

interface CreatePlanPayload {
  key: string;
  name: string;
  description: string;
  trialDays: number;
  amount: number;
  fullAccess: any;
  trialAccess: any;
  features:any;
}

export const validateCreatePlanPayload = (
  body: any,
  type: "create" | "update"
): { valid: boolean; message?: string; data?: CreatePlanPayload } => {
  const {
    key,
    name,
    description,
    trialDays,
    amount,
    fullAccess,
    trialAccess,
    features,
  } = body;

  if ((!key || typeof key !== "string") && type=="create") {
    throw new Error("Plan key is required and must be a string");
  }

  if (!name || typeof name !== "string") {
    throw new Error("Plan name is required and must be a string");
  }

  if (!description || typeof description !== "string") {
    throw new Error("Plan description is required and must be a string");
  }

  if (typeof trialDays !== "number" || trialDays < 0) {
    throw new Error("Trial days must be a non-negative number");
  }

  if (typeof amount !== "number" || amount <= 0) {
    throw new Error("amount must be a positive number");
  }

  return {
    valid: true,
    data: {
      key,
      name,
      description,
      trialDays,
      amount,
      fullAccess,
      trialAccess,
      features
    },
  };
};
