import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { Trash2, Save, X, Zap } from 'lucide-react';
import SerieRow from './SerieRow';
import { motion } from 'framer-motion';

export default function DiaItem({ dia, setDiasMap, semanaId }) {
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [newForm, setNewForm] = useState({
    ejercicio: '', peso: '', repeticiones: '', rir: '', notas: ''
  });
  const [ghostData, setGhostData] = useState(null);

  useEffect(() => {
    if (!newForm.ejercicio || newForm.ejercicio.trim().length < 3) {
      setGhostData(null);
      return;
    }

    const fetchGhost = async () => {
      const searchStr = `%${newForm.ejercicio.trim()}%`;
      const num_serie_actual = dia.series.length > 0 ? dia.series.filter(s => s.ejercicio.toLowerCase() === newForm.ejercicio.trim().toLowerCase()).length + 1 : 1;

      const { data, error } = await supabase
        .from('series')
        .select('peso, repeticiones, ejercicio')
        .eq('user_id', user.id)
        .ilike('ejercicio', searchStr)
        .eq('num_serie', num_serie_actual)
        .neq('dia_id', dia.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setGhostData(data);
      } else {
        setGhostData(null);
      }
    };

    const timer = setTimeout(() => {
      fetchGhost();
    }, 500);

    return () => clearTimeout(timer);
  }, [newForm.ejercicio, dia.series, user.id, dia.id]);

  const deleteDia = async () => {
    if (!confirm(`¿Borrar el día "${dia.nombre}" y todas sus series?`)) return;
    
    await supabase.from('dias').delete().eq('id', dia.id);
    setDiasMap(prev => {
      const dias = prev[semanaId].filter(d => d.id !== dia.id);
      return { ...prev, [semanaId]: dias };
    });
  };

  const saveNewSerie = async (e) => {
    e.preventDefault();
    if (!newForm.ejercicio || !newForm.peso || !newForm.repeticiones) return;

    const num_serie = dia.series.length > 0 ? dia.series.filter(s => s.ejercicio === newForm.ejercicio).length + 1 : 1;

    const { data, error } = await supabase
      .from('series')
      .insert([{
        dia_id: dia.id,
        user_id: user.id,
        ejercicio: newForm.ejercicio,
        num_serie,
        peso: parseFloat(newForm.peso),
        repeticiones: parseInt(newForm.repeticiones),
        rir: newForm.rir ? parseInt(newForm.rir) : null,
        notas: newForm.notas || null
      }])
      .select()
      .single();

    if (!error && data) {
      setDiasMap(prev => {
        const dias = prev[semanaId].map(d => {
          if (d.id === dia.id) return { ...d, series: [...d.series, data] };
          return d;
        });
        return { ...prev, [semanaId]: dias };
      });
      setNewForm(f => ({ ...f, peso: '', repeticiones: '', rir: '', notas: '' }));
      document.getElementById(`peso-input-${dia.id}`)?.focus();
    } else {
      alert('Error guardando serie');
    }
  };

  return (
    <div className="bg-zinc-950/50 border border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-zinc-900/50 px-5 py-4 flex justify-between items-center border-b border-zinc-800">
        <h4 className="font-black text-brand-red tracking-widest uppercase text-xs">{dia.nombre}</h4>
        <button onClick={deleteDia} className="text-zinc-600 hover:text-red-500 transition-colors p-1" title="Borrar Día">
          <Trash2 size={16} />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {dia.series.map(serie => (
          <SerieRow key={serie.id} serie={serie} diaId={dia.id} semanaId={semanaId} setDiasMap={setDiasMap} />
        ))}
        
        {/* Formulario Añadir Inline */}
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/50 border border-zinc-700/50 p-4 rounded-xl flex flex-col gap-3 relative group/item"
          >
            <div className="flex justify-between items-start">
              <input 
                type="text" 
                placeholder="Nombre del Ejercicio..." 
                className="bg-transparent border-b border-zinc-700 focus:border-[var(--color-neon-green)] outline-none text-zinc-100 font-bold uppercase tracking-widest text-xs pb-1 w-2/3" 
                value={newForm.ejercicio} 
                onChange={e => setNewForm({...newForm, ejercicio: e.target.value})} 
                autoFocus 
              />
              <div className="flex gap-2">
                <button type="button" onClick={saveNewSerie} className="text-[var(--color-neon-green)] hover:text-[#32e612] bg-zinc-900 p-1.5 rounded-md border border-zinc-700"><Save size={14} /></button>
                <button type="button" onClick={() => setIsAdding(false)} className="text-zinc-500 hover:text-red-500 bg-zinc-900 p-1.5 rounded-md border border-zinc-700"><X size={14} /></button>
              </div>
            </div>
            
            <div className="flex items-end gap-3 mt-2">
              <div className="flex-1">
                <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest mb-1 block">Peso (kg)</label>
                <input 
                  type="number" id={`peso-input-${dia.id}`} step="0.5" inputMode="decimal" 
                  placeholder={ghostData ? `${ghostData.peso}` : "0"} 
                  className={`w-full bg-zinc-950 border border-zinc-800 rounded-sm px-2 py-1.5 text-center focus:border-brand-red text-brand-red font-bold font-mono outline-none text-sm ${ghostData && !newForm.peso ? 'placeholder-zinc-600 font-light italic' : ''}`}
                  value={newForm.peso} 
                  onChange={e => setNewForm({...newForm, peso: e.target.value})} 
                />
              </div>
              <div className="flex-1 relative">
                <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest mb-1 block">Reps</label>
                <div className="flex items-center gap-1">
                  <input 
                    type="number" inputMode="numeric" pattern="[0-9]*" 
                    placeholder={ghostData ? `${ghostData.repeticiones}` : "0"} 
                    className={`w-full bg-zinc-950 border border-zinc-800 rounded-sm px-2 py-1.5 text-center focus:border-cyan-500 text-cyan-500 font-bold font-mono outline-none text-sm ${ghostData && !newForm.repeticiones ? 'placeholder-zinc-600 font-light italic' : ''}`}
                    value={newForm.repeticiones} 
                    onChange={e => setNewForm({...newForm, repeticiones: e.target.value})} 
                  />
                  {ghostData && (!newForm.peso || !newForm.repeticiones) && (
                    <button 
                      type="button" 
                      onClick={() => setNewForm({...newForm, peso: ghostData.peso, repeticiones: ghostData.repeticiones})}
                      className="absolute -top-5 right-0 text-zinc-500 hover:text-cyan-400 transition-colors"
                      title="Autocompletar fantasma"
                    >
                      <Zap size={12} />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest mb-1 block">RIR</label>
                <input 
                  type="number" inputMode="numeric" pattern="[0-9]*" max="5" min="0" placeholder="-" 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-2 py-1.5 text-center focus:border-purple-500 text-zinc-300 font-mono outline-none text-sm" 
                  value={newForm.rir} onChange={e => setNewForm({...newForm, rir: e.target.value})} 
                />
              </div>
              <div className="flex-[2]">
                <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest mb-1 block">Notas</label>
                <input 
                  type="text" placeholder="..." 
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-sm px-2 py-1.5 focus:border-zinc-500 text-zinc-400 outline-none text-xs" 
                  value={newForm.notas} onChange={e => setNewForm({...newForm, notas: e.target.value})} 
                />
              </div>
            </div>
          </motion.div>
        )}

        {!isAdding && (
          <button 
            type="button"
            onClick={() => setIsAdding(true)}
            className="mt-2 text-[10px] font-bold tracking-widest uppercase text-zinc-500 hover:text-brand-red flex items-center justify-center gap-1 p-3 border border-dashed border-zinc-800 rounded-xl transition-all hover:bg-brand-red/5 hover:border-brand-red/30"
          >
            <Plus size={14} /> Añadir Serie
          </button>
        )}
      </div>
    </div>
  );
}
