import { openai } from "../config/openAi";

export const getLocationDataFromPlaceOpenAi = async (
  placeOfBirth: any,
  dob: any,
  timeOfBirth?: string
): Promise<{ lat: number; lon: number; timezoneOffset: number }> => {
  const prompt = `
You are a helpful assistant that returns precise location data.
Given the place of birth, date of birth, and optionally time of birth, provide the following information in JSON format ONLY:
- latitude (as a decimal number)
- longitude (as a decimal number)
- timezone offset in hours relative to UTC (as a decimal number)

Example input:
Place of Birth: New York, USA
Date of Birth: 1990-01-15
Time of Birth: 14:35

Expected output:
{
  "lat": 40.7128,
  "lon": -74.0060,
  "timezoneOffset": -5
}

Now, process this input:
Place of Birth: ${placeOfBirth}
Date of Birth: ${dob}
Time of Birth: ${timeOfBirth || "Not Provided"}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0,
    messages: [
      { role: "system", content: "You are a location data expert that returns only valid JSON." },
      { role: "user", content: prompt },
    ],
    max_tokens: 300,
  });

  const responseText = completion.choices[0].message?.content?.trim() || "";

  try {
    // Extract JSON object block from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("No JSON object found in OpenAI response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      lat: parsed.lat,
      lon: parsed.lon,
      timezoneOffset: parsed.timezoneOffset,
    };
  } catch (error : any) {
    throw new Error(`Failed to parse location data: ${error.message}\nResponse was:\n${responseText}`);
  }
};
