import axios from "axios";
import { openai } from "src/config/openAi";

export const getAstroDataFromGPT = async ({
  fullName,
  dob,
  timeOfBirth,
  birthPlace,
  gender,
}: {
  fullName: string;
  dob: any;
  timeOfBirth?: string;
  birthPlace: any;
  gender?: string;
}) => {
  const formattedTime = timeOfBirth || "Not provided";
  
  const birthPlaceText = typeof birthPlace === 'object' 
    ? `${birthPlace.city || ''}, ${birthPlace.state || ''}, ${birthPlace.country || ''}`.replace(/^,\s*|,\s*$/g, '')
    : birthPlace || "Not specified";

  const prompt = `You are an expert astrologer specializing in Sidereal astrology for Western audiences.
Based on the birth details provided below, calculate precise astrological data using authentic Sidereal astrology principles, presented in a format familiar to Western users.

CRITICAL INSTRUCTIONS:
- The date and time provided are LOCAL to the birth location
- Use Sidereal zodiac system (approximately 24° behind Tropical/Western astrology)
- Calculate using Lahiri Ayanamsa (standard in Sidereal astrology)
- Birth locations will primarily be in Western countries (US, Canada, Europe, Australia, etc.)
- All calculations must be based on the LOCAL date and time at the birth location
- Present results in English with Western-friendly terminology

Birth Information:
- Full Name: ${fullName}
- Date of Birth (Local): ${dob}
- Time of Birth (Local): ${formattedTime}
- Birth Place: ${birthPlaceText}
- Gender: ${gender || "Not specified"}

CALCULATION METHODOLOGY:
1. Identify exact latitude/longitude coordinates for the birth location (focus on Western countries)
2. Account for local timezone and daylight saving time if applicable
3. Calculate planetary positions using Sidereal system with Lahiri Ayanamsa
4. Determine Moon's position for Moon sign and Nakshatra (birth star)
5. Calculate Sun's Sidereal position (will be different from Western/Tropical sun sign)
6. Calculate Ascendant (Rising sign) based on exact local birth time and coordinates
7. Derive personality traits combining Sidereal and Western astrological insights

NAKSHATRA SYSTEM (27 Birth Stars - use English names):
Ashwini, Bharani, Krittika, Rohini, Mrigashira, Ardra, Punarvasu, Pushya, Ashlesha, Magha, Purva Phalguni, Uttara Phalguni, Hasta, Chitra, Swati, Vishakha, Anuradha, Jyeshtha, Mula, Purva Ashadha, Uttara Ashadha, Shravana, Dhanishta, Shatabhisha, Purva Bhadrapada, Uttara Bhadrapada, Revati

SIDEREAL ZODIAC SIGNS (use familiar Western names):
Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces

IMPORTANT NOTES:
- zodiacSign and moonSign must be identical (both refer to Moon's Sidereal position)
- sunSign is based on Sidereal Sun position (likely different from person's known Western sun sign)
- risingStar is the Sidereal Ascendant/Rising sign
- personalityKeywords should blend Sidereal accuracy with Western psychological insights
- Explain that Sidereal signs may differ from familiar Western astrology due to precession
- If time of birth is not provided, note that rising sign calculations are limited

RESPONSE FORMAT:
Return ONLY a valid JSON object with no additional text, explanations, or markdown formatting.

{
  "sunSign": "<Sidereal Sun sign>",
  "zodiacSign": "<Sidereal Moon sign>",
  "birthStar": "<Nakshatra name in English>",
  "moonSign": "<Same as zodiacSign - Sidereal Moon sign>",
  "personalityKeywords": ["<trait1>", "<trait2>", "<trait3>"],
  "risingStar": "<Sidereal Ascendant sign>"
}

Note: Sidereal positions may differ from Western/Tropical astrology due to the ~24° precession correction.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.05,
      max_tokens: 700,
      messages: [
        { 
          role: "system", 
          content: "You are a master Sidereal astrologer serving Western audiences. Provide accurate Sidereal astrological analysis using precise calculations while presenting results in familiar Western terminology. Return only valid JSON format based on the given birth details." 
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = response.choices[0].message?.content || "{}";
    const cleaned = raw.trim().replace(/```json\n?|```\n?/g, '').replace(/^```|```$/g, '');

    let data;
    try {
      data = JSON.parse(cleaned);
    } catch (parseError) {
      console.error('JSON parsing failed, raw response:', raw);
      throw new Error('Failed to parse astrological data response');
    }

    // Ensure consistent data structure
    return {
      sunSign: data.sunSign || "Unknown",
      zodiacSign: data.zodiacSign || data.moonSign || "Unknown",
      birthStar: data.birthStar || "Unknown",
      moonSign: data.moonSign || data.zodiacSign || "Unknown",
      personalityKeywords: Array.isArray(data.personalityKeywords)
        ? data.personalityKeywords.slice(0, 3)
        : ["Unknown", "Unknown", "Unknown"],
      risingStar: data.risingStar || "Unknown"
    };

  } catch (error) {
    console.error('OpenAI API or parsing error:', error);

    // Return fallback data structure
    return {
      sunSign: "Unknown",
      zodiacSign: "Unknown",
      birthStar: "Unknown",
      moonSign: "Unknown",
      personalityKeywords: ["Unknown", "Unknown", "Unknown"],
      risingStar: "Unknown"
    };
  }
};

export const getAstroDataFromAPI = async ({
  day,
  month,
  year,
  hour = 0,
  min = 0,
  lat,
  lon,
  timezone,
}: {
  day: number;
  month: number;
  year: number;
  hour?: number;
  min?: number;
  lat: number;
  lon: number;
  timezone: number;
}) => {
  try {
    // Use both user ID and API key for Basic Auth
    const auth = Buffer.from(`${process.env.ASTROLOGY_USER_ID}:${process.env.ASTROLOGY_API_KEY}`).toString("base64");

    const response = await axios.post(
      "https://json.astrologyapi.com/v1/western_horoscope",
      { day, month, year, hour, min, lat, lon, tzone: timezone },
      { headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" } }
    );

    return response.data;
  } catch (err: any) {
    console.error("Error fetching astrology data:", err.response?.data || err.message);
    return null;
  }
};