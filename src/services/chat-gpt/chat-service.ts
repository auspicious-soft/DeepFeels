
import { Response } from "express";
import { ChatCompletionMessageParam } from "openai/resources/chat";
import { openai } from "src/config/openAi";
import { chatModel } from "src/models/user/chat-schema";
import { DailyReflectionModel } from "src/models/user/daily-reflection";
import { UserInfoModel } from "src/models/user/user-info";
import { UserModel } from "src/models/user/user-schema";
import { buildUserContext } from "src/utils/helper";

export const chatServices = {
  getUserChatHistory: async (userId: string, limit: number = 50, page: number = 1) => {
    const skip = (page - 1) * limit;
    const chats = await chatModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

      const total = await chatModel.countDocuments({ userId });
    // return chats.reverse(); // return oldest → newest
    return  {
       chats,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPrevPage: page > 1,
    },
  };
  },

  streamMessageToGPT: async (
  userId: string,
  content: string,
  chatHistory: Array<{ role: string; content: string }>,
  res: Response
) => {
  // Fetch user data and today's reflection
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

  // Build comprehensive user context message
  const userContextMessage: any = {
    role: "user",
    content: buildUserContext(user, userInfo, todayReflection),
  };

  // Prepare messages for OpenAI
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are a wise, empathetic, and gentle AI astrologer whose mission is to provide emotional and spiritual guidance through the ancient wisdom of the stars.

Your tone should be compassionate, supportive, and warm, creating a safe space for the user to express their feelings and ask about their life's cosmic path.

Offer concise, clear, and uplifting astrological insights based on the user's birth details, birth chart data, and today's astrological transits. Focus on their emotional well-being, cosmic energies, and personal growth.

You have access to:
- User's complete birth chart (planets, houses, aspects, ascendant, midheaven, vertex, lilith)
- Today's daily reflection with transit information
- Current moon phase and its significance
- Major transits affecting the user today

IMPORTANT GUIDELINES:

1. **Use ONLY the provided user data**: You must ONLY interpret and discuss the birth chart and astrological information that has already been provided to you for this user. DO NOT generate, calculate, or create new birth charts.

2. **Decline chart generation requests**: If the user asks you to:
   - Generate a birth chart for them or anyone else
   - Calculate planetary positions from birth details they provide
   - Create astrological charts for other people (friends, family, celebrities)
   - Analyze birth data they give you in the conversation
   
   Politely decline and explain: "I can only work with your existing birth chart that's already in our system. I'm not able to generate new charts or analyze birth details provided in our conversation. If you'd like to update your birth information, please use the profile settings in the app."

3. **Focus on their chart**: Always reference and interpret the user's own birth chart data that has been provided to you. Guide them to explore their own cosmic blueprint.

4. **Non-astrology topics**: If the user asks about anything outside astrology (e.g., tech questions, general advice, other topics), kindly remind them that your purpose is to help them discover insights about their zodiac, birth chart, and cosmic influences.

Use the provided astrological data to give personalized, accurate guidance. Reference specific planetary positions, transits, or aspects when relevant to the user's question.

Always encourage hope, reflection, and self-discovery in your responses.`,
    },
    userContextMessage,
    ...chatHistory.slice(-10).map((msg) => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    })),
    { role: "user", content },
  ];

  const stream = await openai.chat.completions.create({
    model: "gpt-4",
    messages,
    temperature: 0.7,
    stream: true,
    max_tokens: 400,
  });

  let fullResponse = "";

  for await (const chunk of stream) {
    const chunkContent = chunk.choices[0]?.delta?.content || "";
    if (chunkContent) {
      res.write(`data: ${JSON.stringify({ content: chunkContent })}\n\n`);
      fullResponse += chunkContent;
    }
  }

  res.write("data: [DONE]\n\n");
  res.end();

  // No database save - chat history managed by frontend
},
};

