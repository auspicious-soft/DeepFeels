import { UserInfoModel } from "src/models/user/user-info";

export const generatePersonalityKeywords = (astroData: any): string[] => {
  if (!astroData || !astroData.planets) {
    return ["Unknown", "Unknown", "Unknown"];
  }

  const keywords: string[] = [];
  const planets = astroData.planets;
  const aspects = astroData.aspects || [];

  // Find key planets
  const sun = planets.find((p: any) => p.name === 'Sun');
  const moon = planets.find((p: any) => p.name === 'Moon');
  const mercury = planets.find((p: any) => p.name === 'Mercury');
  const venus = planets.find((p: any) => p.name === 'Venus');
  const mars = planets.find((p: any) => p.name === 'Mars');
  const jupiter = planets.find((p: any) => p.name === 'Jupiter');

  // Sun sign personality traits
  if (sun) {
    const sunTraits = getSunSignTraits(sun.sign);
    keywords.push(sunTraits[0]);
  }

  // Moon sign emotional traits
  if (moon) {
    const moonTraits = getMoonSignTraits(moon.sign);
    keywords.push(moonTraits[0]);
  }

  // Mercury communication traits
  if (mercury) {
    const mercuryTraits = getMercurySignTraits(mercury.sign);
    keywords.push(mercuryTraits[0]);
  }

  // Add traits based on strong aspects
  const strongAspects = aspects.filter((aspect: any) => 
    Math.abs(aspect.orb) < 3 && // tight orbs
    ['Conjunction', 'Opposition', 'Trine', 'Square'].includes(aspect.type)
  );

  // Add aspect-based traits
  strongAspects.forEach((aspect: any) => {
    const aspectTrait = getAspectTrait(aspect);
    if (aspectTrait && keywords.length < 5) {
      keywords.push(aspectTrait);
    }
  });

  // Add planetary house position traits
  if (jupiter && keywords.length < 4) {
    const jupiterTrait = getJupiterHouseTrait(jupiter.house);
    keywords.push(jupiterTrait);
  }

  if (mars && keywords.length < 5) {
    const marsTrait = getMarsHouseTrait(mars.house);
    keywords.push(marsTrait);
  }

  // Return top 3 unique keywords
  const uniqueKeywords = [...new Set(keywords)];
  return uniqueKeywords.slice(0, 3).concat(['Intuitive', 'Adaptable', 'Creative'].slice(0, 3 - uniqueKeywords.length));
};

const getSunSignTraits = (sign: string): string[] => {
  const traits: { [key: string]: string[] } = {
    'Aries': ['Dynamic', 'Leader', 'Pioneering'],
    'Taurus': ['Practical', 'Stable', 'Determined'],
    'Gemini': ['Communicative', 'Versatile', 'Curious'],
    'Cancer': ['Nurturing', 'Intuitive', 'Protective'],
    'Leo': ['Confident', 'Creative', 'Generous'],
    'Virgo': ['Analytical', 'Perfectionist', 'Service-oriented'],
    'Libra': ['Harmonious', 'Diplomatic', 'Aesthetic'],
    'Scorpio': ['Intense', 'Transformative', 'Mysterious'],
    'Sagittarius': ['Philosophical', 'Adventurous', 'Optimistic'],
    'Capricorn': ['Ambitious', 'Disciplined', 'Responsible'],
    'Aquarius': ['Innovative', 'Independent', 'Humanitarian'],
    'Pisces': ['Compassionate', 'Imaginative', 'Spiritual']
  };
  return traits[sign] || ['Unique', 'Complex', 'Individual'];
};

const getMoonSignTraits = (sign: string): string[] => {
  const traits: { [key: string]: string[] } = {
    'Aries': ['Impulsive', 'Quick-tempered', 'Enthusiastic'],
    'Taurus': ['Calm', 'Comfort-seeking', 'Loyal'],
    'Gemini': ['Restless', 'Communicative', 'Changeable'],
    'Cancer': ['Emotional', 'Home-loving', 'Sensitive'],
    'Leo': ['Dramatic', 'Warm-hearted', 'Pride'],
    'Virgo': ['Cautious', 'Helpful', 'Critical'],
    'Libra': ['Peace-loving', 'Social', 'Indecisive'],
    'Scorpio': ['Passionate', 'Secretive', 'Magnetic'],
    'Sagittarius': ['Freedom-loving', 'Honest', 'Restless'],
    'Capricorn': ['Reserved', 'Practical', 'Ambitious'],
    'Aquarius': ['Detached', 'Friendly', 'Eccentric'],
    'Pisces': ['Dreamy', 'Sympathetic', 'Escapist']
  };
  return traits[sign] || ['Emotional', 'Sensitive', 'Reactive'];
};

