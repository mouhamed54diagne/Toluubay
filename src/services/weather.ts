import { WeatherData } from "../types";

export const getWeatherData = async (location: string): Promise<WeatherData> => {
  // Mock data for Tambacounda and Kaffrine
  const data: Record<string, WeatherData> = {
    'Tambacounda': {
      temp: 38,
      humidity: 45,
      rainfall: 0,
      condition: 'Ensoleillé',
      location: 'Tambacounda'
    },
    'Kaffrine': {
      temp: 35,
      humidity: 55,
      rainfall: 5,
      condition: 'Partiellement nuageux',
      location: 'Kaffrine'
    }
  };

  return data[location] || data['Tambacounda'];
};
