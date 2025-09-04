import { Request, Response } from "express";
import { planModel } from "src/models/admin/plan-schema";
import { PlatformInfoModel } from "src/models/admin/platform-info-schema";
import { TransactionModel } from "src/models/user/transaction-schema";
import { UserModel } from "src/models/user/user-schema";
import { planServices } from "src/services/admin/plan-services";

import {
  BADREQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  OK,
} from "src/utils/response";
import { validateCreatePlanPayload } from "src/validation/validPlan";

export const createPlan = async (req: Request, res: Response) => {
  try {
    const payload = validateCreatePlanPayload(req.body, "create");

    if (!payload.data) {
      throw new Error("Invalid payload: data is missing.");
    }
    const checkExist = await planModel
      .findOne({
        $or: [
          { key: payload.data.key },
        ],
      })
      .lean();

    if (checkExist) {
      throw new Error("A plan with the same key or name already exists.");
    }

    const response = await planServices.createPlan(payload.data);
    return CREATED(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const getPlans = async (req: Request, res: Response) => {
  try {
    const response = await planServices.getPlans({});

    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const updatePlan = async (req: Request, res: Response) => {
  try {
    const { planId, ...restData } = req.body;
    const response = await planServices.updatePlan(planId, restData);
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const handleStripeWebhook = async (req: Request, res: Response) => {
  try {
    const response = await planServices.handleStripeWebhook(req);
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const getPlatformInfo = async (req: Request, res: Response) => {
  try {
    const response = await PlatformInfoModel.findOneAndUpdate(
      {
        isActive: true,
      },
      {},
      {
        new: true,
        upsert: true, // Create if it doesn't exist
      }
    );
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const postTermAndCondition = async (req: Request, res: Response) => {
  try {
    const { ...termAndCondition } = req.body;
    if (!termAndCondition || Object.keys(termAndCondition).length !== 4) {
      throw new Error("invalidFields");
    }
    const response = await PlatformInfoModel.findOneAndUpdate(
      {
        isActive: true,
      },
      {
        $set: {
          termAndCondition,
        },
      },
      {
        new: true,
        upsert: true, // Create if it doesn't exist
      }
    );
    return CREATED(
      res,
      response?.termAndCondition || {},
      req.body.language || "en"
    );
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const postPrivacyPolicy = async (req: Request, res: Response) => {
  try {
    const { ...privacyPolicy } = req.body;
    if (!privacyPolicy || Object.keys(privacyPolicy).length !== 4) {
      throw new Error("invalidFields");
    }
    const response = await PlatformInfoModel.findOneAndUpdate(
      {
        isActive: true,
      },
      {
        $set: {
          privacyPolicy,
        },
      },
      {
        new: true,
        upsert: true, // Create if it doesn't exist
      }
    );
    return CREATED(
      res,
      response?.privacyPolicy || {},
      req.body.language || "en"
    );
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const postSupport = async (req: Request, res: Response) => {
  try {
    const { ...support } = req.body;
    if (
      !support.phone ||
      !support.email ||
      Object.keys(support.address).length !== 4
    ) {
      throw new Error("invalidFields");
    }
    const response = await PlatformInfoModel.findOneAndUpdate(
      {
        isActive: true,
      },
      {
        $set: {
          support,
        },
      },
      {
        new: true,
        upsert: true, // Create if it doesn't exist
      }
    );
    return CREATED(res, response?.support || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const getStats = async (req: Request, res: Response) => {
  try {
    const { type, period } = req.query as { type: string; period: string };

    if (!type || !["user", "transaction"].includes(type)) {
      throw new Error("Invalid type. Must be 'user' or 'transaction'");
    }
    if (!period || !["month", "total"].includes(period)) {
      throw new Error("Invalid period. Must be 'month' or 'total'");
    }

    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    let stats: any = {};
    let items: any[] = [];

    if (type === "user") {
      const filter: any = {};
      if (period === "month") {
        filter.createdAt = { $gte: startOfMonth };
      }

      const users = await UserModel.find(filter).select("-password"); // don’t expose password
      stats = {
        type: "user",
        period,
        count: users.length,
      };
      items = users;
    }

    if (type === "transaction") {
      const filter: any = { status: "succeeded" ,amount:{$ne:0}};
      if (period === "month") {
        filter.paidAt = { $gte: startOfMonth };
      }

      const transactions = await TransactionModel.find(filter).populate("userId", "fullName email image");
      const aggregateResult = await TransactionModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalCount: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
          },
        },
      ]);

      const result = aggregateResult[0] || { totalCount: 0, totalAmount: 0 };
      stats = {
        type: "transaction",
        period,
        count: result.totalCount,
        totalAmountUSD: (result.totalAmount).toFixed(2), // assuming stored in cents
      };
      items = transactions;
    }

    return res.status(200).json({
      success: true,
      data: {
        stats,
        items,
      },
    });
  } catch (error: any) {
    console.error(error);
    if (error.message) {
      return BADREQUEST(res, error.message, req.body?.language);
    }
    return INTERNAL_SERVER_ERROR(res, req.body?.language);
  }
};
