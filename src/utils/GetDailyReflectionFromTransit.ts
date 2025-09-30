import OpenAI from 'openai';
import { getDailyMajorTransits } from "./GetMajorAspects";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

/**
 * Generate transit reflections using OpenAI GPT
 */
const generateReflectionsWithGPT = async (
  majorTransits: any[]
): Promise<TransitReflection[]> => {
  if (!majorTransits || majorTransits.length === 0) {
    return [];
  }

  const transitsDescription = majorTransits.map((t, idx) => 
    `${idx + 1}. ${t.transit_planet} ${t.aspect_type} ${t.natal_planet} (Score: ${t.significanceScore.toFixed(1)}, Intensity: ${getIntensityFromScore(t)})`
  ).join('\n');

  const prompt = `You are an expert Western astrologer. Generate personalized, meaningful daily reflections for these ${majorTransits.length} major transit aspects:

${transitsDescription}

For EACH transit aspect, provide:
1. A single cohesive reflection (3-4 sentences): Deep, insightful guidance on what this transit means for the person's day. Be specific about the energies at play, their practical implications, and emotional wisdom.
2. A key action (1 sentence): A specific, practical action the person can take today to work harmoniously with this transit energy. The action should directly relate to and support the guidance given in the reflection.

Guidelines:
- Write in second person ("you", "your")
- Be warm, empathetic, and encouraging
- Focus on practical application and emotional wisdom
- Avoid fear-based language; frame challenges as growth opportunities
- Make each reflection unique and specific to the transit combination
- Consider the nature of both planets and the aspect type
- Use poetic, inspiring language while remaining grounded
- Key actions should be concrete, doable, and directly connected to the reflection's theme

Return ONLY a valid JSON array with this exact structure:
[
  {
    "transit": "Transit Planet Aspect Type Natal Planet",
    "reflection": "single cohesive reflection here (3-4 sentences)",
    "keyAction": "specific action that supports the reflection"
  }
]

Do not include any markdown formatting, explanations, or text outside the JSON array.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert Western astrologer who creates meaningful, personalized daily reflections. You return only valid JSON arrays with no additional text or formatting."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0].message.content?.trim() || '[]';
    
    // Remove markdown code blocks if present
    let cleanedResponse = responseText;
    if (responseText.startsWith('```')) {
      cleanedResponse = responseText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '').trim();
    }
    
    const generatedReflections = JSON.parse(cleanedResponse);

    // Merge with transit data
    const enrichedReflections: TransitReflection[] = majorTransits.map((transit, idx) => {
      const generated = generatedReflections[idx] || {
        transit: `${transit.transit_planet} ${transit.aspect_type} ${transit.natal_planet}`,
        reflection: "The cosmos invites you to pay attention to this transit's energy. Today's planetary alignment brings significant themes into focus, asking you to remain aware and responsive. Trust that this moment holds valuable lessons and opportunities for growth as the celestial dance unfolds.",
        keyAction: "Take a moment to journal about how you're feeling and what themes are showing up in your life today."
      };

      return {
        ...generated,
        intensity: getIntensityFromScore(transit),
        score: transit.significanceScore,
        transit_planet: transit.transit_planet,
        natal_planet: transit.natal_planet,
        aspect_type: transit.aspect_type,
        start_time: transit.start_time,
        exact_time: transit.exact_time,
        end_time: transit.end_time
      };
    });

    return enrichedReflections;

  } catch (error) {
    console.error("Error generating reflections with GPT:", error);
    
    // Fallback to basic reflections if GPT fails
    return majorTransits.map(transit => ({
      transit: `${transit.transit_planet} ${transit.aspect_type} ${transit.natal_planet}`,
      reflection: `Today, ${transit.transit_planet} forms a ${transit.aspect_type.toLowerCase()} with your natal ${transit.natal_planet}, creating a significant moment to pay attention to these planetary energies in your life. This aspect brings ${getIntensityFromScore(transit)} energy that invites you to work consciously with its themes. The cosmic timing asks you to be present and responsive to how these planetary forces are manifesting in your daily experience.`,
      keyAction: `Take time today to notice how ${transit.transit_planet} and ${transit.natal_planet} themes show up in your life, and journal about any insights that arise.`,
      intensity: getIntensityFromScore(transit),
      score: transit.significanceScore,
      transit_planet: transit.transit_planet,
      natal_planet: transit.natal_planet,
      aspect_type: transit.aspect_type,
      start_time: transit.start_time,
      exact_time: transit.exact_time,
      end_time: transit.end_time
    }));
  }
};

/**
 * Helper function to determine intensity from transit data
 */
const getIntensityFromScore = (transit: any): string => {
  const aspectIntensities: Record<string, string> = {
    'Conjunction': 'very high',
    'Opposition': 'high',
    'Square': 'high',
    'Trine': 'harmonious',
    'Sextile': 'moderate'
  };

  return aspectIntensities[transit.aspect_type] || 'moderate';
};
/**
 * Main function to get transit reflections with GPT generation
 */
