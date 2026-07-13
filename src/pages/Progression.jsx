import { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Activity, Dumbbell } from 'lucide-react';
import SearchableExerciseSelect from '../components/Workout/SearchableExerciseSelect';

export default function Progression() {
  const { user } = useAuth();
  const [ejercicios, setEjercicios] = useState([]);
  const [selectedEjercicioId, setSelectedEjercicioId] = useState("");
  const [activeTab, setActiveTab] = useState('CARGA'); // 'CARGA' | 'VOLUMEN'
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estados para Simetría
  const [datosSimetria, setDatosSimetria] = useState([]);
  const [simetriaLoading, setSimetriaLoading] = useState(false);

  useEffect(() => {
    const fetchEjercicios = async () => {
      if (!user) return;
      const { data } = await supabase.from('ejercicios').select('*').order('nombre');
      if (data) {
        setEjercicios(data);
        if (data.length > 0) setSelectedEjercicioId(data[0].id.toString());
      }
    };
    fetchEjercicios();
  }, [user]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user || !selectedEjercicioId) return;
      setLoading(true);
      
      const { data: semanas } = await supabase
        .from('semanas')
        .select('*, dias(*, series(*))')
        .order('id', { ascending: true });

      if (semanas) {
        const processedData = semanas.map(semana => {
          let maxWeight = 0;
          let totalVolume = 0;

          semana.dias?.forEach(dia => {
            dia.series?.filter(s => s.ejercicio_id && s.ejercicio_id.toString() === selectedEjercicioId).forEach(s => {
              if (s.peso > maxWeight) maxWeight = s.peso;
              totalVolume += (s.peso * s.repeticiones);
            });
          });

          return {
            week: semana.nombre,
            cargaMaxima: maxWeight,
            volumenTotal: totalVolume
          };
        }).filter(d => d.cargaMaxima > 0 || d.volumenTotal > 0); 

        setChartData(processedData);
      }
      setLoading(false);
    };

    fetchData();
  }, [user, selectedEjercicioId]);

  useEffect(() => {
    const fetchSimetria = async () => {
      if (!user) return;
      setSimetriaLoading(true);
      
      const { data, error } = await supabase
        .from('series')
        .select('*, ejercicios(grupo_muscular_principal)');
      
      if (data && !error) {
        const totales = data.reduce((acc, serie) => {
          const musculo = serie.ejercicios?.grupo_muscular_principal;
          if (musculo) {
            acc[musculo] = (acc[musculo] || 0) + 1;
          }
          return acc;
        }, {});

        const valores = Object.values(totales);
        const maxSeries = valores.length > 0 ? Math.max(...valores) : 0;
        const limiteGrafica = Math.ceil(maxSeries * 1.1) || 10;
        
        const dataFormateada = Object.keys(totales).map(musculo => ({ 
          musculo: musculo.toUpperCase(), 
          series: totales[musculo], 
          maxMark: limiteGrafica 
        }));

        setDatosSimetria(dataFormateada);
      }
      setSimetriaLoading(false);
    };

    fetchSimetria();
  }, [user]);

  // Lógica de Diagnóstico (Extracción de Extremos)
  const { musculoDominante, puntoDebil } = useMemo(() => {
    if (!datosSimetria || datosSimetria.length === 0) return { musculoDominante: null, puntoDebil: null };
    
    let max = -1;
    let min = Infinity;
    let dominante = null;
    let debil = null;

    datosSimetria.forEach(item => {
      if (item.series > max) { max = item.series; dominante = item; }
      if (item.series < min) { min = item.series; debil = item; }
    });

    return { musculoDominante: dominante, puntoDebil: debil };
  }, [datosSimetria]);

  return (
    <>
      <section className="mb-12">
        <h2 className="text-4xl font-black tracking-tighter text-zinc-100 mb-2 uppercase">
          MÉTRICAS <span className="text-brand-red">PROGRESIÓN</span>
        </h2>
        <p className="text-zinc-500 text-sm font-light tracking-widest max-w-xl uppercase">
          ANÁLISIS DE TONELAJE ACUMULADO Y CARGA MÁXIMA POR EJERCICIO.
        </p>
      </section>

      <div className="bg-zinc-950/60 backdrop-blur-md border border-zinc-800/50 p-6 rounded-2xl shadow-xl shadow-black/50 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between group hover:border-brand-red/50 hover:shadow-[0_0_15px_rgba(225,29,72,0.15)] transition-all duration-300">
        <div className="flex items-center gap-4 w-full md:w-auto z-[9999]">
          <Dumbbell className="text-zinc-500" size={20} />
          <div className="flex-1 md:w-64">
            <SearchableExerciseSelect 
              value={selectedEjercicioId}
              onChange={setSelectedEjercicioId}
              ejercicios={ejercicios}
            />
          </div>
        </div>

        <div className="flex bg-zinc-900 p-1 rounded-sm w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('CARGA')}
            className={`flex-1 px-6 py-2 text-[10px] font-black tracking-widest uppercase rounded-sm transition-colors ${activeTab === 'CARGA' ? 'bg-brand-red text-zinc-950' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Carga Máxima (KG)
          </button>
          <button 
            onClick={() => setActiveTab('VOLUMEN')}
            className={`flex-1 px-6 py-2 text-[10px] font-black tracking-widest uppercase rounded-sm transition-colors ${activeTab === 'VOLUMEN' ? 'bg-brand-red text-zinc-950' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Volumen Total (KG x REPS)
          </button>
        </div>
      </div>

      <div className="bg-zinc-950/60 backdrop-blur-md border border-zinc-800/50 p-6 rounded-2xl shadow-xl shadow-black/50 min-h-[400px] group hover:border-brand-red/50 hover:shadow-[0_0_15px_rgba(225,29,72,0.15)] transition-all duration-300">
        <div className="flex items-center gap-2 mb-8">
          <Activity className="text-brand-red" size={16} />
          <h3 className="text-sm font-bold tracking-widest text-zinc-400 uppercase">
            HISTÓRICO RENDIMIENTO: {activeTab}
          </h3>
        </div>
        
        {loading ? (
          <div className="w-full h-64 md:h-80 min-h-[250px] flex items-center justify-center text-zinc-600 font-bold tracking-widest text-xs uppercase">
            CALCULANDO MÉTRICAS...
          </div>
        ) : chartData.length === 0 ? (
          <div className="w-full h-64 md:h-80 min-h-[250px] flex items-center justify-center text-zinc-600 font-bold tracking-widest text-xs uppercase">
            NO HAY DATOS DE ESTE EJERCICIO
          </div>
        ) : (
          <div className="w-full h-64 md:h-80 min-h-[250px]">
            <div className="w-full h-full overflow-x-auto overflow-y-hidden whitespace-nowrap custom-scrollbar">
              <div className="min-w-[600px] h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRedProgression" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e11d48" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="week" 
                      stroke="#27272a" 
                      tick={{ fill: '#52525b', fontSize: 10, fontWeight: 'bold' }} 
                      tickLine={false} 
                      axisLine={{ stroke: '#27272a' }}
                    />
                    <YAxis 
                      stroke="#27272a" 
                      tick={{ fill: '#52525b', fontSize: 10, fontWeight: 'bold' }} 
                      tickLine={false} 
                      axisLine={{ stroke: '#27272a' }}
                      width={40}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#e11d48', borderRadius: '2px', borderWidth: '1px' }}
                      itemStyle={{ color: '#ffffff', fontWeight: '900', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px' }}
                      labelStyle={{ color: '#52525b', fontWeight: 'bold', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}
                      cursor={{ stroke: '#e11d48', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey={activeTab === 'CARGA' ? 'cargaMaxima' : 'volumenTotal'} 
                      stroke="#e11d48" 
                      strokeWidth={3} 
                      fill="url(#colorRedProgression)"
                      activeDot={{ r: 6, fill: '#e11d48', stroke: '#ffffff', strokeWidth: 2 }}
                      style={{ filter: 'drop-shadow(0px 0px 8px rgba(225,29,72,0.8))' }}
                      animationDuration={500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      <section className="mt-12 mb-12">
        <h2 className="text-xl font-bold text-zinc-100 mb-4 tracking-wider uppercase">
          HUELLA DE DESARROLLO GLOBAL
        </h2>
        <div className="relative w-full h-[350px] min-h-[350px] bg-zinc-950 rounded-2xl p-4 border border-zinc-800 shadow-xl shadow-black/50 group hover:border-brand-red/50 hover:shadow-[0_0_15px_rgba(225,29,72,0.15)] transition-all duration-300">
          {simetriaLoading ? (
            <div className="w-full h-full flex items-center justify-center text-zinc-600 font-bold tracking-widest text-xs uppercase">
              ANALIZANDO HISTÓRICO...
            </div>
          ) : datosSimetria.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-zinc-600 font-bold tracking-widest text-xs uppercase">
              NO HAY DATOS SUFICIENTES PARA EL ANÁLISIS
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={datosSimetria}>
                <PolarGrid stroke="#334155" />
                <PolarAngleAxis dataKey="musculo" tick={{ fill: '#f8fafc', fontSize: 10, fontWeight: 'bold' }} />
                <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} tick={false} axisLine={false} />
                <Radar 
                  name="Volumen Histórico (Series)" 
                  dataKey="series" 
                  stroke="#ec4899" 
                  strokeWidth={3} 
                  fill="#ef4444" 
                  fillOpacity={0.4} 
                  style={{ filter: 'drop-shadow(0px 0px 8px rgba(236,72,153,0.6))' }}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#ec4899', borderRadius: '8px', borderWidth: '1px' }}
                  itemStyle={{ color: '#ffffff', fontWeight: 'bold', fontSize: '14px' }}
                  labelStyle={{ color: '#a1a1aa', fontWeight: 'bold', fontSize: '10px', textTransform: 'uppercase' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Panel de Diagnóstico */}
        {!simetriaLoading && datosSimetria.length > 0 && musculoDominante && puntoDebil ? (
          <div className="grid grid-cols-2 gap-4 mt-6 w-full">
            {/* Tarjeta 1 (Músculo Dominante) */}
            <div className="bg-zinc-900/50 border-l-2 border-pink-500 p-4 rounded-xl flex flex-col justify-center">
              <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mb-1">DOMINANCIA</p>
              <h3 className="text-sm md:text-base text-white font-black uppercase truncate">{musculoDominante.musculo}</h3>
              <p className="text-xs text-pink-500 font-bold mt-1">{musculoDominante.series} SERIES HISTÓRICAS</p>
            </div>
            {/* Tarjeta 2 (Foco Prioritario) */}
            <div className="bg-zinc-900/50 border-l-2 border-orange-500 p-4 rounded-xl flex flex-col justify-center">
              <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mb-1">FOCO PRIORITARIO</p>
              <h3 className="text-sm md:text-base text-white font-black uppercase truncate">{puntoDebil.musculo}</h3>
              <p className="text-xs text-orange-500 font-bold mt-1">{puntoDebil.series} SERIES HISTÓRICAS</p>
            </div>
          </div>
        ) : (!simetriaLoading && datosSimetria.length === 0) ? (
          <div className="text-zinc-500 text-center mt-4 italic text-sm">
            Entrena para desbloquear el diagnóstico muscular.
          </div>
        ) : null}
      </section>
    </>
  );
}
