import { Request } from "express";
import stripe from "src/config/stripe";
import { planModel } from "src/models/admin/plan-schema";
import { SubscriptionModel } from "src/models/user/subscription-schema";
import { TransactionModel } from "src/models/user/transaction-schema";
import { features, regionalAccess } from "src/utils/constant";
import { Stripe } from "stripe";

export const planServices = {
  async getPlans(payload: any) {
    const plans = await planModel.find();
    return { plans, features, regionalAccess };
  },

  async createPlan(payload: any) {
    const {
      key,
      name,
      description,
      trialDays,
      amount,
      fullAccess,
      trialAccess,
      features,
    } = payload;

    const stripeProduct = await stripe.products.create({
      name: name,
      description: description,
      metadata: {
        key,
      },
    });


    const Price = await stripe.prices.create({
      unit_amount: Math.round(amount * 100),
      currency: "usd",
      recurring: { interval: "month" },
      product: stripeProduct.id,
    });


    // 3. Save to DB
    const planDoc = await planModel.create({
      key,
      name,
      description,
      trialDays,
      stripeProductId: stripeProduct.id,
      stripePrices: Price.id,
      amounts: Math.round(amount * 100),
      fullAccess,
      trialAccess,
      features: features,
    });

    return planDoc;
  },

  async updatePlan(planId: string, payload: any) {
    const {
      name,
      description,
      trialDays,
      eurAmount,
      gbpAmount,
      fullAccess,
      trialAccess,
      isActive,
    } = payload;

    const plan = await planModel.findById(planId);
    if (!plan) throw new Error("planNotFound");

    // Update Stripe product name and description
    if (description) {
      await stripe.products.update(plan.stripeProductId, {
        description: description.en,
      });
    }
    if (name) {
      await stripe.products.update(plan.stripeProductId, {
        name: name.en,
      });
    }

    let eurPrice;

    if (eurAmount) {
      if (plan.stripePrices.eur) {
        await stripe.prices.update(plan.stripePrices.eur, { active: false });
      }
      // Update Stripe prices (deactivating old and creating new)
      eurPrice = await stripe.prices.create({
        unit_amount: Math.round(eurAmount * 100),
        currency: "eur",
        recurring: { interval: "month" },
        product: plan.stripeProductId,
      });
    }

    let gbpPrice;

    if (gbpAmount) {
      if (plan.stripePrices.gbp) {
        await stripe.prices.update(plan.stripePrices.gbp, { active: false });
      }
      gbpPrice = await stripe.prices.create({
        unit_amount: Math.round(gbpAmount * 100),
        currency: "gbp",
        recurring: { interval: "month" },
        product: plan.stripeProductId,
      });
    }

    let taskFeature;
    let jobApplicationFeature;
    // Construct feature updates based on fullAccess values
    if (fullAccess) {
      if (fullAccess.task) {
        taskFeature =
          fullAccess.tasks < 200
            ? {
                en: `${fullAccess.tasks} Tasks`,
                nl: `${fullAccess.tasks} Taken`,
                fr: `${fullAccess.tasks} Tâches`,
                es: `${fullAccess.tasks} Tareas`,
              }
            : {
                en: `${fullAccess.tasks}+ Tasks`,
                nl: `${fullAccess.tasks}+ Taken`,
                fr: `${fullAccess.tasks}+ Tâches`,
                es: `${fullAccess.tasks}+ Tareas`,
              };
      }

      if (fullAccess.jobApplicationsPerDay) {
        jobApplicationFeature =
          fullAccess.jobApplicationsPerDay < 100
            ? {
                en: `${fullAccess.jobApplicationsPerDay} Job Application / Day (max ${fullAccess.jobApplicationsPerMonth}/month)`,
                nl: `${fullAccess.jobApplicationsPerDay} Sollicitatie / Dag (max ${fullAccess.jobApplicationsPerMonth}/maand)`,
                fr: `${fullAccess.jobApplicationsPerDay} Candidature / Jour (max ${fullAccess.jobApplicationsPerMonth}/mois)`,
                es: `${fullAccess.jobApplicationsPerDay} Solicitud / Día (máx ${fullAccess.jobApplicationsPerMonth}/mes)`,
              }
            : {
                en: "Unlimited Job Applications",
                nl: "Onbeperkt Sollicitaties",
                fr: "Candidatures Illimitées",
                es: "Solicitudes Ilimitadas",
              };
      }
    }

    // Update DB
    if (name) {
      plan.name = name;
    }
    if (description) {
      plan.description = description;
    }
    if (trialDays) {
      plan.trialDays = trialDays;
    }

    if (eurPrice) {
      plan.stripePrices.eur = eurPrice.id;
      plan.unitAmounts.eur = Math.round(eurAmount * 100);
    }
    if (gbpPrice) {
      plan.stripePrices.gbp = gbpPrice.id;
      plan.umounts.gbp = Math.round(gbpAmount * 100);
    }

    if (trialAccess) {
      plan.trialAccess = trialAccess;
    }

    if (fullAccess) {
      plan.fullAccess = fullAccess;
    }

    if (typeof isActive === "boolean") {
      plan.isActive = isActive;
    }

    if (taskFeature || jobApplicationFeature) {
      const filteredFeatures = plan.features.filter(
        (f) =>
          !f?.en?.includes("Tasks") &&
          !f?.en?.includes("Job Application") &&
          !f?.en?.includes("Unlimited Job Applications")
      );

      plan.features = [
        ...filteredFeatures,
        ...(taskFeature ? [taskFeature] : []),
        ...(jobApplicationFeature ? [jobApplicationFeature] : []),
      ];
    }

    await plan.save();
    return plan;
  },

  async handleStripeWebhook(req: Request) {
    const sig = req.headers["stripe-signature"] as string;
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

    if (!sig || !endpointSecret) {
      console.error("***STRIPE SIGNATURE MISSING***");
      return;
    }

    let event: Stripe.Event | undefined;
    const toDate = (timestamp?: number | null): Date | null =>
      typeof timestamp === "number" && !isNaN(timestamp)
        ? new Date(timestamp * 1000)
        : null;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
      console.log(`***STRIPE EVENT TYPE***: ${event.type}`);

      const subscription = event.data.object as Stripe.Subscription;

      switch (event.type) {
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const {
            id: stripeSubscriptionId,
            customer: stripeCustomerId,
            status,
            start_date,
            trial_start,
            trial_end,
            cancel_at_period_end,
            items,
          } = subscription;

          const item = items?.data?.[0];
          const planAmount = item?.price?.unit_amount ?? 0;
          const currency = item?.price?.currency ?? "inr";
          const current_period_start = subscription.current_period_start;
          const current_period_end = subscription.current_period_end;

          const updateData: any = {
            stripeCustomerId,
            stripeSubscriptionId,
            status: cancel_at_period_end ? "canceling" : status,
            startDate: toDate(start_date),
            trialStart: toDate(trial_start),
            trialEnd: toDate(trial_end),
            currentPeriodStart: toDate(current_period_start),
            currentPeriodEnd: toDate(current_period_end),
            nextBillingDate: toDate(current_period_end),
            amount: planAmount / 100,
            currency,
          };

          await SubscriptionModel.findOneAndUpdate(
            { stripeCustomerId, stripeSubscriptionId },
            { $set: updateData },
            { upsert: false }
          );
          break;
        }

        case "customer.subscription.deleted": {
          const { customer: stripeCustomerId, currency, id } = subscription;

          const existingSub = await SubscriptionModel.findOne({
            stripeCustomerId,
            stripeSubscriptionId: id,
          }).lean();

          if (!existingSub) {
            console.warn(
              "⚠️ No existing subscription found for deletion event."
            );
            return;
          }

          const { userId, nextPlanId, paymentMethodId, _id } = existingSub;

          await SubscriptionModel.findByIdAndUpdate(_id, {
            $set: {
              status: "canceled",
              trialEnd: null,
              startDate: null,
              currentPeriodEnd: null,
              currentPeriodStart: null,
              nextBillingDate: null,
            },
          });

          if (nextPlanId) {
            await SubscriptionModel.findByIdAndDelete(_id);
            const planData = await planModel.findById(nextPlanId);
            console.log("🔁 Upgrade triggered for next plan:", nextPlanId);

            const newSub = await stripe.subscriptions.create({
              customer:
                typeof stripeCustomerId === "string"
                  ? stripeCustomerId
                  : stripeCustomerId?.id ?? "",
              items: [
                { price: planData?.stripePrices[currency as "eur" | "gbp"] },
              ],
              default_payment_method: paymentMethodId,
              expand: ["latest_invoice.payment_intent"],
            });

            const newSubPrice = newSub.items.data[0]?.price;

            await SubscriptionModel.create({
              userId,
              stripeCustomerId,
              stripeSubscriptionId: newSub.id,
              planId: nextPlanId,
              paymentMethodId,
              status: newSub.status,
              trialStart: toDate(newSub.trial_start),
              trialEnd: toDate(newSub.trial_end),
              startDate: toDate(newSub.start_date),
              currentPeriodStart: toDate(newSub.current_period_start),
              currentPeriodEnd: toDate(newSub.current_period_end),
              nextBillingDate: toDate(newSub.current_period_end),
              amount: newSubPrice?.unit_amount
                ? newSubPrice.unit_amount / 100
                : 0,
              currency: newSubPrice?.currency ?? "inr",
              nextPlanId: null,
            });

            console.log(
              "✅ Upgrade flow completed and new subscription created."
            );
          }

          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event?.data?.object as Stripe.Invoice;
          const customerId = invoice?.customer as string;

          const existing = await SubscriptionModel.findOne({
            stripeCustomerId: customerId,
          });

          if (!existing) break;

          const subscriptionId = existing?.stripeSubscriptionId as string;
          const userId = existing?.userId;

          const pi =
            typeof invoice.payment_intent === "string"
              ? await stripe?.paymentIntents?.retrieve(invoice?.payment_intent)
              : invoice?.payment_intent;

          // Retrieve charge
          let charge: Stripe.Charge | undefined;
          if (pi?.id) {
            const chargesList = await stripe?.charges?.list({
              payment_intent: pi.id,
            });
            charge = chargesList.data[0];
          }

          const card = charge?.payment_method_details?.card;

          const lineItem = invoice?.lines?.data?.[0];
          const period = lineItem?.period;

          const currentPeriodStart = period?.start
            ? new Date(period.start * 1000)
            : null;

          const currentPeriodEnd = period?.end
            ? new Date(period.end * 1000)
            : null;

          const nextBillingDate = currentPeriodEnd; // Same as currentPeriodEnd

          // Update SubscriptionModel with billing cycle info
          await SubscriptionModel.findOneAndUpdate(
            {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
            },
            {
              $set: {
                currentPeriodStart,
                currentPeriodEnd,
                nextBillingDate,
              },
            }
          );

          // Create transaction
          await TransactionModel.create({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            invoiceId: invoice.id,
            paymentIntentId: pi?.id,
            status: "succeeded",
            amount: invoice.amount_paid / 100,
            currency: invoice.currency,
            paymentMethodDetails: {
              brand: card?.brand ?? "unknown",
              last4: card?.last4 ?? "0000",
              expMonth: card?.exp_month ?? 0,
              expYear: card?.exp_year ?? 0,
              type: card ? "card" : "unknown",
            },
            billingReason: invoice.billing_reason,
            paidAt: toDate(invoice.status_transitions?.paid_at) ?? new Date(),
          });

          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string

          const existing = await SubscriptionModel.findOne({
            stripeCustomerId: customerId,
          });

          const subscriptionId = existing?.stripeSubscriptionId as string;

          if (!existing) break;

          const userId = existing.userId;
          const pi =
            typeof invoice?.payment_intent === "string"
              ? await stripe?.paymentIntents?.retrieve(invoice?.payment_intent)
              : invoice.payment_intent;

          // Retrieve the charge using the payment intent id
          let charge: Stripe.Charge | undefined;
          if (pi?.id) {
            const chargesList = await stripe?.charges?.list({
              payment_intent: pi.id,
            });
            charge = chargesList.data[0];
          }
          const card = charge?.payment_method_details?.card;

          await SubscriptionModel.updateOne(
            { stripeSubscriptionId: subscriptionId },
            { $set: { status: "past_due" } }
          );

          await TransactionModel.create({
            userId,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscriptionId,
            invoiceId: invoice.id,
            paymentIntentId: pi?.id,
            status: "failed",
            amount: invoice.amount_due / 100,
            currency: invoice.currency,
            paymentMethodDetails: {
              brand: card?.brand ?? "unknown",
              last4: card?.last4 ?? "0000",
              expMonth: card?.exp_month ?? 0,
              expYear: card?.exp_year ?? 0,
              type: card ? "card" : "unknown",
            },
            billingReason: invoice.billing_reason,
            errorMessage: pi?.last_payment_error?.message ?? "Unknown failure",
            paidAt: new Date(),
          });

          break;
        }
      }

      console.log("✅ Successfully handled event:", event.type);
      return {};
    } catch (err: any) {
      console.error("***STRIPE EVENT FAILED***", err.message);
      return {};
    }
  },
};
