import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';
import { Flame, Activity, Zap, CheckCircle2, Circle, BrainCircuit, Loader2, ArrowUpRight, ArrowDownRight, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Groq from 'groq-sdk';
import confetti from 'canvas-confetti';
import ActivityTracker from '../components/ActivityTracker';
import HeatmapMuscular from '../components/HeatmapMuscular';
import { MagicCard } from '../components/MagicCard';

// Variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 80, damping: 20 } }
};

export default function Dashboard() {
  const { user } = useAuth();
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'ATLETA';

  const [loadingData, setLoadingData] = useState(true);
  
  // Nutricion Data
  const [caloriasHoy, setCaloriasHoy] = useState(0);
  const [metaCalorias, setMetaCalorias] = useState(2000); // Default
  const [macrosHoy, setMacrosHoy] = useState({ p: 0, c: 0, g: 0 });
  const [metaMacros, setMetaMacros] = useState({ p: 150, c: 200, g: 60 });

  // Biometria Data
  const [pesoActual, setPesoActual] = useState(null);
  const [pesoDelta, setPesoDelta] = useState(0); // Positivo o negativo
  const [pesoVariacion, setPesoVariacion] = useState(0);
  
  // Entrenamiento Data
  const [volumenHoy, setVolumenHoy] = useState(0);
  const [bloqueActual, setBloqueActual] = useState('DESCANSO ACTIVO');
  const [seriesCompletadas, setSeriesCompletadas] = useState(0);

  // Actividad Física Data
  const [pasosHoy, setPasosHoy] = useState(0);
  const [cardioHoy, setCardioHoy] = useState(0);
  const [metaPasos, setMetaPasos] = useState(10000);
  const [metaCardio, setMetaCardio] = useState(20);

  // Heatmap Data
  const [volumenHoyMusculos, setVolumenHoyMusculos] = useState({});

  // AI Insight
  const [aiInsight, setAiInsight] = useState('');
  const [loadingAi, setLoadingAi] = useState(true);

  // Gamification
  const [hasFiredConfetti, setHasFiredConfetti] = useState(false);
  const [rachaActual, setRachaActual] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchStreak = async () => {
      const [ { data: dSeries }, { data: dNutri }, { data: dMedidas } ] = await Promise.all([
        supabase.from('series').select('created_at').eq('user_id', user.id),
        supabase.from('registros_alimentos').select('created_at').eq('user_id', user.id),
        supabase.from('medidas').select('created_at').eq('user_id', user.id)
      ]);

      const combined = [
        ...(dSeries || []),
        ...(dNutri || []),
        ...(dMedidas || [])
      ];

      const fechasUnicas = [...new Set(combined.map(d => d.created_at.split('T')[0]))];
      
      const calcularRacha = (fechas) => {
        if (fechas.length === 0) return 0;
        
        const hoy = new Date();
        const ayer = new Date();
        ayer.setDate(ayer.getDate() - 1);
        
        const formatStr = (d) => {
          const offset = d.getTimezoneOffset() * 60000;
          return new Date(d.getTime() - offset).toISOString().split('T')[0];
        };

        const hoyStr = formatStr(hoy);
        const ayerStr = formatStr(ayer);

        let streak = 0;
        let currentDateToCheck = new Date();

        if (!fechas.includes(hoyStr) && !fechas.includes(ayerStr)) {
          return 0;
        }

        if (!fechas.includes(hoyStr) && fechas.includes(ayerStr)) {
           currentDateToCheck = ayer;
        }

        while (true) {
           const checkStr = formatStr(currentDateToCheck);
           if (fechas.includes(checkStr)) {
              streak++;
              currentDateToCheck.setDate(currentDateToCheck.getDate() - 1);
           } else {
              break;
           }
        }
        return streak;
      };

      const racha = calcularRacha(fechasUnicas);
      console.log('DÍAS DE RACHA GLOBAL CALCULADOS:', racha);
      setRachaActual(racha);
    };
    
    fetchStreak();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    const fetchVolumenHoy = async () => {
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const { data: seriesDeHoy, error: errSeries } = await supabase
          .from('series')
          .select('*, ejercicios(nombre, grupo_muscular_principal)')
          .gte('created_at', startOfDay.toISOString())
          .lte('created_at', endOfDay.toISOString());
          
        console.log("DATOS SERIES HOY:", seriesDeHoy, "ERROR:", errSeries);

        if (errSeries || !seriesDeHoy || seriesDeHoy.length === 0) {
           setVolumenHoyMusculos({});
           return;
        }

        const nombresUnicos = [...new Set(seriesDeHoy.map(s => s.ejercicio))].filter(Boolean);
        const { data: infoEjercicios } = await supabase
          .from('ejercicios')
          .select('nombre, grupo_muscular_principal')
          .in('nombre', nombresUnicos);
          
        // Diccionario heurístico de emergencia para ejercicios antiguos
        const HARDCODED_FALLBACKS = {
          'BANCA': 'PECHO',
          'PRESS BANCA': 'PECHO',
          'SENTADILLA': 'CUADRICEPS',
          'SENTADILLAS': 'CUADRICEPS',
          'PESO MUERTO': 'ISQUIOSURALES',
          'DOMINADAS': 'ESPALDA',
          'REMO': 'ESPALDA',
          'CURL BICEPS': 'BRAZOS_FRONTALES',
          'CURL': 'BRAZOS_FRONTALES',
          'PRESS MILITAR': 'HOMBROS',
          'ELEVACIONES LATERALES': 'HOMBROS',
          'EXTENSIONES TRICEPS': 'TRICEPS'
        };

        const mapaGrupos = {};
        if (infoEjercicios) {
          infoEjercicios.forEach(e => {
            const nombreNormalizado = e.nombre.toUpperCase().trim();
            // Rescata el grupo de la BD, o del fallback heurístico, o por defecto a un músculo visible para no dejar a 0
            const grupoRescatado = e.grupo_muscular_principal 
              ? e.grupo_muscular_principal.toUpperCase().trim() 
              : (HARDCODED_FALLBACKS[nombreNormalizado] || null);

            if (grupoRescatado) {
               mapaGrupos[nombreNormalizado] = grupoRescatado;
            }
          });
        }
        console.log("DEBUG DICCIONARIO - Nombres:", nombresUnicos);
        console.log("DEBUG DICCIONARIO - Info DB (Puede que grupo_muscular_principal sea null):", infoEjercicios);
        console.log("DEBUG DICCIONARIO - Mapa Final (Rescatado):", mapaGrupos);

        const volumenHoy = seriesDeHoy.reduce((acc, serie) => {
          let grupo = null;
          const nombreSerie = (serie.ejercicio || '').toUpperCase().trim();
          
          // 1. Intento por JOIN (si alguna vez se arregla la FK)
          if (serie.ejercicios) {
            grupo = Array.isArray(serie.ejercicios) 
              ? serie.ejercicios[0]?.grupo_muscular_principal 
              : serie.ejercicios.grupo_muscular_principal;
          }
          
          // 2. Intento por Diccionario (El Fix Quirúrgico Real)
          if (!grupo && nombreSerie) {
             grupo = mapaGrupos[nombreSerie];
          }

          // 3. Intento Extremo (Directo al Hardcode si todo falló)
          if (!grupo && nombreSerie) {
             grupo = HARDCODED_FALLBACKS[nombreSerie];
          }
          
          if (grupo) {
            const grupoUpper = grupo.toUpperCase().trim();
            acc[grupoUpper] = (acc[grupoUpper] || 0) + 1; // Sumamos 1 serie
          }
          return acc;
        }, {});

        console.log('DATOS EN DASHBOARD (REDUCER REPARADO):', volumenHoy);
        setVolumenHoyMusculos(volumenHoy);
      } catch (err) {
         console.error('Error Crítico en fetchVolumenHoy:', err);
         setVolumenHoyMusculos({});
      }
    };
    fetchVolumenHoy();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    const fetchDashboardData = async () => {
      setLoadingData(true);
      const todayLocal = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
      
      try {
        // 1. Fetch Nutrition
        const [objResponse, regResponse] = await Promise.all([
          supabase.from('objetivos_nutricion').select('*').eq('user_id', user.id).single(),
          supabase.from('registros_alimentos').select('*').eq('user_id', user.id).eq('fecha', todayLocal)
        ]);
        
        let metaCals = 2000;
        let metaMac = { p: 150, c: 200, g: 60 };
        if (objResponse.data) {
          metaCals = objResponse.data.objetivo_calorias;
          metaMac = { 
            p: objResponse.data.objetivo_proteinas, 
            c: objResponse.data.objetivo_carbohidratos, 
            g: objResponse.data.objetivo_grasas 
          };
          setMetaCalorias(metaCals);
          setMetaMacros(metaMac);
          if (objResponse.data.objetivo_pasos) setMetaPasos(objResponse.data.objetivo_pasos);
          if (objResponse.data.objetivo_cardio) setMetaCardio(objResponse.data.objetivo_cardio);
        }
        
        let totalCals = 0, totalP = 0, totalC = 0, totalG = 0;
        if (regResponse.data) {
          regResponse.data.forEach(r => {
            totalCals += Number(r.calorias || 0);
            totalP += Number(r.proteinas || 0);
            totalC += Number(r.carbohidratos || 0);
            totalG += Number(r.grasas || 0);
          });
        }
        setCaloriasHoy(totalCals);
        setMacrosHoy({ p: totalP, c: totalC, g: totalG });

        // 2. Fetch Biometria
        const medResponse = await supabase
          .from('medidas')
          .select('peso, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(2);
          
        if (medResponse.data && medResponse.data.length > 0) {
          const current = medResponse.data[0].peso;
          setPesoActual(current);
          if (medResponse.data.length > 1) {
            const previous = medResponse.data[1].peso;
            setPesoVariacion(Math.abs(current - previous));
            setPesoDelta(current > previous ? 1 : current < previous ? -1 : 0);
          }
        }

        // 2.5 Fetch Actividad Diaria
        const fechaLimpia = new Date().toISOString().split('T')[0];
        const actResponse = await supabase
          .from('actividad_diaria')
          .select('pasos, cardio')
          .eq('user_id', user.id)
          .eq('fecha', fechaLimpia)
          .maybeSingle();
          
        if (actResponse.data) {
          setPasosHoy(actResponse.data.pasos || 0);
          setCardioHoy(actResponse.data.cardio || 0);
        } else {
          setPasosHoy(0);
          setCardioHoy(0);
        }

        // 3. Fetch Entrenamiento de Hoy
        const entResponse = await supabase
          .from('semanas')
          .select('*, dias(*, series(*))')
          .eq('user_id', user.id)
          .order('id', { ascending: false })
          .order('id', { referencedTable: 'dias', ascending: false })
          .limit(1);

        let vol = 0;
        let sets = 0;
        let blq = 'DESCANSO / OFF';
        const ejerciciosHoyCounts = {};

        if (entResponse.data && entResponse.data.length > 0) {
          const semana = entResponse.data[0];
          let diaHoy = null;
          semana.dias?.forEach(d => {
             const hasSeriesToday = d.series?.some(s => s.created_at?.startsWith(todayLocal));
             if (hasSeriesToday) {
               diaHoy = d;
             }
          });

          if (diaHoy) {
            blq = diaHoy.nombre;
            diaHoy.series?.forEach(s => {
              if (s.created_at?.startsWith(todayLocal)) {
                sets++;
                vol += (s.peso * s.repeticiones);
                if (s.ejercicio) {
                  ejerciciosHoyCounts[s.ejercicio] = (ejerciciosHoyCounts[s.ejercicio] || 0) + 1;
                }
              }
            });
          } else if (semana.dias && semana.dias.length > 0) {
            blq = semana.dias[0].nombre; // Bloque por defecto si hoy no hay entreno
          }
        }
        setVolumenHoy(vol);
        setSeriesCompletadas(sets);
        setBloqueActual(blq ? blq.toUpperCase() : 'DESCANSO / OFF');

        // 3.5 Eliminado: Reemplazado por el nuevo fetchVolumenHoy (Reducer)

        // 4. Load AI Insight
        await fetchAiInsight({ totalCals, totalP, totalC, totalG, metaCals, metaMac });

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const fetchAiInsight = async (nutritionData) => {
    try {
      const cacheKey = 'ironforge_insight_cache';
      const cached = localStorage.getItem(cacheKey);
      
      if (cached) {
        const parsed = JSON.parse(cached);
        const ageInMinutes = (Date.now() - parsed.timestamp) / (1000 * 60);
        if (ageInMinutes < 60) {
          setAiInsight(parsed.text);
          setLoadingAi(false);
          return;
        }
      }

      const { data: settings } = await supabase
        .from('user_settings')
        .select('gemini_api_key')
        .eq('user_id', user.id)
        .single();

      if (!settings?.gemini_api_key) {
        setAiInsight('API KEY NO CONFIGURADA EN AJUSTES.');
        setLoadingAi(false);
        return;
      }

      const groq = new Groq({ 
        apiKey: settings.gemini_api_key, 
        dangerouslyAllowBrowser: true
      });
      
      const prompt = `Eres IronForge IA, un asistente táctico y militar brutalista. El atleta ha consumido ${Math.round(nutritionData.totalCals)}/${nutritionData.metaCals} kcal hoy. Macros consumidos: P: ${Math.round(nutritionData.totalP)}/${nutritionData.metaMac.p}g, C: ${Math.round(nutritionData.totalC)}/${nutritionData.metaMac.c}g, G: ${Math.round(nutritionData.totalG)}/${nutritionData.metaMac.g}g.
Dale un ÚNICO y cortísimo consejo (máximo 15 palabras) agresivo y motivador sobre qué debe hacer (ej. prioriza proteína, frena carbos, etc.). No uses emojis. Usa formato mayúsculas.`;

      const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'openai/gpt-oss-120b',
      });

      let text = completion.choices[0]?.message?.content || 'SISTEMA OPERATIVO ÓPTIMO.';
      text = text.toUpperCase().replace(/["']/g, '');

      setAiInsight(text);
      localStorage.setItem(cacheKey, JSON.stringify({ text, timestamp: Date.now() }));

    } catch (err) {
      console.error(err);
      setAiInsight('SISTEMA AISLADO. SIN CONEXIÓN DE RED.');
    } finally {
      setLoadingAi(false);
    }
  };

  const calPercent = Math.min((caloriasHoy / metaCalorias) * 100, 100) || 0;
  const proPercent = Math.min((macrosHoy.p / metaMacros.p) * 100, 100) || 0;
  const carbPercent = Math.min((macrosHoy.c / metaMacros.c) * 100, 100) || 0;
  const fatPercent = Math.min((macrosHoy.g / metaMacros.g) * 100, 100) || 0;
  const progresoHoy = (caloriasHoy > 0 || seriesCompletadas > 0 || pasosHoy > 0 || cardioHoy > 0) ? 100 : 0;

  // Rank Calculation
  const getRankData = () => {
    // Nueva Regla Rango S
    const caloriasOk = calPercent >= 95 && calPercent <= 105;
    const proteinasOk = proPercent >= 95;
    const nutricionPerfecta = caloriasOk && proteinasOk;

    const entrenoForja = seriesCompletadas > 0;
    const actividadOk = pasosHoy >= metaPasos || cardioHoy >= metaCardio;
    const cumpleFisico = entrenoForja || actividadOk;

    if (nutricionPerfecta && cumpleFisico) {
      return { rank: 'S', color: 'text-brand-red', extra: 'animate-pulse drop-shadow-[0_0_20px_rgba(225,29,72,0.8)]' };
    }
    
    if (nutricionPerfecta && !cumpleFisico) {
      return { rank: 'A', color: 'text-brand-red', extra: '' };
    }

    let workoutScore = 0;
    if (entrenoForja) workoutScore = 100;
    else if (actividadOk) workoutScore = 80;
    else if (pasosHoy > 0 || cardioHoy > 0) workoutScore = 40;

    const finalScore = (calPercent + workoutScore) / 2;

    if (finalScore >= 90) return { rank: 'A', color: 'text-brand-red', extra: '' };
    if (finalScore >= 75) return { rank: 'B', color: 'text-orange-500', extra: 'drop-shadow-[0_0_5px_rgba(249,115,22,0.5)]' };
    if (finalScore >= 50) return { rank: 'C', color: 'text-zinc-200', extra: '' };
    return { rank: 'D', color: 'text-zinc-500', extra: '' };
  };
  const { rank, color: rankColor, extra: rankExtra } = getRankData();

  useEffect(() => {
    if (rank === 'S' && !hasFiredConfetti && !loadingData) {
      setHasFiredConfetti(true);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#e11d48', '#f97316', '#eab308', '#ffffff'],
        scalar: 0.5,
        startVelocity: 60,
        gravity: 1.2,
        ticks: 200,
        angle: 90
      });
    }
  }, [rank, hasFiredConfetti, loadingData]);

  // Fake chart data for background visual
  const activityData = [ {value: 300}, {value: 450}, {value: 350}, {value: 600}, {value: 500}, {value: 800}, {value: volumenHoy || 200} ];

  const handleUpdatePasos = async (newPasos) => {
    setPasosHoy(newPasos);
    await saveActividad(newPasos, cardioHoy);
  };

  const handleUpdateCardio = async (newCardio) => {
    setCardioHoy(newCardio);
    await saveActividad(pasosHoy, newCardio);
  };

  const saveActividad = async (pasos, cardio) => {
    if (!user) return;
    const todayLocal = new Date().toLocaleDateString('en-CA');
    try {
      await supabase.from('actividad_diaria').upsert({
        user_id: user.id,
        fecha: todayLocal,
        pasos: pasos,
        minutos_cardio: cardio
      }, { onConflict: 'user_id, fecha' });
    } catch (err) {
      console.error('Error saving activity:', err);
    }
  };

  return (
    <div className="bg-[#050505] min-h-full text-zinc-100 uppercase tracking-wide">
      
      {/* Saludo y Círculo de Fuego */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col items-center text-center pt-4"
      >
        <h1 className="text-2xl md:text-3xl font-black tracking-widest text-zinc-100 font-bebas mb-8">
          HOLA, {userName}, ALIMENTA LA <span className="text-brand-red">LLAMA.</span>
        </h1>

        <div className="relative flex items-center justify-center w-[280px] h-[280px] md:w-[320px] md:h-[320px] mb-10">
          <svg className="absolute w-full h-full transform -rotate-90">
            {/* Anillo Base */}
            <circle
              cx="50%"
              cy="50%"
              r="120"
              fill="transparent"
              strokeWidth="16"
              className="stroke-zinc-900"
            />
            {/* Anillo Fuego Animado */}
            <motion.circle
              cx="50%"
              cy="50%"
              r="120"
              fill="transparent"
              strokeWidth="16"
              strokeLinecap="round"
              stroke="url(#fireGradient)"
              initial={{ strokeDashoffset: 2 * Math.PI * 120 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 120 - (progresoHoy / 100) * (2 * Math.PI * 120) }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              strokeDasharray={2 * Math.PI * 120}
              className="drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]"
            />
            <defs>
              <linearGradient id="fireGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f97316" /> {/* orange-500 */}
                <stop offset="100%" stopColor="#dc2626" /> {/* red-600 */}
              </linearGradient>
            </defs>
          </svg>
          
          {/* HUD Interior */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <motion.div 
              animate={{ scale: progresoHoy > 0 ? [1, 1.1, 1] : 1 }} 
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Flame size={48} strokeWidth={2.5} className={progresoHoy > 0 ? "text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]" : "text-zinc-600"} />
            </motion.div>
            <h2 className={`text-7xl font-black tracking-tighter uppercase font-bebas mt-2 ${progresoHoy > 0 ? 'text-white' : 'text-zinc-500'}`}>
              {rachaActual}
            </h2>
            <p className="text-zinc-500 text-[10px] font-bold tracking-widest uppercase mt-1">
              Días de Racha
            </p>
          </div>
        </div>

        {/* Botones Premium Gigantes */}
        <div className="flex w-full max-w-md gap-4 px-4">
          <Link to="/blocks" className="flex-1">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-brand-red/50 hover:bg-zinc-800/80 transition-all shadow-lg shadow-black"
            >
              <Zap className="text-brand-red drop-shadow-[0_0_10px_rgba(225,29,72,0.5)]" size={32} />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-100 text-center">Entrar a la Forja</span>
            </motion.div>
          </Link>
          <Link to="/nutrition" className="flex-1">
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-orange-500/50 hover:bg-zinc-800/80 transition-all shadow-lg shadow-black"
            >
              <Activity className="text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]" size={32} />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-100 text-center">Combustible</span>
            </motion.div>
          </Link>
        </div>
      </motion.div>

      {!loadingData && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
           {/* Vitrina de Medallas Link */}
           <Link to="/settings" className="block w-full h-full mt-4">
              <MagicCard className="w-full h-24 flex items-center justify-between px-6 hover:shadow-[0_0_20px_rgba(225,29,72,0.3)] transition-all cursor-pointer">
                 <div>
                    <h3 className="text-xl font-black text-white font-bebas tracking-widest flex items-center gap-2">
                      <span className="text-2xl">🏆</span> VITRINA DE LOGROS
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                      Ver medallas y desafíos conseguidos →
                    </p>
                 </div>
                 <ArrowUpRight className="text-brand-red opacity-50" size={24} />
              </MagicCard>
           </Link>
        </motion.div>
      )}

      {loadingData ? (
        <div className="flex justify-center items-center h-64">
           <Loader2 size={32} className="animate-spin text-brand-red" />
        </div>
      ) : (
        /* Bento Grid */
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
        >
          
          {/* Rango de la Forja Card */}
          <motion.div variants={itemVariants} className="col-span-1 md:col-span-2 lg:col-span-1 h-full min-h-[160px] flex">
            <MagicCard className="w-full h-full">
               <h2 className={`font-bebas text-8xl md:text-9xl tracking-wider leading-none ${rankColor} ${rankExtra}`}>
                 {rank}
               </h2>
               <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-2">Rango Diario</span>
            </MagicCard>
          </motion.div>

          {/* Hero / Combustible Card */}

          <Link to="/nutrition" className="col-span-1 md:col-span-2 lg:col-span-2 row-span-2 block">
            <motion.div 
              variants={itemVariants}
              className="h-full rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between border border-zinc-800/50 bg-zinc-950/60 backdrop-blur-md shadow-xl shadow-black/50 group hover:border-brand-red/50 hover:shadow-[0_0_15px_rgba(225,29,72,0.15)] transition-all duration-300 min-h-[300px]"
            >
              <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-red/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                   <div className="w-10 h-10 rounded-full bg-brand-red/20 flex items-center justify-center border border-brand-red/50">
                     <Flame className="text-brand-red" size={20} />
                   </div>
                   <div className="text-right">
                      <h3 className="text-[10px] font-bold text-brand-red uppercase tracking-widest">Meta Diaria</h3>
                      <p className="text-lg font-black text-white font-bebas tracking-wider">{metaCalorias} KCAL</p>
                   </div>
                </div>
                
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative w-32 h-32 flex-shrink-0">
                     <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90 overflow-visible">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="#18181b" strokeWidth="8" />
                        <motion.circle 
                          cx="50" cy="50" r="40" 
                          fill="none" 
                          stroke="#e11d48" 
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray="251.2"
                          initial={{ strokeDashoffset: 251.2 }}
                          animate={{ strokeDashoffset: 251.2 * (1 - (calPercent/100)) }}
                          transition={{ duration: 1.5, type: 'spring' }}
                          style={{ filter: 'drop-shadow(0px 0px 8px rgba(225,29,72,0.8))' }}
                        />
                     </svg>
                     <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-black text-white font-bebas tracking-wider">{Math.round(calPercent)}%</span>
                     </div>
                  </div>
                  <div className="flex-1 space-y-4">
                     <div>
                        <div className="flex justify-between text-[10px] font-bold text-zinc-400 mb-1 tracking-widest">
                          <span>PRO</span><span>{Math.round(macrosHoy.p)}/{metaMacros.p}g</span>
                        </div>
                        <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                           <motion.div initial={{ width: 0 }} animate={{ width: `${proPercent}%` }} className="h-full bg-brand-red" />
                        </div>
                     </div>
                     <div>
                        <div className="flex justify-between text-[10px] font-bold text-zinc-400 mb-1 tracking-widest">
                          <span>CAR</span><span>{Math.round(macrosHoy.c)}/{metaMacros.c}g</span>
                        </div>
                        <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                           <motion.div initial={{ width: 0 }} animate={{ width: `${carbPercent}%` }} className="h-full bg-brand-red opacity-80" />
                        </div>
                     </div>
                     <div>
                        <div className="flex justify-between text-[10px] font-bold text-zinc-400 mb-1 tracking-widest">
                          <span>GRA</span><span>{Math.round(macrosHoy.g)}/{metaMacros.g}g</span>
                        </div>
                        <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                           <motion.div initial={{ width: 0 }} animate={{ width: `${fatPercent}%` }} className="h-full bg-brand-red opacity-60" />
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </Link>

          {/* AI Insight Card */}
          <Link to="/console" className="col-span-1 md:col-span-2 lg:col-span-1 block">
            <motion.div 
              variants={itemVariants}
              className="h-full rounded-2xl bg-zinc-950/60 backdrop-blur-md border border-zinc-800/50 shadow-xl shadow-black/50 p-6 group hover:border-brand-red/50 hover:shadow-[0_0_15px_rgba(225,29,72,0.15)] transition-all duration-300 flex flex-col justify-center relative overflow-hidden min-h-[140px]"
            >
              <div className="flex items-center gap-3 mb-4 text-brand-red shrink-0">
                 <BrainCircuit size={18} />
                 <h3 className="text-[10px] font-bold uppercase tracking-widest">IronForge Insight</h3>
              </div>
              
              <div className="flex-1 flex items-center">
                 {loadingAi ? (
                   <div className="flex items-center gap-2 text-zinc-600 font-mono text-xs">
                     <Loader2 size={14} className="animate-spin text-brand-red" />
                     <span>ANALIZANDO TELEMETRÍA...</span>
                   </div>
                 ) : (
                   <p className="text-zinc-200 text-sm md:text-base font-bold leading-relaxed tracking-wide italic border-l-2 border-brand-red pl-4">
                     "{aiInsight}"
                   </p>
                 )}
              </div>
            </motion.div>
          </Link>

          {/* Activity Tracker Card */}
          <ActivityTracker 
            pasos={pasosHoy}
            minutosCardio={cardioHoy}
            metaPasos={metaPasos}
            metaCardio={metaCardio}
            onUpdatePasos={handleUpdatePasos}
            onUpdateCardio={handleUpdateCardio}
          />

          {/* Entrenamiento Card */}
          <Link to="/blocks" className="col-span-1 block">
            <motion.div 
              variants={itemVariants}
              className="h-full rounded-2xl bg-zinc-950/60 backdrop-blur-md border border-zinc-800/50 shadow-xl shadow-black/50 p-6 group hover:border-brand-red/50 hover:shadow-[0_0_15px_rgba(225,29,72,0.15)] transition-all duration-300 flex flex-col relative overflow-hidden min-h-[140px]"
            >
              <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Bloque Activo</h3>
                <Activity size={14} className="text-zinc-500" />
              </div>
              
              <div className="relative z-10 flex-1 flex flex-col justify-center">
                 <h4 className="text-xl font-black text-white leading-none mb-2 break-words font-bebas tracking-wider">
                    {bloqueActual}
                 </h4>
                 <p className="text-xs text-brand-red font-bold tracking-widest">{seriesCompletadas} SERIES HOY</p>
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 w-full opacity-20 pointer-events-none">
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={activityData}>
                    <Area type="monotone" dataKey="value" stroke="none" fill="#e11d48" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </Link>

          {/* Biometría Card */}
          <Link to="/measurements" className="col-span-1 block">
            <motion.div 
              variants={itemVariants}
              className="h-full rounded-2xl bg-zinc-950/60 backdrop-blur-md border border-zinc-800/50 shadow-xl shadow-black/50 p-6 group hover:border-brand-red/50 hover:shadow-[0_0_15px_rgba(225,29,72,0.15)] transition-all duration-300 flex flex-col justify-between min-h-[140px]"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Peso Actual</h3>
                {pesoDelta !== 0 && (
                  <div className={`flex items-center gap-1 text-[10px] font-bold tracking-widest ${pesoDelta > 0 ? 'text-brand-red' : 'text-zinc-400'}`}>
                    {pesoDelta > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {pesoVariacion.toFixed(1)}KG
                  </div>
                )}
              </div>
              <div className="flex items-end gap-2">
                 <span className="text-4xl md:text-5xl font-black text-white font-bebas tracking-wider">{pesoActual !== null ? pesoActual : '--'}</span>
                 <span className="text-sm font-bold text-zinc-600 mb-1">KG</span>
              </div>
            </motion.div>
          </Link>

          {/* Heatmap Muscular */}
          <HeatmapMuscular datosVolumen={volumenHoyMusculos} />

        </motion.div>
      )}
    </div>
  );
}

