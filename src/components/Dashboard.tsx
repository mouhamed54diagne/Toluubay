import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CloudSun, AlertTriangle, ArrowRight } from 'lucide-react';
import { getWeatherData } from '../services/weather';
import { WeatherData } from '../types';

export default function Dashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    getWeatherData('Tambacounda').then(setWeather);
  }, []);

  return (
    <div className="space-y-6">
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-[#1a1a1a]/5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-medium text-[#1a1a1a]/50 uppercase tracking-widest mb-1">Météo Actuelle</p>
            <h2 className="text-3xl font-serif italic text-[#1a1a1a]">{weather?.location}</h2>
          </div>
          <div className="bg-[#f5f5f0] p-3 rounded-2xl">
            <CloudSun size={32} className="text-[#5A5A40]" />
          </div>
        </div>
        <div className="flex items-end gap-4">
          <span className="text-5xl font-light tracking-tighter">{weather?.temp}°C</span>
          <div className="pb-1">
            <p className="text-sm font-medium">{weather?.condition}</p>
            <p className="text-xs text-[#1a1a1a]/50">Humidité: {weather?.humidity}%</p>
          </div>
        </div>
      </section>

      <section className="bg-[#5A5A40] rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-yellow-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Alerte Saisonnière</span>
          </div>
          <h3 className="text-xl font-serif italic mb-2">Préparation du sol pour l'Arachide</h3>
          <p className="text-sm text-white/80 mb-4">
            La première pluie utile est prévue dans 10 jours à Tambacounda. Commencez le labour dès maintenant.
          </p>
          <button 
            onClick={() => onNavigate('calendar')}
            className="bg-white text-[#5A5A40] px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2"
          >
            Voir le calendrier <ArrowRight size={14} />
          </button>
        </div>
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      </section>

      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => onNavigate('diagnostic')}
          className="bg-white p-6 rounded-3xl border border-[#1a1a1a]/5 shadow-sm text-left group"
        >
          <div className="w-10 h-10 bg-[#f5f5f0] rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#5A5A40] group-hover:text-white transition-colors">
            <AlertTriangle size={20} />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1">Diagnostic</p>
          <p className="text-sm text-[#1a1a1a]/60">Ma plante est-elle malade ?</p>
        </button>
        <button 
          onClick={() => onNavigate('chat')}
          className="bg-white p-6 rounded-3xl border border-[#1a1a1a]/5 shadow-sm text-left group"
        >
          <div className="w-10 h-10 bg-[#f5f5f0] rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#5A5A40] group-hover:text-white transition-colors">
            <CloudSun size={20} />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1">Conseiller</p>
          <p className="text-sm text-[#1a1a1a]/60">Posez vos questions à l'IA</p>
        </button>
      </div>
    </div>
  );
}
