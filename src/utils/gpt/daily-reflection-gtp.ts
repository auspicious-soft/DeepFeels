import { openai } from "src/config/openAi";

export const generateReflectionWithGPT = async (data: {
  name: string;
  dob: string;
  timeOfBirth?: string;
  location: string;
  zodiacSign?: string;
  sunSign?: string;
  moonSign?: string;
  risingSign?: string;
  personalityKeywords?: string[];
}) => {
  let birthDetails = `- Name: ${data.name}\n- Date of Birth: ${data.dob}\n- Birth Location: ${data.location}`;

  if (data.timeOfBirth) {
    birthDetails += `\n- Time of Birth: ${data.timeOfBirth}`;
  }

  if (data.zodiacSign) {
    birthDetails += `\n- Zodiac Sign (Moon Sign): ${data.zodiacSign}`;
  }
  if (data.sunSign) {
    birthDetails += `\n- Sun Sign: ${data.sunSign}`;
  }
  if (data.moonSign) {
    birthDetails += `\n- Moon Sign: ${data.moonSign}`;
  }
  if (data.risingSign) {
    birthDetails += `\n- Rising Sign (Ascendant): ${data.risingSign}`;
  }
  if (data.personalityKeywords && data.personalityKeywords.length > 0) {
    birthDetails += `\n- Personality Keywords: ${data.personalityKeywords.join(", ")}`;
  }

  const prompt = `
You are a compassionate and professional Western astrologer.

Based strictly and explicitly on the user data provided below, generate a structured JSON response containing a poetic and thoughtful daily astrological reflection, grounding tip, uplifting mantra, and other insights for today.

⚡ IMPORTANT: Wherever you mention the user's zodiac sign, sun sign, moon sign, rising sign or personality traits in the reflection, explicitly reference the exact name provided in the input, e.g., "Your Sun Sign is Aries", "The Moon Sign Capricorn brings...". Do NOT infer or calculate any new signs or data – use exactly the values provided.

⚡ Remember: The 'Date of Birth' and 'Time of Birth' (if provided) are in LOCAL TIME of the Birth Location.

User Astrological Data:
${birthDetails}

${
  data.timeOfBirth
    ? 'With the exact birth time available, highlight planetary positions influencing the user today.'
    : 'Without the birth time, focus on the general sun transit, moon phases, and planetary movements today in a nurturing and general way.'

}

Respond strictly in **JSON format** with these keys:
- title: A poetic, uplifting title summarizing today’s cosmic insight.
- reflection: A gentle reflection offering astrological guidance that clearly mentions any of the provided signs or traits by name (e.g., "As your Moon Sign Capricorn suggests...").
- groundingTip: A calming, practical tip to stay centered today.
- mantra: A concise, powerful phrase aligned with today’s energy.
- todayEnergy: A 1–2 sentence summary of the day’s cosmic atmosphere.
- emotionalTheme: A short phrase describing the dominant emotional theme today.
- suggestedFocus: A short phrase suggesting where the user should focus energy today.
`;

  const chatCompletion = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.5,
    max_tokens: 600,
    messages: [
      { role: "system", content: "You are a professional Western astrologer providing structured reflections in valid JSON format, strictly based only on provided user data." },
      { role: "user", content: prompt },
    ],
  });

  const message = chatCompletion.choices[0].message?.content;
  if (!message) throw new Error("No content returned from GPT");

  const cleanedMessage = message.trim().replace(/^```json\s*/, '').replace(/```$/, '').trim();

return JSON.parse(cleanedMessage);
};
