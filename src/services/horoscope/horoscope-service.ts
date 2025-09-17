import { HoroscopeModel } from "src/models/horoscope/horoscope-schema";
import { UserModel } from "src/models/user/user-schema";
import { getAstroDataFromAPI } from "src/utils/gpt/generateAstroData";
import { getLocationDataFromPlaceOpenAi } from "src/utils/location";
import { generatePersonalityKeywords } from "src/utils/updateUserWthAstroData";

export const generateAndSaveHoroscope = async (payload: any) => {
  const { name, dob, timeOfBirth, placeOfBirth, gender, userData } = payload;

  const user = await UserModel.findOne({ _id: userData.id, isVerifiedEmail: true });
  if (!user) throw new Error("User not found");

  // Check if horoscope already exists for same user + birth details
  const existingHoroscope = await HoroscopeModel.findOne({
    userId: user._id,
    dob,
    timeOfBirth,
    placeOfBirth,
    gender,
  }).lean();

  if (existingHoroscope) {
    return existingHoroscope; // Return existing data without re-generating
  }

  const [year, month, day] = dob.split("-").map(Number);
  const [hour, min] = timeOfBirth ? timeOfBirth.split(":").map(Number) : [0, 0];

  const locationData = await getLocationDataFromPlaceOpenAi(placeOfBirth, dob, timeOfBirth);
  const { lat, lon, timezoneOffset } = locationData;

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

  if (!astroData) throw new Error("Failed to fetch astrology data");

  const sunPlanet = astroData.planets?.find((planet: any) => planet.name === "Sun");
  const moonPlanet = astroData.planets?.find((planet: any) => planet.name === "Moon");
  const ascendantHouse = astroData.houses?.find((house: any) => house.house === 1);

  const sunSign = sunPlanet?.sign || "Unknown";
  const moonSign = moonPlanet?.sign || "Unknown";
  const ascendantSign = ascendantHouse?.sign || "Unknown";

  const personalityKeywords = generatePersonalityKeywords(astroData);

  const horoscopeDoc = await HoroscopeModel.create({
    userId: user._id,
    zodiacSign: sunSign,
    sunSign,
    moonSign,
    risingStar: ascendantSign,
    lilith: astroData.lilith || null,
    ascendantDegree: astroData.ascendant || null,
    midheavenDegree: astroData.midheaven || null,
    vertex: astroData.vertex || null,
    planetsData: astroData.planets || null,
    housesData: astroData.houses || null,
    aspectsData: astroData.aspects || null,
    personalityKeywords: personalityKeywords || [],
    name,
    dob,
    timeOfBirth,
    placeOfBirth,
    gender,
  });

  return horoscopeDoc.toObject();
};