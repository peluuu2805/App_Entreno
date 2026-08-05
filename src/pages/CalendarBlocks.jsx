import { useState, useEffect, useRef } from 'react';
import { BarChart2, Activity, ChevronRight, ChevronLeft, Plus, ArrowUp, ArrowDown, Trash2, Edit2, Zap, CalendarPlus, Dumbbell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import SearchableExerciseSelect from '../components/Workout/SearchableExerciseSelect';
import { ConfirmModal, ActionModal } from '../components/PremiumModals';

function VisualEngineModel() {
  const meshRef = useRef();
  const lightRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (meshRef.current) {
      // Rotación base
      meshRef.current.rotation.y += 0.002;
      
      // Inclinación reactiva al ratón
      const targetX = (state.mouse.y * Math.PI) / 4;
      const targetY = (state.mouse.x * Math.PI) / 4;
      meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, targetX, 0.05);
      meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, -targetY, 0.05);
    }
    
    if (lightRef.current) {
      // Orbita circular
      lightRef.current.position.x = Math.sin(t * 1.5) * 4;
      lightRef.current.position.z = Math.cos(t * 1.5) * 4;
      lightRef.current.position.y = Math.sin(t * 0.5) * 2;
    }
  });

  return (
    <>
      <ambientLight intensity={0.1} color="#ffffff" />
      <pointLight ref={lightRef} intensity={10} color="#ff0000" distance={15} castShadow />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#333333" />

      <mesh ref={meshRef} castShadow receiveShadow>
        <icosahedronGeometry args={[2.5, 1]} />
        <meshStandardMaterial 
          color="#050505" 
          roughness={0.9} 
          metalness={0.5} 
          wireframe={false}
        />
      </mesh>
    </>
  );
}

function VisualEngine() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none opacity-60">
      <Canvas 
        shadows 
        camera={{ position: [0, 0, 8], fov: 45 }}
        eventSource={document.getElementById('root')}
        eventPrefix="client"
      >
        <fog attach="fog" args={['#050505', 5, 15]} />
        <VisualEngineModel />
      </Canvas>
    </div>
  );
}

