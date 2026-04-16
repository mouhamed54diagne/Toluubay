import React from 'react';
import { motion } from 'motion/react';
import { Home, CloudSun, Calendar, MessageSquare, Camera, ClipboardList, LogOut } from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Accueil' },
    { id: 'weather', icon: CloudSun, label: 'Météo' },
    { id: 'calendar', icon: Calendar, label: 'Calendrier' },
    { id: 'chat', icon: MessageSquare, label: 'Chatbot' },
    { id: 'diagnostic', icon: Camera, label: 'Diagnostic' },
    { id: 'log', icon: ClipboardList, label: 'Carnet' },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a] font-sans pb-20">
      <header className="bg-white border-b border-[#1a1a1a]/10 p-4 sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <h1 className="text-2xl font-serif italic text-[#5A5A40]">TooluBaay</h1>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleLogout}
              className="p-2 text-[#1a1a1a]/30 hover:text-red-400 transition-colors"
              title="Déconnexion"
            >
              <LogOut size={18} />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#5A5A40] flex items-center justify-center text-white text-xs font-bold ring-2 ring-[#5A5A40]/10">
              {auth.currentUser?.displayName?.substring(0, 2).toUpperCase() || 'JD'}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#1a1a1a]/10 px-2 py-2 z-50">
        <div className="max-w-md mx-auto flex justify-between items-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center p-2 transition-colors ${
                activeTab === tab.id ? 'text-[#5A5A40]' : 'text-[#1a1a1a]/40'
              }`}
            >
              <tab.icon size={20} />
              <span className="text-[10px] mt-1 font-medium uppercase tracking-wider">
                {tab.label}
              </span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="w-1 h-1 rounded-full bg-[#5A5A40] mt-1"
                />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
