import { ShieldAlert, Database, Edit2, Check, X, Cpu, Lock, Trophy, Flame, Zap, Target, Crown, Apple, Ruler } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { AI_PERSONA_LABELS } from '../lib/constants';

export default function Settings() {
  const { user } = useAuth();
  const [ejercicios, setEjercicios] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [aiPersona, setAiPersona] = useState('biomecanic');
  const [rachaActual, setRachaActual] = useState(0);
  const [rachaNutricion, setRachaNutricion] = useState(0); 
  const [rachaMedidas, setRachaMedidas] = useState(0);
  const [logroDesbloqueado, setLogroDesbloqueado] = useState(null);

  // Sistema de Notificaciones de Desbloqueo
  useEffect(() => {
     // Evaluamos de inmediato si las rachas coinciden con algún hito de medalla
     const allMedals = [
       { name: 'BRONCE (Forja)', req: 7, actual: rachaActual },
       { name: 'PLATA (Forja)', req: 30, actual: rachaActual },
       { name: 'ORO (Forja)', req: 90, actual: rachaActual },
       { name: 'LEYENDA S (Forja)', req: 365, actual: rachaActual },
       { name: 'BRONCE (Nutrición)', req: 30, actual: rachaNutricion },
       { name: 'PLATA (Nutrición)', req: 90, actual: rachaNutricion },
       { name: 'ORO (Nutrición)', req: 180, actual: rachaNutricion },
       { name: 'LEYENDA S (Nutrición)', req: 365, actual: rachaNutricion },
       { name: 'BRONCE (Evolución)', req: 2, actual: rachaMedidas },
       { name: 'PLATA (Evolución)', req: 6, actual: rachaMedidas },
       { name: 'ORO (Evolución)', req: 12, actual: rachaMedidas },
       { name: 'LEYENDA S (Evolución)', req: 24, actual: rachaMedidas }
     ];
     const newlyUnlocked = allMedals.find(m => m.actual > 0 && m.actual === m.req);
     if (newlyUnlocked) {
        setLogroDesbloqueado(newlyUnlocked);
     }
  }, [rachaActual, rachaNutricion, rachaMedidas]);

  useEffect(() => {
    if (!user) return;
    const fetchStreaks = async () => {
      const [ { data: dSeries }, { data: dNutri }, { data: dMedidas } ] = await Promise.all([
        supabase.from('series').select('created_at').eq('user_id', user.id),
        supabase.from('registros_alimentos').select('created_at').eq('user_id', user.id),
        supabase.from('medidas').select('created_at').eq('user_id', user.id)
      ]);


      const formatStr = (d) => {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
      };

      const calcularRachaDias = (dataArray) => {
        if (!dataArray || dataArray.length === 0) return 0;
        const fechasUnicas = [...new Set(dataArray.map(d => d.created_at.split('T')[0]))];
        const hoy = new Date();
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);

        const hoyStr = formatStr(hoy);
        const ayerStr = formatStr(ayer);

        let streak = 0;
        let currentDateToCheck = new Date();

        if (!fechasUnicas.includes(hoyStr) && !fechasUnicas.includes(ayerStr)) {
          return 0;
        }

        if (!fechasUnicas.includes(hoyStr) && fechasUnicas.includes(ayerStr)) {
           currentDateToCheck = ayer;
        }

        while (true) {
           const checkStr = formatStr(currentDateToCheck);
           if (fechasUnicas.includes(checkStr)) {
              streak++;
              currentDateToCheck.setDate(currentDateToCheck.getDate() - 1);
           } else {
              break;
           }
        }
        return streak;
      };

      const calcularRachaMeses = (dataArray) => {
        if (!dataArray || dataArray.length < 2) return 0;
        
        const mesesUnicos = [...new Set(dataArray.map(d => d.created_at.substring(0, 7)))];
        if (mesesUnicos.length === 0) return 0;
        
        mesesUnicos.sort().reverse();
        
        const hoy = new Date();
        const mesActual = hoy.toISOString().substring(0, 7);
        const mesPasadoDate = new Date();
        mesPasadoDate.setMonth(mesPasadoDate.getMonth() - 1);
        const mesPasado = mesPasadoDate.toISOString().substring(0, 7);

        let streak = 0;
        let currentMonthToCheck = new Date();

        if (!mesesUnicos.includes(mesActual) && !mesesUnicos.includes(mesPasado)) {
          return 0;
        }

        if (!mesesUnicos.includes(mesActual) && mesesUnicos.includes(mesPasado)) {
           currentMonthToCheck = mesPasadoDate;
        }

        while (true) {
           const checkStr = currentMonthToCheck.toISOString().substring(0, 7);
           if (mesesUnicos.includes(checkStr)) {
              streak++;
              currentMonthToCheck.setMonth(currentMonthToCheck.getMonth() - 1);
           } else {
              break;
           }
        }
        return streak > 1 ? streak : 0;
      };

      const rachaEntreno = calcularRachaDias(dSeries);
      const rachaNutri = calcularRachaDias(dNutri);
      const rachaEvo = calcularRachaMeses(dMedidas);

      setRachaActual(rachaEntreno);
      setRachaNutricion(rachaNutri);
      setRachaMedidas(rachaEvo);

      console.table({
        'Racha Global': 'Ver Dashboard',
        'Días Forja': rachaEntreno,
        'Días Nutrición': rachaNutri,
        'Meses Medidas': rachaEvo
      });
    };
    
    fetchStreaks();
  }, [user]);

  const fetchEjercicios = async () => {
    if (!user) return;
    const { data } = await supabase.from('ejercicios').select('*').order('nombre');
    if (data) setEjercicios(data);
  };

  const fetchUserSettings = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_settings').select('ai_persona').eq('user_id', user.id).single();
    if (data?.ai_persona) {
      setAiPersona(data.ai_persona);
    }
  };

  useEffect(() => {
    fetchEjercicios();
    fetchUserSettings();
  }, [user]);

  const handlePersonaChange = async (e) => {
    const newPersona = e.target.value;
    setAiPersona(newPersona);
    const { error } = await supabase.from('user_settings').update({ ai_persona: newPersona }).eq('user_id', user.id);
    if (error) {
      toast.error('ERROR AL ACTUALIZAR IA: ' + error.message);
    } else {
      toast.success('PERSONALIDAD IA ACTUALIZADA');
    }
  };

  const handleUpdate = async (id) => {
    if (!editName.trim()) {
      setEditingId(null);
      return;
    }
    const { error } = await supabase.from('ejercicios').update({ nombre: editName.toUpperCase() }).eq('id', id);
    if (error) {
      toast.error('ERROR AL ACTUALIZAR: ' + error.message);
    } else {
      toast.success('Ejercicio renombrado exitosamente');
      fetchEjercicios();
    }
    setEditingId(null);
  };

  const startEditing = (ej) => {
    setEditingId(ej.id);
    setEditName(ej.nombre);
  };

  const handleKeyDown = (e, id) => {
    if (e.key === 'Enter') handleUpdate(id);
    if (e.key === 'Escape') setEditingId(null);
  };

  return (
    <>
      <section className="mb-12">
        <h2 className="text-4xl font-black tracking-tighter text-zinc-100 mb-2 uppercase">
          PARÁMETROS <span className="text-brand-red">SISTEMA</span>
        </h2>
        <p className="text-zinc-500 text-sm font-light tracking-widest max-w-xl uppercase">
          CONFIGURACIÓN DE SEGURIDAD BYOK Y BASE DE DATOS MAESTRA.
        </p>
      </section>

      {/* Modal / Toast Notificación de Logro */}
      {logroDesbloqueado && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
           <div className="absolute inset-0 backdrop-blur-md bg-black/80" onClick={() => setLogroDesbloqueado(null)}></div>
           <div className="relative bg-[#0a0a0a] border-2 border-brand-red rounded-3xl p-8 flex flex-col items-center shadow-[0_0_50px_rgba(225,29,72,0.6)] animate-in fade-in zoom-in duration-500 max-w-sm w-full text-center">
             <div className="text-brand-red animate-bounce mb-6">
                <Crown size={80} strokeWidth={1.5} />
             </div>
             <h2 className="text-3xl font-black text-white uppercase font-bebas tracking-widest mb-2">¡LOGRO DESBLOQUEADO!</h2>
             <p className="text-brand-red text-xl font-bold uppercase tracking-widest mb-8">{logroDesbloqueado.name}</p>
             <button 
               onClick={() => setLogroDesbloqueado(null)}
               className="w-full bg-brand-red text-white font-black uppercase tracking-widest text-sm py-4 rounded-sm hover:bg-rose-700 transition-colors shadow-[0_0_20px_rgba(225,29,72,0.5)]"
             >
               Reclamar y Continuar
             </button>
           </div>
        </div>
      )}

      {/* Vitrina de Medallas (El Perfil) */}
      <div className="mb-12">
         <div className="flex items-center gap-3 mb-8">
           <Trophy className="text-brand-red" size={28} />
           <h3 className="text-3xl font-black tracking-widest text-zinc-100 uppercase font-bebas">SISTEMA DE LOGROS</h3>
         </div>

         <div className="space-y-12">
           {/* Categoria 1: Entrenamiento */}
           <section>
             <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-2">
               <Flame className="text-orange-500" size={20} />
               <h4 className="text-lg font-bold tracking-widest text-zinc-300 uppercase">LA FORJA (Entrenamiento)</h4>
             </div>
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: 'BRONCE', req: 7, bg: 'from-amber-600 to-amber-800', border: 'border-amber-700/50', shadow: 'rgba(217,119,6,0.6)', icon: <Flame size={32} /> },
                  { name: 'PLATA', req: 30, bg: 'from-slate-300 to-slate-500', border: 'border-slate-300/50', shadow: 'rgba(148,163,184,0.6)', icon: <Zap size={32} /> },
                  { name: 'ORO', req: 90, bg: 'from-yellow-400 to-amber-600', border: 'border-yellow-400/50', shadow: 'rgba(250,204,21,0.6)', icon: <Target size={32} /> },
                  { name: 'LEYENDA S', req: 365, bg: 'from-red-500 to-orange-600', border: 'border-red-500/50', shadow: 'rgba(239,68,68,0.6)', icon: <Crown size={32} /> }
                ].map((med, idx) => {
                   const isUnlocked = rachaActual >= med.req;
                   return (
                     <div key={idx} className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border transition-all duration-300 ${isUnlocked ? `bg-gradient-to-br ${med.bg} ${med.border} hover:scale-105 cursor-pointer` : 'bg-zinc-950 border-zinc-800/50 opacity-40 grayscale blur-[1px]'}`} style={{ boxShadow: isUnlocked ? `0 0 20px ${med.shadow}` : '' }}>
                       {isUnlocked ? <div className="mb-3 text-white drop-shadow-xl animate-pulse">{med.icon}</div> : <div className="absolute top-4 right-4 text-zinc-600 z-10"><Lock size={16} /></div>}
                       {!isUnlocked && <div className="mb-3 text-zinc-700">{med.icon}</div>}
                       <span className={`text-sm md:text-base font-black tracking-widest font-bebas mt-2 ${isUnlocked ? 'text-white drop-shadow-md' : 'text-zinc-600'}`}>{med.name}</span>
                       <span className={`text-[10px] md:text-xs font-bold tracking-widest mt-1 ${isUnlocked ? 'text-white/90' : 'text-zinc-700'}`}>{med.req} DÍAS</span>
                     </div>
                   );
                })}
             </div>
           </section>

           {/* Categoria 2: Nutrición */}
           <section>
             <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-2">
               <Apple className="text-green-500" size={20} />
               <h4 className="text-lg font-bold tracking-widest text-zinc-300 uppercase">EL COMBUSTIBLE (Nutrición)</h4>
             </div>
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: 'BRONCE', req: 30, bg: 'from-amber-600 to-amber-800', border: 'border-amber-700/50', shadow: 'rgba(217,119,6,0.6)', icon: <Apple size={32} /> },
                  { name: 'PLATA', req: 90, bg: 'from-slate-300 to-slate-500', border: 'border-slate-300/50', shadow: 'rgba(148,163,184,0.6)', icon: <Zap size={32} /> },
                  { name: 'ORO', req: 180, bg: 'from-green-400 to-emerald-600', border: 'border-green-400/50', shadow: 'rgba(74,222,128,0.6)', icon: <Target size={32} /> },
                  { name: 'LEYENDA S', req: 365, bg: 'from-cyan-400 to-blue-600', border: 'border-cyan-400/50', shadow: 'rgba(34,211,238,0.6)', icon: <Crown size={32} /> }
                ].map((med, idx) => {
                   const isUnlocked = rachaNutricion >= med.req;
                   return (
                     <div key={idx} className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border transition-all duration-300 ${isUnlocked ? `bg-gradient-to-br ${med.bg} ${med.border} hover:scale-105 cursor-pointer` : 'bg-zinc-950 border-zinc-800/50 opacity-40 grayscale blur-[1px]'}`} style={{ boxShadow: isUnlocked ? `0 0 20px ${med.shadow}` : '' }}>
                       {isUnlocked ? <div className="mb-3 text-white drop-shadow-xl animate-pulse">{med.icon}</div> : <div className="absolute top-4 right-4 text-zinc-600 z-10"><Lock size={16} /></div>}
                       {!isUnlocked && <div className="mb-3 text-zinc-700">{med.icon}</div>}
                       <span className={`text-sm md:text-base font-black tracking-widest font-bebas mt-2 ${isUnlocked ? 'text-white drop-shadow-md' : 'text-zinc-600'}`}>{med.name}</span>
                       <span className={`text-[10px] md:text-xs font-bold tracking-widest mt-1 ${isUnlocked ? 'text-white/90' : 'text-zinc-700'}`}>{med.req} DÍAS</span>
                     </div>
                   );
                })}
             </div>
           </section>

           {/* Categoria 3: Medidas */}
           <section>
             <div className="flex items-center gap-2 mb-4 border-b border-zinc-800 pb-2">
               <Ruler className="text-purple-500" size={20} />
               <h4 className="text-lg font-bold tracking-widest text-zinc-300 uppercase">LA EVOLUCIÓN (Medidas)</h4>
             </div>
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { name: 'BRONCE', req: 2, bg: 'from-amber-600 to-amber-800', border: 'border-amber-700/50', shadow: 'rgba(217,119,6,0.6)', icon: <Ruler size={32} /> },
                  { name: 'PLATA', req: 6, bg: 'from-slate-300 to-slate-500', border: 'border-slate-300/50', shadow: 'rgba(148,163,184,0.6)', icon: <Zap size={32} /> },
                  { name: 'ORO', req: 12, bg: 'from-purple-400 to-fuchsia-600', border: 'border-purple-400/50', shadow: 'rgba(192,132,252,0.6)', icon: <Target size={32} /> },
                  { name: 'LEYENDA S', req: 24, bg: 'from-pink-500 to-rose-600', border: 'border-pink-500/50', shadow: 'rgba(236,72,153,0.6)', icon: <Crown size={32} /> }
                ].map((med, idx) => {
                   const isUnlocked = rachaMedidas >= med.req;
                   return (
                     <div key={idx} className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border transition-all duration-300 ${isUnlocked ? `bg-gradient-to-br ${med.bg} ${med.border} hover:scale-105 cursor-pointer` : 'bg-zinc-950 border-zinc-800/50 opacity-40 grayscale blur-[1px]'}`} style={{ boxShadow: isUnlocked ? `0 0 20px ${med.shadow}` : '' }}>
                       {isUnlocked ? <div className="mb-3 text-white drop-shadow-xl animate-pulse">{med.icon}</div> : <div className="absolute top-4 right-4 text-zinc-600 z-10"><Lock size={16} /></div>}
                       {!isUnlocked && <div className="mb-3 text-zinc-700">{med.icon}</div>}
                       <span className={`text-sm md:text-base font-black tracking-widest font-bebas mt-2 ${isUnlocked ? 'text-white drop-shadow-md' : 'text-zinc-600'}`}>{med.name}</span>
                       <span className={`text-[10px] md:text-xs font-bold tracking-widest mt-1 ${isUnlocked ? 'text-white/90' : 'text-zinc-700'}`}>{med.req} MESES</span>
                     </div>
                   );
                })}
             </div>
           </section>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0a0a0a] border border-zinc-900 p-8 rounded-2xl shadow-xl shadow-black/50">
          <div className="flex items-center gap-3 mb-8 border-b border-zinc-800 pb-4">
            <ShieldAlert className="text-brand-red" size={24} />
            <h3 className="text-lg font-black tracking-widest text-zinc-300 uppercase">PROTOCOLOS BYOK</h3>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">GEMINI API KEY</label>
              <input 
                type="password" 
                className="w-full bg-black border border-zinc-800 rounded-sm px-4 py-3 text-sm focus:border-brand-red outline-none transition-colors text-zinc-300"
                placeholder="************************"
                disabled
              />
            </div>

            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-zinc-800">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="text-zinc-400" size={16} />
                <label className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">ARQUETIPO IA (PERSONALIDAD)</label>
              </div>
              <select 
                value={aiPersona} 
                onChange={handlePersonaChange}
                className="bg-black border border-zinc-800 text-brand-red p-3 rounded-sm focus:border-red-600 focus:outline-none w-full uppercase tracking-widest text-xs font-bold transition-colors cursor-pointer"
              >
                {Object.entries(AI_PERSONA_LABELS).map(([key, label]) => (
                   <option key={key} value={key} className="bg-black text-zinc-300">{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-[#0a0a0a] border border-zinc-900 p-8 rounded-2xl shadow-xl shadow-black/50 flex flex-col max-h-[600px]">
          <div className="flex items-center gap-3 mb-8 border-b border-zinc-800 pb-4 shrink-0">
            <Database className="text-brand-red" size={24} />
            <h3 className="text-lg font-black tracking-widest text-zinc-300 uppercase">BASE DE DATOS EJERCICIOS</h3>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {ejercicios.length === 0 && (
              <p className="text-[10px] text-zinc-600 font-bold tracking-widest uppercase">No hay ejercicios registrados.</p>
            )}
            {ejercicios.map(ej => (
              <div key={ej.id} className="bg-zinc-950 border border-zinc-900 p-3 rounded-xl flex justify-between items-center group hover:border-zinc-700 transition-colors">
                {editingId === ej.id ? (
                  <div className="flex-1 flex gap-2 mr-2">
                    <input 
                      type="text"
                      className="flex-1 bg-zinc-950 border border-brand-red/50 text-xs text-zinc-100 p-2 rounded-sm focus:outline-none uppercase"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => handleKeyDown(e, ej.id)}
                      autoFocus
                    />
                    <button onClick={() => handleUpdate(ej.id)} className="bg-brand-red hover:bg-[#be123c] text-zinc-950 p-2 rounded-sm transition-colors">
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingId(null)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded-sm transition-colors">
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">{ej.nombre}</span>
                    <button 
                      onClick={() => startEditing(ej)}
                      className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-brand-red transition-all p-1"
                    >
                      <Edit2 size={14} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

