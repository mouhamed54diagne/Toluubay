import { WeatherData } from "../types";

const COORDINATES: Record<string, { lat: number; lon: number }> = {
  'Tambacounda': { lat: 13.77, lon: -13.67 },
  'Kaffrine': { lat: 14.10, lon: -15.55 }
};

export const getWeatherData = async (location: string): Promise<WeatherData> => {
  const coords = COORDINATES[location] || COORDINATES['Tambacounda'];
  
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code&timezone=auto`
    );
    
    if (!response.ok) throw new Error('Weather fetch failed');
    
    const data = await response.json();
    const current = data.current;

    // Convert WMO Weather Interpretation Codes
    const getCondition = (code: number) => {
      if (code === 0) return 'Dégagé';
      if (code <= 3) return 'Partiellement nuageux';
      if (code <= 69) return 'Pluie';
      if (code <= 79) return 'Neige';
      if (code <= 99) return 'Orageux';
      return 'Cloudy';
    };

    return {
      temp: Math.round(current.temperature_2m),
      humidity: current.relative_humidity_2m,
      rainfall: current.precipitation,
      condition: getCondition(current.weather_code),
      location: location
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    // Fallback if API fails
    return {
      temp: 35,
      humidity: 50,
      rainfall: 0,
      condition: 'Indisponible',
      location: location
    };
  }
};
