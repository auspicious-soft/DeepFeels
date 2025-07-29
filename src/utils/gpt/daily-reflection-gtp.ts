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
- title
- reflection
- groundingTip
- mantra
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
