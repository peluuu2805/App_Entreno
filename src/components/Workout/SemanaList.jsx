import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { ChevronDown, ChevronUp, Plus, Trash2, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DiaItem from './DiaItem';

export default function SemanaList({ semanas, setSemanas }) {
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState(null);
  const [diasMap, setDiasMap] = useState({});

  const toggleSemana = async (semanaId) => {
    if (expandedId === semanaId) {
      setExpandedId(null);
      return;
    }
    
    setExpandedId(semanaId);
    
    if (!diasMap[semanaId]) {
      const { data, error } = await supabase
        .from('dias')
        .select('*, series(*)')
        .eq('semana_id', semanaId)
        .order('orden', { ascending: true })
        .order('num_serie', { referencedTable: 'series', ascending: true });

      if (!error && data) {
        setDiasMap(prev => ({ ...prev, [semanaId]: data }));
      }
    }
  };

  const deleteSemana = async (e, id) => {
    e.stopPropagation();
    if (!confirm('¿Seguro que quieres borrar esta semana y todo su contenido?')) return;
    
    await supabase.from('semanas').delete().eq('id', id);
    setSemanas(semanas.filter(s => s.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const addDia = async (semanaId) => {
    const nombreDia = prompt('Nombre del día o rutina (Ej: Espalda, Pecho):');
    if (!nombreDia) return;

    const { data, error } = await supabase
      .from('dias')
      .insert([{ semana_id: semanaId, nombre: nombreDia, user_id: user.id }])
      .select()
      .single();

    if (!error && data) {
      data.series = [];
      setDiasMap(prev => ({
        ...prev,
        [semanaId]: [...(prev[semanaId] || []), data]
      }));
    } else {
      alert('Error: Ya existe un día con ese nombre en esta semana o hubo un fallo.');
    }
  };

  return (
    <div className="space-y-4">
      {semanas.map((semana) => {
        const isExpanded = expandedId === semana.id;
        const dias = diasMap[semana.id] || [];

        return (
          <div key={semana.id} className="bg-zinc-950/60 backdrop-blur-md border border-zinc-800/50 rounded-2xl overflow-hidden group hover:border-zinc-700/50 transition-all shadow-sm">
            {/* Header Acordeón */}
            <div 
              className="p-5 flex justify-between items-center cursor-pointer bg-zinc-900/40 hover:bg-zinc-900/80 transition-colors"
              onClick={() => toggleSemana(semana.id)}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center justify-center text-[var(--color-neon-green)] group-hover:border-[var(--color-neon-green)] transition-all">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="text-zinc-100 font-bold uppercase tracking-widest text-sm">{semana.nombre}</h3>
                  <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">{dias.length} DÍAS DE ENTRENAMIENTO</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={(e) => deleteSemana(e, semana.id)}
                  className="text-zinc-600 hover:text-red-500 p-2 rounded-xl transition-colors hover:bg-red-500/10"
                  title="Borrar Semana"
                >
                  <Trash2 size={18} />
                </button>
                {isExpanded ? <ChevronUp size={20} className="text-zinc-600" /> : <ChevronDown size={20} className="text-zinc-600" />}
              </div>
            </div>

            {/* Contenido Expandido */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 sm:p-6 bg-zinc-950/40 flex flex-col gap-6">
                    {dias.map(dia => (
                      <DiaItem 
                        key={dia.id} 
                        dia={dia} 
                        setDiasMap={setDiasMap} 
                        semanaId={semana.id} 
                      />
                    ))}

                    <button 
                      onClick={() => addDia(semana.id)}
                      className="flex items-center justify-center gap-2 w-full py-4 border border-dashed border-zinc-800 text-zinc-500 rounded-xl hover:text-[var(--color-neon-green)] hover:border-[var(--color-neon-green)] hover:bg-[var(--color-neon-green-dim)] transition-all font-bold tracking-widest text-xs uppercase"
                    >
                      <Plus size={16} /> Añadir Día de Entrenamiento
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
