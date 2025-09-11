import { openai } from "src/config/openAi";

export const getAstroDataFromGPT = async ({
  fullName,
  dob,
  timeOfBirth,
  birthPlace,
  gender,
}: {
  fullName: any;
  dob: string;
  timeOfBirth?: string;
  birthPlace: string;
  gender?: string;
}) => {
  const prompt = `You are an expert Vedic astrologer. Given the following birth details
- Full Name: ${fullName}
- Date of Birth: ${dob}
- Time of Birth: ${timeOfBirth || "Not provided"}
- Birth Place: ${birthPlace}
- Gender: ${gender}
- Note: The Time of Birth provided is based on the local time zone of the Birth Place.

Please analyze the birth chart and respond in **strict JSON format** with the following fields:
{
  "sunSign": "<Sun sign>",
  "zodiacSign": "<One of: Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces>",
  "birthStar": "<Nakshatra / Birth star>",
  "moonSign": "<Moon sign>",
  "personalityKeywords": ["<keyword1>", "<keyword2>", "<keyword3>"],
  "risingStar": "<Rising sign / Ascendant>"
}

Be sure to provide accurate values based on traditional Vedic astrology principles. Do not include any additional explanations, just the required JSON response.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    temperature: 0.5,
    messages: [
      { role: "system", content: "You are a professional Vedic astrologer." },
      { role: "user", content: prompt },
    ],
  });

  const raw = response.choices[0].message?.content || "{}";
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    data = {};
  }

  return data;
};