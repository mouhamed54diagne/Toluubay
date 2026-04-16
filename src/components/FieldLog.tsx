import React, { useEffect, useState } from 'react';
import { ClipboardList, Plus, ChevronRight, MapPin, Calendar, Loader2, X } from 'lucide-react';
import { FieldEntry, CropType } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, onSnapshot, query, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';

export default function FieldLog() {
  const [entries, setEntries] = useState<FieldEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    crop: 'arachide' as CropType,
    location: 'Tambacounda',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    const user = auth.currentUser;
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
    const user = auth.currentUser;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif italic">Carnet de Champs</h2>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-colors ${showAddForm ? 'bg-red-400 rotate-45' : 'bg-[#5A5A40]'} text-white`}
        >
          <Plus size={20} />
        </button>
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
      ) : entries.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-3xl border border-dashed border-[#1a1a1a]/10">
          <p className="text-sm text-[#1a1a1a]/40 italic">Aucune note enregistrée. Commencez par enregistrer vos semis !</p>
        </div>
      ) : (
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
      )}

      <div className="bg-[#f5f5f0] border-2 border-dashed border-[#1a1a1a]/10 rounded-3xl p-8 text-center pb-8 mb-8">
        <p className="text-sm text-[#1a1a1a]/40 italic">
          "La traçabilité de vos cultures vous aide à obtenir de meilleurs financements et conseils."
        </p>
      </div>
    </div>
  );
}
