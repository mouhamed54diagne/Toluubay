import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CloudSun, AlertTriangle, ArrowRight, Sparkles, Loader2, Info } from 'lucide-react';
import { getWeatherData } from '../services/weather';
import { generateIntelligentInsight } from '../services/gemini';
import { WeatherData } from '../types';
import { PILOT_ZONES, CROPS } from '../constants';

export default function Dashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [insight, setInsight] = useState<string>('');
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  useEffect(() => {
    const initDashboard = async () => {
      const weatherData = await getWeatherData(PILOT_ZONES[0]);
      setWeather(weatherData);
      
      // Intersection of data: Weather + Calendar (Mocking Arachide/Semis)
      setIsLoadingInsight(true);
      try {
        const text = await generateIntelligentInsight('Arachide', 'Semis', weatherData, 'Français');
        setInsight(text);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingInsight(false);
      }
    };
    initDashboard();
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. Météo & Intersection Visuelle */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-[#1a1a1a]/5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-medium text-[#1a1a1a]/50 uppercase tracking-widest mb-1">Météo & Contexte</p>
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
            <p className="text-xs text-[#1a1a1a]/50">Risque stress: Moyen</p>
          </div>
        </div>
      </section>

      {/* 2. Point 5: Alertes Intelligentes (Intersection de données) */}
      <section className="bg-white border-2 border-[#5A5A40]/10 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-[#5A5A40]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]">Analyse Inteligente (IA)</span>
            </div>
            {isLoadingInsight && <Loader2 size={14} className="animate-spin text-[#5A5A40]" />}
          </div>
          
          <div className="bg-[#f5f5f0] p-4 rounded-2xl">
            <p className="text-sm leading-relaxed text-[#1a1a1a]/80 italic">
              {isLoadingInsight ? "Intersection des données en cours..." : insight || "Analyse indisponible."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 bg-yellow-50 p-3 rounded-xl flex items-center gap-2">
              <AlertTriangle size={14} className="text-yellow-600" />
              <p className="text-[10px] font-bold text-yellow-700 uppercase tracking-tight">Alerte: Préparation Sol</p>
            </div>
            <button 
              onClick={() => onNavigate('calendar')}
              className="p-3 bg-[#5A5A40] text-white rounded-xl"
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* 3. Accès Rapides */}
      <section className="bg-[#5A5A40] rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Info size={16} className="text-yellow-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/70">Conseil Semences</span>
          </div>
          <h3 className="text-xl font-serif italic mb-2">Choix des spéculations</h3>
          <p className="text-sm text-white/80 mb-4">
            Utilisez des semences certifiées cycle court (90j) pour contrer la variabilité pluviométrique cette saison.
          </p>
        </div>
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      </section>

      <div className="grid grid-cols-2 gap-4 pb-8">
        <button 
          onClick={() => onNavigate('diagnostic')}
          className="bg-white p-6 rounded-3xl border border-[#1a1a1a]/5 shadow-sm text-left group"
        >
          <div className="w-10 h-10 bg-[#f5f5f0] rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#5A5A40] group-hover:text-white transition-colors">
            <AlertTriangle size={20} />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1">Diagnostic</p>
          <p className="text-sm text-[#1a1a1a]/60">Santé des plantes</p>
        </button>
        <button 
          onClick={() => onNavigate('chat')}
          className="bg-white p-6 rounded-3xl border border-[#1a1a1a]/5 shadow-sm text-left group"
        >
          <div className="w-10 h-10 bg-[#f5f5f0] rounded-2xl flex items-center justify-center mb-4 group-hover:bg-[#5A5A40] group-hover:text-white transition-colors">
            <CloudSun size={20} />
          </div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1">Conseiller</p>
          <p className="text-sm text-[#1a1a1a]/60">Expert IA Vocal</p>
        </button>
      </div>
    </div>
  );
}

