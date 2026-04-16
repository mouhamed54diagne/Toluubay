import React from 'react';
import { ClipboardList, Plus, ChevronRight, MapPin, Calendar } from 'lucide-react';
import { FieldEntry } from '../types';

export default function FieldLog() {
  const entries: FieldEntry[] = [
    {
      id: '1',
      date: '2026-04-15',
      crop: 'arachide',
      location: 'Parcelle Nord, Tambacounda',
      notes: 'Semis effectué après la pluie d\'hier. Sol bien humide.',
    },
    {
      id: '2',
      date: '2026-04-10',
      crop: 'mil',
      location: 'Parcelle Sud, Kaffrine',
      notes: 'Préparation du sol terminée. Attente de la pluie.',
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif italic">Carnet de Champs</h2>
        <button className="w-10 h-10 bg-[#5A5A40] text-white rounded-full flex items-center justify-center shadow-lg">
          <Plus size={20} />
        </button>
      </div>

      <div className="space-y-4">
        {entries.map((entry) => (
          <div key={entry.id} className="bg-white p-5 rounded-3xl border border-[#1a1a1a]/5 shadow-sm hover:border-[#5A5A40]/30 transition-colors cursor-pointer group">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#f5f5f0] rounded-xl flex items-center justify-center text-[#5A5A40]">
                  <ClipboardList size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-widest">{entry.crop}</h3>
                  <div className="flex items-center gap-1 text-[10px] text-[#1a1a1a]/40">
                    <Calendar size={10} />
                    <span>{entry.date}</span>
                  </div>
                </div>
              </div>
              <ChevronRight size={16} className="text-[#1a1a1a]/20 group-hover:text-[#5A5A40] transition-colors" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-1 text-xs text-[#1a1a1a]/60">
                <MapPin size={12} />
                <span>{entry.location}</span>
              </div>
              <p className="text-sm text-[#1a1a1a]/80 line-clamp-2 leading-relaxed">
                {entry.notes}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#f5f5f0] border-2 border-dashed border-[#1a1a1a]/10 rounded-3xl p-8 text-center">
        <p className="text-sm text-[#1a1a1a]/40 italic">
          "La traçabilité de vos cultures vous aide à obtenir de meilleurs financements et conseils."
        </p>
      </div>
    </div>
  );
}
