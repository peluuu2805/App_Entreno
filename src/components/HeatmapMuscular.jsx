import React, { useMemo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MagicCard } from './MagicCard';
import { Activity, Smartphone } from 'lucide-react';

import anatomyBase from '../assets/clean_sci_fi_anatomy.png';

export default function HeatmapMuscular({ datosVolumen = {} }) {
  const [activeView, setActiveView] = useState('front'); // 'front' | 'back'
  
  const normalizeText = (text) => {
    if (!text) return '';
    return text.toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
  };
  
  const activeMap = useMemo(() => {
    const map = {};
    for (const [muscle, count] of Object.entries(datosVolumen)) {
      const norm = normalizeText(muscle);
      map[norm] = (map[norm] || 0) + count;
    }
    return map;
  }, [datosVolumen]);

  const getSeriesCount = (muscleId) => {
    const norm = normalizeText(muscleId);
    let count = activeMap[norm] || 0;

    // Frontal
    if (norm === 'CUADRICEPS') count += (activeMap['PIERNA'] || 0);
    if (norm === 'BRAZOS_FRONTALES') count += (activeMap['BICEPS'] || 0) + (activeMap['ANTEBRAZOS'] || 0) + (activeMap['BRAZOS'] || 0);
    if (norm === 'CORE') count += (activeMap['ABDOMEN'] || 0);
    
    // Trasero
    if (norm === 'ESPALDA') count += (activeMap['DORSALES'] || 0) + (activeMap['TRAPECIO'] || 0) + (activeMap['ESPALDA_ALTA'] || 0);
    if (norm === 'ESPALDA_BAJA') {
      count += (activeMap['LUMBAR'] || 0);
      if (!count && activeMap['ESPALDA']) count = activeMap['ESPALDA'];
    }
    if (norm === 'ISQUIOSURALES' || norm === 'GLUTEOS') count += (activeMap['PIERNA'] || 0);
    if (norm === 'PANTORRILLAS' || norm === 'GEMELOS') count += (activeMap['GEMELOS'] || 0) + (activeMap['PANTORRILLAS'] || 0) + (activeMap['PIERNA'] || 0);
    if (norm === 'DELTOIDES_POSTERIOR' || norm === 'HOMBROS') count += (activeMap['HOMBROS'] || 0) + (activeMap['DELTOIDES_POSTERIOR'] || 0);
    if (norm === 'TRICEPS') count += (activeMap['BRAZOS'] || 0);

    return count;
  };

  const getStyleData = (seriesCount) => {
    if (seriesCount === 0) {
      return { textColor: 'text-zinc-500', dotColor: 'bg-zinc-800', lineColor: 'bg-zinc-800', shadow: '', colorName: '' };
    }
    if (seriesCount <= 2) {
      return { textColor: 'text-blue-400', dotColor: 'bg-blue-600', lineColor: 'bg-blue-500/70', shadow: 'shadow-[0_0_10px_rgba(37,99,235,0.8)]', colorName: '(Mínima)' };
    }
    if (seriesCount <= 4) {
      return { textColor: 'text-emerald-400', dotColor: 'bg-emerald-500', lineColor: 'bg-emerald-500/70', shadow: 'shadow-[0_0_10px_rgba(16,185,129,0.8)]', colorName: '(Baja)' };
    }
    if (seriesCount <= 6) {
      return { textColor: 'text-yellow-400', dotColor: 'bg-yellow-400', lineColor: 'bg-yellow-400/70', shadow: 'shadow-[0_0_15px_rgba(250,204,21,0.8)]', colorName: '(Media)' };
    }
    if (seriesCount <= 8) {
      return { textColor: 'text-orange-500', dotColor: 'bg-orange-500', lineColor: 'bg-orange-500/70', shadow: 'shadow-[0_0_20px_rgba(249,115,22,0.8)]', colorName: '(Alta)' };
    }
    // Rango S (Peak)
    return { 
      textColor: 'text-red-500', 
      dotColor: 'bg-red-600', 
      lineColor: 'bg-red-500/70',
      shadow: 'shadow-[0_0_25px_rgba(220,38,38,1)] animate-pulse', 
      colorName: '(Máxima)' 
    };
  };

  // Coordenadas y tamaños de área para iluminación (width/height en %)
  // Se alternan 'align' a derecha/izquierda para evitar que las etiquetas colisionen verticalmente.
  const musclePoints = [
    // FRONTAL
    { id: 'HOMBROS', label: 'DELTOIDES', align: 'right', labelPos: { top: '23%', left: '24%' }, glows: [
      { top: '23%', left: '24%', width: '10%', height: '8%' },
      { top: '23%', left: '36%', width: '10%', height: '8%' }
    ]},
    { id: 'PECHO', label: 'PECTORALES', align: 'left', labelPos: { top: '27%', left: '36%' }, glows: [
      { top: '27%', left: '26%', width: '12%', height: '10%' },
      { top: '27%', left: '34%', width: '12%', height: '10%' }
    ]},
    { id: 'BRAZOS_FRONTALES', label: 'BÍCEPS', align: 'right', labelPos: { top: '35%', left: '23%' }, glows: [
      { top: '35%', left: '23%', width: '8%', height: '12%' },
      { top: '35%', left: '37%', width: '8%', height: '12%' }
    ]},
    { id: 'CORE', label: 'ABDOMINALES', align: 'left', labelPos: { top: '43%', left: '34%' }, glows: [
      { top: '43%', left: '30%', width: '14%', height: '16%' } 
    ]},
    { id: 'CUADRICEPS', label: 'CUÁDRICEPS', align: 'right', labelPos: { top: '55%', left: '26%' }, glows: [
      { top: '55%', left: '26%', width: '10%', height: '20%' },
      { top: '55%', left: '34%', width: '10%', height: '20%' }
    ]},
    { id: 'GEMELOS', label: 'GEMELOS', align: 'left', labelPos: { top: '75%', left: '34%' }, glows: [
      { top: '75%', left: '26%', width: '8%', height: '15%' },
      { top: '75%', left: '34%', width: '8%', height: '15%' }
    ]},

    // TRASERO
    { id: 'ESPALDA', label: 'DORSAL ANCHO', align: 'left', labelPos: { top: '32%', left: '74%' }, glows: [
      { top: '25%', left: '70%', width: '15%', height: '8%' }, 
      { top: '32%', left: '66%', width: '12%', height: '14%' }, 
      { top: '32%', left: '74%', width: '12%', height: '14%' }  
    ]},
    { id: 'TRICEPS', label: 'TRÍCEPS', align: 'right', labelPos: { top: '36%', left: '63%' }, glows: [
      { top: '36%', left: '63%', width: '8%', height: '12%' },
      { top: '36%', left: '77%', width: '8%', height: '12%' }
    ]},
    { id: 'ESPALDA_BAJA', label: 'LUMBAR', align: 'left', labelPos: { top: '44%', left: '74%' }, glows: [
      { top: '44%', left: '70%', width: '14%', height: '10%' } 
    ]},
    { id: 'GLUTEOS', label: 'GLÚTEOS', align: 'right', labelPos: { top: '51%', left: '66%' }, glows: [
      { top: '51%', left: '66%', width: '12%', height: '14%' },
      { top: '51%', left: '74%', width: '12%', height: '14%' }
    ]},
    { id: 'ISQUIOSURALES', label: 'ISQUIOS', align: 'left', labelPos: { top: '61%', left: '74%' }, glows: [
      { top: '61%', left: '66%', width: '10%', height: '18%' },
      { top: '61%', left: '74%', width: '10%', height: '18%' }
    ]},
    { id: 'PANTORRILLAS', label: 'GEMELOS', align: 'right', labelPos: { top: '75%', left: '66%' }, glows: [
      { top: '75%', left: '66%', width: '8%', height: '15%' },
      { top: '75%', left: '74%', width: '8%', height: '15%' }
    ]},
  ];

  return (
    <motion.div className="col-span-1 md:col-span-2 lg:col-span-3 h-[650px] md:h-[700px] flex">
      <MagicCard className="w-full h-full relative overflow-hidden bg-zinc-950 border border-zinc-800/50 rounded-3xl">
        
        {/* Header HUD */}
        <div className="absolute top-4 left-4 md:top-6 md:left-6 z-30 flex flex-col pointer-events-none bg-black/60 backdrop-blur-md p-3 md:p-4 rounded-2xl border border-white/5 shadow-2xl">
          <h2 className="text-sm md:text-lg font-black text-white uppercase tracking-wider drop-shadow-md">
            ANÁLISIS MUSCULAR
          </h2>
          <h3 className="text-[9px] md:text-xs font-semibold text-zinc-400 uppercase tracking-widest mt-1">
            MAPA DE CALOR TÉRMICO
          </h3>
        </div>

        {/* Toggle Mobile Front/Back */}
        <div className="absolute top-4 right-4 md:top-6 md:right-6 z-30 flex md:hidden bg-black/60 backdrop-blur-md rounded-full border border-zinc-700/50 p-1 shadow-2xl">
          <button 
            onClick={() => setActiveView('front')} 
            className={`px-4 py-2 rounded-full text-[10px] font-bold tracking-wider transition-all duration-300 ${activeView === 'front' ? 'bg-zinc-700 text-white shadow-md' : 'text-zinc-400'}`}
          >
            FRONT
          </button>
          <button 
            onClick={() => setActiveView('back')} 
            className={`px-4 py-2 rounded-full text-[10px] font-bold tracking-wider transition-all duration-300 ${activeView === 'back' ? 'bg-zinc-700 text-white shadow-md' : 'text-zinc-400'}`}
          >
            BACK
          </button>
        </div>

        {/* Leyenda HUD */}
        <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 w-[92%] max-w-lg px-4 py-3 bg-black/60 backdrop-blur-md rounded-2xl border border-white/5 shadow-2xl">
          <span className="text-[9px] md:text-xs font-bold text-white/90 uppercase tracking-[0.2em]">Intensidad:</span>
          <div className="flex items-center justify-between w-full gap-1 md:gap-2">
            <div className="flex flex-col items-center flex-1">
              <div className="w-full h-1.5 md:h-2 bg-red-600 rounded-l-full shadow-[0_0_8px_rgba(220,38,38,0.8)]"></div>
              <span className="text-[7px] md:text-[9px] text-zinc-300 mt-1 font-bold">Rojo</span>
            </div>
            <div className="flex flex-col items-center flex-1">
              <div className="w-full h-1.5 md:h-2 bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]"></div>
              <span className="text-[7px] md:text-[9px] text-zinc-300 mt-1 font-bold">Naranja</span>
            </div>
            <div className="flex flex-col items-center flex-1">
              <div className="w-full h-1.5 md:h-2 bg-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.8)]"></div>
              <span className="text-[7px] md:text-[9px] text-zinc-300 mt-1 font-bold">Amarillo</span>
            </div>
            <div className="flex flex-col items-center flex-1">
              <div className="w-full h-1.5 md:h-2 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
              <span className="text-[7px] md:text-[9px] text-zinc-300 mt-1 font-bold">Verde</span>
            </div>
            <div className="flex flex-col items-center flex-1">
              <div className="w-full h-1.5 md:h-2 bg-blue-600 rounded-r-full shadow-[0_0_8px_rgba(37,99,235,0.8)]"></div>
              <span className="text-[7px] md:text-[9px] text-zinc-300 mt-1 font-bold">Azul</span>
            </div>
          </div>
        </div>

        {/* CONTENEDOR LAYERED MASKING */}
        <div className="relative w-full h-full overflow-hidden">
          
          {/* Imagen Base con Wrapper deslizable para móvil */}
          <div 
            className={`absolute top-0 h-full w-[200%] md:w-full transition-transform duration-700 ease-in-out ${activeView === 'front' ? 'translate-x-0' : '-translate-x-1/2'} md:translate-x-0 flex justify-center items-center pb-8`}
          >
            <img 
              src={anatomyBase} 
              alt="Modelo Anatómico HUD" 
              className="absolute inset-0 w-full h-full object-contain mix-blend-screen opacity-90"
              style={{ filter: 'contrast(1.2) brightness(0.8)' }}
            />
            
            {/* Zonas de Calor (Iluminación Térmica) */}
            {musclePoints.map((point, index) => {
              const seriesCount = getSeriesCount(point.id);
              const style = getStyleData(seriesCount);

              const isActive = seriesCount > 0;

              return (
                <React.Fragment key={`glow-group-${index}`}>
                  {/* Resplandores Térmicos */}
                  {point.glows.map((glow, gIdx) => (
                    <div 
                      key={`glow-${index}-${gIdx}`}
                      className={`absolute rounded-[100%] ${style.dotColor} mix-blend-screen transition-all duration-1000 pointer-events-none`}
                      style={{ 
                        top: glow.top, 
                        left: glow.left, 
                        width: glow.width, 
                        height: glow.height,
                        transform: 'translate(-50%, -50%)',
                        filter: 'blur(22px)', 
                        opacity: isActive ? 0.7 : 0 
                      }} 
                    />
                  ))}
                  
                  {/* Etiqueta y Conector (Anclado a labelPos) */}
                  <div 
                    className="absolute flex justify-center items-center z-20"
                    style={{ top: point.labelPos.top, left: point.labelPos.left, transform: 'translate(-50%, -50%)' }}
                  >
                    <div className={`relative w-1 h-1 md:w-1.5 md:h-1.5 rounded-full ${isActive ? style.dotColor : 'bg-zinc-600'} shadow-lg transition-colors duration-700`} />
                    
                    {/* Conectores y Etiquetas */}
                    {point.align === 'right' ? (
                      <div className="absolute right-full mr-1 md:mr-2 flex items-center">
                        <div className="flex flex-col items-end mr-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md border border-white/5">
                          <span className={`text-[8px] md:text-[10px] font-bold whitespace-nowrap tracking-wider transition-colors duration-700 ${isActive ? 'text-white' : 'text-zinc-400'}`}>{point.label}</span>
                          {style.colorName && (
                            <span className={`text-[7px] md:text-[8px] font-mono mt-0.5 ${style.textColor}`}>{style.colorName}</span>
                          )}
                        </div>
                        <div className={`w-3 md:w-8 h-[1px] ${style.lineColor} opacity-70`} />
                      </div>
                    ) : (
                      <div className="absolute left-full ml-1 md:ml-2 flex items-center">
                        <div className={`w-3 md:w-8 h-[1px] ${style.lineColor} opacity-70`} />
                        <div className="flex flex-col items-start ml-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-md border border-white/5">
                          <span className={`text-[8px] md:text-[10px] font-bold whitespace-nowrap tracking-wider transition-colors duration-700 ${isActive ? 'text-white' : 'text-zinc-400'}`}>{point.label}</span>
                          {style.colorName && (
                            <span className={`text-[7px] md:text-[8px] font-mono mt-0.5 ${style.textColor}`}>{style.colorName}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </MagicCard>
    </motion.div>
  );
}

