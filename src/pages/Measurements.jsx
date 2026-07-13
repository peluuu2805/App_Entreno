import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Scale, Activity, Save, Loader2, AlertTriangle, Trash2, Edit2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { ConfirmModal } from '../components/PremiumModals';

const METRICS_LIST = [
  { id: 'peso', label: 'Peso', icon: '⚖️', color: 'text-brand-red' },
  { id: 'cintura', label: 'Cintura', icon: '📏', color: 'text-cyan-500' },
  { id: 'brazo', label: 'Bíceps', icon: '💪', color: 'text-purple-500' },
  { id: 'pecho', label: 'Pecho', icon: '👕', color: 'text-emerald-500' },
  { id: 'pierna', label: 'Pierna', icon: '🦵', color: 'text-yellow-500' },
];

export default function Measurements() {
  const { user } = useAuth();
  const [medidas, setMedidas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorConfig, setErrorConfig] = useState(false);
  const [parent] = useAutoAnimate();
  const [selectedMetric, setSelectedMetric] = useState('peso');
  
  // Form State
  const [peso, setPeso] = useState('');
  const [altura, setAltura] = useState('');
  const [cintura, setCintura] = useState('');
  const [brazo, setBrazo] = useState('');
  const [pierna, setPierna] = useState('');
  const [pecho, setPecho] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [notas, setNotas] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtros Historial
  const [activeFilter, setActiveFilter] = useState('todas');
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, targetId: null });

  useEffect(() => {
    if (user) {
      fetchMedidas();
    }
  }, [user]);

  const fetchMedidas = async () => {
    try {
      setLoading(true);
      setErrorConfig(false);
      const { data, error } = await supabase
        .from('medidas')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20); // Ampliado para el historial de tarjetas

      if (error) {
        if (error.code === '42P01') {
          setErrorConfig(true);
        } else {
          throw error;
        }
      } else {
        setMedidas(data || []);
      }
    } catch (err) {
      console.error('Error fetching medidas:', err);
      toast.error('Error al cargar historial de medidas.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!peso) return;

    try {
      setIsSubmitting(true);
      const { error } = await supabase
        .from('medidas')
        .insert([{
          user_id: user.id,
          peso: parseFloat(peso),
          altura: altura ? parseFloat(altura) : null,
          cintura: cintura ? parseFloat(cintura) : null,
          brazo: brazo ? parseFloat(brazo) : null,
          pierna: pierna ? parseFloat(pierna) : null,
          pecho: pecho ? parseFloat(pecho) : null,
          notas: notas ? notas : null,
          created_at: new Date(fecha).toISOString()
        }]);

      if (error) throw error;

      toast.success('Medida registrada correctamente.');
      setPeso('');
      setAltura('');
      setCintura('');
      setBrazo('');
      setPierna('');
      setPecho('');
      setNotas('');
      setFecha(new Date().toISOString().split('T')[0]);
      fetchMedidas();
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar. Verifica la estructura de la base de datos.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const executeDeleteModal = async () => {
    const { targetId } = deleteModal;
    setDeleteModal({ isOpen: false, targetId: null });
    if (!targetId) return;

    try {
      const { error } = await supabase
        .from('medidas')
        .delete()
        .eq('id', targetId);

      if (error) throw error;
      
      toast.success('Registro eliminado.');
      setMedidas(prev => prev.filter(m => m.id !== targetId));
    } catch (err) {
      console.error(err);
      toast.error('Error al eliminar registro.');
    }
  };

  const handleDelete = (id) => {
    setDeleteModal({ isOpen: true, targetId: id });
  };

  // Filtrado de historial
  const filteredMedidas = medidas.filter(m => {
    if (activeFilter === 'todas') return true;
    return m[activeFilter] != null && m[activeFilter] !== '';
  });

  if (errorConfig) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] bg-zinc-950 border border-red-900/50 rounded-lg p-6">
        <AlertTriangle className="text-red-500 mb-4" size={48} />
        <h2 className="text-xl font-bold text-zinc-100 mb-2 uppercase tracking-widest text-center">Tabla No Detectada</h2>
        <p className="text-zinc-500 text-sm max-w-md text-center mb-6 leading-relaxed">
          La tabla <code className="bg-zinc-900 text-red-400 px-2 py-1 rounded">medidas</code> requiere nuevas columnas. Ejecuta el SQL correspondiente en Supabase (peso, altura, cintura, brazo, pierna, pecho).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="mb-8">
        <h1 className="text-3xl font-black tracking-tighter text-zinc-100 uppercase flex items-center gap-3">
          <Scale className="text-brand-red" size={32} />
          Biometría
        </h1>
        <p className="text-zinc-500 text-sm tracking-widest uppercase mt-1">
          Monitorización de antropometría
        </p>
      </header>

      {medidas.length > 1 && (
        <section className="mb-8 bg-zinc-950/60 backdrop-blur-md border border-zinc-800/50 p-6 rounded-2xl shadow-xl shadow-black/50 group hover:border-brand-red/50 hover:shadow-[0_0_15px_rgba(225,29,72,0.15)] transition-all duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
              <Activity size={16} className="text-brand-red" />
              Analítica Corporal
            </h2>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 focus:border-brand-red focus:ring-1 focus:ring-brand-red text-zinc-100 text-xs font-bold uppercase tracking-widest p-2 rounded-md outline-none cursor-pointer appearance-none px-4"
            >
              {METRICS_LIST.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          
          <div className="w-full h-64 md:h-80 min-h-[250px]">
            <div className="w-full h-full overflow-x-auto overflow-y-hidden whitespace-nowrap custom-scrollbar">
              <div className="min-w-[600px] h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[...medidas].reverse().filter(m => m[selectedMetric] != null).map(m => ({
                    ...m,
                    fecha: format(new Date(m.created_at), 'MMM dd')
                  }))}>
                    <defs>
                      <linearGradient id="colorRed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e11d48" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="fecha" 
                      stroke="#27272a" 
                      tick={{ fill: '#52525b', fontSize: 10, fontWeight: 'bold' }} 
                      tickLine={false} 
                      axisLine={{ stroke: '#27272a' }}
                    />
                    <YAxis 
                      domain={['auto', 'auto']}
                      stroke="#27272a" 
                      tick={{ fill: '#52525b', fontSize: 10, fontWeight: 'bold' }} 
                      tickLine={false} 
                      axisLine={{ stroke: '#27272a' }}
                      width={40}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#e11d48', borderRadius: '8px', borderWidth: '1px' }}
                      itemStyle={{ color: '#ffffff', fontWeight: '900', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '2px' }}
                      labelStyle={{ color: '#52525b', fontWeight: 'bold', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}
                      cursor={{ stroke: '#e11d48', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey={selectedMetric}
                      name={selectedMetric}
                      stroke="#e11d48" 
                      strokeWidth={3} 
                      fillOpacity={1}
                      fill="url(#colorRed)"
                      activeDot={{ r: 6, fill: '#e11d48', stroke: '#ffffff', strokeWidth: 2 }}
                      style={{ filter: 'drop-shadow(0px 0px 8px rgba(225,29,72,0.8))' }}
                      animationDuration={500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Formulario Premium */}
        <div className="lg:col-span-1">
          <form onSubmit={handleSubmit} className="bg-zinc-950/60 backdrop-blur-md border border-zinc-800/50 p-6 rounded-2xl shadow-xl shadow-black/50 sticky top-6 group hover:border-brand-red/50 hover:shadow-[0_0_15px_rgba(225,29,72,0.15)] transition-all duration-300">
            <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Activity size={16} className="text-brand-red" />
              Nuevo Registro
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Fecha</label>
                  <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)}
                    className="w-full bg-zinc-900/80 text-white border border-zinc-700 px-4 py-3 rounded-sm font-mono text-xs outline-none focus:border-brand-red transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Peso (kg) *</label>
                  <input type="number" step="0.1" required value={peso} onChange={(e) => setPeso(e.target.value)}
                    className="w-full bg-zinc-900/80 text-brand-red font-bold border border-zinc-700 px-4 py-3 rounded-sm font-mono text-sm outline-none focus:border-brand-red transition-colors placeholder-zinc-700" placeholder="80.5" />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Altura (cm)</label>
                  <input type="number" step="0.1" value={altura} onChange={(e) => setAltura(e.target.value)}
                    className="w-full bg-zinc-900/80 text-white border border-zinc-700 px-4 py-3 rounded-sm font-mono text-sm outline-none focus:border-brand-red transition-colors placeholder-zinc-700" placeholder="180" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Cintura (cm)</label>
                  <input type="number" step="0.1" value={cintura} onChange={(e) => setCintura(e.target.value)}
                    className="w-full bg-zinc-900/80 text-white border border-zinc-700 px-4 py-3 rounded-sm font-mono text-sm outline-none focus:border-brand-red transition-colors placeholder-zinc-700" placeholder="85" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Bíceps</label>
                  <input type="number" step="0.1" value={brazo} onChange={(e) => setBrazo(e.target.value)}
                    className="w-full bg-zinc-900/80 text-white border border-zinc-700 px-4 py-3 rounded-sm font-mono text-sm outline-none focus:border-brand-red transition-colors placeholder-zinc-700 text-center" placeholder="40" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Pierna</label>
                  <input type="number" step="0.1" value={pierna} onChange={(e) => setPierna(e.target.value)}
                    className="w-full bg-zinc-900/80 text-white border border-zinc-700 px-4 py-3 rounded-sm font-mono text-sm outline-none focus:border-brand-red transition-colors placeholder-zinc-700 text-center" placeholder="60" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Pecho</label>
                  <input type="number" step="0.1" value={pecho} onChange={(e) => setPecho(e.target.value)}
                    className="w-full bg-zinc-900/80 text-white border border-zinc-700 px-4 py-3 rounded-sm font-mono text-sm outline-none focus:border-brand-red transition-colors placeholder-zinc-700 text-center" placeholder="105" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Anotaciones del día</label>
                <textarea value={notas} onChange={(e) => setNotas(e.target.value)}
                  className="w-full bg-zinc-900/80 text-white border border-zinc-700 px-4 py-3 rounded-sm font-mono text-sm outline-none focus:border-brand-red transition-colors placeholder-zinc-700 resize-none h-24" placeholder="Estado de ánimo, retención de líquidos, ayunas..."></textarea>
              </div>

              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit" disabled={isSubmitting || !peso}
                className="w-full bg-[#e11d48] hover:bg-[#be123c] text-white font-black uppercase tracking-widest text-xs py-4 rounded-md shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6">
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Registrar
              </motion.button>
            </div>
          </form>
        </div>

        {/* Historial en formato Cards Estilo Nutrición */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-950/60 backdrop-blur-md border border-zinc-800/50 rounded-2xl overflow-hidden shadow-xl shadow-black/50 p-6">
            
            <div className="flex flex-col gap-4 mb-6">
              <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-widest">Registros Anteriores</h2>
              
              {/* Filtros Píldoras */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveFilter('todas')}
                  className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-all ${
                    activeFilter === 'todas' 
                      ? 'bg-zinc-100 text-black shadow-[0_0_10px_rgba(255,255,255,0.3)]' 
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  Todas
                </button>
                {METRICS_LIST.map(metric => (
                  <button
                    key={metric.id}
                    onClick={() => setActiveFilter(metric.id)}
                    className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-all flex items-center gap-1 ${
                      activeFilter === metric.id 
                        ? 'bg-zinc-100 text-black shadow-[0_0_10px_rgba(255,255,255,0.3)]' 
                        : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'
                    }`}
                  >
                    <span>{metric.icon}</span> {metric.label}
                  </button>
                ))}
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="animate-spin text-brand-red" size={32} />
              </div>
            ) : filteredMedidas.length === 0 ? (
              <div className="text-center p-12 text-zinc-600 text-xs font-bold uppercase tracking-widest border border-dashed border-zinc-800 rounded-xl">
                No hay registros para este filtro
              </div>
            ) : (
              <div className="space-y-3" ref={parent}>
                <AnimatePresence>
                  {filteredMedidas.map((item) => (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-zinc-900/50 border border-zinc-800/50 p-4 rounded-xl flex flex-col relative group/item hover:border-brand-red/30 transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col">
                          <h4 className="text-zinc-200 text-xs font-bold uppercase tracking-widest">{format(new Date(item.created_at), 'dd MMM, yyyy')}</h4>
                          {item.notas && <p className="text-[10px] text-zinc-500 italic mt-1">{item.notas}</p>}
                        </div>
                        <button 
                          onClick={() => handleDelete(item.id)} 
                          className="text-zinc-600 hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-mono">
                        {item.peso && (
                          <div className="flex flex-col">
                            <span className="text-[9px] text-zinc-500 font-sans tracking-widest uppercase">Peso</span>
                            <span className="text-brand-red font-bold">{item.peso} kg</span>
                          </div>
                        )}
                        {item.cintura && (
                          <div className="flex flex-col">
                            <span className="text-[9px] text-zinc-500 font-sans tracking-widest uppercase">Cintura</span>
                            <span className="text-cyan-500 font-bold">{item.cintura} cm</span>
                          </div>
                        )}
                        {item.brazo && (
                          <div className="flex flex-col">
                            <span className="text-[9px] text-zinc-500 font-sans tracking-widest uppercase">Bíceps</span>
                            <span className="text-purple-500 font-bold">{item.brazo} cm</span>
                          </div>
                        )}
                        {item.pecho && (
                          <div className="flex flex-col">
                            <span className="text-[9px] text-zinc-500 font-sans tracking-widest uppercase">Pecho</span>
                            <span className="text-emerald-500 font-bold">{item.pecho} cm</span>
                          </div>
                        )}
                        {item.pierna && (
                          <div className="flex flex-col">
                            <span className="text-[9px] text-zinc-500 font-sans tracking-widest uppercase">Pierna</span>
                            <span className="text-yellow-500 font-bold">{item.pierna} cm</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, targetId: null })}
        onConfirm={executeDeleteModal}
        title="¿ELIMINAR REGISTRO?"
        message="Esta acción no se puede deshacer."
      />
    </div>
  );
}
