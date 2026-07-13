import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Footprints, Timer, Plus } from 'lucide-react';

export default function ActivityTracker({ pasos, minutosCardio, metaPasos, metaCardio, onUpdatePasos, onUpdateCardio }) {
  const goalPasos = metaPasos || 10000;
  const goalCardio = metaCardio || 20;
  const progressPercent = Math.min((pasos / goalPasos) * 100, 100) || 0;

  const handlePasosChange = (e) => {
    const val = parseInt(e.target.value) || 0;
    onUpdatePasos(val);
  };

  const handleCardioChange = (e) => {
    const val = parseInt(e.target.value) || 0;
    onUpdateCardio(val);
  };

  return (
    <motion.div 
      className="col-span-1 md:col-span-2 lg:col-span-1 bg-zinc-950/60 backdrop-blur-md border border-zinc-800/50 shadow-xl shadow-black/50 p-6 rounded-2xl relative overflow-hidden group hover:border-orange-500/50 hover:shadow-[0_0_15px_rgba(249,115,22,0.15)] transition-all duration-300 min-h-[220px] flex flex-col justify-between"
    >
      <div className="flex items-center gap-3 mb-6 text-orange-500 shrink-0">
        <Footprints size={18} />
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-300">Actividad Física</h3>
      </div>

      <div className="flex flex-col gap-6 relative z-10 flex-1">
        {/* Pasos */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-end">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Pasos Diarios</label>
            <div className="flex gap-2">
              <button onClick={() => onUpdatePasos(pasos + 1000)} className="bg-zinc-900 hover:bg-orange-500/20 text-zinc-400 hover:text-orange-500 text-[10px] font-bold px-2 py-1 rounded border border-zinc-800 hover:border-orange-500/50 transition-colors flex items-center gap-1">
                +1000
              </button>
              <button onClick={() => onUpdatePasos(pasos + 5000)} className="bg-zinc-900 hover:bg-orange-500/20 text-zinc-400 hover:text-orange-500 text-[10px] font-bold px-2 py-1 rounded border border-zinc-800 hover:border-orange-500/50 transition-colors flex items-center gap-1">
                +5000
              </button>
            </div>
          </div>
          <input 
            type="number" 
            inputMode="numeric"
            value={pasos || ''} 
            onChange={handlePasosChange}
            placeholder="0"
            className="bg-zinc-900/50 border border-zinc-800 rounded px-3 py-2 text-xl font-black font-bebas tracking-wider text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all w-full text-right"
          />
          
          {/* Progress Bar */}
          <div className="mt-1">
            <div className="flex justify-between text-[10px] font-bold text-zinc-500 mb-1 tracking-widest">
              <span>META: {goalPasos >= 1000 ? `${goalPasos/1000}K` : goalPasos}</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden shadow-inner">
              <motion.div 
                initial={{ width: 0 }} 
                animate={{ width: `${progressPercent}%` }} 
                className="h-full bg-orange-500"
                style={{ filter: 'drop-shadow(0px 0px 4px rgba(249,115,22,0.8))' }}
              />
            </div>
          </div>
        </div>

        {/* Cardio */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-end">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-1">
              <Timer size={12} /> Min Cardio (Meta: {goalCardio})
            </label>
            <button onClick={() => onUpdateCardio(minutosCardio + 15)} className="bg-zinc-900 hover:bg-orange-500/20 text-zinc-400 hover:text-orange-500 text-[10px] font-bold px-2 py-1 rounded border border-zinc-800 hover:border-orange-500/50 transition-colors flex items-center gap-1">
              +15 MIN
            </button>
          </div>
          <input 
            type="number" 
            inputMode="numeric"
            value={minutosCardio || ''} 
            onChange={handleCardioChange}
            placeholder="0"
            className="bg-zinc-900/50 border border-zinc-800 rounded px-3 py-2 text-xl font-black font-bebas tracking-wider text-white focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all w-full text-right"
          />
        </div>
      </div>
    </motion.div>
  );
}
