// lib/weather.ts

export async function getLiveWeather(
  lat: number,
  lng: number
): Promise<{
  temperature: number;
  precipitation: number;
  precipitationProbability: number;
  windSpeed: number;
  cloudCover: number;
} | undefined> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,precipitation,wind_speed_10m,cloud_cover&hourly=precipitation_probability`;

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) return undefined;

    const json = await res.json();

    const current = json.current;
    const hourly = json.hourly;

    return {
      temperature: current?.temperature_2m ?? 0,
      precipitation: current?.precipitation ?? 0,
      windSpeed: current?.wind_speed_10m ?? 0,
      cloudCover: current?.cloud_cover ?? 0,
      precipitationProbability:
        hourly?.precipitation_probability?.[0] ?? 0
    };
  } catch {
    return undefined;
  }
}

export function advancedWeatherScore(
  indoor: boolean,
  live?: {
    temperature: number;
    precipitation: number;
    precipitationProbability: number;
    windSpeed: number;
    cloudCover: number;
  }
) {
  if (!live) return 0.7;

  let score = 1;

  if (live.precipitation > 2 || live.precipitationProbability > 70) {
    if (!indoor) score -= 0.5;
  }

  if (live.windSpeed > 40) {
    score -= indoor ? 0.05 : 0.3;
  }

  if (live.temperature > 34) {
    score -= indoor ? 0 : 0.25;
  }

  if (live.temperature < 8) {
    score -= indoor ? 0 : 0.2;
  }

  if (live.cloudCover > 85) {
    score -= indoor ? 0 : 0.15;
  }

  return Math.max(0, Math.min(1, score));
}