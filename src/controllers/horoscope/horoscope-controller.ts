import { Request, Response } from "express";
import { generateAndSaveHoroscope } from "src/services/horoscope/horoscope-service";
import { BADREQUEST, INTERNAL_SERVER_ERROR } from "src/utils/response";
import { OK } from "zod";

export const generateHoroscope = async (req: Request, res: Response): Promise<Response> => {
  try {
    const userData = req.user as any;
    const { name, dob, timeOfBirth, placeOfBirth, gender } = req.body;

    if (!name || !dob || !placeOfBirth || !gender) {
      throw new Error("name, dob, placeOfBirth, and gender are required");
    }

    const result = await generateAndSaveHoroscope({
      name,
      dob,
      timeOfBirth,
      placeOfBirth,
      gender,
      userData,
    });

    return res.status(200).json({
       success: true,
      message: "Compatibility result generated successfully",
      data: result
    });
  } catch (err: any) {
    if (err.message) {
      return BADREQUEST(res, err.message, req.body.language || "en");
    }
    return INTERNAL_SERVER_ERROR(res, req.body.language || "en");
  }
};