const getMercurySignTraits = (sign: string): string[] => {
  const traits: { [key: string]: string[] } = {
    'Aries': ['Direct', 'Quick-thinking', 'Impatient'],
    'Taurus': ['Methodical', 'Practical-minded', 'Stubborn'],
    'Gemini': ['Witty', 'Curious', 'Scattered'],
    'Cancer': ['Intuitive-thinking', 'Memory-focused', 'Subjective'],
    'Leo': ['Confident-speaking', 'Creative-thinking', 'Dramatic'],
    'Virgo': ['Analytical', 'Detail-oriented', 'Critical'],
    'Libra': ['Diplomatic', 'Balanced-thinking', 'Indecisive'],
    'Scorpio': ['Probing', 'Secretive', 'Investigative'],
    'Sagittarius': ['Philosophical', 'Broad-minded', 'Blunt'],
    'Capricorn': ['Strategic', 'Practical', 'Cautious'],
    'Aquarius': ['Innovative-thinking', 'Objective', 'Detached'],
    'Pisces': ['Imaginative', 'Intuitive-communication', 'Vague']
  };
  return traits[sign] || ['Thoughtful', 'Communicative', 'Mental'];
};

const getAspectTrait = (aspect: any): string => {
  const aspectTraits: { [key: string]: string[] } = {
    'Conjunction': ['Focused', 'Intense', 'Unified'],
    'Opposition': ['Tension-aware', 'Balancing', 'Conflicted'],
    'Trine': ['Harmonious', 'Natural-talent', 'Easy-flowing'],
    'Square': ['Challenging', 'Growth-oriented', 'Dynamic'],
    'Sextile': ['Opportunistic', 'Cooperative', 'Skilled']
  };
  
  const traits = aspectTraits[aspect.type] || ['Complex'];
  return traits[Math.floor(Math.random() * traits.length)];
};

const getJupiterHouseTrait = (house: number): string => {
  const houseTraits: { [key: number]: string } = {
    1: 'Optimistic',
    2: 'Abundant',
    3: 'Knowledgeable',
    4: 'Family-oriented',
    5: 'Creative',
    6: 'Service-minded',
    7: 'Partnership-focused',
    8: 'Transformative',
    9: 'Philosophical',
    10: 'Successful',
    11: 'Social',
    12: 'Spiritual'
  };
  return houseTraits[house] || 'Expansive';
};

const getMarsHouseTrait = (house: number): string => {
  const houseTraits: { [key: number]: string } = {
    1: 'Energetic',
    2: 'Determined',
    3: 'Competitive',
    4: 'Protective',
    5: 'Passionate',
    6: 'Hard-working',
    7: 'Assertive',
    8: 'Intense',
    9: 'Adventurous',
    10: 'Ambitious', // Mars in 10th house from your data
    11: 'Goal-oriented',
    12: 'Private-strength'
  };
  return houseTraits[house] || 'Driven';
};

// Updated function to use with your astrology data
export const updateUserWithAstrologyData = async (astroData: any, userId: any,timezoneOffset:any,dataToSave:any,planetsData:any) => {
  if (astroData) {
    // Extract Sun sign from the Sun planet data
    const sunPlanet = astroData.planets?.find((planet: any) => planet.name === 'Sun');
    const sunSign = sunPlanet?.sign || "Unknown";

    // Extract Moon sign from the Moon planet data
    const moonPlanet = astroData.planets?.find((planet: any) => planet.name === 'Moon');
    const moonSign = moonPlanet?.sign || "Unknown";

    // Get ascendant sign from houses data (1st house sign)
    const ascendantHouse = planetsData.find((planet: any) => planet.name === "Ascendant");
    const ascendantSign = ascendantHouse?.sign || "Unknown";

    // Generate personality keywords from the astrology data
    const personalityKeywords = generatePersonalityKeywords(astroData);

    // Update UserInfo with astrology data
    await UserInfoModel.updateOne(
      { userId: userId },
      {
        $set: {
          sunSign: sunSign,
          moonSign: moonSign,
          zodiacSign: sunSign,
          // birthStar: "Unknown", // This API doesn't provide nakshatra data
          risingStar: ascendantSign,
          personalityKeywords: personalityKeywords,
          // Store additional detailed data          
          timezoneOffset:timezoneOffset,
          ascendantDegree: astroData.ascendant,
          lilith:astroData.lilith,
          vertex:astroData.vertex,
          midheaven:astroData.midheaven,
          planetsData: astroData.planets,
          housesData: astroData.houses,
          aspectsData: astroData.aspects,
          dataToSave:dataToSave
        },
      }
    );
  }
};