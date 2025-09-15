import axios from "axios";

export const getLatLngFromPlace = async (place: any) => {
  try {
    const response = await axios.get("https://nominatim.openstreetmap.org/search", {
      params: {
        q: place,
        format: "json",
        limit: 1,
      },
      headers: {
        "User-Agent": "MyAstroApp/1.0 (support@myastroapp.com)",
      },
    });

    if (response.data.length === 0) {
      throw new Error(`Could not find coordinates for: ${place}`);
    }

    const { lat, lon } = response.data[0];
    return { lat: parseFloat(lat), lon: parseFloat(lon) };
  } catch (error : any) {
    throw new Error(`Geocoding error: ${error.message}`);
  }
};

export const getTimezoneFromCoordinates = async (lat: number, lon: number, timestamp?: number) => {
  try {
    // Use current timestamp if not provided
    const ts = timestamp || Math.floor(Date.now() / 1000);
    
    const response = await axios.get(`http://api.timezonedb.com/v2.1/get-time-zone`, {
      params: {
        key: process.env.TIMEZONE_API_KEY, // You'll need to get a free API key from timezonedb.com
        format: 'json',
        by: 'position',
        lat: lat,
        lng: lon,
        time: ts
      }
    });

    if (response.data.status === 'OK') {
      return {
        timezone: response.data.zoneName, // e.g., "America/Los_Angeles"
        offsetSeconds: response.data.gmtOffset, // offset in seconds
        offsetMinutes: response.data.gmtOffset / 60, // offset in minutes
        offsetHours: response.data.gmtOffset / 3600, // offset in hours
        isDST: response.data.dst === 1
      };
    } else {
      throw new Error(`Timezone API error: ${response.data.message}`);
    }
  } catch (error : any) {
    throw new Error(`Timezone error: ${error.message}`);
  }
};

// Alternative using free service (no API key required but less reliable)
export const getTimezoneFromCoordinatesFree = async (lat: number, lon: number) => {
  try {
    const response = await axios.get(`https://api.sunrise-sunset.org/json`, {
      params: {
        lat: lat,
        lng: lon,
        formatted: 0
      }
    });

    // This API doesn't give timezone directly, so we use a simpler approach
    // Calculate approximate timezone offset based on longitude
    const approximateOffset = Math.round(lon / 15); // rough estimate
    
    return {
      timezone: `UTC${approximateOffset >= 0 ? '+' : ''}${approximateOffset}`,
      offsetSeconds: approximateOffset * 3600,
      offsetMinutes: approximateOffset * 60,
      offsetHours: approximateOffset,
      isDST: false // can't determine DST with this method
    };
  } catch (error) {
    console.error("Free timezone error:", error);
    return {
      timezone: "UTC",
      offsetSeconds: 0,
      offsetMinutes: 0,
      offsetHours: 0,
      isDST: false
    };
  }
};

// Combined function to get both coordinates and timezone
export const getLocationDataFromPlace = async (place: any, birthDate?: string, birthTime?: string) => {
    // Get coordinates
    const { lat, lon } = await getLatLngFromPlace(place);
    
    if (lat === 0 && lon === 0) {
      return { lat, lon, timezone: null, timezoneOffset: 0 };
    }

    // Convert birth date/time to timestamp if provided
    let timestamp;
    if (birthDate && birthTime) {
      const birthDateTime = new Date(`${birthDate}T${birthTime}`);
      timestamp = Math.floor(birthDateTime.getTime() / 1000);
    }

    // Get timezone information
    const timezoneData = await getTimezoneFromCoordinates(lat, lon, timestamp);
    
    return {
      lat,
      lon,
      timezone: timezoneData.timezone,
      timezoneOffset: timezoneData.offsetHours, // in hours for astrology API
      timezoneOffsetMinutes: timezoneData.offsetMinutes, // in minutes for your DB
      isDST: timezoneData.isDST
    };
};

// Usage example for your code:
export const updateUserInfoWithLocation = async (birthPlace: string, dob: string, timeOfBirth?: string) => {
  const locationData = await getLocationDataFromPlace(birthPlace, dob, timeOfBirth);
  
  return {
    lat: locationData.lat,
    lon: locationData.lon,
    timezone: locationData.timezone,
    timezoneOffsetForAPI: locationData.timezoneOffset, // hours for astrology API
    timezoneOffsetForDB: locationData.timezoneOffsetMinutes, // minutes for your database
    isDST: locationData.isDST
  };
};