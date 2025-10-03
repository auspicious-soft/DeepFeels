import axios from 'axios';

// Type definitions for the API response
interface TransitAspect {
  transit_planet: string;
  natal_planet: string;
  aspect_type: string;
  start_time: string;
  exact_time?: string;
  end_time?: string;
  orb?: number;
  is_applying?: boolean;
  is_separating?: boolean;
}

interface NatalTransitResponse {
  transit_relation?: TransitAspect[];
  aspects?: TransitAspect[]; // Keep for backwards compatibility
  transit_date?: string;
  ascendant?: string;
  [key: string]: any;
}

interface FilteredAspect extends TransitAspect {
  significanceScore: number;
  aspectWeight: number;
  planetCombinationWeight: number;
}

interface FilterOptions {
  maxCount?: number;
  includeLuminaries?: boolean;
  includePersonalPlanets?: boolean;
  includeSocialPlanets?: boolean;
  includeOuterPlanets?: boolean;
  includeNodes?: boolean;
  includeAngles?: boolean;
  minSignificanceScore?: number;
  prioritizeApplyingAspects?: boolean;
}

// Major aspects in Western astrology with their significance weights and orbs
const MAJOR_ASPECTS = {
  'Conjunction': { weight: 10, orb: 8, intensity: 'very high' },
  'Opposition': { weight: 9, orb: 8, intensity: 'high' },
  'Square': { weight: 8, orb: 8, intensity: 'high' },
  'Trine': { weight: 8, orb: 8, intensity: 'harmonious' },
  'Sextile': { weight: 6, orb: 6, intensity: 'moderate' }
} as const;

// Planet significance weights (higher = more important in transits)
const PLANET_WEIGHTS = {
  // Luminaries - most significant
  'Sun': 10,
  'Moon': 10,
  
  // Personal planets - very significant
  'Mercury': 7,
  'Venus': 7,
  'Mars': 7,
  
  // Social planets - significant
  'Jupiter': 8,
  'Saturn': 8,
  
  // Outer planets - moderate significance for transits
  'Uranus': 6,
  'Neptune': 6,
  'Pluto': 6,
  
  // Lunar nodes - moderate
  'North Node': 5,
  'South Node': 5,
  
  // Angles - very significant
  'Ascendant': 9,
  'Midheaven': 8,
  'MC': 8,
  'IC': 7,
  'Descendant': 7
} as const;

