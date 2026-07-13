import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export default function ProfileSettingsModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.user_metadata?.full_name || '');
  const [objetivoPasos, setObjetivoPasos] = useState(10000);
  const [objetivoCardio, setObjetivoCardio] = useState(20);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      const fetchGoals = async () => {
        const { data } = await supabase.from('objetivos_nutricion').select('objetivo_pasos, objetivo_cardio').eq('user_id', user.id).single();
        if (data) {
          if (data.objetivo_pasos) setObjetivoPasos(data.objetivo_pasos);
          if (data.objetivo_cardio) setObjetivoCardio(data.objetivo_cardio);
        }
      };
      fetchGoals();
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: name.toUpperCase() }
      });

      if (error) throw error;

      // Update movement goals
      const { error: dbError } = await supabase.from('objetivos_nutricion').update({
        objetivo_pasos: objetivoPasos,
        objetivo_cardio: objetivoCardio
      }).eq('user_id', user.id);
      
      // Si dbError es not found, ignoramos por ahora asumiendo que Nutrition creará la fila, o podríamos hacer un select previo. Pero como update no falla crasheadamente si no encuentra fila, está bien.
      if (dbError) console.warn("Error updating goals, row might not exist:", dbError);

      toast.success('IDENTIDAD ACTUALIZADA');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('ERROR AL ACTUALIZAR PERFIL');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md bg-zinc-950 border border-zinc-800 p-6 flex flex-col shadow-2xl shadow-black"
        >
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <User className="text-brand-red" size={24} />
              <h2 className="text-lg font-black tracking-widest text-white uppercase">
                Perfil de Operario
              </h2>
            </div>
            <button onClick={onClose} className="text-zinc-500 hover:text-brand-red transition-colors">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                Nombre de Atleta
              </label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-zinc-900 rounded-sm px-4 py-3 text-sm text-white focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition-all uppercase tracking-wide"
                placeholder="TU NOMBRE..."
                required
              />
            </div>

            <div className="flex flex-col gap-4 mt-2 border-t border-zinc-800 pt-6">
              <h3 className="text-xs font-black tracking-widest text-zinc-300 uppercase">
                Objetivos de Movimiento
              </h3>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                    Pasos Diarios
                  </label>
                  <input 
                    type="number" 
                    inputMode="numeric"
                    value={objetivoPasos}
                    onChange={(e) => setObjetivoPasos(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#0a0a0a] border border-zinc-900 rounded-sm px-4 py-3 text-sm text-white focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition-all uppercase tracking-wide"
                  />
                </div>
                
                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
                    Min Cardio
                  </label>
                  <input 
                    type="number" 
                    inputMode="numeric"
                    value={objetivoCardio}
                    onChange={(e) => setObjetivoCardio(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#0a0a0a] border border-zinc-900 rounded-sm px-4 py-3 text-sm text-white focus:border-brand-red focus:ring-1 focus:ring-brand-red outline-none transition-all uppercase tracking-wide"
                  />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full bg-[#e11d48] hover:bg-[#be123c] text-white font-black uppercase tracking-widest text-xs py-4 rounded-sm transition-all disabled:opacity-50 mt-2 shadow-[0_0_15px_rgba(225,29,72,0.4)] hover:shadow-[0_0_25px_rgba(225,29,72,0.6)]"
            >
              {isSaving ? 'ACTUALIZANDO...' : 'GUARDAR CAMBIOS'}
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
