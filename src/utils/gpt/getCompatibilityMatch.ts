import { openai } from "src/config/openAi";

interface AstroData {
  zodiacSign: string;
  personalityKeywords: string[];
  risingStar: string;
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
You are a compassionate and deeply intuitive Vedic astrologer. Based on the sacred wisdom of the stars, generate a gentle and insightful compatibility analysis for a ${relationshipType.toUpperCase()} relationship.

Speak with warmth, softness, and poetic grace, focusing on the beauty of emotional connection, shared growth, and cosmic harmony.

Your Astrological Data:
- Sun Sign: ${you.sunSign}
- Moon Sign: ${you.zodiacSign}
- Rising Star (Ascendant): ${you.risingStar}
- Personality Keywords: ${you.personalityKeywords.join(", ")}

Partner Astrological Data:
- Full Name: ${partnerInfo.firstName} ${partnerInfo.lastName}
- Gender: ${partnerInfo.gender}
- Sun Sign: ${partner.sunSign}
- Moon Sign: ${partner.zodiacSign}
- Rising Star (Ascendant): ${partner.risingStar}
- Personality Keywords: ${partner.personalityKeywords.join(", ")}

Relationship Context: ${relationshipType}

Respond strictly in the following JSON format with poetic, supportive, and emotionally uplifting language:

{
  "overallCompatibilityLabel": "string (e.g., 'EXTRAORDINARY', 'GOOD', 'AVERAGE', etc.)",
  "description": "A gentle overview of the cosmic connection between the two souls",
  "emotionalAndMentalCompatibility": {
    "title": "Emotional & Mental Compatibility",
    "text": "A thoughtful and tender paragraph about their emotional and intellectual harmony"
  },
  "bondAndConnection": {
  "title": "Bond & Connection",
  "text": "A thoughtful and gentle paragraph about the unique connection, shared experiences, and harmony between the two souls."
},
  "spiritualCompatibility": {
    "title": "Spiritual Compatibility",
    "text": "A reflective paragraph on shared spiritual paths, karmic connections, and mutual growth"
  },
  "communicationAndUnderstanding": {
    "title": "Communication & Understanding",
    "text": "An insightful view of their ability to listen, understand, and nurture dialogue"
  },
  "lifestyleAndValuesCompatibility": {
    "title": "Lifestyle & Values Compatibility",
    "text": "A harmonious reflection of shared values, habits, and long-term aspirations"
  },
  "astrologicalSupport": {
    "you": {
      "zodiacSign": "${you.zodiacSign}",
      "personalityKeywords": ${JSON.stringify(you.personalityKeywords)},
      "risingStar": "${you.risingStar}",
      "sunSign": "${you.sunSign}"
    },
    "partner": {
      "zodiacSign": "${partner.zodiacSign}",
      "personalityKeywords": ${JSON.stringify(partner.personalityKeywords)},
      "risingStar": "${partner.risingStar}",
      "sunSign": "${partner.sunSign}"
    }
  },
  "compatibilityScore": number (out of 100),
  "summaryHighlights": {
    "strengths": ["string, poetic and gentle"],
    "challenges": ["string, constructive and soft"],
    "advice": ["string, nurturing and encouraging"]
  },
  "generatedText": "a warm, poetic, and spiritually grounded interpretation of their compatibility, filled with hope and guidance"
}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4",
    temperature: 0.8,  // Higher for more creative & expressive responses
    messages: [
      {
        role: "system",
        content: `
You are a wise, empathetic AI astrologer who crafts gentle, poetic, and emotionally supportive insights.
Avoid technical jargon or overly rigid phrasing. Use soft, uplifting, and graceful language.
Your goal is to help users feel seen, supported, and encouraged as they explore their relationship from a cosmic perspective.
Respond only in the requested JSON format.
Focus on Rising Star as the Ascendant sign, which represents the persona and how one presents to the world.
        `,
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