function SerieRow({ serie, index, refreshData, ghostData }) {
  const [isEditing, setIsEditing] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [form, setForm] = useState({
    peso: serie.peso === 0 ? '' : serie.peso,
    repeticiones: serie.repeticiones === 0 ? '' : serie.repeticiones,
    rir: serie.rir ?? '',
    notas: serie.notas ?? ''
  });

  const handleUpdate = async () => {
    if (form.peso == serie.peso && form.repeticiones == serie.repeticiones && form.rir == (serie.rir ?? '') && form.notas == (serie.notas ?? '')) {
      setIsEditing(false);
      return;
    }

    const updates = {
      peso: parseFloat(form.peso) || 0,
      repeticiones: parseInt(form.repeticiones, 10) || 0,
      rir: form.rir !== '' ? parseInt(form.rir, 10) : null,
      notas: form.notas.trim() !== '' ? form.notas : null
    };

    const { error } = await supabase
      .from('series')
      .update(updates)
      .eq('id', serie.id);

    if (error) {
      toast.error('ERROR AL ACTUALIZAR: ' + error.message);
    } else {
      toast.success('Serie actualizada');
      refreshData();
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleUpdate();
    if (e.key === 'Escape') {
      setForm({ peso: serie.peso, repeticiones: serie.repeticiones, rir: serie.rir ?? '', notas: serie.notas ?? '' });
      setIsEditing(false);
    }
  };

  const handleBlur = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      handleUpdate();
    }
  };

  const handleDelete = async (e) => {
    if (e) e.stopPropagation();
    localStorage.removeItem('ironforge_insight_cache'); 
    const { error } = await supabase.from('series').delete().eq('id', serie.id);
    if (error) {
      toast.error('ERROR AL BORRAR: ' + error.message);
    } else {
      toast.success('Serie eliminada');
      refreshData();
    }
    setDeleteModalOpen(false);
  };

  return (
    <div className="bg-zinc-900/30 border border-zinc-800/50 p-3 rounded-xl flex flex-col relative group hover:border-zinc-600/50 hover:bg-zinc-900/50 transition-all w-full overflow-hidden">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-zinc-600 font-black text-xs">S{index + 1}</span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); setDeleteModalOpen(true); }}
          className="p-1.5 px-3 bg-zinc-900/80 rounded-sm text-[10px] uppercase tracking-widest font-bold text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-100 sm:opacity-0 group-hover:opacity-100 touch-manipulation"
        >
          Eliminar
        </button>
      </div>

      {isEditing ? (
        <div 
          className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 items-center bg-zinc-950 p-3 rounded-lg border border-brand-red/50 mt-1"
          onBlur={handleBlur}
        >
          <div className="col-span-1 relative">
            <span className="absolute -top-2 left-2 bg-zinc-950 text-[8px] text-brand-red font-bold px-1">PESO</span>
            <input 
              type="number" step="0.1" inputMode="decimal"
              placeholder={ghostData ? ghostData.peso : "0"}
              className={`w-full bg-zinc-900 text-brand-red font-bold p-2 rounded-md text-center focus:outline-none focus:border-brand-red border border-transparent ${ghostData && form.peso === '' ? 'placeholder-zinc-500 font-light italic' : ''}`}
              value={form.peso} onChange={e => setForm({...form, peso: e.target.value})}
              onKeyDown={handleKeyDown} autoFocus
            />
          </div>
          
          <div className="col-span-1 relative">
            <span className="absolute -top-2 left-2 bg-zinc-950 text-[8px] text-cyan-500 font-bold px-1">REPS</span>
            <input 
              type="number" inputMode="numeric" pattern="[0-9]*"
              placeholder={ghostData ? ghostData.repeticiones : "0"}
              className={`w-full bg-zinc-900 text-cyan-500 font-bold p-2 rounded-md text-center focus:outline-none focus:border-cyan-500 border border-transparent ${ghostData && form.repeticiones === '' ? 'placeholder-zinc-500 font-light italic' : ''}`}
              value={form.repeticiones} onChange={e => setForm({...form, repeticiones: e.target.value})}
              onKeyDown={handleKeyDown}
            />
          </div>
          
          {ghostData && (form.peso === '' || form.repeticiones === '') && (
            <button 
              type="button" 
              onClick={() => setForm({...form, peso: ghostData.peso, repeticiones: ghostData.repeticiones})}
              className="col-span-2 flex items-center justify-center gap-2 text-zinc-500 hover:text-cyan-400 transition-colors p-2 bg-zinc-900/50 rounded-md border border-zinc-800 border-dashed"
              title="Autocompletar fantasma"
            >
              <Zap size={14} /> <span className="text-[10px] font-bold uppercase">Autocompletar</span>
            </button>
          )}
          
          <div className="col-span-1 relative">
            <span className="absolute -top-2 left-2 bg-zinc-950 text-[8px] text-zinc-500 font-bold px-1">RIR</span>
            <input 
              type="number" placeholder="-" inputMode="numeric" pattern="[0-9]*"
              className="w-full bg-zinc-900 text-zinc-300 p-2 rounded-md text-center focus:outline-none border border-transparent"
              value={form.rir} onChange={e => setForm({...form, rir: e.target.value})}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="col-span-2 sm:flex-[2] relative mt-2 sm:mt-0">
            <input 
              type="text" placeholder="Anotaciones..."
              className="w-full bg-zinc-900 text-zinc-300 p-2 rounded-md focus:outline-none border border-transparent text-xs"
              value={form.notas} onChange={e => setForm({...form, notas: e.target.value})}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>
      ) : (
        <div 
          onClick={() => setIsEditing(true)}
          className="flex flex-col sm:flex-row sm:justify-between items-start sm:items-end gap-3 cursor-text mt-1 w-full"
        >
          <div className="flex flex-wrap gap-2 text-[10px] font-bold text-zinc-500 tracking-widest uppercase w-full sm:w-auto">
            {serie.rir != null && <span className="bg-zinc-950 px-2 py-1 rounded-md border border-zinc-800 shrink-0">RIR: {serie.rir}</span>}
            {serie.notas && <span className="text-zinc-400 italic font-normal block w-full sm:w-auto sm:max-w-[150px] truncate leading-relaxed">{serie.notas}</span>}
          </div>
          <div className="flex gap-4 font-mono items-center self-end shrink-0 bg-zinc-950/50 p-2 rounded-lg border border-zinc-800/50 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-brand-red font-bold text-base">{serie.peso} <span className="text-[10px] text-brand-red/60 font-sans">KG</span></span>
            <span className="text-cyan-500 font-bold text-base">{serie.repeticiones} <span className="text-[10px] text-cyan-500/60 font-sans">REPS</span></span>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="¿ELIMINAR SERIE?"
        message="Esta acción es irreversible."
      />
    </div>
  );
}

function EjercicioBlock({ bloque, bloqueIndex, totalBloques, onMoveBlock, dia, user, refreshData }) {
  const [parent] = useAutoAnimate();
  const [notas, setNotas] = useState(bloque.ejercicioNotas || '');
  const [ghostSets, setGhostSets] = useState([]);

  useEffect(() => {
    setNotas(bloque.ejercicioNotas || '');
  }, [bloque.ejercicioNotas]);

  useEffect(() => {
    const fetchGhost = async () => {
      // Find the most recent dia_id where this exercise was performed (excluding this day)
      const { data: lastSet } = await supabase
        .from('series')
        .select('dia_id')
        .eq('user_id', user.id)
        .eq('ejercicio_id', bloque.ejercicio_id)
        .neq('dia_id', dia.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (lastSet?.dia_id) {
        // Fetch all sets for that exercise on that day
        const { data: pastSets } = await supabase
          .from('series')
          .select('peso, repeticiones, orden')
          .eq('dia_id', lastSet.dia_id)
          .eq('ejercicio_id', bloque.ejercicio_id)
          .order('orden', { ascending: true });
          
        if (pastSets) {
          setGhostSets(pastSets);
        }
      }
    };
    fetchGhost();
  }, [bloque.ejercicio_id, user.id, dia.id]);

  const handleUpdateNotas = async () => {
    if (notas === (bloque.ejercicioNotas || '')) return;
    const { error } = await supabase.from('ejercicios').update({ notas }).eq('id', bloque.ejercicio_id);
    if (!error) {
      toast.success('Anotaciones guardadas');
      refreshData();
    } else {
      toast.error('ERROR AL GUARDAR NOTAS');
    }
  };

  const handleAddSerie = async () => {
    const maxOrdenInBlock = bloque.series.length > 0 ? Math.max(...bloque.series.map(s => s.orden)) : bloque.minOrden;
    const newOrden = maxOrdenInBlock + 1; 

    localStorage.removeItem('ironforge_insight_cache'); 
    const { error } = await supabase.from('series').insert([{
      dia_id: dia.id,
      user_id: user.id,
      ejercicio_id: bloque.ejercicio_id,
      ejercicio: bloque.ejercicioNombre,
      peso: 0,
      repeticiones: 0,
      orden: Math.ceil(newOrden)
    }]);

    if (error) {
      toast.error('ERROR AL AÑADIR SERIE: ' + error.message);
    } else {
      refreshData();
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl mb-6 shadow-sm overflow-hidden">
      <div className="flex justify-between items-center p-4 bg-zinc-900/50 border-b border-zinc-800 group">
        <h4 className="text-sm font-black text-brand-red uppercase tracking-widest">{bloque.ejercicioNombre}</h4>
        <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onMoveBlock(bloqueIndex, 'up')} 
            disabled={bloqueIndex === 0}
            className="text-zinc-500 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors p-1"
          >
            <ArrowUp size={16} strokeWidth={3} />
          </button>
          <button 
            onClick={() => onMoveBlock(bloqueIndex, 'down')} 
            disabled={bloqueIndex === totalBloques - 1}
            className="text-zinc-500 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-500 transition-colors p-1"
          >
            <ArrowDown size={16} strokeWidth={3} />
          </button>
        </div>
      </div>
      
      <div ref={parent} className="p-4 space-y-3">
        {bloque.series.map((serie, idx) => (
          <SerieRow key={serie.id} index={idx} serie={serie} refreshData={refreshData} ghostData={ghostSets[idx]} />
        ))}
        
        <button 
          type="button"
          onClick={(e) => { e.preventDefault(); handleAddSerie(); }}
          className="w-full text-[10px] text-zinc-500 hover:text-brand-red font-bold tracking-widest uppercase py-3 border border-dashed border-zinc-800 hover:border-brand-red/30 hover:bg-brand-red/5 rounded-xl transition-all mt-2 touch-manipulation relative z-50 flex items-center justify-center gap-1"
        >
          <Plus size={14} /> Añadir Serie
        </button>
      </div>

      <div className="px-4 pb-4">
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          onBlur={handleUpdateNotas}
          placeholder="Anotaciones (RPE, sensaciones, técnica...)"
          className="w-full bg-zinc-950 border border-zinc-800/50 text-zinc-400 italic text-xs p-3 rounded-xl focus:border-brand-red/50 outline-none resize-none min-h-[40px] custom-scrollbar transition-colors"
        />
      </div>
    </div>
  );
}

function GhostBlock({ onCommit, onCancel, ejercicios, user, refreshEjercicios }) {
  const [ejercicioId, setEjercicioId] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newNombre, setNewNombre] = useState('');
  const [newGrupo, setNewGrupo] = useState('');
  
  const handleCreateEjercicio = async () => {
    if (!newNombre.trim() || !newGrupo) {
      toast.error('NOMBRE Y GRUPO MUSCULAR SON OBLIGATORIOS');
      return;
    }
    const { data, error } = await supabase.from('ejercicios').insert([{ 
      nombre: newNombre.trim().toUpperCase(), 
      grupo_muscular_principal: newGrupo,
      user_id: user.id 
    }]).select();
    
    if (error) {
      toast.error('ERROR AL CREAR EJERCICIO: ' + error.message);
    } else {
      toast.success('EJERCICIO MAESTRO CREADO');
      await refreshEjercicios();
      setEjercicioId(data[0].id.toString());
      setIsCreating(false);
      setNewNombre('');
      setNewGrupo('');
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-sm mb-4 border-dashed relative z-[9999]">
      <div className="flex flex-col gap-2">
        <label className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">
          {isCreating ? "Crear Nuevo Ejercicio" : "Seleccionar Ejercicio"}
        </label>
        
        {isCreating ? (
          <div className="flex flex-col gap-2">
            <input 
              type="text" 
              placeholder="NOMBRE DEL EJERCICIO..." 
              value={newNombre}
              onChange={(e) => setNewNombre(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-100 p-2 rounded-sm text-sm focus:outline-none focus:border-brand-red/50 uppercase"
              autoFocus
            />
            <div className="relative">
              <select
                value={newGrupo}
                onChange={(e) => setNewGrupo(e.target.value)}
                className="w-full bg-zinc-950/80 backdrop-blur-md border border-zinc-800 text-zinc-100 p-2 rounded-sm text-sm focus:outline-none focus:border-brand-red/50 appearance-none uppercase"
              >
                <option value="" disabled>Seleccionar Grupo Muscular...</option>
                <option value="PECHO">PECHO</option>
                <option value="ESPALDA">ESPALDA</option>
                <option value="HOMBROS">HOMBROS</option>
                <option value="CUÁDRICEPS">CUÁDRICEPS</option>
                <option value="ISQUIOSURALES">ISQUIOSURALES</option>
                <option value="BÍCEPS">BÍCEPS</option>
                <option value="TRÍCEPS">TRÍCEPS</option>
                <option value="BRAZOS">BRAZOS</option>
                <option value="GEMELOS">GEMELOS</option>
                <option value="ABDOMEN">ABDOMEN</option>
                <option value="CORE">CORE</option>
                <option value="GLÚTEOS">GLÚTEOS</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-500">
                <ArrowDown size={14} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-2 h-[38px]">
            <SearchableExerciseSelect 
              value={ejercicioId}
              onChange={setEjercicioId}
              ejercicios={ejercicios}
              autoFocus
            />
            <button 
              type="button" 
              onClick={(e) => { e.preventDefault(); setIsCreating(true); }}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-4 md:py-2 rounded-sm transition-colors flex items-center justify-center touch-manipulation relative z-50"
              title="Crear Nuevo Ejercicio"
            >
              <Plus size={16} />
            </button>
          </div>
        )}

        <div className="flex gap-2 mt-2">
          <button 
            type="button"
            onClick={(e) => { 
              e.preventDefault(); 
              if (isCreating) { setIsCreating(false); setNewNombre(''); setNewGrupo(''); }
              else onCancel(); 
            }}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-black uppercase tracking-widest py-4 md:py-2 rounded-sm transition-colors touch-manipulation relative z-50"
          >
            Cancelar
          </button>
          {isCreating ? (
            <button 
              type="button"
              onClick={(e) => { e.preventDefault(); handleCreateEjercicio(); }}
              className="flex-1 bg-brand-red hover:bg-[#be123c] text-zinc-950 text-[10px] font-black uppercase tracking-widest py-4 md:py-2 rounded-sm transition-colors touch-manipulation relative z-50"
            >
              Guardar Ejercicio
            </button>
          ) : (
            <button 
              type="button"
              onClick={(e) => { e.preventDefault(); if (ejercicioId) onCommit(ejercicioId); }}
              disabled={!ejercicioId}
              className="flex-1 bg-brand-red hover:bg-[#be123c] disabled:opacity-50 disabled:hover:bg-brand-red text-zinc-950 text-[10px] font-black uppercase tracking-widest py-4 md:py-2 rounded-sm transition-colors touch-manipulation relative z-50"
            >
              Aceptar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DiaItem({ dia, user, ejercicios, refreshData, refreshEjercicios }) {
  const [parent] = useAutoAnimate();
  const [isEditingNombre, setIsEditingNombre] = useState(false);
  const [diaNombre, setDiaNombre] = useState(dia.nombre);
  const [ghostBlocks, setGhostBlocks] = useState([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const sortedSeries = dia.series ? [...dia.series].sort((a, b) => a.orden - b.orden || a.id - b.id) : [];
  
  const bloquesMap = new Map();
  sortedSeries.forEach(s => {
    if (!bloquesMap.has(s.ejercicio_id)) {
      bloquesMap.set(s.ejercicio_id, {
        ejercicio_id: s.ejercicio_id,
        ejercicioNombre: s.ejercicios?.nombre || s.ejercicio || 'DESCONOCIDO',
        ejercicioNotas: s.ejercicios?.notas || '',
        series: [],
        minOrden: s.orden
      });
    }
    bloquesMap.get(s.ejercicio_id).series.push(s);
    bloquesMap.get(s.ejercicio_id).minOrden = Math.min(bloquesMap.get(s.ejercicio_id).minOrden, s.orden);
  });
  
  const bloques = Array.from(bloquesMap.values()).sort((a, b) => a.minOrden - b.minOrden);

  const handleMoveBlock = async (bloqueIndex, direction) => {
    const swapIndex = direction === 'up' ? bloqueIndex - 1 : bloqueIndex + 1;
    if (swapIndex < 0 || swapIndex >= bloques.length) return;

    const newBloquesOrder = [...bloques];
    const temp = newBloquesOrder[bloqueIndex];
    newBloquesOrder[bloqueIndex] = newBloquesOrder[swapIndex];
    newBloquesOrder[swapIndex] = temp;

    const updates = [];
    let currentOrden = 0;
    newBloquesOrder.forEach(b => {
      b.series.forEach(s => {
        updates.push({ id: s.id, orden: currentOrden });
        currentOrden++;
      });
    });

    const promises = updates.map(u => supabase.from('series').update({ orden: u.orden }).eq('id', u.id));
    await Promise.all(promises);
    refreshData();
  };

  const handleCommitGhostBlock = async (ghostId, selectedEjercicioId) => {
    const ejercicioSeleccionado = ejercicios.find(ej => ej.id.toString() === selectedEjercicioId.toString());
    const nombreEjercicio = ejercicioSeleccionado ? ejercicioSeleccionado.nombre : 'DESCONOCIDO';
    const maxOrden = sortedSeries.length > 0 ? Math.max(...sortedSeries.map(s => s.orden)) : -1;

    localStorage.removeItem('ironforge_insight_cache'); 
    const { error } = await supabase.from('series').insert([{
      dia_id: dia.id,
      user_id: user.id,
      ejercicio_id: selectedEjercicioId,
      ejercicio: nombreEjercicio,
      peso: 0,
      repeticiones: 0,
      orden: maxOrden + 1
    }]);
    
    if (!error) {
      setGhostBlocks(ghostBlocks.filter(g => g.id !== ghostId));
      refreshData();
    } else {
      toast.error('ERROR AL CREAR BLOQUE: ' + error.message);
    }
  };

  const handleDeleteDia = async () => {
    const { error } = await supabase.from('dias').delete().eq('id', dia.id);
    if (error) toast.error('ERROR AL BORRAR: ' + error.message);
    else {
      toast.success('Módulo de día destruido');
      refreshData();
    }
    setDeleteModalOpen(false);
  };

  const handleUpdateDia = async () => {
    if (!diaNombre.trim() || diaNombre === dia.nombre) {
      setIsEditingNombre(false);
      return;
    }
    const { error } = await supabase.from('dias').update({ nombre: diaNombre.toUpperCase() }).eq('id', dia.id);
    if (error) toast.error('ERROR AL RENOMBRAR: ' + error.message);
    else {
      toast.success('Módulo renombrado');
      refreshData();
    }
    setIsEditingNombre(false);
  };

  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-zinc-800/50 p-6 rounded-2xl mt-6 shadow-sm overflow-hidden group/dia">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-zinc-800 gap-4">
        
        {isEditingNombre ? (
          <input 
            type="text"
            className="flex-1 bg-zinc-900 border border-brand-red/50 text-sm font-black text-zinc-100 uppercase tracking-widest p-2 rounded-lg focus:outline-none"
            value={diaNombre}
            onChange={e => setDiaNombre(e.target.value)}
            onBlur={handleUpdateDia}
            onKeyDown={(e) => {
              if(e.key === 'Enter') handleUpdateDia();
              if(e.key === 'Escape') { setDiaNombre(dia.nombre); setIsEditingNombre(false); }
            }}
            autoFocus
          />
        ) : (
          <div className="flex items-center gap-3">
            <h5 className="text-lg font-black text-white uppercase tracking-widest">{dia.nombre}</h5>
            <div className="flex gap-1 opacity-100 md:opacity-0 group-hover/dia:opacity-100 transition-opacity">
              <button 
                onClick={() => setIsEditingNombre(true)}
                className="p-1.5 px-3 bg-zinc-900/50 rounded-sm text-[10px] uppercase tracking-widest font-bold text-zinc-400 hover:text-brand-red hover:bg-brand-red/10 transition-colors"
              >
                Editar
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setDeleteModalOpen(true); }}
                className="p-1.5 px-3 bg-zinc-900/50 rounded-sm text-[10px] uppercase tracking-widest font-bold text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        )}
      </div>

      <div ref={parent}>
        {bloques.map((bloque, index) => (
          <EjercicioBlock 
            key={bloque.ejercicio_id} 
            bloque={bloque} 
            bloqueIndex={index} 
            totalBloques={bloques.length} 
            onMoveBlock={handleMoveBlock} 
            dia={dia}
            user={user}
            refreshData={refreshData}
          />
        ))}

        {ghostBlocks.map(g => (
          <GhostBlock 
            key={g.id}
            ejercicios={ejercicios}
            user={user}
            refreshEjercicios={refreshEjercicios}
            onCommit={(ejId) => handleCommitGhostBlock(g.id, ejId)}
            onCancel={() => setGhostBlocks(ghostBlocks.filter(ghost => ghost.id !== g.id))}
          />
        ))}

        {bloques.length === 0 && ghostBlocks.length === 0 && (
          <p className="text-[10px] text-zinc-600 font-bold tracking-widest uppercase py-4 text-center mb-4 border border-dashed border-zinc-800 rounded-xl">MÓDULO DE ENTRENAMIENTO VACÍO</p>
        )}

        <button 
          type="button"
          onClick={(e) => { e.preventDefault(); setGhostBlocks([...ghostBlocks, { id: Date.now() }]); }}
          className="w-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-black tracking-widest text-xs py-4 md:py-3 rounded-xl transition-colors uppercase flex items-center justify-center gap-2 mt-4 touch-manipulation relative z-50 hover:border-brand-red/30 hover:text-white"
        >
          <Plus size={16} /> Añadir Nuevo Ejercicio
        </button>
      </div>

      <ConfirmModal 
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteDia}
        title={`¿DESTRUIR DÍA ${dia.nombre}?`}
        message="Todas las series y datos asociados se perderán."
      />
    </div>
  );
}

function SemanaCard({ semana, onInspect, refreshData }) {
  const [isEditing, setIsEditing] = useState(false);
  const [nombre, setNombre] = useState(semana.nombre);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const handleDelete = async (e) => {
    if (e) e.stopPropagation();
    const { error } = await supabase.from('semanas').delete().eq('id', semana.id);
    if (error) toast.error('ERROR AL BORRAR: ' + error.message);
    else {
      toast.success('Bloque de semana destruido');
      refreshData();
    }
    setDeleteModalOpen(false);
  };

  const handleUpdate = async () => {
    if (!nombre.trim() || nombre === semana.nombre) {
      setIsEditing(false);
      return;
    }
    const { error } = await supabase.from('semanas').update({ nombre: nombre.toUpperCase() }).eq('id', semana.id);
    if (error) toast.error('ERROR AL RENOMBRAR: ' + error.message);
    else {
      toast.success('Bloque renombrado');
      refreshData();
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleUpdate();
    if (e.key === 'Escape') {
      setNombre(semana.nombre);
      setIsEditing(false);
    }
  };

  return (
    <div className="bg-zinc-950/60 backdrop-blur-md border border-zinc-800/50 p-6 rounded-3xl shadow-xl shadow-black/50 flex flex-col transition-all duration-300 hover:border-brand-red/50 hover:shadow-[0_0_15px_rgba(225,29,72,0.15)] group relative overflow-hidden">
      {/* Decal background */}
      <div className="absolute -right-8 -top-8 text-zinc-900/30 rotate-12 pointer-events-none transition-transform group-hover:rotate-6 group-hover:scale-110 duration-500">
        <Activity size={120} strokeWidth={1} />
      </div>

      <div className="flex justify-between items-start mb-6 gap-4 relative z-10">
        <div className="flex-1">
          {isEditing ? (
            <input 
              type="text"
              className="w-full bg-zinc-900 border border-brand-red/50 text-xl font-black tracking-tighter text-zinc-100 p-2 rounded-lg focus:outline-none uppercase"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              onBlur={handleUpdate}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          ) : (
            <h4 
              onClick={() => onInspect(semana.id)}
              className="text-2xl font-black tracking-tighter text-zinc-100 uppercase cursor-pointer group-hover:text-brand-red transition-colors"
            >
              {semana.nombre}
            </h4>
          )}
          <span className="text-[10px] text-zinc-500 font-bold tracking-widest block mt-1 uppercase">
            ID REF: {semana.id}
          </span>
        </div>
        
        {!isEditing && (
          <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
              className="p-2 px-3 bg-zinc-900/50 rounded-lg text-[10px] uppercase tracking-widest font-bold text-zinc-400 hover:text-brand-red hover:bg-brand-red/10 transition-colors backdrop-blur-md"
            >
              Editar
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setDeleteModalOpen(true); }}
              className="p-2 px-3 bg-zinc-900/50 rounded-lg text-[10px] uppercase tracking-widest font-bold text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors backdrop-blur-md"
            >
              Eliminar
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 space-y-2 mb-8 relative z-10">
        <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mb-3">MÓDULOS DE ESTA SEMANA:</p>
        <div className="flex flex-wrap gap-2">
          {semana.dias?.slice().sort((a, b) => b.id - a.id).map(dia => (
            <span key={dia.id} className="text-xs bg-zinc-900/80 text-zinc-300 font-bold uppercase tracking-wider px-3 py-1.5 border border-zinc-800/50 rounded-lg shadow-sm">
              {dia.nombre}
            </span>
          ))}
          {(!semana.dias || semana.dias.length === 0) && (
            <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest px-3 py-1.5 border border-dashed border-zinc-800 rounded-lg">VACÍO</span>
          )}
        </div>
      </div>

      <button 
        onClick={() => onInspect(semana.id)}
        className="w-full bg-brand-red/10 hover:bg-brand-red text-brand-red hover:text-white font-black tracking-widest text-xs py-4 rounded-xl transition-all uppercase flex justify-center items-center gap-2 relative z-10"
      >
        INSPECCIONAR MÓDULO <ChevronRight size={16} strokeWidth={3} />
      </button>

      <ConfirmModal 
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title={`¿DESTRUIR BLOQUE ${semana.nombre}?`}
        message="Todo el contenido de la semana será eliminado."
      />
    </div>
  );
}

export default function CalendarBlocks() {
  const { user } = useAuth();
  const [semanas, setSemanas] = useState([]);
  const [ejercicios, setEjercicios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeWeekId, setActiveWeekId] = useState(null);
  const [parent] = useAutoAnimate();
  const [daysParent] = useAutoAnimate();
  const [promptModal, setPromptModal] = useState({ isOpen: false, type: null, targetId: null, title: '', placeholder: '' });

  const fetchEjercicios = async () => {
    if (!user) return;
    const { data } = await supabase.from('ejercicios').select('*').order('nombre');
    if (data) setEjercicios(data);
  };

  const fetchSemanas = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('semanas')
      .select('*, dias(*, series(*, ejercicios(nombre, notas)))')
      .order('created_at', { ascending: false })
      .order('id', { referencedTable: 'dias', ascending: false });
    
    if (error) {
      toast.error('ERROR AL CARGAR DATOS: ' + error.message);
    } else {
      setSemanas(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEjercicios();
    fetchSemanas();
  }, [user]);

  const handleAddSemana = () => {
    setPromptModal({ isOpen: true, type: 'semana', targetId: null, title: 'NUEVA SEMANA', placeholder: 'EJ. SEMANA 27' });
  };

  const handleAddDia = (semanaId) => {
    setPromptModal({ isOpen: true, type: 'dia', targetId: semanaId, title: 'NUEVO DÍA', placeholder: 'EJ. EMPUJE A' });
  };

  const handlePromptSubmit = async (nombre) => {
    if (!nombre.trim()) return;
    const { type, targetId } = promptModal;
    setPromptModal({ ...promptModal, isOpen: false });

    if (type === 'semana') {
      const { error } = await supabase.from('semanas').insert([{ nombre: nombre.toUpperCase(), user_id: user.id }]);
      if (error) toast.error("ERROR AL CREAR SEMANA: " + error.message);
      else { toast.success("SEMANA CREADA EN SERVIDOR"); fetchSemanas(); }
    } else if (type === 'dia') {
      const { error } = await supabase.from('dias').insert([{ nombre: nombre.toUpperCase(), semana_id: targetId, user_id: user.id }]);
      if (error) toast.error("ERROR AL CREAR DÍA: " + error.message);
      else { toast.success("DÍA CREADO EN SERVIDOR"); fetchSemanas(); }
    }
  };

  const totalSemanas = semanas.length;
  const totalSesiones = semanas.reduce((acc, sem) => acc + (sem.dias?.length || 0), 0);
  const activeWeek = semanas.find(s => s.id === activeWeekId);

  return (
    <>
      <VisualEngine />
      <div className="relative z-10">
      <section className="mb-12">
        <h2 className="text-4xl font-black tracking-tighter text-zinc-100 mb-2 uppercase">
          VISTA GENERAL <span className="text-brand-red">PROTOCOLO</span>
        </h2>
        <p className="text-zinc-500 text-sm font-light tracking-widest max-w-xl uppercase">
          ARQUITECTURA DE SISTEMA PARA MAXIMIZACIÓN DE FUERZA E HIPERTROFIA. SELECCIONE UN BLOQUE ACTIVO PARA CONTINUAR.
        </p>
      </section>

      <AnimatePresence mode="wait">
        {!activeWeekId ? (
          <motion.div 
            key="grid-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* HUD Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-800 border border-zinc-800 mb-12 rounded-sm overflow-hidden">
              <div className="bg-zinc-950 p-6 flex flex-col items-start">
                <BarChart2 className="text-zinc-600 mb-4" size={20} />
                <span className="text-4xl font-black text-zinc-100">{loading ? '-' : String(totalSemanas).padStart(2, '0')}</span>
                <span className="text-[10px] text-zinc-500 font-bold tracking-widest mt-1 uppercase">SEMANAS REGISTRADAS</span>
              </div>
              <div className="bg-zinc-950 p-6 flex flex-col items-start">
                <Activity className="text-brand-red mb-4" size={20} />
                <span className="text-4xl font-black text-zinc-100">{loading ? '-' : String(totalSesiones).padStart(2, '0')}</span>
                <span className="text-[10px] text-zinc-500 font-bold tracking-widest mt-1 uppercase">SESIONES TOTALES</span>
              </div>
              <div className="bg-zinc-950 p-6 flex flex-col items-start">
                <div className="w-5 h-5 border-2 border-brand-red mb-4 rounded-sm"></div>
                <span className="text-4xl font-black text-zinc-100">ON<span className="text-lg text-zinc-600">LINE</span></span>
                <span className="text-[10px] text-zinc-500 font-bold tracking-widest mt-1 uppercase">ESTADO CONEXIÓN</span>
              </div>
              <div className="bg-zinc-950 p-6 flex flex-col items-start justify-end">
                 <button 
                   onClick={handleAddSemana}
                   className="w-full bg-brand-red hover:bg-[#be123c] text-zinc-950 font-black tracking-widest text-xs py-4 rounded-sm transition-colors flex items-center justify-center gap-2 uppercase"
                 >
                   NUEVA SEMANA
                 </button>
              </div>
            </div>

            {/* Cards Grid */}
            <section>
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800">
                <h3 className="text-lg font-black tracking-widest text-zinc-300 uppercase">
                  BLOQUES ESTRUCTURALES
                </h3>
                <span className="text-xs text-zinc-600 font-light tracking-widest uppercase">DATOS: SUPABASE DB</span>
              </div>

              <div ref={parent} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading && <p className="text-zinc-500 font-bold tracking-widest text-sm uppercase">Sincronizando con servidor...</p>}
                {!loading && semanas.length === 0 && (
                   <p className="text-zinc-600 font-bold tracking-widest text-sm uppercase">NO HAY BLOQUES REGISTRADOS. INICIALICE UNA NUEVA SEMANA.</p>
                )}
                
                {semanas.map((semana) => (
                  <SemanaCard 
                    key={semana.id} 
                    semana={semana} 
                    onInspect={setActiveWeekId} 
                    refreshData={fetchSemanas} 
                  />
                ))}
              </div>
            </section>
          </motion.div>
        ) : activeWeek && (
          <motion.div
            key="focused-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-4 border-b border-zinc-800 gap-4">
              <div>
                <button 
                  onClick={() => setActiveWeekId(null)}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-black tracking-widest uppercase px-4 py-2 rounded-sm transition-colors mb-6 flex items-center gap-2"
                >
                  <ChevronLeft size={14} /> VOLVER AL BLOQUE GENERAL
                </button>
                <h3 className="text-3xl font-black tracking-tighter text-zinc-100 uppercase">
                  {activeWeek.nombre}
                </h3>
                <span className="text-xs text-brand-red font-bold tracking-widest block mt-1 uppercase">
                  VISTA ENFOCADA • MODO EDICIÓN
                </span>
              </div>
              <button 
                onClick={() => handleAddDia(activeWeek.id)}
                className="bg-brand-red hover:bg-[#be123c] text-zinc-950 px-4 py-3 rounded-sm transition-colors text-xs font-black tracking-widest flex items-center gap-2 uppercase"
              >
                <Plus size={14} /> Añadir Día de Entrenamiento
              </button>
            </div>

            <div ref={daysParent} className="space-y-6 pb-32">
              {activeWeek.dias?.slice().sort((a, b) => b.id - a.id).map(dia => (
                <DiaItem 
                  key={dia.id} 
                  dia={dia} 
                  user={user} 
                  ejercicios={ejercicios}
                  refreshData={fetchSemanas} 
                  refreshEjercicios={fetchEjercicios}
                />
              ))}
              {(!activeWeek.dias || activeWeek.dias.length === 0) && (
                <p className="text-xs text-zinc-600 font-bold tracking-widest uppercase p-8 border border-dashed border-zinc-800 rounded-sm text-center">
                  MÓDULOS DE ENTRENAMIENTO VACÍOS EN ESTA SEMANA
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>

      <ActionModal 
        isOpen={promptModal.isOpen}
        onClose={() => setPromptModal({ ...promptModal, isOpen: false })}
        onSubmit={handlePromptSubmit}
        title={promptModal.title}
        placeholder={promptModal.placeholder}
      />
    </>
  );
}
