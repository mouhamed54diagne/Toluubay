import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar as CalendarIcon, ChevronRight, Info } from 'lucide-react';
import { CROPS } from '../constants';
import { CropType } from '../types';

export default function Calendar() {
  const [selectedCrop, setSelectedCrop] = useState<CropType>('arachide');

  const cropData = CROPS[selectedCrop];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif italic">Calendrier Cultural</h2>
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

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#1a1a1a]/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-[#f5f5f0] rounded-2xl flex items-center justify-center">
            <CalendarIcon className="text-[#5A5A40]" />
          </div>
          <div>
            <h3 className="text-lg font-serif italic">{cropData.name}</h3>
            <p className="text-xs text-[#1a1a1a]/50">Cycle complet: ~90 jours</p>
          </div>
        </div>

        <div className="space-y-8 relative">
          <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-[#f5f5f0]" />
          
          {cropData.stages.map((stage, i) => (
            <div key={i} className="relative pl-12">
              <div className={`absolute left-0 w-10 h-10 rounded-full border-4 border-[#f5f5f0] flex items-center justify-center z-10 ${
                i === 0 ? 'bg-[#5A5A40] text-white' : 'bg-white text-[#1a1a1a]/20'
              }`}>
                <span className="text-xs font-bold">{i + 1}</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className={`font-medium ${i === 0 ? 'text-[#1a1a1a]' : 'text-[#1a1a1a]/40'}`}>
                    {stage.name}
                  </h4>
                  <span className="text-[10px] font-bold text-[#1a1a1a]/30 uppercase tracking-widest">
                    {stage.duration} jours
                  </span>
                </div>
                
                {i === 0 && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="bg-[#f5f5f0] rounded-2xl p-4 space-y-3"
                  >
                    <div className="flex items-start gap-2">
                      <Info size={14} className="text-[#5A5A40] mt-0.5 flex-shrink-0" />
                      <p className="text-xs font-medium text-[#5A5A40]">Recommandations:</p>
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
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#5A5A40] p-6 rounded-3xl text-white">
        <p className="text-xs font-bold uppercase tracking-widest mb-2 opacity-70">Conseil du moment</p>
        <p className="text-sm font-serif italic leading-relaxed">
          "Le semis de l'arachide doit se faire sur un sol bien humide, après une pluie d'au moins 20mm."
        </p>
      </div>
    </div>
  );
}
