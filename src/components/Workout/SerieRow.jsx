import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Trash2, Edit2, Save, X } from 'lucide-react';

export default function SerieRow({ serie, diaId, semanaId, setDiasMap }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(serie);

  const deleteSerie = async () => {
    if (!confirm('¿Borrar esta serie?')) return;
    await supabase.from('series').delete().eq('id', serie.id);
    setDiasMap(prev => {
      const dias = prev[semanaId].map(d => {
        if (d.id === diaId) return { ...d, series: d.series.filter(s => s.id !== serie.id) };
        return d;
      });
      return { ...prev, [semanaId]: dias };
    });
  };

  const saveEdit = async () => {
    const { data, error } = await supabase
      .from('series')
      .update({
        peso: parseFloat(editForm.peso),
        repeticiones: parseInt(editForm.repeticiones),
        rir: editForm.rir ? parseInt(editForm.rir) : null,
        notas: editForm.notas || null
      })
      .eq('id', serie.id)
      .select()
      .single();

    if (!error && data) {
      setDiasMap(prev => {
        const dias = prev[semanaId].map(d => {
          if (d.id === diaId) {
            return { ...d, series: d.series.map(s => s.id === serie.id ? data : s) };
          }
          return d;
        });
        return { ...prev, [semanaId]: dias };
      });
      setIsEditing(false);
    } else {
      alert('Error al actualizar');
    }
  };

  if (isEditing) {
    return (
      <div className="bg-zinc-900/80 border border-zinc-700/50 p-4 rounded-xl flex flex-col gap-3 relative shadow-inner">
        <div className="flex justify-between items-start">
          <span className="text-zinc-100 font-bold uppercase tracking-widest text-xs">{serie.ejercicio}</span>
          <div className="flex gap-2">
            <button type="button" onClick={saveEdit} className="text-[var(--color-neon-green)] hover:text-[#32e612] bg-zinc-950 p-1.5 rounded-md border border-zinc-800"><Save size={14} /></button>
            <button type="button" onClick={() => setIsEditing(false)} className="text-zinc-500 hover:text-white bg-zinc-950 p-1.5 rounded-md border border-zinc-800"><X size={14} /></button>
          </div>
        </div>

        <div className="flex items-end gap-3 mt-2">
          <div className="flex-1">
            <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest mb-1 block">Peso (kg)</label>
            <input type="number" step="0.5" inputMode="decimal" className="w-full bg-zinc-950 border border-brand-red rounded-sm px-2 py-1.5 text-center text-brand-red font-bold font-mono outline-none text-sm" value={editForm.peso} onChange={e => setEditForm({...editForm, peso: e.target.value})} autoFocus />
          </div>
          <div className="flex-1">
            <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest mb-1 block">Reps</label>
            <input type="number" inputMode="numeric" pattern="[0-9]*" className="w-full bg-zinc-950 border border-cyan-500 rounded-sm px-2 py-1.5 text-center text-cyan-500 font-bold font-mono outline-none text-sm" value={editForm.repeticiones} onChange={e => setEditForm({...editForm, repeticiones: e.target.value})} />
          </div>
          <div className="flex-1">
            <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest mb-1 block">RIR</label>
            <input type="number" max="5" min="0" inputMode="numeric" pattern="[0-9]*" className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-2 py-1.5 text-center text-zinc-300 font-mono outline-none text-sm" value={editForm.rir || ''} onChange={e => setEditForm({...editForm, rir: e.target.value})} />
          </div>
          <div className="flex-[2]">
            <label className="text-[9px] uppercase font-bold text-zinc-500 tracking-widest mb-1 block">Notas</label>
            <input type="text" className="w-full bg-zinc-950 border border-zinc-700 rounded-sm px-2 py-1.5 text-zinc-300 outline-none text-xs" value={editForm.notas || ''} onChange={e => setEditForm({...editForm, notas: e.target.value})} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/30 border border-zinc-800/50 p-3 sm:p-4 rounded-xl flex flex-col relative group/item hover:border-zinc-600/50 hover:bg-zinc-900/50 transition-all">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-zinc-600 font-black text-xs">S{serie.num_serie}</span>
          <h4 className="text-zinc-200 text-xs font-bold uppercase tracking-widest">{serie.ejercicio}</h4>
        </div>
        <div className="flex gap-2 opacity-100 sm:opacity-0 group-hover/item:opacity-100 transition-opacity">
          <button type="button" onClick={() => setIsEditing(true)} className="text-zinc-500 hover:text-[var(--color-neon-green)] transition-colors"><Edit2 size={14} /></button>
          <button type="button" onClick={deleteSerie} className="text-zinc-500 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
        </div>
      </div>
      
      <div className="flex justify-between items-end">
        <div className="flex gap-3 text-[10px] font-bold text-zinc-500 tracking-widest uppercase">
          {serie.rir != null && <span className="bg-zinc-950 px-2 py-0.5 rounded-sm border border-zinc-800">RIR: {serie.rir}</span>}
          {serie.notas && <span className="text-zinc-400 italic font-normal max-w-[120px] truncate block">{serie.notas}</span>}
        </div>
        <div className="flex gap-4 font-mono items-center">
          <span className="text-brand-red font-bold text-sm">{serie.peso} <span className="text-[10px] text-brand-red/60 font-sans">KG</span></span>
          <span className="text-cyan-500 font-bold text-sm">{serie.repeticiones} <span className="text-[10px] text-cyan-500/60 font-sans">REPS</span></span>
        </div>
      </div>
    </div>
  );
}
