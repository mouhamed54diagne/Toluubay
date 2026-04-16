import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Upload, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { analyzePlantImage } from '../services/gemini';
import { getWeatherData } from '../services/weather';
import { DiagnosticResult, WeatherData } from '../types';
import { PILOT_ZONES } from '../constants';
import FeedbackModule from './FeedbackModule';

export default function Diagnostic() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [location, setLocation] = useState(PILOT_ZONES[0]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setIsAnalyzing(true);
    try {
      const weather = await getWeatherData(location);
      const base64 = image.split(',')[1];
      const diagnostic = await analyzePlantImage(base64, weather);
      setResult(diagnostic);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-serif italic">Diagnostic Photo</h2>
        <div className="flex gap-2">
          {PILOT_ZONES.map(zone => (
            <button
              key={zone}
              onClick={() => setLocation(zone)}
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${
                location === zone ? 'bg-[#5A5A40] text-white' : 'text-[#1a1a1a]/40 bg-white border border-[#1a1a1a]/10'
              }`}
            >
              {zone[0]}
            </button>
          ))}
          {image && (
            <button onClick={reset} className="text-xs text-[#1a1a1a]/50 p-1">
              <RefreshCw size={12} />
            </button>
          )}
        </div>
      </div>

      {!image ? (
        <div className="space-y-4">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square bg-white border-2 border-dashed border-[#1a1a1a]/10 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-[#5A5A40]/50 transition-colors"
          >
            <div className="w-16 h-16 bg-[#f5f5f0] rounded-full flex items-center justify-center mb-4">
              <Camera size={32} className="text-[#5A5A40]" />
            </div>
            <p className="font-medium">Prendre une photo</p>
            <p className="text-xs text-[#1a1a1a]/50 mt-1">ou cliquez pour importer</p>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
              capture="environment"
            />
          </div>
          <div className="bg-[#5A5A40]/5 p-4 rounded-2xl flex gap-3">
            <AlertCircle size={20} className="text-[#5A5A40] flex-shrink-0" />
            <p className="text-xs text-[#5A5A40]">
              Conseil: Prenez une photo nette des feuilles ou des tiges affectées pour un meilleur diagnostic.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="relative aspect-square rounded-3xl overflow-hidden shadow-lg">
            <img src={image} alt="Plante à diagnostiquer" className="w-full h-full object-cover" />
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                <Loader2 size={48} className="animate-spin mb-4" />
                <p className="font-medium">Analyse en cours...</p>
              </div>
            )}
          </div>

          {!result && !isAnalyzing && (
            <button 
              onClick={handleAnalyze}
              className="w-full bg-[#5A5A40] text-white py-4 rounded-3xl font-bold shadow-lg hover:opacity-90 transition-opacity"
            >
              Lancer le diagnostic IA
            </button>
          )}

          <AnimatePresence>
            {result && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 pb-8"
              >
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-[#1a1a1a]/5">
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 size={20} className="text-green-500" />
                    <h3 className="text-lg font-serif italic">Résultat de l'analyse</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 mb-1">Problème détecté</p>
                      <p className="text-lg font-medium">{result.disease}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1 bg-[#f5f5f0] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500" 
                            style={{ width: `${result.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold">{(result.confidence * 100).toFixed(0)}% de confiance</span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/40 mb-1">Description</p>
                      <p className="text-sm text-[#1a1a1a]/70 leading-relaxed">{result.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="bg-green-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-green-700 mb-1">Traitement</p>
                        <p className="text-xs text-green-800">{result.treatment}</p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700 mb-1">Prévention</p>
                        <p className="text-xs text-blue-800">{result.prevention}</p>
                      </div>
                    </div>
                  </div>
                  
                  <FeedbackModule context={`diagnostic_${result.disease}`} />
                </div>

                <button 
                  onClick={() => {/* Save to log logic */}}
                  className="w-full bg-white border border-[#5A5A40] text-[#5A5A40] py-3 rounded-2xl text-sm font-bold"
                >
                  Enregistrer dans mon carnet
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
