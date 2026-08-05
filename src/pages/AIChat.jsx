import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Cpu } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Groq from 'groq-sdk';
import { AI_PERSONAS } from '../lib/constants';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const AI_CATALOG = [
  { id: 'biomecanic', icono: '⚙️', nombre: 'Mainframe (Analista)', color: 'text-zinc-400', descripcion: 'Análisis biomecánico frío y calculador.' },
  { id: 'sergeant', icono: '🔥', nombre: 'Sargento de Hierro', color: 'text-red-500', descripcion: 'Entrenador agresivo y motivador.' },
  { id: 'powerlifter', icono: '🦍', nombre: 'Estratega Powerlifter', color: 'text-orange-500', descripcion: 'Fuerza máxima y SNC.' },
  { id: 'bodybuilder', icono: '💪', nombre: 'Arquitecto Hipertrofia', color: 'text-purple-500', descripcion: 'Volumen y daño metabólico.' },
  { id: 'nutritionist', icono: '🧬', nombre: 'Ingeniero Nutricional', color: 'text-green-500', descripcion: 'Optimización de macros.' },
  { id: 'rehab', icono: '⚕️', nombre: 'Atena (Biomecánica & Fisio)', color: 'text-cyan-400', descripcion: 'Especialista en readaptación, movilidad y prevención de lesiones.' }
];

