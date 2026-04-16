import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, ChevronRight, Info, CheckCircle2, Timer } from 'lucide-react';
import { CROPS } from '../constants';
import { CropType } from '../types';

export default function Calendar() {
  const [selectedCrop, setSelectedCrop] = useState<CropType>('arachide');
  const [sowingDate, setSowingDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const cropData = CROPS[selectedCrop];

  const { currentDay, stagesWithDates } = useMemo(() => {
    if (!sowingDate) return { currentDay: 0, stagesWithDates: [] };
    
    const start = new Date(sowingDate);
    const today = new Date();
    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let cumulativeDays = 0;
    const stages = cropData.stages.map((stage) => {
      const stageStart = new Date(start);
      stageStart.setDate(start.getDate() + cumulativeDays);
      
      const stageEnd = new Date(stageStart);
      stageEnd.setDate(stageStart.getDate() + stage.duration);
      
      const isCompleted = diffDays > (cumulativeDays + stage.duration);
      const isCurrent = diffDays > cumulativeDays && diffDays <= (cumulativeDays + stage.duration);
      
      cumulativeDays += stage.duration;
      
      return {
        ...stage,
        startDate: stageStart,
        endDate: stageEnd,
        isCompleted,
        isCurrent,
        cumulativeDays
      };
    });

    return { 
      currentDay: diffDays > 0 ? diffDays : 0, 
      stagesWithDates: stages 
    };
  }, [selectedCrop, sowingDate, cropData]);

  const totalCycle = stagesWithDates.reduce((acc, s) => acc + s.duration, 0) || 90;

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif italic">Calendrier Dynamique</h2>
        <div className="flex gap-2">
          {(Object.keys(CROPS) as CropType[]).map(crop => (
            <button
              key={crop}
              onClick={() => setSelectedCrop(crop)}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold uppercase transition-all ${
                selectedCrop === crop 
                  ? 'bg-[#5A5A40] text-white scale-110' 
                  : 'bg-white text-[#1a1a1a]/40 border border-[#1a1a1a]/10'
              }`}
            >
              {crop[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#1a1a1a]/5 space-y-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/40">Date de semis réelle</p>
        <div className="relative">
          <input 
            type="date" 
            value={sowingDate}
            onChange={(e) => setSowingDate(e.target.value)}
            className="w-full bg-[#f5f5f0] border-none rounded-2xl p-4 text-sm font-medium outline-none text-[#1a1a1a]"
          />
          <CalendarIcon size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5A5A40] pointer-events-none" />
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#1a1a1a]/5">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#f5f5f0] rounded-2xl flex items-center justify-center">
              <CalendarIcon className="text-[#5A5A40]" />
            </div>
            <div>
              <h3 className="text-lg font-serif italic">{cropData.name}</h3>
              <p className="text-xs text-[#1a1a1a]/50">Cycle complet: ~{totalCycle} jours</p>
            </div>
          </div>
          {currentDay > 0 && (
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/40">Jour actuel</p>
              <p className="text-xl font-serif italic text-[#5A5A40]">J+{currentDay}</p>
            </div>
          )}
        </div>

        <div className="space-y-8 relative">
          <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-[#f5f5f0]" />
          
          {stagesWithDates.map((stage, i) => (
            <div key={i} className="relative pl-12">
              <div className={`absolute left-0 w-10 h-10 rounded-full border-4 border-[#f5f5f0] flex items-center justify-center z-10 transition-colors ${
                stage.isCompleted ? 'bg-green-500 text-white border-green-100' : 
                stage.isCurrent ? 'bg-[#5A5A40] text-white border-[#5A5A40]/20' : 
                'bg-white text-[#1a1a1a]/20'
              }`}>
                {stage.isCompleted ? <CheckCircle2 size={16} /> : <span className="text-xs font-bold">{i + 1}</span>}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className={`font-medium ${stage.isCurrent || stage.isCompleted ? 'text-[#1a1a1a]' : 'text-[#1a1a1a]/30'}`}>
                      {stage.name}
                    </h4>
                    <p className="text-[10px] text-[#1a1a1a]/40 font-medium tracking-tight">
                      {stage.startDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - {stage.endDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-bold text-[#1a1a1a]/30 uppercase tracking-widest">
                      {stage.duration} j
                    </span>
                    {stage.isCurrent && (
                      <div className="flex items-center gap-1 text-[8px] font-bold text-[#5A5A40] uppercase tracking-tighter mt-1">
                        <Timer size={10} className="animate-pulse" /> En cours
                      </div>
                    )}
                  </div>
                </div>
                
                <AnimatePresence>
                  {(stage.isCurrent || (i === 0 && currentDay === 0)) && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="bg-[#f5f5f0] rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-start gap-2">
                        <Info size={14} className="text-[#5A5A40] mt-0.5 flex-shrink-0" />
                        <p className="text-xs font-medium text-[#5A5A40]">Recommandations d'aujourd'hui :</p>
                      </div>
                      <ul className="space-y-2">
                        {stage.recommendations.map((rec, j) => (
                          <li key={j} className="flex items-center gap-2 text-xs text-[#1a1a1a]/70">
                            <ChevronRight size={12} className="text-[#5A5A40]" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#5A5A40] p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-widest mb-2 opacity-70">Conseil dynamique</p>
          <p className="text-sm font-serif italic leading-relaxed">
            {currentDay === 0 
              ? "Veuillez renseigner votre date de semis pour activer le calendrier dynamique." 
              : `Vous êtes au jour ${currentDay} de votre culture de ${cropData.name.toLowerCase()}. Suivez scrupuleusement les recommandations de l'étape actuelle.`}
          </p>
        </div>
        <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
      </div>
    </div>
  );
}