export const getAndSaveTransitReflections = async (userInfo: any): Promise<{
  transitReflections: TransitReflection[];
  majorTransits: any[];
}> => {
  try {
    
    // Step 1: Get top 3 major transits
    const majorTransits = await getDailyMajorTransits({
      day: userInfo?.dataToSave?.day,
      month: userInfo?.dataToSave?.month,
      year: userInfo?.dataToSave?.year,
      hour: userInfo?.dataToSave?.hour || 0,
      min: userInfo?.dataToSave?.min || 0,
      lat: userInfo?.dataToSave?.lat,
      lon: userInfo?.dataToSave?.lon,
      timezone: userInfo?.dataToSave?.timezone,
    }, {
      maxCount: 3,
      includeLuminaries: true,
      includePersonalPlanets: true,
      includeSocialPlanets: true,
      includeOuterPlanets: true,
      includeNodes: true,
      includeAngles: true,
    });

    
    if (majorTransits.length === 0) {
      return {
        transitReflections: [],
        majorTransits: []
      };
    }

    // Step 2: Generate reflections using GPT
    const transitReflections = await generateReflectionsWithGPT(majorTransits);

   
    return {
      transitReflections,
      majorTransits
    };

  } catch (error) {
    console.error("Error in getAndSaveTransitReflections:", error);
    return {
      transitReflections: [],
      majorTransits: []
    };
  }
};
/**
 * Alternative: Get reflections with more detailed user context
 */
export const getTransitReflectionsWithContext = async (
  userInfo: any,
  userData?: {
    name?: string;
    sunSign?: string;
    moonSign?: string;
    risingSign?: string;
  }
): Promise<{
  transitReflections: TransitReflection[];
  majorTransits: any[];
}> => {
  try {
    const majorTransits = await getDailyMajorTransits({
      day: userInfo?.dataToSave?.day,
      month: userInfo?.dataToSave?.month,
      year: userInfo?.dataToSave?.year,
      hour: userInfo?.dataToSave?.hour || 0,
      min: userInfo?.dataToSave?.min || 0,
      lat: userInfo?.dataToSave?.lat,
      lon: userInfo?.dataToSave?.lon,
      timezone: userInfo?.dataToSave?.timezone,
    }, {
      maxCount: 3,
      includeLuminaries: true,
      includePersonalPlanets: true,
      includeSocialPlanets: true,
      includeOuterPlanets: true,
      includeNodes: true,
      includeAngles: true,
    });

    if (majorTransits.length === 0) {
      return {
        transitReflections: [],
        majorTransits: []
      };
    }

    // Enhanced prompt with user context
    const transitsDescription = majorTransits.map((t, idx) => 
      `${idx + 1}. ${t.transit_planet} ${t.aspect_type} ${t.natal_planet} (Score: ${t.significanceScore.toFixed(1)})`
    ).join('\n');

    const userContext = userData ? `
User Context:
- Sun Sign: ${userData.sunSign || 'Unknown'}
- Moon Sign: ${userData.moonSign || 'Unknown'}
- Rising Sign: ${userData.risingSign || 'Unknown'}
` : '';

    const prompt = `You are an expert Western astrologer. Generate personalized daily reflections for these transits:

${transitsDescription}

${userContext}

For EACH transit, provide:
1. Main reflection (2-3 sentences): Deep guidance on what this means
2. Short reflection (1 sentence): Concise insight or affirmation
3. Wisdom reflection (1 sentence): Spiritual/philosophical perspective
4. Key action (1 sentence): Specific action to take today

Return ONLY a valid JSON array with this structure:
[
  {
    "transit": "Transit Planet Aspect Type Natal Planet",
    "reflection1": "main reflection",
    "reflection2": "short reflection",
    "reflection3": "wisdom reflection",
    "keyAction": "specific action"
  }
]`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert Western astrologer. Return only valid JSON arrays."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 2000,
    });

    const responseText = completion.choices[0].message.content?.trim() || '[]';
    let cleanedResponse = responseText;
    if (responseText.startsWith('```')) {
      cleanedResponse = responseText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '').trim();
    }
    
    const generatedReflections = JSON.parse(cleanedResponse);

    const enrichedReflections: TransitReflection[] = majorTransits.map((transit, idx) => {
      const generated = generatedReflections[idx] || {
        transit: `${transit.transit_planet} ${transit.aspect_type} ${transit.natal_planet}`,
        reflection1: "Pay attention to today's cosmic energies.",
        reflection2: "Stay present and aware.",
        reflection3: "Trust the journey.",
        keyAction: "Take a mindful pause to check in with yourself."
      };

      return {
        ...generated,
        intensity: getIntensityFromScore(transit),
        score: transit.significanceScore,
        transit_planet: transit.transit_planet,
        natal_planet: transit.natal_planet,
        aspect_type: transit.aspect_type,
        start_time: transit.start_time,
        exact_time: transit.exact_time,
        end_time: transit.end_time
      };
    });

    return {
      transitReflections: enrichedReflections,
      majorTransits
    };

  } catch (error) {
    console.error("Error getting reflections with context:", error);
    return {
      transitReflections: [],
      majorTransits: []
    };
  }
};

export { TransitReflection };