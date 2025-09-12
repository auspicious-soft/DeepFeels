import { openai } from "src/config/openAi";
import { convertFromUTC } from "../helper";

export const getAstroDataFromGPT = async ({
  fullName,
  dob,
  timeOfBirth,
  birthPlace,
  gender,
  timezone,
  utcDate = false,
  dobUTC,
}: {
  fullName: any;
  dob: any | Date;
  timeOfBirth?: string;
  birthPlace: any;
  gender?: string;
  timezone?: string;
  utcDate?: boolean;
  dobUTC?: any;
}) => {
  let formattedDate: string;
  let formattedTime: string;
  let timezoneInfo: string = "";

  // Handle different date formats and timezone conversions
  if (utcDate && dobUTC && timezone) {
    // Convert UTC date back to local time for accurate astrology calculations
    try {
      const localDateTime = convertFromUTC(dobUTC, timezone);
      formattedDate = localDateTime.localDate;
      formattedTime = localDateTime.localTime;
      timezoneInfo = `\n- Timezone: ${timezone} (UTC date converted to local time for accuracy)`;
    } catch (error) {
      console.error('Error converting UTC to local time:', error);
      // Fallback to provided date/time
      formattedDate = dob instanceof Date ? dob.toISOString().split('T')[0] : dob.toString();
      formattedTime = timeOfBirth || "Not provided";
    }
  } else {
    // Use provided date/time as is
    formattedDate = dob instanceof Date ? dob.toISOString().split('T')[0] : dob.toString();
    formattedTime = timeOfBirth || "Not provided";
    if (timezone) {
      timezoneInfo = `\n- Timezone: ${timezone}`;
    }
  }

  const prompt = `You are an expert Vedic astrologer with deep knowledge of traditional Jyotish principles. Given the following birth details, please provide an accurate astrological analysis:

Birth Details:
- Full Name: ${fullName}
- Date of Birth: ${formattedDate}
- Time of Birth: ${formattedTime}
- Birth Place: ${birthPlace}
- Gender: ${gender || "Not specified"}${timezoneInfo}

IMPORTANT INSTRUCTIONS:
1. The date and time provided are in the LOCAL TIME ZONE of the birth place for accurate planetary calculations
2. Use traditional Vedic astrology (Jyotish) principles, not Western astrology
3. Calculate the exact planetary positions based on the given coordinates and time
4. For Nakshatra (birth star), use the traditional 27 Nakshatras system
5. Ensure zodiacSign matches the Moon sign in Vedic astrology (Rashi)
6. Provide 3-5 relevant personality keywords based on the planetary combinations

Please respond in **strict JSON format** with the following structure:
{
  "sunSign": "<Vedic Sun sign based on birth date>",
  "zodiacSign": "<Moon sign - one of: Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces>",
  "birthStar": "<Nakshatra name (Sanskrit preferred)>",
  "moonSign": "<Moon sign - should match zodiacSign>",
  "personalityKeywords": ["<trait1>", "<trait2>", "<trait3>"],
  "risingStar": "<Ascendant/Lagna sign>"
}

Rules:
- Do not include any explanations or additional text outside the JSON
- Ensure all values are properly formatted strings or arrays
- If time is not provided, focus on date-based calculations and mention limitations in calculations
- Use traditional Sanskrit names for Nakshatras where appropriate
- Ensure consistency between moonSign and zodiacSign (they should be the same in Vedic astrology)`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      temperature: 0.3, // Reduced for more consistent results
      max_tokens: 500,   // Added to ensure complete response
      messages: [
        { 
          role: "system", 
          content: "You are a professional Vedic astrologer (Jyotishi) with expertise in traditional Indian astrology. Always provide accurate calculations based on Vedic principles and respond only in valid JSON format." 
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = response.choices[0].message?.content || "{}";
    
    // Clean the response to ensure it's valid JSON
    const cleanedResponse = raw.trim().replace(/```json\n?|\n?```/g, '');
    
    let data;
    try {
      data = JSON.parse(cleanedResponse);
      
      // Validate required fields and provide defaults if missing
      const validatedData = {
        sunSign: data.sunSign || "Unknown",
        zodiacSign: data.zodiacSign || data.moonSign || "Unknown",
        birthStar: data.birthStar || "Unknown",
        moonSign: data.moonSign || data.zodiacSign || "Unknown",
        personalityKeywords: Array.isArray(data.personalityKeywords) 
          ? data.personalityKeywords.slice(0, 5) // Limit to 5 keywords
          : [],
        risingStar: data.risingStar || "Unknown"
      };

      // Ensure moonSign and zodiacSign consistency (Vedic astrology principle)
      if (validatedData.moonSign !== validatedData.zodiacSign) {
        validatedData.zodiacSign = validatedData.moonSign;
      }

      return validatedData;
      
    } catch (parseError) {
      console.error('Error parsing GPT response:', parseError);
      console.error('Raw response:', raw);
      
      // Return default values if parsing fails
      return {
        sunSign: "Unknown",
        zodiacSign: "Unknown", 
        birthStar: "Unknown",
        moonSign: "Unknown",
        personalityKeywords: [],
        risingStar: "Unknown"
      };
    }
    
  } catch (apiError) {
    console.error('Error calling OpenAI API:', apiError);
    
    // Return default values if API call fails
    return {
      sunSign: "Unknown",
      zodiacSign: "Unknown",
      birthStar: "Unknown", 
      moonSign: "Unknown",
      personalityKeywords: [],
      risingStar: "Unknown"
    };
  }
};