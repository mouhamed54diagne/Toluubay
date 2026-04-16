/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
import { LogIn } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Ensure user exists in Firestore
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
        setUser(user);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5A5A40]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-white rounded-3xl shadow-lg flex items-center justify-center mb-8 border border-[#1a1a1a]/5">
          <h1 className="text-4xl font-serif italic text-[#5A5A40]">T</h1>
        </div>
        <h1 className="text-3xl font-serif italic text-[#5A5A40] mb-2">TooluBaay</h1>
        <p className="text-sm text-[#1a1a1a]/60 mb-12 max-w-xs">
          Connectez-vous pour accéder à vos conseils personnalisés et votre carnet de champ.
        </p>
        <button
          onClick={handleLogin}
          className="w-full max-w-xs bg-[#5A5A40] text-white py-4 rounded-3xl font-bold shadow-lg flex items-center justify-center gap-3 hover:opacity-90 transition-opacity"
        >
          <LogIn size={20} />
          Se connecter avec Google
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
        return <Chatbot />;
      case 'diagnostic':
        return <Diagnostic />;
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

