import { openai } from "src/config/openAi";

export const generateReflectionWithGPT = async (data: {
  name: string;
  dob: string;
  timeOfBirth?: string;
  location: string;
  zodiacSign?: string;
  sunSign?: string;
  moonSign?: string;
  birthStar?: string;
  personalityKeywords?: string[];
}) => {
  let birthDetails = `- Name: ${data.name}\n- Date of Birth: ${data.dob}\n- Birth Location: ${data.location}`;

  if (data.timeOfBirth) {
    birthDetails += `\n- Time of Birth: ${data.timeOfBirth}`;
  }

  if (data.zodiacSign) {
    birthDetails += `\n- Zodiac Sign: ${data.zodiacSign}`;
  }
  if (data.sunSign) {
    birthDetails += `\n- Sun Sign: ${data.sunSign}`;
  }
  if (data.moonSign) {
    birthDetails += `\n- Moon Sign: ${data.moonSign}`;
  }
  if (data.birthStar) {
    birthDetails += `\n- Birth Star (Nakshatra): ${data.birthStar}`;
  }
  if (data.personalityKeywords && data.personalityKeywords.length > 0) {
    birthDetails += `\n- Personality Keywords: ${data.personalityKeywords.join(", ")}`;
  }

  const prompt: string = `
You are a compassionate and insightful astrologer, deeply attuned to the universe's subtle energies. Using the user's complete birth and astrological details below, craft a tender and thoughtful daily astrological reflection, a grounding tip, and a mantra that nurtures their soul, in harmony with the cosmic energies of today.

User Details:
${birthDetails}

${data.timeOfBirth ? 
  'With the precise birth time available, weave a reflection that touches on the unique dance of planets and houses influencing their path today.' : 
  'Without the birth time, gracefully focus on the sun’s current journey, moon phases, and planetary transits to inspire a heartfelt reflection.'}

Respond strictly in **JSON format** with these keys:
- title: A poetic and uplifting title that captures the essence of today’s cosmic message (avoid using the user's name).
- reflection: A gentle and introspective daily astrological reflection, written as if offering warm guidance and insight.
- groundingTip: A soothing tip to help the user stay present, calm, and centered today.
- mantra: A short, powerful, and poetic phrase that harmonizes with today's energy, designed to uplift the spirit.
- todayEnergy: A 1–2 sentence evocative summary of the day’s prevailing cosmic atmosphere.
- emotionalTheme: A short phrase or sentence that softly describes the dominant emotional current flowing through the day.
- suggestedFocus: A short phrase or sentence gently suggesting where the user should channel their energy or attention today.
`;

  const chatCompletion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.4,
  });

  const message = chatCompletion.choices[0].message.content;
  if (!message) throw new Error("No content returned from GPT");

  return JSON.parse(message);
};
