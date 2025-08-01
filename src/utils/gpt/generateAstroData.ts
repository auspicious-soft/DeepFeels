import { openai } from "src/config/openAi";

export const getAstroDataFromGPT = async ({ fullName, dob, timeOfBirth, birthPlace, gender }: { fullName: any; dob: any; timeOfBirth: any; birthPlace: any; gender: any; }) => {
  const prompt = `Based on the birth details:
- Full Name: ${fullName}
- Date of Birth: ${dob}
- Time of Birth: ${timeOfBirth}
- Birth Place: ${birthPlace}
- Gender: ${gender}

Give me:
- sunSign
- zodiacSign
- birthStar
- moonSign
- 2-3 personality keywords

Respond in JSON only.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    temperature: 0.5,
    messages: [{ role: "system", content: "You are a professional Vedic astrologer." }, { role: "user", content: prompt }],
  });

  const data = JSON.parse(response.choices[0].message.content || "{}");
  return data;
};
