import { openai } from "src/config/openAi";

interface TransitReflection {
 transit: string;
  reflection: string;
  keyAction: string;
  intensity: string;
  score: number;
  transit_planet: string;
  natal_planet: string;
  aspect_type: string;
  start_time: string;
  exact_time?: string;
  end_time?: string;
}

interface MoonPhaseData {
  considered_date?: string;
  moon_phase?: string;
  significance?: string;
  report?: string;
  [key: string]: any;
}

export const generateReflectionWithGPT = async (
  data: {
    name: string;
    dob: string;
    timeOfBirth?: string;
    location: string;
    zodiacSign?: string;
    sunSign?: string;
    moonSign?: string;
    risingSign?: string;
    personalityKeywords?: string[];
  },
  transitReflections?: TransitReflection[],
  moonPhaseData?: MoonPhaseData
) => {
  let birthDetails = `- Name: ${data.name}\n- Date of Birth: ${data.dob}\n- Birth Location: ${data.location}`;

  if (data.timeOfBirth) {
    birthDetails += `\n- Time of Birth: ${data.timeOfBirth}`;
  }

  if (data.zodiacSign) {
    birthDetails += `\n- Zodiac Sign (Moon Sign): ${data.zodiacSign}`;
  }
  if (data.sunSign) {
    birthDetails += `\n- Sun Sign: ${data.sunSign}`;
  }
  if (data.moonSign) {
    birthDetails += `\n- Moon Sign: ${data.moonSign}`;
  }
  if (data.risingSign) {
    birthDetails += `\n- Rising Sign (Ascendant): ${data.risingSign}`;
  }
  if (data.personalityKeywords && data.personalityKeywords.length > 0) {
    birthDetails += `\n- Personality Keywords: ${data.personalityKeywords.join(", ")}`;
  }

  // Build transit context section
  let transitContext = "";
  if (transitReflections && transitReflections.length > 0) {
    transitContext = `\n\n📍 TODAY'S MAJOR TRANSIT ASPECTS (Use these as the foundation for your reflection):\n`;
    
    transitReflections.forEach((transit, idx) => {
      transitContext += `\n${idx + 1}. ${transit.transit} (${transit.intensity} intensity, Score: ${transit.score.toFixed(1)})
   - Main Theme: ${transit.reflection}
   - Suggested Action: ${transit.keyAction}\n`;
    });

    transitContext += `\n⚡ IMPORTANT: Base your reflection primarily on these ${transitReflections.length} major transits happening today. Weave their themes and energies into the daily guidance.`;
  }

  // Build moon phase context
  let moonContext = "";
  if (moonPhaseData && moonPhaseData.moon_phase) {
    moonContext = `\n\n🌙 CURRENT MOON PHASE:\n- Phase: ${moonPhaseData.moon_phase}`;
    
    if (moonPhaseData.significance) {
      moonContext += `\n- Cosmic Significance: ${moonPhaseData.significance}`;
    }
    
    if (moonPhaseData.report) {
      // Clean the report text (remove any $1651 type artifacts)
      const cleanedReport = moonPhaseData.report.replace(/\$\d+/g, '').trim();
      moonContext += `\n- Guidance: ${cleanedReport}`;
    }
    
    moonContext += `\n\n⚡ Weave the moon phase energy and its guidance naturally into your reflection. The moon phase provides the emotional backdrop for today's transits.`;
  }

  const prompt = `
You are a compassionate and professional Western astrologer creating a personalized daily reflection.

User Astrological Data:
${birthDetails}
${transitContext}
${moonContext}

${
  data.timeOfBirth
    ? 'With the exact birth time available, you have precise transit information above. Focus deeply on those specific planetary aspects.'
    : 'Without the birth time, focus on the transits provided and general cosmic energies in a nurturing way.'
}

⚡ CRITICAL INSTRUCTIONS:
1. **Base your entire reflection on the major transits provided above** - they are the most important astrological events for this person today
2. **Integrate the Moon Phase guidance** - it provides the emotional and energetic backdrop for the day
3. Wherever you mention zodiac signs, use the EXACT names provided (e.g., "Your Sun Sign Aries", "Your Moon Sign Capricorn")
4. Do NOT calculate or infer new astrological data - only use what's provided
5. Weave the transit themes and moon phase energy naturally into your reflection without explicitly listing them
6. Make it personal, warm, and actionable
7. Focus on growth opportunities, not fear-based predictions
8. The moon phase report provides specific guidance - honor it in your reflection

Respond strictly in **JSON format** with these keys:

- **title**: A poetic, uplifting title that captures today's primary transit energy (reference the most significant transit subtly)

- **reflection**: A 3-4 paragraph reflection that:
  * Opens with the day's dominant cosmic theme (weaving in the moon phase if significant)
  * Integrates all major transits naturally without listing them
  * Honors the moon phase guidance provided in the report
  * References the user's signs by exact name when relevant
  * Offers practical wisdom and emotional guidance
  * Ends with encouragement aligned with both transit and moon phase energies

- **groundingTip**: A calming, practical tip directly related to today's transit challenges (if any)

- **mantra**: A powerful affirmation aligned with today's strongest transit energy

- **todayEnergy**: 1-2 sentences summarizing the cosmic atmosphere based on the transits

- **emotionalTheme**: A short phrase (3-5 words) describing the dominant emotional theme from the transits

- **suggestedFocus**: A short phrase (3-5 words) suggesting where to direct energy today based on the transits

- **keyTransits**: A brief summary (1-2 sentences) of what planetary aspects are most active today and how they relate to the moon phase

Example structure (DO NOT COPY - create original content based on actual transits and moon phase):
{
  "title": "Reflection and Inner Power",
  "reflection": "Under the Balsamic Moon, a time for rest and reflection, today's Mars-Pluto square asks you to...",
  "groundingTip": "As the Balsamic Moon encourages rest, when intensity rises...",
  "mantra": "I honor both action and reflection in perfect balance",
  "todayEnergy": "Reflective and transformative with undertones of...",
  "emotionalTheme": "Deep introspection",
  "suggestedFocus": "Inner reflection",
  "keyTransits": "Mars-Pluto square dominates, while the Balsamic Moon calls for rest and inner work"
}
`;

  const chatCompletion = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.7, // Slightly higher for more creative, personalized content
    max_tokens: 1200, // Increased for richer content
    messages: [
      { 
        role: "system", 
        content: "You are a professional Western astrologer providing deeply personalized daily reflections in valid JSON format. You expertly weave specific transit energies into cohesive, meaningful guidance without being formulaic." 
      },
      { role: "user", content: prompt },
    ],
  });

  const message = chatCompletion.choices[0].message?.content;
  if (!message) throw new Error("No content returned from GPT");

  const cleanedMessage = message
    .trim()
    .replace(/^```json\s*/, '')
    .replace(/```$/, '')
    .trim();

  return JSON.parse(cleanedMessage);
};

// Type export for use in other files
export type ReflectionOutput = {
  title: string;
  reflection: string;
  groundingTip: string;
  mantra: string;
  todayEnergy: string;
  emotionalTheme: string;
  suggestedFocus: string;
  keyTransits: string;
};