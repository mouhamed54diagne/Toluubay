export type CropType = 'arachide' | 'mil' | 'maïs' | 'riz';

export interface ForecastDay {
  date: string;
  maxTemp: number;
  minTemp: number;
  condition: string;
  rainProbability: number;
}

export interface WeatherData {
  temp: number;
  humidity: number;
  rainfall: number;
  windSpeed?: number;
  condition: string;
  location: string;
  forecast?: ForecastDay[];
}

export interface CropStage {
  name: string;
  duration: number; // in days
  recommendations: string[];
}

export interface DiagnosticResult {
  disease: string;
  confidence: number;
  description: string;
  treatment: string;
  prevention: string;
}

export interface FieldEntry {
  id: string;
  date: string;
  crop: CropType;
  location: string;
  photoUrl?: string;
  notes: string;
  diagnostic?: DiagnosticResult;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  audioUrl?: string;
  timestamp?: any;
}
