import { WeatherData } from "../types";

const COORDINATES: Record<string, { lat: number; lon: number }> = {
  'Tambacounda': { lat: 13.77, lon: -13.67 },
  'Kaffrine': { lat: 14.10, lon: -15.55 }
};

export const getWeatherData = async (location: string): Promise<WeatherData> => {
  const coords = COORDINATES[location] || COORDINATES['Tambacounda'];
  
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`
    );
    
    if (!response.ok) throw new Error('Weather fetch failed');
    
    const data = await response.json();
    const current = data.current;
    const daily = data.daily;

    // Convert WMO Weather Interpretation Codes
    const getCondition = (code: number) => {
      if (code === 0) return 'Dégagé';
      if (code <= 3) return 'Partiellement nuageux';
      if (code <= 69) return 'Pluie';
      if (code <= 79) return 'Neige';
      if (code <= 99) return 'Orageux';
      return 'Couvert';
    };

    // Process forecast (next 5 days)
    const forecast = daily.time.slice(0, 5).map((time: string, index: number) => ({
      date: time,
      maxTemp: Math.round(daily.temperature_2m_max[index]),
      minTemp: Math.round(daily.temperature_2m_min[index]),
      condition: getCondition(daily.weather_code[index]),
      rainProbability: daily.precipitation_probability_max[index]
    }));

    return {
      temp: Math.round(current.temperature_2m),
      humidity: current.relative_humidity_2m,
      rainfall: current.precipitation,
      windSpeed: Math.round(current.wind_speed_10m),
      condition: getCondition(current.weather_code),
      location: location,
      forecast
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    // Fallback if API fails
    return {
      temp: 35,
      humidity: 50,
      rainfall: 0,
      condition: 'Indisponible',
      location: location,
      forecast: []
    };
  }
};
