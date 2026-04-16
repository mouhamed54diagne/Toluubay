import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FeedbackModuleProps {
  context: string;
}

export default function FeedbackModule({ context }: FeedbackModuleProps) {
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);

  const handleFeedback = (type: 'positive' | 'negative') => {
    setFeedback(type);
    setSubmitted(true);
    // Here we would typically send this to a backend/analytics
    console.log(`Feedback submitted for ${context}: ${type}`);
  };

  return (
    <div className="mt-4 pt-4 border-t border-[#1a1a1a]/5">
      <AnimatePresence mode="wait">
        {!submitted ? (
          <motion.div 
            key="feedback-prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between"
          >
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#1a1a1a]/40">
              Ce conseil vous a-t-il aidé ?
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => handleFeedback('positive')}
                className="w-8 h-8 rounded-full bg-[#f5f5f0] flex items-center justify-center text-[#5A5A40] hover:bg-[#5A5A40] hover:text-white transition-all shadow-sm"
              >
                <ThumbsUp size={14} />
              </button>
              <button 
                onClick={() => handleFeedback('negative')}
                className="w-8 h-8 rounded-full bg-[#f5f5f0] flex items-center justify-center text-red-400 hover:bg-red-400 hover:text-white transition-all shadow-sm"
              >
                <ThumbsDown size={14} />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="feedback-thanks"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 text-[#5A5A40]"
          >
            <CheckCircle2 size={14} />
            <p className="text-[10px] font-bold uppercase tracking-widest">
              Merci pour votre retour !
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
