import { openai } from "src/config/openAi";


export const generateReflectionWithGPT = async (data: {
  name: string;
  dob: string;
  timeOfBirth: string;
  location: string;
}) => {

   let birthDetails = `- Name: ${data.name}\n- Date of Birth: ${data.dob}\n- Birth Location: ${data.location}`;
  if (data.timeOfBirth) {
    birthDetails += `\n- Time of Birth: ${data.timeOfBirth}`;
  }
  const prompt = `
You are a professional astrologer. Based on the following birth details, generate a personalized daily astrological reflection, a grounding tip, and a mantra that aligns with the user's cosmic energies for today.

User Details:
${birthDetails}

Respond strictly in JSON format with the following keys:
- title: A creative and meaningful title that summarizes the overall message of the day, inspired by the reflection, mantra, and grounding tip (do NOT use the user's name in the title).
- reflection: The personalized daily astrological reflection.
- groundingTip: A tip to stay grounded based on the reflection.
- mantra: A short, powerful mantra that resonates with today's energy.
- todayEnergy: A 1–2 sentence summary of the overall cosmic energy influencing the day.
- emotionalTheme: A **short phrase** or **single sentence** capturing the dominant emotional tone of the day.
- suggestedFocus: A **short phrase** or **single sentence** suggesting what the user should direct their attention or energy toward today.
`;

  const chatCompletion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.85,
  });

  const message = chatCompletion.choices[0].message.content;
  if (!message) throw new Error("No content from GPT");

  return JSON.parse(message);
};
