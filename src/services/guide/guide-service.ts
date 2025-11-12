import { openai } from "src/config/openAi";
import { DailyReflectionModel } from "src/models/user/daily-reflection";
import { UserInfoModel } from "src/models/user/user-info";
import { UserModel } from "src/models/user/user-schema";
import { buildUserContext } from "src/utils/helper";

export const guideService = {
getGuideMessage: async (userId: string, type: string) => {
  // Fetch astrology & user context
  const [user, userInfo, todayReflection] = await Promise.all([
    UserModel.findById(userId).lean(),
    UserInfoModel.findOne({ userId }).lean(),
    DailyReflectionModel.findOne({
      userId,
      date: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999)),
      },
    }).lean(),
  ]);

  if (!user || !userInfo) throw new Error("User or user info not found");

  const userContext = buildUserContext(user, userInfo, todayReflection);

  // Define type-specific prompts
  const prompts: Record<string, string> = {
    breathe: `
Provide a short, calming breathwork exercise for the user.
Use rhythmic timing (e.g., inhale 4s, hold 2s, exhale 6s).
Keep it warm, grounding, and emotionally supportive.
Return a JSON object with two keys: 
"message" (1–2 sentences of guidance) and "actionStep" (one simple instruction).`,

    reflect: `
Give a brief reflection prompt based on their Moon sign.
Encourage emotional awareness and gentle introspection.
Return a JSON object with "message" (the reflective insight) and "actionStep" (a small follow-up action, e.g., “Journal about this feeling”).`,

    align: `
Provide a gentle, astrologically guided message using today's transits.
Include a clear, uplifting action step (e.g., “Realign through beauty — take a mindful walk”).
Return a JSON object with "message" (astrological insight) and "actionStep" (specific, actionable step).`,

    regulate: `
Provide a short, body-based grounding or sensory technique.
Focus on nervous system calm (e.g., hand on heart, deep breathing).
Return a JSON object with "message" (calming description) and "actionStep" (a single instruction to follow).`,
  };

  const systemPrompt = `
You are a compassionate AI astrologer and emotional guide.
Respond ONLY in valid JSON format.
just make sure tone and language feel gentle and emotionally supportive rather than predictive.
Each response must contain:
- "message": main text (1–3 short sentences)
- "actionStep": 1 clear, practical action
Do not include explanations or extra text outside JSON.
`;

  // Send prompt to OpenAI
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    temperature: 0.7,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `User context:\n${userContext}` },
      { role: "user", content: prompts[type] },
    ],
  });

  // Try to parse AI response as JSON
  let aiResponse: any = {};
  try {
    aiResponse = JSON.parse(completion.choices[0].message?.content || "{}");
  } catch (err) {
    aiResponse = {
      message: completion.choices[0].message?.content || "",
      actionStep: "Take a deep breath and reflect gently.",
    };
  }

  return {
    type,
    message: aiResponse.message?.trim() || "",
    actionStep: aiResponse.actionStep?.trim() || "",
    footer: "For emotional wellness only. Not medical advice.",
  };
},

};
