import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Mic, Volume2, User, UserCheck, Loader2, StopCircle } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { chatWithAI, textToSpeech, transcribeAudio } from '../services/gemini';
import { ChatMessage } from '../types';
import { LOCAL_LANGUAGES } from '../constants';
import FeedbackModule from './FeedbackModule';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, limit } from 'firebase/firestore';

export default function Chatbot({ user }: { user: FirebaseUser | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState(LOCAL_LANGUAGES[0].name);
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!user) return;

    const path = `users/${user.uid}/chatHistory`;
    const q = query(collection(db, path), orderBy('timestamp', 'asc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as ChatMessage);
      if (data.length === 0) {
        setMessages([{ role: 'model', content: "Salam! Je suis TooluBaay, votre conseiller agricole. Comment puis-je vous aider aujourd'hui ?" }]);
      } else {
        setMessages(data);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleAudioProcess(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Impossible d'accéder au micro. Veuillez vérifier vos permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleAudioProcess = async (blob: Blob) => {
    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const transcription = await transcribeAudio(base64, language);
        if (transcription) {
          setInput(transcription);
          // Auto-send could be placed here if desired
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Error transcribing audio:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMessage = async (msg: ChatMessage) => {
    const user = auth.currentUser;
    if (!user) return;
    const path = `users/${user.uid}/chatHistory`;
    try {
      await addDoc(collection(db, path), {
        ...msg,
        uid: user.uid,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessageContent = input;
    setInput('');
    
    // Save user message
    const userMsg: ChatMessage = { role: 'user', content: userMessageContent };
    await saveMessage(userMsg);

    setIsLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const aiResponse = await chatWithAI(userMessageContent, language, history);
      
      if (aiResponse) {
        const modelMsg: ChatMessage = { role: 'model', content: aiResponse };
        await saveMessage(modelMsg);
      }
    } catch (error: any) {
      console.error(error);
      const technicalDetails = error.message || String(error);
      const errorMsg: ChatMessage = { 
        role: 'model', 
        content: technicalDetails.includes("Clé API") 
          ? "Erreur technique : La clé API Gemini ne semble pas être configurée correctement pour cet environnement. Veuillez vérifier les 'Premiers pas' ou 'Secrets' dans l'éditeur." 
          : `Désolé, j'ai rencontré une erreur technique : "${technicalDetails}". Cela peut arriver si la connexion est instable ou si le service est momentanément saturé.` 
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const [isAudioLoading, setIsAudioLoading] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudio = async (text: string, index: number) => {
    // If already loading or playing this one, do nothing (or stop if we want toggle)
    if (isAudioLoading !== null) {
      if (isAudioLoading === index && audioRef.current) {
        audioRef.current.pause();
        setIsAudioLoading(null);
        return;
      }
    }

    // Stop any existing playback
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsAudioLoading(index);

    // iOS/Mobile: We must "pre-unlock" the audio context in the click handler
    const audio = new Audio();
    audioRef.current = audio;
    
    // Attempt a silent play to unlock context
    try {
      audio.play().catch(() => {});
      audio.pause();
    } catch (e) {
      console.warn("Audio unlock attempt failed", e);
    }
    
    try {
      const audioUrl = await textToSpeech(text, language);
      if (audioUrl && audioRef.current === audio) {
        audio.src = audioUrl;
        audio.onended = () => {
          setIsAudioLoading(null);
          URL.revokeObjectURL(audioUrl);
        };
        audio.onerror = (e) => {
          console.error("Audio error event:", e);
          setIsAudioLoading(null);
          URL.revokeObjectURL(audioUrl);
        };
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error("Playback failed after source set:", error);
            setIsAudioLoading(null);
          });
        }
      } else {
        setIsAudioLoading(null);
      }
    } catch (error) {
      console.error("Audio generation error:", error);
      setIsAudioLoading(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-serif italic">Conseiller IA</h2>
        <select 
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="text-xs bg-white border border-[#1a1a1a]/10 rounded-full px-3 py-1 outline-none"
        >
          {LOCAL_LANGUAGES.map(lang => (
            <option key={lang.code} value={lang.name}>{lang.name}</option>
          ))}
        </select>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[85%] flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-[#5A5A40] text-white' : 'bg-white border border-[#1a1a1a]/10'
                }`}>
                  {msg.role === 'user' ? <User size={14} /> : <UserCheck size={14} />}
                </div>
                <div className={`p-4 rounded-3xl text-sm shadow-sm ${
                  msg.role === 'user' ? 'bg-[#5A5A40] text-white rounded-tr-none' : 'bg-white text-[#1a1a1a] rounded-tl-none border border-[#1a1a1a]/5'
                }`}>
                  <p>{msg.content}</p>
                  {msg.role === 'model' && (
                    <div className="flex flex-col gap-2 mt-2">
                      <button 
                        onClick={() => playAudio(msg.content, i)}
                        disabled={isAudioLoading !== null}
                        className={`w-fit transition-all ${
                          isAudioLoading === i 
                          ? 'text-[#5A5A40] animate-pulse' 
                          : 'text-[#5A5A40]/40 hover:text-[#5A5A40]'
                        }`}
                      >
                        {isAudioLoading === i ? (
                          <div className="flex items-center gap-2">
                            <Loader2 size={16} className="animate-spin" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Génération...</span>
                          </div>
                        ) : (
                          <Volume2 size={16} />
                        )}
                      </button>
                      <FeedbackModule context={`chat_msg_${i}`} />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-[#1a1a1a]/5 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-[#5A5A40]" />
              <span className="text-xs text-[#1a1a1a]/50">TooluBaay prépare votre réponse...</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 bg-white rounded-3xl p-2 shadow-lg border border-[#1a1a1a]/5 flex items-center gap-2">
        <button 
          onClick={isRecording ? stopRecording : startRecording}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
            isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-[#f5f5f0] text-[#5A5A40]'
          }`}
        >
          {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
        </button>
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isRecording ? "Parlez maintenant..." : "Posez votre question..."}
          className="flex-1 bg-transparent outline-none text-sm px-2"
        />
        <button 
          onClick={handleSend}
          disabled={!input.trim() || isLoading || isRecording}
          className="w-10 h-10 bg-[#5A5A40] text-white rounded-full flex items-center justify-center disabled:opacity-50"
        >
          <Send size={18} />
        </button>
      </div>
    </div>
  );
}

