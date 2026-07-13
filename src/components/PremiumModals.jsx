import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarPlus, Dumbbell, Trash2, Plus } from 'lucide-react';

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
          onClick={(e) => { e.stopPropagation(); onClose(); }}
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0a0a0a] border border-red-900/50 rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-2xl relative overflow-hidden"
          >
            <div className="absolute -right-6 -top-6 text-red-900/20 rotate-12 pointer-events-none">
              <Trash2 size={120} strokeWidth={1} />
            </div>

            <div className="relative z-10 text-center">
              <div className="inline-flex bg-red-900/20 p-4 rounded-full border border-red-900/30 text-red-500 mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-zinc-100 uppercase tracking-tighter mb-2">{title}</h3>
              <p className="text-zinc-400 text-xs tracking-widest uppercase mb-8 leading-relaxed">{message}</p>

              <div className="flex gap-3">
                <button 
                  onClick={(e) => { e.stopPropagation(); onClose(); }}
                  className="flex-1 py-4 text-zinc-400 font-black text-xs tracking-widest uppercase hover:bg-zinc-900 rounded-xl transition-colors border border-transparent hover:border-zinc-800"
                >
                  Cancelar
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onConfirm(e); }}
                  className="flex-[1.5] bg-red-600 hover:bg-red-500 text-white font-black text-xs tracking-widest uppercase py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(220,38,38,0.2)] hover:shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                >
                  Destruir
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ActionModal({ isOpen, onClose, onSubmit, title, placeholder }) {
  const [value, setValue] = useState('');
  useEffect(() => { if (isOpen) setValue(''); }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-[#0a0a0a] border border-zinc-800 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative overflow-hidden"
          >
            {/* Decal */}
            <div className="absolute -right-6 -top-6 text-zinc-900/40 rotate-12 pointer-events-none">
              <CalendarPlus size={120} strokeWidth={1} />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="bg-brand-red/10 p-3 rounded-xl border border-brand-red/20 text-brand-red">
                  <Dumbbell size={28} />
                </div>
                <h3 className="text-xl font-black text-zinc-100 uppercase tracking-tighter">{title}</h3>
              </div>

              <input 
                type="text" 
                placeholder={placeholder}
                className="w-full bg-zinc-900/80 border border-zinc-800 text-zinc-100 p-4 rounded-xl focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red uppercase tracking-widest font-black placeholder:text-zinc-600 transition-all mb-8"
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') onSubmit(value); if (e.key === 'Escape') onClose(); }}
                autoFocus
              />

              <div className="flex gap-3">
                <button 
                  onClick={onClose}
                  className="flex-1 py-4 text-zinc-400 font-black text-xs tracking-widest uppercase hover:bg-zinc-900 rounded-xl transition-colors border border-transparent hover:border-zinc-800"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => onSubmit(value)}
                  className="flex-[2] bg-brand-red hover:bg-[#be123c] text-white font-black text-xs tracking-widest uppercase py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(225,29,72,0.15)] hover:shadow-[0_0_20px_rgba(225,29,72,0.3)] flex justify-center items-center gap-2"
                >
                  Inicializar <Plus size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
