import { getLocationDataFromPlace } from "src/middleware/getLatLngFromPlace";
import { getAstroDataFromAPI } from "./gpt/generateAstroData";
import { generatePersonalityKeywords } from "./updateUserWthAstroData";

// Helper function to generate astro data from API (matching userMoreInfo logic exactly)
export const generateAstroDataFromAPI = async ({ dob, timeOfBirth, birthPlace }:{dob: any, timeOfBirth: any, birthPlace: any}) => {
  try {
    // Parse date and time exactly like userMoreInfo
    const [year, month, day] = dob ? dob.split("-").map(Number) : [0, 0, 0];
    const [hour, min] = timeOfBirth 
      ? timeOfBirth.split(":").map(Number) 
      : [0, 0];

    // Get location data from place (matches your exact function signature)
    const locationData = await getLocationDataFromPlace(
      birthPlace, 
      dob, 
      timeOfBirth
    );
    const { lat, lon } = locationData;
    const timezoneOffset = locationData.timezoneOffset;

    // Get astro data from API using your existing function (exact same call as userMoreInfo)
    const astroData = await getAstroDataFromAPI({
      day,
      month,
      year,
      hour,
      min,
      lat,
      lon,
      timezone: timezoneOffset,
    });

    console.log('astroData:', astroData);

    if (!astroData) {
      return null;
    }

    // Process the raw astro data exactly like updateUserWithAstrologyData
    const sunPlanet = astroData.planets?.find((planet: any) => planet.name === 'Sun');
    const sunSign = sunPlanet?.sign || "Unknown";

    const moonPlanet = astroData.planets?.find((planet: any) => planet.name === 'Moon');
    const moonSign = moonPlanet?.sign || "Unknown";

    const ascendantHouse = astroData.houses?.find((house: any) => house.house === 1);
    const ascendantSign = ascendantHouse?.sign || "Unknown";

    const personalityKeywords = generatePersonalityKeywords(astroData);

    return {
      zodiacSign: sunSign,
      personalityKeywords: personalityKeywords || [],
      sunSign: sunSign,
      moonSign: moonSign,
      risingStar: ascendantSign,
      ascendantDegree: astroData.ascendant,
      planetsData: astroData.planets,
      housesData: astroData.houses,
      aspectsData: astroData.aspects
    };
  } catch (error) {
    console.error('Error in generateAstroDataFromAPI:', error);
    return null;
  }
};