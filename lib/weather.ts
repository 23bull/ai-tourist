export type LiveWeather = {
    temperature: number;
    precipitation: number; // mm
    precipitationProbability: number; // %
    windSpeed: number; // km/h
    cloudCover: number; // %
  };
  
  export async function getLiveWeather(
    lat: number,
    lng: number
  ): Promise<LiveWeather | null> {
    try {
      const url =
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}` +
        `&longitude=${lng}` +
        `&current=temperature_2m,precipitation,precipitation_probability,cloudcover,windspeed_10m`;
  
      const res = await fetch(url, {
        next: { revalidate: 600 } // cache 10 min
      });
  
      const data = await res.json();
  
      const c = data.current;
  
      return {
        temperature: c.temperature_2m,
        precipitation: c.precipitation,
        precipitationProbability: c.precipitation_probability,
        windSpeed: c.windspeed_10m,
        cloudCover: c.cloudcover
      };
    } catch {
      return null;
    }
  }