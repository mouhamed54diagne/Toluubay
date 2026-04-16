import React, { useState, useEffect } from 'react';
import { CloudSun, Wind, Droplets, Thermometer, MapPin } from 'lucide-react';
import { getWeatherData } from '../services/weather';
import { WeatherData } from '../types';
import { PILOT_ZONES } from '../constants';

export default function Weather() {
  const [location, setLocation] = useState(PILOT_ZONES[0]);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    getWeatherData(location).then(setWeather);
  }, [location]);

  const indicators = [
    { label: 'Température', value: `${weather?.temp}°C`, icon: Thermometer, color: 'text-orange-500' },
    { label: 'Humidité', value: `${weather?.humidity}%`, icon: Droplets, color: 'text-blue-500' },
    { label: 'Vent', value: '12 km/h', icon: Wind, color: 'text-gray-500' },
    { label: 'Pluie utile', value: `${weather?.rainfall} mm`, icon: CloudSun, color: 'text-indigo-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif italic">Météo Agricole</h2>
        <div className="flex bg-white rounded-full p-1 border border-[#1a1a1a]/10">
          {PILOT_ZONES.map(zone => (
            <button
              key={zone}
              onClick={() => setLocation(zone)}
              className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                location === zone ? 'bg-[#5A5A40] text-white' : 'text-[#1a1a1a]/40'
              }`}
            >
              {zone}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-[#1a1a1a]/5 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-[#f5f5f0] rounded-3xl flex items-center justify-center">
            <CloudSun size={48} className="text-[#5A5A40]" />
          </div>
        </div>
        <h3 className="text-4xl font-light tracking-tighter mb-1">{weather?.temp}°C</h3>
        <p className="text-lg font-serif italic text-[#1a1a1a]/60 mb-6">{weather?.condition}</p>
        
        <div className="flex items-center justify-center gap-2 text-xs font-medium text-[#5A5A40]">
          <MapPin size={14} />
          <span>{weather?.location}, Sénégal</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {indicators.map((item, i) => (
          <div key={i} className="bg-white p-5 rounded-3xl border border-[#1a1a1a]/5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-xl bg-[#f5f5f0] flex items-center justify-center ${item.color}`}>
                <item.icon size={16} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/40">{item.label}</span>
            </div>
            <p className="text-xl font-medium">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-3xl p-6 border border-[#1a1a1a]/5 shadow-sm">
        <h4 className="text-sm font-bold uppercase tracking-widest mb-4">Prévisions 5 jours</h4>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(day => (
            <div key={day} className="flex items-center justify-between py-2 border-b border-[#f5f5f0] last:border-0">
              <span className="text-sm font-medium w-12">J+{day}</span>
              <CloudSun size={20} className="text-[#1a1a1a]/30" />
              <div className="flex gap-3 text-sm">
                <span className="font-bold">36°</span>
                <span className="text-[#1a1a1a]/40">24°</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
