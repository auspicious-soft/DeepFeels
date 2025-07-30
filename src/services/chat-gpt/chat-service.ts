
import { ChatCompletionMessageParam } from "openai/resources/chat";
import { openai } from "src/config/openAi";
import { chatModel } from "src/models/user/chat-schema";
import { UserInfoModel } from "src/models/user/user-info";
import { UserModel } from "src/models/user/user-schema";

export const chatServices = {
  getUserChatHistory: async (userId: string, limit: number = 50) => {
    const chats = await chatModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return chats.reverse(); // return oldest → newest
  },

  streamMessageToGPT: async (userId: string, content: string, res: Response) => {
    // Save user message
   // Fetch user + birth info
  const [user, userInfo] = await Promise.all([
    UserModel.findById(userId).lean(),
    UserInfoModel.findOne({ userId }).lean(),
  ]);

  if (!user || !userInfo) throw new Error("User or user info not found");

  const userDetailsMessage = {
    role: "user",
    content: `User Details for astrological insight:
- Full Name: ${user.fullName}
- Date of Birth: ${userInfo.dob?.toISOString().split("T")[0]}
- Time of Birth: ${userInfo.timeOfBirth}
- Birth Location: ${userInfo.birthPlace}`,
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
      content: `
You are a wise and intuitive AI astrologer. Keep your responses concise and to the point. Provide short, clear insights based on astrological principles using the user's birth details.

You must only respond to astrology-related questions — such as zodiac signs, birth charts, cosmic energies, or spiritual growth.

If the user asks something unrelated to astrology (e.g., tech, finance, general advice), gently remind them that you're only here to offer astrological guidance.
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
    temperature: 0.5,
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

