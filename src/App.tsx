/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { LogIn, Sprout, Loader2 } from 'lucide-react';

// Lazy load heavy components to speed up initial dashboard mount
const Weather = lazy(() => import('./components/Weather'));
const Calendar = lazy(() => import('./components/Calendar'));
const Chatbot = lazy(() => import('./components/Chatbot'));
const Diagnostic = lazy(() => import('./components/Diagnostic'));
const FieldLog = lazy(() => import('./components/FieldLog'));

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // Global Error Listener for debugging environment issues
    const handleError = (event: ErrorEvent) => {
      console.error("[Fatal Error]", event.error);
    };
    window.addEventListener('error', handleError);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      
      // Hide the instant splash screen once React takes over
      const splash = document.getElementById('instant-splash');
      if (splash) {
        splash.style.opacity = '0';
        splash.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
          if (splash.parentNode) splash.remove();
        }, 500);
      }
      
      if (user) {
        // Background registration (non-blocking)
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
      }
    });

    return () => unsubscribe();
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
      <div className="min-h-screen bg-[#f5f5f0] flex flex-col items-center justify-center animate-pulse">
        <div className="w-24 h-24 mb-6">
          <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="48" fill="white" stroke="#5A5A40" stroke-width="0.5"/>
            <path d="M50 25C50 25 35 45 35 60C35 68.2843 41.7157 75 50 75C58.2843 75 65 68.2843 65 60C65 45 50 25 50 25Z" fill="#5A5A40" fill-opacity="0.1" stroke="#5A5A40" stroke-width="2"/>
            <path d="M50 75V55" stroke="#5A5A40" stroke-width="2" stroke-linecap="round"/>
            <path d="M40 60C40 60 45 60 50 55" stroke="#5A5A40" stroke-width="2" stroke-linecap="round"/>
            <path d="M60 60C60 60 55 60 50 55" stroke="#5A5A40" stroke-width="2" stroke-linecap="round"/>
            <circle cx="50" cy="35" r="5" fill="#A8A878"/>
          </svg>
        </div>
        <h1 className="text-3xl font-serif italic text-[#5A5A40] letter-spacing-tight">TooluBaay</h1>
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
    return (
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center bg-[#f5f5f0]">
          <Loader2 size={24} className="animate-spin text-[#5A5A40]/20" />
        </div>
      }>
        {(() => {
          switch (activeTab) {
            case 'home':
              return <Dashboard user={user} onNavigate={setActiveTab} />;
            case 'weather':
              return <Weather />;
            case 'calendar':
              return <Calendar />;
            case 'chat':
              return <Chatbot user={user} />;
            case 'diagnostic':
              return <Diagnostic user={user} />;
            case 'log':
              return <FieldLog user={user} />;
            default:
              return <Dashboard user={user} onNavigate={setActiveTab} />;
          }
        })()}
      </Suspense>
    );
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

