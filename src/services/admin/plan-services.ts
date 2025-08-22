import { Request } from "express";
import stripe from "src/config/stripe";
import { planModel } from "src/models/admin/plan-schema";
import { SubscriptionModel } from "src/models/user/subscription-schema";
import { TokenModel } from "src/models/user/token-schema";
import { TransactionModel } from "src/models/user/transaction-schema";
import { UserModel } from "src/models/user/user-schema";
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
    amount,
    fullAccess,
    trialAccess,
    features,
    isActive,
  } = payload;

  const plan = await planModel.findById(planId);
  if (!plan) throw new Error("planNotFound");

  // --- Update Stripe Product ---
  if (name || description) {
    await stripe.products.update(plan.stripeProductId, {
      ...(name && { name }),
      ...(description && { description }),
    });
  }

  // --- Handle Price update ---
  let newPrice;
  if (amount) {
    // Deactivate old price
    if (plan.stripePrices) {
      await stripe.prices.update(plan.stripePrices, { active: false });
    }

    // Create new price
    newPrice = await stripe.prices.create({
      unit_amount: Math.round(amount * 100),
      currency: "usd",
      recurring: { interval: "month" },
      product: plan.stripeProductId,
    });

    plan.stripePrices = newPrice.id;
    plan.amounts = Math.round(amount * 100);
  }

  // --- Update DB fields ---
  if (name) plan.name = name;
  if (description) plan.description = description;
  if (trialDays !== undefined) plan.trialDays = trialDays;
  if (fullAccess) plan.fullAccess = fullAccess;
  if (trialAccess) plan.trialAccess = trialAccess;
  if (features) plan.features = features;
  if (typeof isActive === "boolean") plan.isActive = isActive;

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

    switch (event.type) {
      /** ---------------------- SUBSCRIPTION CREATED / UPDATED ---------------------- */
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const {
          id: stripeSubscriptionId,
          customer: stripeCustomerId,
          status,
          start_date,
          trial_start,
          trial_end,
          cancel_at_period_end,
          items,
          current_period_start,
          current_period_end,
          default_payment_method,
        } = sub;

        const item = items?.data?.[0];
        const planAmount = item?.price?.unit_amount ?? 0;
        const currency = item?.price?.currency ?? "inr";

        const updateData = {
          stripeCustomerId: stripeCustomerId as string,
          stripeSubscriptionId,
          status: cancel_at_period_end ? "canceling" : status,
          startDate: toDate(start_date) ?? new Date(),
          trialStart: toDate(trial_start),
          trialEnd: toDate(trial_end),
          currentPeriodStart: toDate(current_period_start),
          currentPeriodEnd: toDate(current_period_end),
          nextBillingDate: toDate(current_period_end),
          amount: planAmount ,
          currency,
          paymentMethodId:
            typeof default_payment_method === "string"
              ? default_payment_method
              : (default_payment_method as any)?.id ?? "",
        };

        await SubscriptionModel.findOneAndUpdate(
          { stripeCustomerId, stripeSubscriptionId },
          { $set: updateData },
          { upsert: false }
        );
        break;
      }

      /** ---------------------- SUBSCRIPTION DELETED ---------------------- */
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const { customer: stripeCustomerId, id } = sub;

        const existingSub = await SubscriptionModel.findOne({
          stripeCustomerId,
          stripeSubscriptionId: id,
        }).lean();

        if (!existingSub) {
          console.warn("⚠️ No existing subscription found for deletion event.");
          return;
        }

        const { userId, nextPlanId, paymentMethodId, _id } = existingSub;

        // mark canceled
        await SubscriptionModel.findByIdAndUpdate(_id, {
          $set: {
            status: "canceled",
            trialEnd: null,
            startDate: new Date(),
            currentPeriodEnd: null,
            currentPeriodStart: null,
            nextBillingDate: null,
          },
        });

        if (nextPlanId) {
          // schedule new plan
          await SubscriptionModel.findByIdAndDelete(_id);
          const planData = await planModel.findById(nextPlanId);
          const newSub = await stripe.subscriptions.create({
            customer: stripeCustomerId as string,
            items: [
              { price: planData?.stripePrices },
            ],
            default_payment_method: paymentMethodId,
            expand: ["latest_invoice.payment_intent"],
          });

          const newSubPrice = newSub.items.data[0]?.price;
          await SubscriptionModel.create({
            userId,
            stripeCustomerId: stripeCustomerId as string,
            stripeSubscriptionId: newSub.id,
            planId: nextPlanId,
            paymentMethodId,
            status: newSub.status,
            trialStart: toDate(newSub.trial_start),
            trialEnd: toDate(newSub.trial_end),
            startDate: toDate(newSub.start_date) ?? new Date(),
            currentPeriodStart: toDate(newSub.current_period_start),
            currentPeriodEnd: toDate(newSub.current_period_end),
            nextBillingDate: toDate(newSub.current_period_end),
            amount: newSubPrice?.unit_amount
              ? newSubPrice.unit_amount / 100
              : 0,
            currency: newSubPrice?.currency ?? sub.currency ?? "inr",
            nextPlanId: null,
          });
        } else {
          await stripe.paymentMethods.detach(paymentMethodId);
          await TokenModel.findOneAndDelete({ userId });
          // await SubscriptionModel.findByIdAndDelete(_id)
        }
        break;
      }

      /** ---------------------- INVOICE PAYMENT SUCCEEDED ---------------------- */
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const existing = await SubscriptionModel.findOne({
          stripeCustomerId: customerId,
        });

        if (!existing) break;

        const subscriptionId = existing.stripeSubscriptionId;
        const userId = existing.userId;

        const pi =
          typeof invoice.payment_intent === "string"
            ? await stripe.paymentIntents.retrieve(
                invoice.payment_intent as string
              )
            : invoice.payment_intent;

        // Get charge
        let charge: Stripe.Charge | undefined;
        if (pi?.id) {
          const chargesList = await stripe.charges.list({
            payment_intent: pi.id,
          });
          charge = chargesList.data[0];
        }
        const card = charge?.payment_method_details?.card;

        const lineItem = invoice.lines?.data?.[0];
        const period = lineItem?.period;
        const currentPeriodStart = period?.start
          ? new Date(period.start * 1000)
          : null;
        const currentPeriodEnd = period?.end
          ? new Date(period.end * 1000)
          : null;

        await SubscriptionModel.findOneAndUpdate(
          { stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId },
          {
            $set: {
              currentPeriodStart,
              currentPeriodEnd,
              nextBillingDate: currentPeriodEnd,
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
          billingReason: invoice.billing_reason ?? "subscription_cycle",
          paidAt: toDate(invoice.status_transitions?.paid_at) ?? new Date(),
        });
        break;
      }

      /** ---------------------- INVOICE PAYMENT FAILED ---------------------- */
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const existing = await SubscriptionModel.findOne({
          stripeCustomerId: customerId,
        });
        if (!existing) break;

        const subscriptionId = existing.stripeSubscriptionId;
        const userId = existing.userId;

        const pi =
          typeof invoice.payment_intent === "string"
            ? await stripe.paymentIntents.retrieve(
                invoice.payment_intent as string
              )
            : invoice.payment_intent;

        let charge: Stripe.Charge | undefined;
        if (pi?.id) {
          const chargesList = await stripe.charges.list({
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
          billingReason: invoice.billing_reason ?? "subscription_cycle",
          errorMessage: pi?.last_payment_error?.message ?? "Unknown failure",
          paidAt: new Date(),
        });
        break;
      }

      /** ---------------------- CHECKOUT SESSION COMPLETED ---------------------- */
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode !== "subscription" || !session.subscription) break;

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        const stripeCustomerId = subscription.customer as string;
        const planId = session.metadata?.planId;
        const userId = session.metadata?.userId;
        const paymentMethodId = subscription.default_payment_method as string;

        const item = subscription.items?.data?.[0];
        const planAmount = item?.price?.unit_amount ;
        const currency = item?.price?.currency ;

        await SubscriptionModel.findOneAndDelete({ userId });
        await UserModel.findByIdAndUpdate(userId, { hasUsedTrial: true });

        await SubscriptionModel.create({
          userId,
          stripeCustomerId,
          stripeSubscriptionId: subscription.id,
          planId,
          paymentMethodId,
          status: subscription.status,
          trialStart: toDate(subscription.trial_start),
          trialEnd: toDate(subscription.trial_end),
          startDate: toDate(subscription.start_date) ?? new Date(),
          currentPeriodStart: toDate(subscription.current_period_start),
          currentPeriodEnd: toDate(subscription.current_period_end),
          nextBillingDate: toDate(subscription.current_period_end),
          amount: planAmount / 100,
          currency,
          nextPlanId: null,
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
}
};