export const getNatalTransitDaily = async ({
  day,
  month,
  year,
  hour = 0,
  min = 0,
  lat,
  lon,
  timezone,
}: {
  day: number;
  month: number;
  year: number;
  hour?: number;
  min?: number;
  lat: number;
  lon: number;
  timezone: number;
}): Promise<NatalTransitResponse | null> => {
  try {
    const auth = Buffer.from(`${process.env.ASTROLOGY_USER_ID}:${process.env.ASTROLOGY_API_KEY}`).toString("base64");

    const response = await axios.post(
      "https://json.astrologyapi.com/v1/natal_transits/daily",
      { day, month, year, hour, min, lat, lon, tzone: timezone },
      { headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" } }
    );

    return response.data;
  } catch (err: any) {
    console.error("Error fetching astrology data:", err.response?.data || err.message);
    return null;
  }
};
export const getDailyPrediction = async ({
  zodiacSign
}: {
  zodiacSign: string;
}): Promise<NatalTransitResponse | null> => {
  try {
    const auth = Buffer.from(`${process.env.ASTROLOGY_USER_ID}:${process.env.ASTROLOGY_API_KEY}`).toString("base64");

    const response = await axios.post(
      `https://json.astrologyapi.com/v1/sun_sign_prediction/daily/${zodiacSign}`,
      {},
      { headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" } }
    );

    return response.data;
  } catch (err: any) {
    console.error("Error fetching astrology data:", err.response?.data || err.message);
    return null;
  }
};

/**
 * Filters natal transit data for major aspects only and ranks by significance
 */
export const filterMajorTransitAspects = (
  transitData: NatalTransitResponse | null,
  options: FilterOptions = {}
): FilteredAspect[] => {
  if (!transitData) {
    return [];
  }

  // Check for aspects in either transit_relation or aspects array
  const aspectsArray = transitData.transit_relation || transitData.aspects;
  
  if (!Array.isArray(aspectsArray)) {
    return [];
  }

 
  const {
    maxCount = 3,
    includeLuminaries = true,
    includePersonalPlanets = true,
    includeSocialPlanets = true,
    includeOuterPlanets = true,
    includeNodes = false,
    includeAngles = true,
    minSignificanceScore = 0,
    prioritizeApplyingAspects = true
  } = options;

  // Define which planets to include based on options
  const includedPlanets: string[] = [];
  
  if (includeLuminaries) includedPlanets.push('Sun', 'Moon');
  if (includePersonalPlanets) includedPlanets.push('Mercury', 'Venus', 'Mars');
  if (includeSocialPlanets) includedPlanets.push('Jupiter', 'Saturn');
  if (includeOuterPlanets) includedPlanets.push('Uranus', 'Neptune', 'Pluto');
  if (includeNodes) includedPlanets.push('North Node', 'South Node');
  if (includeAngles) includedPlanets.push('Ascendant', 'Midheaven', 'MC', 'IC', 'Descendant');

  // Filter for major aspects involving specified planets
  const majorAspects = aspectsArray.filter(aspect => {
    const isMajorAspect = MAJOR_ASPECTS.hasOwnProperty(aspect.aspect_type as keyof typeof MAJOR_ASPECTS);
    const involvesIncludedPlanet = includedPlanets.includes(aspect.natal_planet) || 
                                  includedPlanets.includes(aspect.transit_planet);
     
    return isMajorAspect && involvesIncludedPlanet;
  });

  
  // Calculate significance scores
  const scoredAspects: FilteredAspect[] = majorAspects.map(aspect => {
    const aspectInfo = MAJOR_ASPECTS[aspect.aspect_type as keyof typeof MAJOR_ASPECTS];
    const aspectWeight = aspectInfo?.weight || 0;
    
    const natalPlanetWeight = PLANET_WEIGHTS[aspect.natal_planet as keyof typeof PLANET_WEIGHTS] || 3;
    const transitPlanetWeight = PLANET_WEIGHTS[aspect.transit_planet as keyof typeof PLANET_WEIGHTS] || 3;
    
    // Calculate planet combination weight
    const planetCombinationWeight = (natalPlanetWeight * 0.6) + (transitPlanetWeight * 0.4);
    
    // Base significance score
    let significanceScore = aspectWeight + planetCombinationWeight;
    
    // Bonus for applying aspects (getting stronger)
    if (prioritizeApplyingAspects && aspect.is_applying) {
      significanceScore += 1;
    }
    
    // Bonus for exact or near-exact aspects
    if (aspect.orb && aspect.orb < 2) {
      significanceScore += 2;
    } else if (aspect.orb && aspect.orb < 5) {
      significanceScore += 1;
    }

    return {
      ...aspect,
      significanceScore,
      aspectWeight,
      planetCombinationWeight
    };
  });

  // Sort by significance score (highest first)
  const sortedAspects = scoredAspects
    .filter(aspect => aspect.significanceScore >= minSignificanceScore)
    .sort((a, b) => b.significanceScore - a.significanceScore);

  // Return top aspects based on maxCount
  return sortedAspects.slice(0, maxCount);
};

/**
 * Get daily major transit aspects with filtering
 */
export const getDailyMajorTransits = async (
  coordinates: {
    day: number;
    month: number;
    year: number;
    hour?: number;
    min?: number;
    lat: number;
    lon: number;
    timezone: number;
  },
  filterOptions?: FilterOptions
): Promise<FilteredAspect[]> => {
  const transitData = await getNatalTransitDaily(coordinates);
  return filterMajorTransitAspects(transitData, filterOptions);
};

/**
 * Utility function to get aspect interpretation
 */
export const getAspectInterpretation = (aspect: FilteredAspect): string => {
  const aspectInfo = MAJOR_ASPECTS[aspect.aspect_type as keyof typeof MAJOR_ASPECTS];
  const intensity = aspectInfo?.intensity || 'moderate';
  
  return `${aspect.transit_planet} ${aspect.aspect_type} ${aspect.natal_planet} - ${intensity} intensity (Score: ${aspect.significanceScore.toFixed(1)})`;
};

/**
 * Helper function to format aspects for display
 */
export const formatTransitAspects = (aspects: FilteredAspect[]): Array<{
  description: string;
  intensity: string;
  score: number;
  timing: {
    start: string;
    exact?: string;
    end?: string;
  };
  isApplying: boolean;
  orb?: number;
}> => {
  return aspects.map(aspect => {
    const aspectInfo = MAJOR_ASPECTS[aspect.aspect_type as keyof typeof MAJOR_ASPECTS];
    
    return {
      description: `${aspect.transit_planet} ${aspect.aspect_type} ${aspect.natal_planet}`,
      intensity: aspectInfo?.intensity || 'moderate',
      score: Math.round(aspect.significanceScore * 10) / 10,
      timing: {
        start: aspect.start_time,
        exact: aspect.exact_time,
        end: aspect.end_time
      },
      isApplying: aspect.is_applying || false,
      orb: aspect.orb
    };
  });
};

// Example usage:
/*
const dailyTransits = await getDailyMajorTransits({
  day: 9,
  month: 7,
  year: 2025,
  lat: 30.7333,
  lon: 76.7794,
  timezone: 5.5
}, {
  maxCount: 3,
  includeLuminaries: true,
  includePersonalPlanets: true,
  prioritizeApplyingAspects: true
});

const formattedAspects = formatTransitAspects(dailyTransits);
*/