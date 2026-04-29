import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Mic, Volume2, User, UserCheck, Loader2, StopCircle, History, Plus, ChevronLeft, Trash2 } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { chatWithAI, textToSpeech, transcribeAudio } from '../services/gemini';
import { ChatMessage } from '../types';
import { LOCAL_LANGUAGES } from '../constants';
import FeedbackModule from './FeedbackModule';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, limit, doc, deleteDoc, updateDoc } from 'firebase/firestore';

interface Conversation {
  id: string;
  title: string;
  lastMessage?: string;
  updatedAt: any;
}

export default function Chatbot({ user }: { user: FirebaseUser | null }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState(LOCAL_LANGUAGES[0].name);
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 1. Load Conversations List
  useEffect(() => {
    if (!user) return;
    const path = `users/${user.uid}/conversations`;
    const q = query(collection(db, path), orderBy('updatedAt', 'desc'), limit(20));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const convs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Conversation));
      setConversations(convs);
      
      // Auto-select latest if none selected
      if (convs.length > 0 && !currentConversationId) {
        setCurrentConversationId(convs[0].id);
      }
    });
    
    return () => unsubscribe();
  }, [user]);

  // 2. Load Messages for current conversation
  useEffect(() => {
    if (!user || !currentConversationId) {
      setMessages([]);
      return;
    }

    const path = `users/${user.uid}/conversations/${currentConversationId}/messages`;
    const q = query(collection(db, path), orderBy('timestamp', 'asc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as ChatMessage);
      setMessages(data);
    }, (error) => {
      console.error("Messages list error", error);
      handleFirestoreError(error, OperationType.LIST, path);
    });

    return () => unsubscribe();
  }, [user, currentConversationId]);

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
      const mimeType = blob.type || 'audio/webm';
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const transcription = await transcribeAudio(base64, language, mimeType);
        if (transcription) {
          setInput(transcription);
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Error transcribing audio:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createNewConversation = async () => {
    if (!user) return null;
    setIsLoading(true);
    const path = `users/${user.uid}/conversations`;
    try {
      // Add a small delay for Firestore auth stabilization in PWA
      await new Promise(r => setTimeout(r, 100));
      const newConv = await addDoc(collection(db, path), {
        title: "Nouvelle Discussion",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setCurrentConversationId(newConv.id);
      setShowHistory(false);
      setMessages([]);
      return newConv.id;
    } catch (e) {
      console.error("[TooluBaay] Failed to create conv:", e);
      handleFirestoreError(e, OperationType.CREATE, path);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !confirm("Supprimer cette discussion ?")) return;
    const path = `users/${user.uid}/conversations/${id}`;
    try {
      await deleteDoc(doc(db, path));
      if (currentConversationId === id) {
        setCurrentConversationId(null);
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  };

  const saveMessage = async (msg: ChatMessage, overrideConversationId?: string) => {
    const user = auth.currentUser;
    const convId = overrideConversationId || currentConversationId;
    if (!user || !convId) return;
    
    // If it's the first message of a "Nouvelle Discussion", update the title
    if (messages.length <= 1 && msg.role === 'user') {
      const convPath = `users/${user.uid}/conversations/${convId}`;
      updateDoc(doc(db, convPath), { 
        title: msg.content.substring(0, 30) + (msg.content.length > 30 ? '...' : ''),
        updatedAt: serverTimestamp()
      }).catch(console.error);
    } else {
      // Just update updatedAt
      const convPath = `users/${user.uid}/conversations/${convId}`;
      updateDoc(doc(db, convPath), { 
        updatedAt: serverTimestamp()
      }).catch(console.error);
    }

    const path = `users/${user.uid}/conversations/${convId}/messages`;
    try {
      await addDoc(collection(db, path), {
        ...msg,
        timestamp: serverTimestamp()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, path);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    let convId = currentConversationId;

    if (!convId) {
      convId = await createNewConversation();
      if (!convId) return;
    }

    const userMessageContent = input;
    setInput('');
    
    const userMsg: ChatMessage = { 
      role: 'user', 
      content: userMessageContent,
      timestamp: { seconds: Date.now() / 1000 }
    };
    
    // Instant local update
    setMessages(prev => [...prev.filter(m => m.content !== userMessageContent), userMsg]);
    setIsLoading(true);

    try {
      // 1. Save user msg
      saveMessage(userMsg, convId);

      // 2. Chat with AI
      const historyForAI = messages.map(m => ({ role: m.role, content: m.content }));
      const aiResponse = await chatWithAI(userMessageContent, language, historyForAI);
      
      if (aiResponse) {
        const modelMsg: ChatMessage = { 
          role: 'model', 
          content: aiResponse,
          timestamp: { seconds: Date.now() / 1000 }
        };
        
        // Instant local update for model response
        setMessages(prev => [...prev, modelMsg]);
        
        // 3. Save model msg
        await saveMessage(modelMsg, convId);
      }
    } catch (error: any) {
      console.error("[Chatbot] handleSend error:", error);
      const errorMsg: ChatMessage = { 
        role: 'model', 
        content: `Désolé: ${error.message || "Erreur"}.`
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
    <div className="flex flex-col h-[calc(100vh-180px)] pt-2 relative overflow-hidden">
      {/* History Sidebar/Layer */}
      <AnimatePresence>
        {showHistory && (
          <motion.div 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            className="absolute inset-0 z-40 bg-[#f5f5f0] flex flex-col p-4"
          >
            <div className="flex items-center justify-between mb-6">
              <button 
                onClick={() => setShowHistory(false)}
                className="p-2 hover:bg-white rounded-full transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <h3 className="font-serif italic text-lg">Vos Discussions</h3>
              <div className="w-8" />
            </div>

            <button 
              onClick={createNewConversation}
              className="w-full flex items-center justify-center gap-2 p-4 bg-white border border-[#1a1a1a]/5 rounded-2xl mb-4 shadow-sm active:scale-95 transition-all text-[#5A5A40] font-bold text-sm"
            >
              <Plus size={18} />
              Nouvelle Discussion
            </button>

            <div className="flex-1 overflow-y-auto space-y-2">
              {conversations.map(conv => (
                <div 
                  key={conv.id}
                  onClick={() => {
                    setCurrentConversationId(conv.id);
                    setShowHistory(false);
                  }}
                  className={`group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all ${
                    currentConversationId === conv.id 
                    ? 'bg-[#5A5A40] text-white shadow-md scale-[1.02]' 
                    : 'bg-white hover:bg-white/80 text-[#1a1a1a]/80'
                  }`}
                >
                  <div className="flex-1 truncate pr-2">
                    <p className="font-medium text-sm truncate">{conv.title}</p>
                    <p className={`text-[10px] mt-1 ${currentConversationId === conv.id ? 'text-white/60' : 'text-[#1a1a1a]/40'}`}>
                      {conv.updatedAt?.seconds ? new Date(conv.updatedAt.seconds * 1000).toLocaleDateString() : 'Aujourd\'hui'}
                    </p>
                  </div>
                  <button 
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className={`p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${
                      currentConversationId === conv.id ? 'hover:bg-white/20' : 'hover:bg-red-50 text-red-400'
                    }`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {conversations.length === 0 && (
                <div className="text-center py-12 opacity-30 italic text-sm">
                  Aucun historique.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-4 bg-white/50 p-3 rounded-2xl border border-[#1a1a1a]/5">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowHistory(true)}
            className="p-2 bg-[#5A5A40] text-white rounded-xl shadow-sm active:scale-90 transition-all"
          >
            <History size={18} />
          </button>
          <div>
            <h2 className="text-lg font-serif italic text-[#5A5A40] leading-none mb-1">TooluBaay</h2>
            <p className="text-[8px] uppercase tracking-widest text-[#1a1a1a]/40 font-bold">Conseiller IA</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[8px] font-bold uppercase text-[#1a1a1a]/30">Langue</span>
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="text-xs bg-white border border-[#1a1a1a]/10 rounded-full px-4 py-1.5 outline-none shadow-sm font-medium"
          >
            {LOCAL_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.name}>{lang.name}</option>
            ))}
          </select>
        </div>
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

