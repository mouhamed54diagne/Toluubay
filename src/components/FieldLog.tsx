import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardList, Plus, ChevronRight, MapPin, Calendar, Loader2, X } from 'lucide-react';
import { FieldEntry, CropType } from '../types';
import { User as FirebaseUser } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { CROPS } from '../constants';
import { collection, onSnapshot, query, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';

export default function FieldLog({ user }: { user: FirebaseUser | null }) {
  const [entries, setEntries] = useState<FieldEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<FieldEntry | null>(null);
  const [filter, setFilter] = useState<CropType | 'all'>('all');
  const [newEntry, setNewEntry] = useState({
    crop: 'arachide' as CropType,
    location: 'Tambacounda',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!user) return;

    const path = `users/${user.uid}/fields`;
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FieldEntry[];
      setEntries(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, []);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const path = `users/${user.uid}/fields`;
    try {
      await addDoc(collection(db, path), {
        ...newEntry,
        uid: user.uid,
        createdAt: serverTimestamp(),
      });
      setShowAddForm(false);
      setNewEntry({
        crop: 'arachide',
        location: 'Tambacounda',
        notes: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const filteredEntries = filter === 'all' 
    ? entries 
    : entries.filter(e => e.crop === filter);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-serif italic">Carnet de Champs</h2>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors ${showAddForm ? 'bg-red-400 rotate-45' : 'bg-[#5A5A40]'} text-white`}
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
              filter === 'all' 
                ? 'bg-[#5A5A40] text-white' 
                : 'bg-white text-[#1a1a1a]/40 border border-[#1a1a1a]/10'
            }`}
          >
            Tous
          </button>
          {(Object.keys(CROPS) as CropType[]).map(crop => (
            <button
              key={crop}
              onClick={() => setFilter(crop)}
              className={`px-4 py-2 rounded-full text-[10px] font-bold uppercase transition-all whitespace-nowrap ${
                filter === crop 
                  ? 'bg-[#5A5A40] text-white' 
                  : 'bg-white text-[#1a1a1a]/40 border border-[#1a1a1a]/10'
              }`}
            >
              {CROPS[crop].name}
            </button>
          ))}
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddEntry} className="bg-white p-6 rounded-3xl shadow-sm border border-[#1a1a1a]/5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 mb-1 block">Culture</label>
              <select 
                value={newEntry.crop}
                onChange={(e) => setNewEntry({...newEntry, crop: e.target.value as CropType})}
                className="w-full bg-[#f5f5f0] border-none rounded-xl p-3 text-sm"
              >
                <option value="arachide">Arachide</option>
                <option value="mil">Mil</option>
                <option value="maïs">Maïs</option>
                <option value="riz">Riz</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 mb-1 block">Date</label>
              <input 
                type="date"
                value={newEntry.date}
                onChange={(e) => setNewEntry({...newEntry, date: e.target.value})}
                className="w-full bg-[#f5f5f0] border-none rounded-xl p-3 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 mb-1 block">Localisation</label>
            <input 
              type="text"
              placeholder="Ex: Parcelle Nord"
              value={newEntry.location}
              onChange={(e) => setNewEntry({...newEntry, location: e.target.value})}
              className="w-full bg-[#f5f5f0] border-none rounded-xl p-3 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 mb-1 block">Notes</label>
            <textarea 
              rows={3}
              placeholder="Observations..."
              value={newEntry.notes}
              onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
              className="w-full bg-[#f5f5f0] border-none rounded-xl p-3 text-sm resize-none"
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-[#5A5A40] text-white py-3 rounded-2xl font-bold text-sm shadow-md"
          >
            Enregistrer l'activité
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-[#5A5A40]" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-3xl border border-dashed border-[#1a1a1a]/10">
          <p className="text-sm text-[#1a1a1a]/40 italic">
            {filter === 'all' 
              ? "Aucune note enregistrée. Commencez par enregistrer vos semis !" 
              : `Aucune note pour la culture ${CROPS[filter as CropType].name}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <div 
              key={entry.id} 
              onClick={() => setSelectedEntry(entry)}
              className="bg-white p-5 rounded-3xl border border-[#1a1a1a]/5 shadow-sm hover:border-[#5A5A40]/30 transition-colors cursor-pointer group"
            >
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
      )}

      {/* Détails de l'entrée */}
      <AnimatePresence>
        {selectedEntry && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEntry(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="relative w-full max-w-md bg-[#f5f5f0] rounded-t-[40px] sm:rounded-[40px] overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[#5A5A40] text-white rounded-2xl flex items-center justify-center">
                      <ClipboardList size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold uppercase tracking-widest text-[#5A5A40]">{selectedEntry.crop}</h3>
                      <p className="text-xs text-[#1a1a1a]/40">{selectedEntry.date}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedEntry(null)}
                    className="p-2 bg-white rounded-full shadow-sm text-[#1a1a1a]/40"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="bg-white p-5 rounded-3xl shadow-sm border border-[#1a1a1a]/5">
                    <div className="flex items-center gap-2 mb-2 text-[#5A5A40]">
                      <MapPin size={16} />
                      <span className="text-sm font-bold uppercase tracking-wider">Localisation</span>
                    </div>
                    <p className="text-sm text-[#1a1a1a]/80 font-medium">{selectedEntry.location}</p>
                  </div>

                  <div className="bg-white p-5 rounded-3xl shadow-sm border border-[#1a1a1a]/5">
                    <div className="flex items-center gap-2 mb-2 text-[#5A5A40]">
                      <Calendar size={16} />
                      <span className="text-sm font-bold uppercase tracking-wider">Observations</span>
                    </div>
                    <p className="text-sm text-[#1a1a1a]/80 leading-relaxed whitespace-pre-wrap">
                      {selectedEntry.notes}
                    </p>
                  </div>

                  {selectedEntry.diagnostic && (
                    <div className="bg-green-50 p-5 rounded-3xl border border-green-100">
                      <h4 className="text-sm font-bold text-green-800 mb-2 uppercase tracking-wide">Diagnostic IA Associé</h4>
                      <p className="text-xs font-bold text-green-700">{selectedEntry.diagnostic.disease}</p>
                      <p className="text-xs text-green-600/80 mt-1">{selectedEntry.diagnostic.treatment}</p>
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => setSelectedEntry(null)}
                  className="w-full mt-8 bg-[#5A5A40] text-white py-4 rounded-[24px] font-bold shadow-lg"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-[#f5f5f0] border-2 border-dashed border-[#1a1a1a]/10 rounded-3xl p-8 text-center pb-8 mb-8">
        <p className="text-sm text-[#1a1a1a]/40 italic">
          "La traçabilité de vos cultures vous aide à obtenir de meilleurs financements et conseils."
        </p>
      </div>
    </div>
  );
}
