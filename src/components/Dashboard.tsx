import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CloudSun, AlertTriangle, ArrowRight, Lightbulb, Loader2, Info, User as UserIcon } from 'lucide-react';
import { getWeatherData } from '../services/weather';
import { generateIntelligentInsight, hasApiKey, getLastAiError, keyToUse } from '../services/gemini';
import { WeatherData, FieldEntry } from '../types';
import { PILOT_ZONES, CROPS } from '../constants';
import FeedbackModule from './FeedbackModule';
import { User as FirebaseUser } from 'firebase/auth';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

export default function Dashboard({ user, onNavigate }: { user: FirebaseUser | null, onNavigate: (tab: string) => void }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [latestField, setLatestField] = useState<FieldEntry | null>(null);
  const [insight, setInsight] = useState<string>('');
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  useEffect(() => {
    const initDashboard = async () => {
      // Check cache first to save quota
      const cacheKey = `insight_${user?.uid || 'anon'}_${PILOT_ZONES[0]}`;
      const cached = sessionStorage.getItem(cacheKey);
      
      // 1. Fetch Weather
      let weatherData: WeatherData;
      try {
        weatherData = await getWeatherData(PILOT_ZONES[0]);
      } catch (e) {
        weatherData = { temp: 30, condition: 'Dégagé', location: 'Tambacounda', humidity: 50, rainfall: 0, forecast: [] };
      }
      setWeather(weatherData);

      if (cached) {
        setInsight(cached);
        setIsLoadingInsight(false);
        return;
      }

      // 2. Fetch Latest Field Entry
      let currentCrop = 'Arachide';
      let currentStage = 'Semis';

      if (user) {
        try {
          const q = query(
            collection(db, `users/${user.uid}/fields`), 
            orderBy('createdAt', 'desc'), 
            limit(1)
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const entry = snapshot.docs[0].data() as FieldEntry;
            setLatestField(entry);
            currentCrop = entry.crop;
          }
        } catch (e) {
          console.error("Failed to fetch latest field", e);
        }
      }
      
      // 3. Generate Intelligent Intersection
      setIsLoadingInsight(true);
      try {
        const text = await generateIntelligentInsight(currentCrop, currentStage, weatherData, 'Français');
        if (text && !text.includes("Veuillez configurer")) {
          setInsight(text);
          const cacheKey = `insight_${user?.uid || 'anon'}_${PILOT_ZONES[0]}`;
          sessionStorage.setItem(cacheKey, text);
        } else {
          // Natural fallback without relying on AI if it fails
          setInsight(`Focus sur l'${currentCrop} en phase de ${currentStage}. Avec ${weatherData.temp}°C, surveillez l'humidité du sol pour éviter le stress hydrique.`);
        }
      } catch (e) {
        setInsight(`Alerte Météo ${weatherData.location} : ${weatherData.temp}°C. Protégez vos semis d'arachide contre la chaleur excessive.`);
      } finally {
        setIsLoadingInsight(false);
      }
    };
    initDashboard();
  }, [user]);

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
      
      {/* 2. Prévisions 5 Jours */}
      <section className="bg-white rounded-3xl p-6 shadow-sm border border-[#1a1a1a]/5 overflow-x-auto">
        <div className="flex items-center gap-2 mb-4">
          <CloudSun size={16} className="text-[#5A5A40]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]">Prévisions 5 Jours</span>
        </div>
        <div className="flex gap-4 min-w-[450px] pb-2">
          {weather?.forecast?.map((day, idx) => {
            const date = new Date(day.date);
            const dayName = date.toLocaleDateString('fr-FR', { weekday: 'short' });
            return (
              <div key={idx} className="flex-1 bg-[#f5f5f0]/50 rounded-2xl p-3 text-center border border-[#1a1a1a]/5">
                <p className="text-[10px] font-bold uppercase text-[#1a1a1a]/40 mb-2 truncate">{idx === 0 ? 'Auj.' : dayName}</p>
                <div className="text-xl mb-1">
                  {day.condition.includes('Pluie') ? '🌧️' : (day.condition.includes('nuageux') ? '⛅' : '☀️')}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold text-[#1a1a1a]">{day.maxTemp}°</span>
                  <span className="text-[10px] text-[#1a1a1a]/40">{day.minTemp}°</span>
                </div>
                {day.rainProbability > 20 && (
                  <div className="mt-2 text-[9px] font-bold text-blue-500">
                    {day.rainProbability}% 💧
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Point 5: Alertes Intelligentes (Intersection de données) */}
      <section className="bg-white border-2 border-[#5A5A40]/10 rounded-3xl p-6 shadow-sm relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb size={16} className="text-[#5A5A40]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#5A5A40]">Conseils du Jour</span>
            </div>
            {isLoadingInsight && <Loader2 size={14} className="animate-spin text-[#5A5A40]" />}
          </div>
          
          <div className="bg-[#f5f5f0] p-4 rounded-2xl min-h-[80px] flex items-center justify-center">
            {isLoadingInsight ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={24} className="animate-spin text-[#5A5A40]/20" />
                <p className="text-[10px] text-[#1a1a1a]/30 font-bold uppercase tracking-widest">Analyse Croisée...</p>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-[#1a1a1a]/80 italic w-full text-center">
                {insight || "Analyse indisponible."}
              </p>
            )}
            {insight && !isLoadingInsight && <FeedbackModule context="dashboard_insight" />}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 bg-yellow-50 p-3 rounded-xl flex items-center gap-2">
              <AlertTriangle size={14} className="text-yellow-600" />
              <p className="text-[10px] font-bold text-yellow-700 uppercase tracking-tight">
                {latestField ? `Alerte ${latestField.crop}: Suivi` : "Alerte: Préparation Sol"}
              </p>
            </div>
            <button 
              onClick={() => onNavigate(latestField ? 'log' : 'calendar')}
              className="p-3 bg-[#5A5A40] text-white rounded-xl shadow-md active:scale-95 transition-all"
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

      {/* 4. Section Debug (Visible pour le développement) */}
      <section className="mt-8 p-4 bg-red-50 border border-red-100 rounded-3xl">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={14} className="text-red-500" />
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-red-500">Diagnostic Système</h4>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-[10px]">
             <span className="text-red-400">Status IA :</span>
             <span className={`font-bold ${hasApiKey() ? 'text-green-600' : 'text-red-600'}`}>
               {hasApiKey() ? 'Connecté' : 'Clé manquante'}
             </span>
          </div>
          <div className="text-[10px]">
             <span className="text-red-400">Dernière erreur :</span>
             <p className="mt-1 font-mono bg-white p-2 rounded border border-red-50 text-[9px] break-all min-h-[40px]">
               {getLastAiError() || 'Aucune erreur détectée.'}
             </p>
          </div>
          <div className="text-[10px] opacity-50">
             <span className="text-red-400">Empreinte Clé :</span>
             <span className="ml-2 font-mono">
               {keyToUse ? `${keyToUse.substring(0, 4)}...${keyToUse.substring(keyToUse.length - 4)}` : 'Néant'}
             </span>
          </div>
        </div>
      </section>
    </div>
  );
}

