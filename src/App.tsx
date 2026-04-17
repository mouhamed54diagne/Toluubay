/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Weather from './components/Weather';
import Calendar from './components/Calendar';
import Chatbot from './components/Chatbot';
import Diagnostic from './components/Diagnostic';
import FieldLog from './components/FieldLog';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { LogIn, Sprout, Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // Fallback loading safety
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 6000);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Don't clear timeout here yet, keep it for overall app load
      if (user) {
        setUser(user);
        setLoading(false);
        clearTimeout(timeout);
        
        // Background check and registration
        const checkUser = async () => {
          try {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            if (!userSnap.exists()) {
              await setDoc(userRef, {
                uid: user.uid,
                name: user.displayName || 'Anonyme',
                email: user.email,
                createdAt: serverTimestamp(),
                locations: ['Tambacounda']
              });
            }
          } catch (e) {
            console.error("User registration check failed", e);
          }
        };
        checkUser();
      } else {
        setUser(null);
        setLoading(false);
        clearTimeout(timeout);
      }
    });

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // Immediate state update for zero-latency feel
      setUser(result.user);
      setLoading(false);
      setIsLoggingIn(false);
    } catch (error: any) {
      console.error("Login failed", error);
      
      if (error.code === 'auth/popup-blocked') {
        alert("Action requise : Votre navigateur a bloqué la fenêtre de connexion. Si vous utilisez l'application depuis votre écran d'accueil, connectez-vous d'abord sur la page web dans Safari, puis revenez ici. Sinon, autorisez les popups dans vos réglages Safari.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        // Simple cancellation, no alert needed
      } else {
        alert("Erreur de connexion : " + (error.message || "Une erreur inconnue est survenue."));
      }
      setIsLoggingIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-4 animate-bounce">
          <Sprout size={32} className="text-[#5A5A40]" />
        </div>
        <p className="text-sm font-serif italic text-[#5A5A40]">TooluBaay...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex flex-col items-center justify-center p-6 text-center text-[#1a1a1a]">
        <div className="w-24 h-24 bg-white rounded-[32px] shadow-2xl flex items-center justify-center mb-8 border border-[#1a1a1a]/5">
          <Sprout size={48} className="text-[#5A5A40]" />
        </div>
        <h1 className="text-4xl font-serif italic text-[#5A5A40] mb-3 tracking-tight">TooluBaay</h1>
        <p className="text-sm text-[#1a1a1a]/50 mb-12 max-w-[280px] leading-relaxed">
          Votre conseiller agricole digital pour une productivité optimisée au Sénégal.
        </p>
        <button
          onClick={handleLogin}
          disabled={isLoggingIn}
          className="w-full max-w-xs bg-[#5A5A40] text-white py-5 rounded-[24px] font-bold shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-70"
        >
          {isLoggingIn ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <LogIn size={20} />
          )}
          <span>{isLoggingIn ? 'Connexion...' : 'Accéder au Tableau de Bord'}</span>
        </button>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Dashboard onNavigate={setActiveTab} />;
      case 'weather':
        return <Weather />;
      case 'calendar':
        return <Calendar />;
      case 'chat':
        return <Chatbot user={user} />;
      case 'diagnostic':
        return <Diagnostic user={user} />;
      case 'log':
        return <FieldLog />;
      default:
        return <Dashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

