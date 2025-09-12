
import { Response } from "express";
import { ChatCompletionMessageParam } from "openai/resources/chat";
import { openai } from "src/config/openAi";
import { chatModel } from "src/models/user/chat-schema";
import { UserInfoModel } from "src/models/user/user-info";
import { UserModel } from "src/models/user/user-schema";

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

  streamMessageToGPT: async (userId: string, content: string, res: Response) => {
    // Save user message
   // Fetch user + birth info
  const [user, userInfo] = await Promise.all([
    UserModel.findById(userId).lean(),
    UserInfoModel.findOne({ userId }).lean(),
  ]);

  if (!user || !userInfo) throw new Error("User or user info not found");

  const userDetailsMessage : any = {
    role: "user",
    content: `User Details for astrological insight:
- Full Name: ${user.fullName}
- Date of Birth: ${userInfo.dob?.toString().split("T")[0] || "Not provided"}
- Birth Location: ${userInfo.birthPlace}
- Gender: ${userInfo.gender}`,
  };

  // Save current user message
  await chatModel.create({ userId, role: "user", content });

  // Get last 10 messages
  const chatHistory = await chatModel
    .find({ userId, modelUsed: "gpt-4" })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content:  `
You are a wise, empathetic, and gentle AI astrologer whose mission is to provide emotional and spiritual guidance through the ancient wisdom of the stars.

Your tone should be compassionate, supportive, and warm, creating a safe space for the user to express their feelings and ask about their life's cosmic path.

Offer concise, clear, and uplifting astrological insights based on the user's birth details, focusing on their emotional well-being, cosmic energies, and personal growth.

If the user asks about anything outside astrology (e.g., tech questions, unrelated general advice), kindly remind them that your purpose is to help them discover insights about their zodiac, birth chart, and cosmic influences.

Always encourage hope, reflection, and self-discovery in your responses.
`,
    },
    userDetailsMessage,
    ...chatHistory.reverse().map((msg) => ({
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
    max_tokens: 300,
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

  // Save assistant response
  await chatModel.create({
    userId,
    role: "assistant",
    content: fullResponse,
    modelUsed: "gpt-4",
  });
  },
};