export default function AIChat() {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [apiKey, setApiKey] = useState(null);
  const [aiPersona, setAiPersona] = useState('biomecanic');
  const [loading, setLoading] = useState(false);
  const [showSelector, setShowSelector] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    const initChat = async () => {
      if (!user) return;
      
      try {
        const { data: settings, error: settingsError } = await supabase
          .from('user_settings')
          .select('gemini_api_key, ai_persona')
          .eq('user_id', user.id)
          .single();
          
        if (settingsError && settingsError.code !== 'PGRST116') {
          console.error(settingsError);
        }

        if (!settings?.gemini_api_key) {
          setMessages([{ role: 'system', text: 'SISTEMA: Requiere clave de API en Ajustes para operar.' }]);
          return;
        }
        
        setApiKey(settings.gemini_api_key);
        if (settings.ai_persona) {
          setAiPersona(settings.ai_persona);
        }
      } catch (err) {
        setMessages([{ role: 'system', text: 'ERROR DE INICIALIZACIÓN: ' + err.message }]);
      }
    };
    
    initChat();
  }, [user]);

  useEffect(() => {
    let welcomeText = 'Bienvenido. Protocolos operativos en línea. Selecciona un arquetipo e introduce tu consulta para análisis de telemetría.';
    if (aiPersona === 'rehab') {
      welcomeText = 'Saludos. Soy Atena, tu especialista en biomecánica. El músculo crece en la tensión, pero sana en la recuperación. ¿Qué articulación o grupo muscular necesita asistencia técnica hoy?';
    }
    setMessages([{ role: 'system', text: welcomeText }]);
  }, [aiPersona]);

  const handlePersonaSelect = async (id) => {
    setAiPersona(id);
    setShowSelector(false);
    if (user) {
      await supabase.from('user_settings').update({ ai_persona: id }).eq('user_id', user.id);
    }
  };

  const fetchUserTelemetry = async () => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const [workoutsResponse, medidasResponse, nutricionResponse] = await Promise.all([
        supabase
          .from('semanas')
          .select('*, dias(*, series(*, ejercicios(nombre)))')
          .eq('user_id', user.id)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false })
          .order('id', { referencedTable: 'dias', ascending: false }),
        supabase
          .from('medidas')
          .select('*')
          .eq('user_id', user.id)
          .gte('created_at', thirtyDaysAgo.toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from('registros_alimentos')
          .select('*')
          .eq('user_id', user.id)
          .gte('fecha', sevenDaysAgo.toISOString().split('T')[0])
          .order('fecha', { ascending: false })
      ]);

      const semanas = workoutsResponse.data || [];
      const medidas = medidasResponse.data || [];
      const nutricion = nutricionResponse.data || [];

      let recentMeasurementsString = "";
      if (medidas.length > 0) {
        medidas.forEach(m => {
          const date = m.created_at ? m.created_at.split('T')[0] : 'N/A';
          let parts = [`Fecha: ${date}`];
          if (m.peso) parts.push(`Peso: ${m.peso}kg`);
          if (m.altura) parts.push(`Altura: ${m.altura}cm`);
          if (m.cintura) parts.push(`Cintura: ${m.cintura}cm`);
          if (m.pecho) parts.push(`Pecho: ${m.pecho}cm`);
          if (m.brazo) parts.push(`Brazo: ${m.brazo}cm`);
          if (m.pierna) parts.push(`Pierna: ${m.pierna}cm`);
          if (m.notas) parts.push(`Notas: ${m.notas}`);
          recentMeasurementsString += `[BIOMETRÍA RECIENTE]: ${parts.join(' | ')}\n`;
        });
      } else {
        recentMeasurementsString += "[BIOMETRÍA RECIENTE]: No hay registros biométricos recientes.\n";
      }

      let recentNutritionString = "";
      if (nutricion.length > 0) {
        const agrupado = {};
        nutricion.forEach(n => {
          if (!agrupado[n.fecha]) {
            agrupado[n.fecha] = { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0, desglose: {} };
          }
          const dt = agrupado[n.fecha];
          dt.calorias += Number(n.calorias || 0);
          dt.proteinas += Number(n.proteinas || 0);
          dt.carbohidratos += Number(n.carbohidratos || 0);
          dt.grasas += Number(n.grasas || 0);
          
          if (!dt.desglose[n.tipo_comida]) dt.desglose[n.tipo_comida] = [];
          dt.desglose[n.tipo_comida].push(n.nombre_alimento);
        });

        Object.keys(agrupado).sort().reverse().forEach(fecha => {
          const dt = agrupado[fecha];
          recentNutritionString += `[NUTRICIÓN - ${fecha}]: ${Math.round(dt.calorias)} kcal | Proteínas: ${Math.round(dt.proteinas)}g | Carbohidratos: ${Math.round(dt.carbohidratos)}g | Grasas: ${Math.round(dt.grasas)}g.\n`;
        });
      } else {
        recentNutritionString += "[NUTRICIÓN]: No hay registros en los últimos 7 días.\n";
      }

      let recentWorkoutsString = "";
      if (semanas.length > 0) {
        semanas.forEach(sem => {
          sem.dias?.forEach(dia => {
            const date = dia.created_at ? dia.created_at.split('T')[0] : sem.created_at ? sem.created_at.split('T')[0] : 'N/A';
            const sortedSeries = dia.series ? [...dia.series].sort((a,b) => a.orden - b.orden || a.id - b.id) : [];
            sortedSeries.forEach(s => {
              const ejName = s.ejercicios?.nombre || s.ejercicio || 'Desconocido';
              let parts = [`Fecha: ${date}`, `${ejName}: ${s.peso}kg x ${s.repeticiones}`];
              if (s.rir != null) parts.push(`RIR: ${s.rir}`);
              if (s.notas) parts.push(`Notas: ${s.notas}`);
              recentWorkoutsString += `[ENTRENAMIENTOS RECIENTES]: ${parts.join(' | ')}\n`;
            });
          });
        });
        if (recentWorkoutsString === "") recentWorkoutsString = "[ENTRENAMIENTOS RECIENTES]: No hay entrenamientos recientes.\n";
      } else {
        recentWorkoutsString += "[ENTRENAMIENTOS RECIENTES]: No hay entrenamientos recientes.\n";
      }

      return `${recentMeasurementsString}\n${recentNutritionString}\n${recentWorkoutsString}`;
    } catch (err) {
      console.error("Error fetching telemetry:", err);
      return "[SISTEMA]: Error al recopilar telemetría.";
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!input.trim()) return;
    if (!apiKey) {
      setMessages(prev => [...prev, { role: 'system', text: 'SISTEMA: No hay API key configurada. Imposible establecer conexión.' }]);
      return;
    }
    
    const userMessage = input;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const telemetryString = await fetchUserTelemetry();

      const groq = new Groq({ apiKey: apiKey, dangerouslyAllowBrowser: true });
      const personaText = AI_PERSONAS[aiPersona] || AI_PERSONAS['biomecanic'];

      const systemPrompt = `${personaText}\n\n${telemetryString}\n\nTienes acceso a los macros diarios del atleta. Correlaciona su ingesta calórica y proteica con su nivel de fatiga y su progreso en el entrenamiento. Sé directo y matemático en tus recomendaciones nutricionales.\n\nAnaliza obligatoriamente las notas cualitativas del atleta. Usa estos datos reales para dar consejos precisos y matemáticos sobre su progresión.\n\nPor favor, responde a la consulta del usuario de acuerdo a tu personalidad y arquetipo. Usa formato Markdown, incluye tablas si es conveniente.`;

      const chatHistory = [
        {
          role: 'system',
          content: systemPrompt
        }
      ];

      messages
        .filter(m => !m.text.includes('Bienvenido.') && !m.text.includes('SISTEMA:'))
        .forEach(m => {
          chatHistory.push({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.text
          });
        });
        
      chatHistory.push({ role: 'user', content: userMessage });

      const completion = await groq.chat.completions.create({
        messages: chatHistory,
        model: 'llama-3.3-70b-versatile',
      });

      const text = completion.choices[0]?.message?.content || 'SISTEMA: NO SE OBTUVO RESPUESTA';

      setMessages(prev => [...prev, { role: 'system', text }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'system', text: `ERROR DEL SISTEMA GROQ: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-4rem)] bg-[#050505] border border-zinc-900 rounded-2xl overflow-hidden selection:bg-brand-red/30 selection:text-brand-red relative shadow-xl shadow-black/50">
      
      {/* Header */}
      <div 
        className="bg-zinc-900/50 hover:bg-zinc-900 border-b border-zinc-800 p-4 flex items-center justify-between shrink-0 z-10 cursor-pointer transition-colors"
        onClick={() => setShowSelector(!showSelector)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-red/10 rounded-xl">
            <Cpu className="text-brand-red" size={20} />
          </div>
          <div>
            <h2 className="text-zinc-100 font-bold tracking-wide text-sm">IronForge IA</h2>
            <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold">
              Arquetipo Activo: <span className="text-brand-red">{AI_CATALOG.find(c => c.id === aiPersona)?.nombre || aiPersona}</span>
            </p>
          </div>
        </div>
        <div className="text-xs text-zinc-500 font-bold uppercase tracking-widest border border-zinc-800 px-2 py-1 rounded-md">
          {showSelector ? 'CERRAR' : 'CAMBIAR'}
        </div>
      </div>

      {/* Selector UI */}
      {showSelector && (
        <div className="bg-zinc-950 border-b border-zinc-800 p-4 shrink-0 z-20 shadow-xl shadow-black/50">
          <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mb-3">Catálogo de Personalidades</p>
          <div className="flex gap-4 overflow-x-auto custom-scrollbar pb-2">
            {AI_CATALOG.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handlePersonaSelect(cat.id)}
                className={`flex-shrink-0 w-48 p-4 rounded-xl text-left transition-all border ${
                  aiPersona === cat.id 
                    ? 'bg-zinc-900 border-brand-red shadow-[0_0_15px_rgba(225,29,72,0.15)]' 
                    : 'bg-[#0a0a0a] border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50'
                }`}
              >
                <div className="text-2xl mb-2">{cat.icono}</div>
                <h3 className={`text-xs font-black uppercase tracking-wide mb-1 ${cat.color}`}>{cat.nombre}</h3>
                <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">{cat.descripcion}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-zinc-950 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div 
              className={`max-w-[90%] md:max-w-[75%] px-4 py-2 ${
                msg.role === 'user' 
                  ? 'bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-2xl rounded-tr-sm shadow-md' 
                  : 'bg-[#0a0a0a] text-zinc-300 border-l-4 border-l-[#e11d48] rounded-r-xl shadow-md'
              }`}
            >
              {msg.role === 'system' && idx === 0 && (
                 <div className="flex items-center gap-2 mb-2">
                   <Cpu className="text-brand-red" size={16} />
                   <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">IronForge System</span>
                 </div>
              )}
              {msg.role === 'user' ? (
                <div className="text-sm tracking-wide whitespace-pre-wrap">{msg.text}</div>
              ) : (
                <div className="text-sm tracking-wide leading-relaxed prose prose-invert max-w-none 
                  [&>table]:w-full [&>table]:my-4 [&>table]:border-collapse [&>table]:text-sm 
                  [&>table>thead>tr>th]:border-b [&>table>thead>tr>th]:border-zinc-700 [&>table>thead>tr>th]:py-2 [&>table>thead>tr>th]:text-left 
                  [&>table>tbody>tr>td]:border-b [&>table>tbody>tr>td]:border-zinc-800/50 [&>table>tbody>tr>td]:py-2
                  [&>ul]:list-disc [&>ul]:ml-6 [&>ul]:my-3 
                  [&>ol]:list-decimal [&>ol]:ml-6 [&>ol]:my-3
                  [&>p]:mb-3 [&>p:last-child]:mb-0 
                  [&>strong]:text-zinc-100 [&>strong]:font-semibold
                  [&>h1]:text-xl [&>h1]:font-bold [&>h1]:text-zinc-100 [&>h1]:mt-6 [&>h1]:mb-3
                  [&>h2]:text-lg [&>h2]:font-bold [&>h2]:text-zinc-100 [&>h2]:mt-5 [&>h2]:mb-3
                  [&>h3]:text-base [&>h3]:font-bold [&>h3]:text-zinc-100 [&>h3]:mt-4 [&>h3]:mb-2
                  [&>pre]:bg-zinc-900 [&>pre]:p-3 [&>pre]:rounded-lg [&>pre]:overflow-x-auto [&>pre]:border [&>pre]:border-zinc-800 [&>pre]:my-3
                  [&>code]:bg-zinc-900 [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded-md [&>code]:text-brand-red [&>code]:font-mono [&>code]:text-xs
                  [&>pre>code]:bg-transparent [&>pre>code]:p-0 [&>pre>code]:text-zinc-300"
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.text}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex w-full justify-start">
             <div className="flex items-center gap-3 px-4 py-2 text-zinc-400">
               <Loader2 size={16} className="animate-spin text-brand-red" /> 
               <span className="text-xs tracking-widest font-bold uppercase">Procesando telemetría...</span>
             </div>
          </div>
        )}
        
        {/* Spacer para que el scroll pase por encima de la barra flotante */}
        <div className="h-32 md:h-40 shrink-0 pointer-events-none w-full" />
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 w-full p-4 backdrop-blur-md bg-zinc-950/80 border-t border-zinc-800/50 z-50">
        <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto flex items-end gap-2 bg-zinc-900 rounded-full border border-zinc-800 focus-within:border-brand-red/50 transition-colors shadow-inner px-2 py-1.5">
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            className="flex-1 bg-transparent border-none text-zinc-100 placeholder-zinc-500 px-4 py-2 resize-none outline-none max-h-32 min-h-[40px] custom-scrollbar text-sm"
            placeholder="Mensaje a IronForge IA..."
            rows={1}
            spellCheck="false"
          />
          <button 
            type="submit"
            disabled={loading || !input.trim()}
            className="mb-0.5 mr-0.5 p-2 bg-[#e11d48] hover:bg-[#be123c] text-zinc-100 shadow-[0_0_10px_rgba(225,29,72,0.5)] disabled:bg-zinc-800 disabled:text-zinc-600 rounded-full transition-colors flex items-center justify-center shrink-0 shadow-sm cursor-pointer"
          >
            <Send size={18} strokeWidth={2.5} />
          </button>
        </form>
        <p className="text-center text-[10px] text-zinc-500 mt-2 tracking-wide font-mono uppercase">
          IronForge Protocol // Llama 3.3 Engine
        </p>
      </div>
    </div>
  );
}
