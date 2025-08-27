import { openai } from "src/config/openAi";

interface AstroData {
  zodiacSign: string;
  personalityKeywords: string[];
  birthStar: string;
  sunSign: string;
}

interface PartnerDetails {
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  timeOfBirth: string;
  birthPlace: string;
}

export const getCompatibilityAnalysisFromGPT = async ({
  you,
  partner,
  partnerInfo,
  relationshipType,
}: {
  you: AstroData;
  partner: AstroData;
  partnerInfo: PartnerDetails;
  relationshipType: string;
}) => {
  const prompt = `
You are a highly skilled Vedic astrologer. Based on the following astrological profiles, generate a compatibility analysis **specifically for a ${relationshipType.toUpperCase()} relationship**.

Your Astrological Data:
- Sun Sign: ${you.sunSign}
- Moon Sign: ${you.zodiacSign}
- Birth Star: ${you.birthStar}
- Personality Keywords: ${you.personalityKeywords.join(", ")}

Partner Astrological Data:
- Full Name: ${partnerInfo.firstName} ${partnerInfo.lastName}
- Gender: ${partnerInfo.gender}
- Sun Sign: ${partner.sunSign}
- Moon Sign: ${partner.zodiacSign}
- Birth Star: ${partner.birthStar}
- Personality Keywords: ${partner.personalityKeywords.join(", ")}

Relationship Context: ${relationshipType}

Respond strictly in the following JSON format:

{
  "overallCompatibilityLabel": "string (e.g., 'EXTRAORDINARY', 'GOOD', 'AVERAGE', etc.)",
  "description": "short overview of overall compatibility",
  "emotionalAndMentalCompatibility": {
    "title": "Emotional & Mental Compatibility",
    "text": "brief paragraph"
  },
  "emotionalAndMentalCompatibility": {
  "title": "Emotional & Mental Compatibility",
  "text": "brief paragraph"
},
"physicalAndIntimateCompatibility": {
  "title": "Physical & Intimate Compatibility",
  "text": "brief paragraph about physical chemistry, attraction, and intimacy"
},
"spiritualCompatibility": {
  "title": "Spiritual Compatibility",
  "text": "brief paragraph about karmic bonds, shared spiritual growth, and higher purpose alignment"
},
"communicationAndUnderstanding": {
  "title": "Communication & Understanding",
  "text": "brief paragraph about how well they listen, express, and resolve conflicts"
},
"lifestyleAndValuesCompatibility": {
  "title": "Lifestyle & Values Compatibility",
  "text": "brief paragraph about shared habits, goals, values, and long-term vision"
},
  "astrologicalSupport": {
    "you": {
      "zodiacSign": "...",
      "personalityKeywords": [...],
      "birthStar": "...",
      "sunSign": "..."
    },
    "partner": {
      "zodiacSign": "...",
      "personalityKeywords": [...],
      "birthStar": "...",
      "sunSign": "..."
    }
  },
  "compatibilityScore": number (out of 100),
  "summaryHighlights": {
    "strengths": ["..."],
    "challenges": ["..."],
    "advice": ["..."]
  },
  "generatedText": "a poetic or spiritually grounded interpretation of the compatibility"
}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    temperature: 0.5,
    messages: [
      {
        role: "system",
        content: `You are a wise and intuitive AI astrologer. Keep your responses concise and to the point. Provide structured, clear insights in JSON format only.`,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: 1500,
  });

  const content = response.choices[0]?.message?.content || "{}";
  try {
    return JSON.parse(content);
  } catch (err) {
    console.error("Failed to parse GPT response:", content);
    throw new Error("Invalid JSON from OpenAI");
  }
};
