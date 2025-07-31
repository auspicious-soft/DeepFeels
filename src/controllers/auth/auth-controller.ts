import { Request, Response } from "express";
import { planModel } from "src/models/admin/plan-schema";
import { authServices } from "src/services/auth/auth-services";
import { countries, languages } from "src/utils/constant";
import {
  BADREQUEST,
  CREATED,
  INTERNAL_SERVER_ERROR,
  OK,
  UNAUTHORIZED,
} from "src/utils/response";

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { fullName, email, password,phoneNumber, countryCode, fcmToken } = req.body;
    if (!fullName || !email || !password) {
      throw new Error("registerRequiredFields");
    }

    // if (!languages.includes(language) || !countries.includes(country)) {
    //   throw new Error("invalidRegisterFields");
    // }

    if (!fcmToken) {
      throw new Error("FCM is required");
    }

    const response = await authServices.register({
      fullName,
      email,
      password,
      countryCode,
      authType: "EMAIL",
      fcmToken,
      phoneNumber,
      ...req.body,
    });
    return CREATED(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const verifyOtp = async (req: Request, res: Response) => {
  try {
    const { otp, value  } = req.body;
    if (!otp || !value ) {
      throw new Error("otp and value  is required");
    }
    const response = await authServices.verifyOtp({
      otp,
      value,
      userType: "USER",
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { value, purpose, language } = req.body;
    if (!purpose || !value || !language) {
      throw new Error("otp, purpose and language is required");
    }
    const response = await authServices.resendOtp({
      purpose,
      value,
      userType: "USER",
      language,
    });
    return OK(res, response || {}, req.body.language || "en", "otpResent");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password, fcmToken } = req.body;
    if (!email || !password || !fcmToken ) {
      throw new Error("Email, Password & FCM is required");
    }
    const response = await authServices.login({
      email,
      password,
      fcmToken,
      authType: "EMAIL",
    });
    return OK(res, response || {}, req.body.language || "en", "loginSuccess");
  } catch (err: any) {
    if (err.message) {
      return UNAUTHORIZED(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const socialLogin = async (req: Request, res: Response) => {
  try {
    const { authType, idToken, fcmToken, countryCode, language, deviceType } = req.body;
    if (
      !authType ||
      !idToken ||
      !fcmToken ||
      !countryCode ||
      !language ||
      !["GOOGLE", "APPLE"].includes(authType) ||
      !["ANDROID", "IOS"].includes(deviceType)
    ) {
      throw new Error(
        "idToken, fcmToken, countryCode, language and Valid authType or deviceType is required"
      );
    }
    const response = await authServices.socialLogin({
      authType,
      idToken,
      fcmToken,
      countryCode,
      language,
      deviceType
    });
    return OK(res, response || {}, req.body.language || "en", "loginSuccess");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

export const forgetPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email ) {
      throw new Error("Email is required");
    }
    const response = await authServices.forgetPassword({
      email,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const verifyResetPasswordOtp = async (req: Request, res: Response) => {
  try {
    const { otp, value } = req.body;
    if (!value || !otp) {
      throw new Error("Email and value  is required");
    }
    const response = await authServices.verifyForgetPassOtp({
      otp,
      value,
      userType: "USER",
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    if (!password ) {
      throw new Error("Password is required");
    }
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      throw new Error("Token is required");
    }
    const response = await authServices.resetPassword({
      password,
      userType: "USER",
      token,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const userMoreInfo = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const { birthPlace, dob, timeOfBirth,gender } = req.body;
    if (!birthPlace || !dob || !timeOfBirth || !gender) {
      throw new Error("timeOfBirth, DOB, birthPlace and gender is required");
    }

    const response = await authServices.userMoreInfo({
      birthPlace,
      dob,
      timeOfBirth,
      gender,
      userData: req.user,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const getPlans = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    const response = await authServices.getPlans({
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const setupIntent = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language;

    const response = await authServices.setupIntent({
      language: userData.language,
      ...userData,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const buyPlan = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language;
    const { planId, currency, paymentMethodId, freeTrial } = req.body;

    if (!planId || !currency || !paymentMethodId) {
      throw new Error(
        "PlanId, Currency, Payment-Method and Customer-id is required"
      );
    }
    const response = await authServices.buyPlan({
      language: userData.language,
      planId,
      currency,
      paymentMethodId,
      freeTrial,
      ...userData,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const getLoginResponse = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language || "en";
    const response = await authServices.getLoginResponse({
      userId: userData.id,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const buyAgain = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language || "en";
    const { planId } = req.body;
    const plan = await planModel.findById(planId);
    if (!plan) {
      throw new Error("Invalid plan Id");
    }
    const response = await authServices.buyAgain({
      userId: userData.id,
      planId,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const logoutUser = async (req: Request, res: Response) => {
  try {
    const userData = req.user as any;
    req.body.language = userData.language || "en";
    const response = await authServices.logoutUser({
      userId: userData.id,
    });
    return OK(res, response || {}, req.body.language || "en", "logoutSuccess");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};

// Admin Controllers

export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new Error("Email & Password required");
    }
    const response = await authServices.adminLogin({
      email,
      password,
    });
    return OK(res, response || {}, req.body.language || "en", "loginSuccess");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const adminForgetPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      throw new Error("Email is required");
    }
    const response = await authServices.forgetPassword({
      email,
      admin: true,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const adminVerifyOtp = async (req: Request, res: Response) => {
  try {
    const { value, otp } = req.body;
    if (!value) {
      throw new Error("Email is required");
    }
    const response = await authServices.verifyForgetPassOtp({
      value,
      otp,
      userType: "ADMIN",
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
export const adminResetPassword = async (req: Request, res: Response) => {
  try {
    const { password, token } = req.body;
    if (!password) {
      throw new Error("Password is required");
    }
    if (!token) {
      throw new Error("Token is required");
    }
    const response = await authServices.resetPassword({
      password,
      token,
    });
    return OK(res, response || {}, req.body.language || "en");
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
