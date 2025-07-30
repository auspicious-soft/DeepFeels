import { openai } from "src/config/openAi";


export const generateReflectionWithGPT = async (data: {
  name: string;
  dob: string;
  timeOfBirth: string;
  location: string;
}) => {
  const prompt = `
You are a professional astrologer. Based on the following birth details, generate a personalized daily astrological reflection, a grounding tip, and a mantra that aligns with the user's cosmic energies for today.

User Details:
- Name: ${data.name}
- Date of Birth: ${data.dob}
- Time of Birth: ${data.timeOfBirth}
- Birth Location: ${data.location}

Respond strictly in JSON format with the following keys:
- title: A creative and meaningful title that summarizes the overall message of the day, inspired by the reflection, mantra, and grounding tip (do NOT use the user's name in the title).
- reflection: The personalized daily astrological reflection.
- groundingTip: A tip to stay grounded based on the reflection.
- mantra: A short, powerful mantra that resonates with today's energy.
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
