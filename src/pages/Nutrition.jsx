import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Apple, Plus, Loader2, Calendar, Search, X, ChevronDown, ChevronUp, Barcode, Check, BookOpen, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Html5Qrcode } from 'html5-qrcode';
import Groq from 'groq-sdk';
import { motion, AnimatePresence } from 'framer-motion';
import { MagicCard } from '../components/MagicCard';
import { VanishInput } from '../components/VanishInput';
import { ConfirmModal } from '../components/PremiumModals';

const MEAL_TYPES = ['Desayuno', 'Almuerzo', 'Cena', 'Snacks'];

const DEFAULT_GOALS = {
  calorias: 2000,
  proteinas: 150,
  carbohidratos: 200,
  grasas: 65
};

const parseFoodDescription = (desc) => {
  const calMatch = desc.match(/(?:Calories|Calorías):\s*([\d.]+)kcal/i);
  const fatMatch = desc.match(/(?:Fat|Grasa):\s*([\d.]+)g/i);
  const carbMatch = desc.match(/(?:Carbs|Carbohidratos):\s*([\d.]+)g/i);
  const protMatch = desc.match(/(?:Protein|Prot|Proteínas):\s*([\d.]+)g/i);
  
  return {
    calorias: calMatch ? parseInt(calMatch[1], 10) : 0,
    grasas: fatMatch ? parseFloat(fatMatch[1]) : 0,
    carbohidratos: carbMatch ? parseFloat(carbMatch[1]) : 0,
    proteinas: protMatch ? parseFloat(protMatch[1]) : 0,
  };
};

function RippleButton({ children, onClick, className, type = "button" }) {
  const [ripples, setRipples] = useState([]);

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    const newRipple = { x, y, size, id: Date.now() };
    setRipples(prev => [...prev, newRipple]);
    
    if (onClick) onClick(e);
  };

  const handleAnimationEnd = (id) => {
    setRipples(prev => prev.filter(r => r.id !== id));
  };

  return (
    <button type={type} onClick={handleClick} className={`relative overflow-hidden ${className}`}>
      <span className="relative z-10 flex justify-center items-center gap-2">{children}</span>
      <AnimatePresence>
        {ripples.map(r => (
          <motion.span
            key={r.id}
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            onAnimationComplete={() => handleAnimationEnd(r.id)}
            className="absolute rounded-full bg-brand-red pointer-events-none"
            style={{
              width: r.size,
              height: r.size,
              left: r.x,
              top: r.y
            }}
          />
        ))}
      </AnimatePresence>
    </button>
  );
}

function MetabolicRing({ label, current, goal, colorHex, unit, size = 120, strokeWidth = 8 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min(100, Math.max(0, (current / goal) * 100));
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Background Ring */}
        <svg className="absolute inset-0 transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#18181b" 
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress Ring */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colorHex}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ type: 'spring', stiffness: 50, damping: 20 }}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0px 0px 6px ${colorHex}80)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-lg font-black text-zinc-100">{Math.round(current)}</span>
          <span className="text-[8px] uppercase tracking-widest text-zinc-500 font-bold">{unit}</span>
        </div>
      </div>
      <div className="text-center">
        <span className="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">{label}</span>
        <span className="block text-[10px] font-mono text-zinc-600 mt-1">/{goal}</span>
      </div>
    </div>
  );
}

export default function Nutrition() {
  const { user, keys } = useAuth();
  
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [alimentos, setAlimentos] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [activeMealType, setActiveMealType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [resultadoAlimento, setResultadoAlimento] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [amountToAdd, setAmountToAdd] = useState(100);

  // Recetario
  const [recetario, setRecetario] = useState([]);
  const [recetarioFilter, setRecetarioFilter] = useState('todos');
  const [mealSelectorOpen, setMealSelectorOpen] = useState(false);
  const [selectedRecetarioItem, setSelectedRecetarioItem] = useState(null);
  const [editRecetarioModalOpen, setEditRecetarioModalOpen] = useState(false);
  const [editRecetarioForm, setEditRecetarioForm] = useState(null);

  // Fast-Track
  const [fastTrackItem, setFastTrackItem] = useState(null);
  const [fastTrackSelectorOpen, setFastTrackSelectorOpen] = useState(false);
  const [flashItemId, setFlashItemId] = useState(null);

  // Escáner de código de barras
  const [scannerOpen, setScannerOpen] = useState(false);

  // Historial Inteligente
  const [recentFoods, setRecentFoods] = useState([]);

  // Registro Manual Rápido
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    nombre: 'Registro Rápido',
    calorias: '',
    proteinas: 0,
    carbohidratos: 0,
    grasas: 0
  });

  // Edición in-line
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingAmount, setEditingAmount] = useState(100);

  // Colapsables
  const [expandedSections, setExpandedSections] = useState({
    Desayuno: true,
    Almuerzo: true,
    Cena: true,
    Snacks: true
  });

  // Metas dinámicas
  const [targets, setTargets] = useState(DEFAULT_GOALS);
  const [editingTargets, setEditingTargets] = useState(false);
  const [targetForm, setTargetForm] = useState(DEFAULT_GOALS);
  const [targetsId, setTargetsId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: null, targetId: null, itemName: '' });

  useEffect(() => {
    if (user) {
      fetchAlimentos(fecha);
      fetchTargets();
      fetchRecentFoods();
      fetchRecetario();
    }
  }, [user, fecha]);

  const fetchRecetario = async () => {
    try {
      const { data, error } = await supabase
        .from('recetario_usuario')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRecetario(data || []);
    } catch (err) {
      console.error('Error fetching recetario:', err);
    }
  };

  const guardarEnRecetario = async (alimento, origen) => {
    try {
      const origenValido = ['ia', 'barcode', 'manual'].includes(origen) ? origen : 'manual';
      const nombreLimpio = alimento.nombre.toLowerCase().trim();
      const payload = {
        user_id: user.id,
        nombre: nombreLimpio,
        calorias: Math.round(Number(alimento.calorias || 0)),
        proteinas: Math.round(Number(alimento.proteinas || 0)),
        carbohidratos: Math.round(Number(alimento.carbohidratos || 0)),
        grasas: Math.round(Number(alimento.grasas || 0)),
        barcode: alimento.barcode || null,
        origen: origenValido
      };
      
      const { data, error } = await supabase
        .from('recetario_usuario')
        .upsert(payload, { onConflict: 'user_id, nombre' })
        .select();
        
      if (error) {
        if (error.code === 'P0429') {
          throw new Error("RATE_LIMIT");
        }
        console.error("❌ ERROR CRÍTICO EN EL RECETARIO DE SUPABASE:", error.message, error.details, error.hint);
        throw new Error(error.message);
      } else if (data && data.length > 0) {
        // Actualización en caliente instantánea
        setRecetario(prev => {
          const index = prev.findIndex(item => item.id === data[0].id);
          if (index !== -1) {
            const newArr = [...prev];
            newArr[index] = data[0];
            return newArr;
          }
          return [data[0], ...prev];
        });
      }
    } catch (err) {
      if (err.message === "RATE_LIMIT") {
        toast.error("Has alcanzado el límite de seguridad (5 acciones / 15 min). Espera un poco.", { duration: 5000 });
      } else {
        console.error('Catch recetario:', err);
        toast.error('Error inesperado en recetario: ' + err.message);
      }
    }
  };

  const executeDeleteModal = async () => {
    const { type, targetId, itemName } = deleteModal;
    setDeleteModal({ ...deleteModal, isOpen: false });
    if (!targetId) return;

    if (type === 'recetario') {
      try {
        const { error } = await supabase.from('recetario_usuario').delete().eq('id', targetId);
        if (error) throw error;
        toast.success(`${itemName} eliminado del recetario.`);
        setRecetario(prev => prev.filter(item => item.id !== targetId));
      } catch (err) {
        console.error('Error al borrar:', err);
        toast.error('Error al borrar el alimento.');
      }
    } else if (type === 'food') {
      try {
        const { error } = await supabase.from('registros_alimentos').delete().eq('id', targetId); 
        localStorage.removeItem('ironforge_insight_cache');
        if (error) throw error;
        fetchAlimentos(fecha);
        toast.success('Alimento eliminado');
      } catch (err) {
        console.error(err);
        toast.error('Error al eliminar');
      }
    }
  };

  const borrarDeRecetario = (id, nombre) => {
    setDeleteModal({ isOpen: true, type: 'recetario', targetId: id, itemName: nombre });
  };

  const handleEditRecetarioSubmit = async (e) => {
    e.preventDefault();
    if (!editRecetarioForm) return;
    try {
      const nombreLimpio = editRecetarioForm.nombre.toLowerCase().trim();
      const payload = {
        nombre: nombreLimpio,
        calorias: Math.round(Number(editRecetarioForm.calorias || 0)),
        proteinas: Math.round(Number(editRecetarioForm.proteinas || 0)),
        carbohidratos: Math.round(Number(editRecetarioForm.carbohidratos || 0)),
        grasas: Math.round(Number(editRecetarioForm.grasas || 0))
      };
      
      const { data, error } = await supabase.from('recetario_usuario')
        .update(payload)
        .eq('id', editRecetarioForm.id)
        .select();
      
      if (error) throw error;
      toast.success('Alimento actualizado correctamente.');
      setEditRecetarioModalOpen(false);
      
      if (data && data.length > 0) {
        setRecetario(prev => {
          const index = prev.findIndex(item => item.id === data[0].id);
          if (index !== -1) {
            const newArr = [...prev];
            newArr[index] = data[0];
            return newArr;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Error al actualizar:', err);
      toast.error('Error al actualizar el alimento.');
    }
  };

  const fetchRecentFoods = async () => {
    try {
      const { data, error } = await supabase
        .from('registros_alimentos')
        .select('nombre_alimento, calorias, proteinas, carbohidratos, grasas')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      if (data) {
        const uniqueFoods = [];
        const seenNames = new Set();
        for (const item of data) {
          if (!seenNames.has(item.nombre_alimento)) {
            seenNames.add(item.nombre_alimento);
            uniqueFoods.push(item);
            if (uniqueFoods.length >= 8) break;
          }
        }
        setRecentFoods(uniqueFoods);
      }
    } catch (err) {
      console.error('Error fetching recent foods:', err);
    }
  };

  const fetchTargets = async () => {
    try {
      const { data, error } = await supabase
        .from('objetivos_nutricion')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        const dGoals = {
          calorias: data.objetivo_calorias || DEFAULT_GOALS.calorias,
          proteinas: data.objetivo_proteinas || DEFAULT_GOALS.proteinas,
          carbohidratos: data.objetivo_carbohidratos || DEFAULT_GOALS.carbohidratos,
          grasas: data.objetivo_grasas || DEFAULT_GOALS.grasas
        };
        setTargets(dGoals);
        setTargetForm(dGoals);
        setTargetsId(data.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveTargets = async (e) => {
    e.preventDefault();
    
    const payload = {
      user_id: user.id,
      objetivo_calorias: parseInt(targetForm.calorias, 10),
      objetivo_proteinas: parseFloat(targetForm.proteinas),
      objetivo_carbohidratos: parseFloat(targetForm.carbohidratos),
      objetivo_grasas: parseFloat(targetForm.grasas)
    };

    try {
      const { error } = await supabase
        .from('objetivos_nutricion')
        .upsert([payload]);

      if (error) {
        console.error('Error al guardar objetivos:', error);
        alert(`Error en metas: ${error.message} (Código: ${error.code})`);
      } else {
        setTargets({
          calorias: payload.objetivo_calorias,
          proteinas: payload.objetivo_proteinas,
          carbohidratos: payload.objetivo_carbohidratos,
          grasas: payload.objetivo_grasas
        });
        setEditingTargets(false);
        toast.success('¡Objetivos guardados correctamente!');
      }
    } catch (err) {
      console.error('Catch Error al guardar objetivos:', err);
      alert(`Error crítico en guardado: ${err.message}`);
    }
  };

  const fetchAlimentos = async (selectedDate) => {
    setLoadingData(true);
    try {
      const { data, error } = await supabase
        .from('registros_alimentos')
        .select('*')
        .eq('user_id', user.id)
        .eq('fecha', selectedDate)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setAlimentos(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar alimentos.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSearch = async (query) => {
    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    setIsSearching(true);
    setSearchError('');
    setResultadoAlimento(null);
    setAmountToAdd(100);
    
    const isBarcode = /^\d{8,13}$/.test(cleanQuery);
    console.log('Ruta tomada:', isBarcode ? 'Track A (OpenFoodFacts)' : 'Track B (Motor IA)');

    try {
      if (isBarcode) {
        // Carril A - Escáner de Código de Barras (Open Food Facts)
        const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${cleanQuery}.json`);
        if (!response.ok) throw new Error('Error al conectar con OpenFoodFacts');
        const data = await response.json();
        
        if (data.status === 1 && data.product) {
          const product = data.product;
          const nutriments = product.nutriments || {};
          const result = {
            alimento: product.product_name_es || product.product_name || 'Producto Desconocido',
            porcion: "100g",
            calorias: Math.round(nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0),
            proteinas: Math.round(nutriments.proteins_100g || nutriments.proteins || 0),
            carbohidratos: Math.round(nutriments.carbohydrates_100g || nutriments.carbohydrates || 0),
            grasas: Math.round(nutriments.fat_100g || nutriments.fat || 0),
            origen: 'barcode',
            barcode: cleanQuery
          };
          setResultadoAlimento(result);
        } else {
          setSearchError('Producto no registrado en la base abierta.');
        }
      } else {
        // Carril B - Oráculo IA
        if (!keys?.gemini) {
          throw new Error('API Key de IA no configurada.');
        }

        const groq = new Groq({ apiKey: keys.gemini, dangerouslyAllowBrowser: true });
        
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: 'Eres el Motor Nutricional de IronForge. Calcula los macros del alimento proporcionado. Responde SOLO con un JSON válido usando esta estructura exacta y ningún otro texto: {"alimento": "Nombre", "porcion": "100g", "calorias": 0, "proteinas": 0, "carbohidratos": 0, "grasas": 0}. SIEMPRE calcula en base a 100g exactos.'
            },
            {
              role: "user",
              content: cleanQuery
            }
          ],
          model: "llama-3.3-70b-versatile",
          temperature: 0.1,
          response_format: { type: "json_object" }
        });

        const aiResponse = completion.choices[0]?.message?.content;
        if (!aiResponse) throw new Error('No se recibió respuesta de la IA');

        const cleanJson = aiResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
        const result = JSON.parse(cleanJson);
        
        setResultadoAlimento({
          alimento: result.alimento || 'Estimación IA',
          porcion: result.porcion || '100g',
          calorias: Math.round(Number(result.calorias) || 0),
          proteinas: Number(result.proteinas) || 0,
          carbohidratos: Number(result.carbohidratos) || 0,
          grasas: Number(result.grasas) || 0,
          origen: 'ia',
          barcode: null
        });
      }
    } catch (err) {
      console.error("Error en handleSearch:", err);
      setSearchError(`Error: ${err.message || 'Desconocido'}`);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    let html5QrCode;
    if (scannerOpen) {
      html5QrCode = new Html5Qrcode("reader");
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          // success
          html5QrCode.stop().then(() => {
            setScannerOpen(false);
            setSearchModalOpen(true);
            setSearchQuery(decodedText);
            handleSearch(decodedText);
          }).catch(err => console.error(err));
        },
        (errorMessage) => {
          // ignore scan errors
        }
      ).catch((err) => {
        console.error("Scanner error", err);
      });
    }

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(() => {});
      }
    };
  }, [scannerOpen]);

  const handleDirectAdd = async (resultado) => {
    const multiplier = amountToAdd > 0 ? (amountToAdd / 100) : 1;
    const finalMealType = activeMealType || 'Snacks';
    const payload = {
      user_id: user.id,
      fecha: fecha,
      tipo_comida: finalMealType,
      nombre_alimento: resultado.alimento || 'Alimento sin nombre',
      porcion: `${amountToAdd || 100}g`,
      calorias: Math.round(Number(resultado.calorias || 0) * multiplier),
      proteinas: Number((Number(resultado.proteinas || 0) * multiplier).toFixed(1)),
      carbohidratos: Number((Number(resultado.carbohidratos || 0) * multiplier).toFixed(1)),
      grasas: Number((Number(resultado.grasas || 0) * multiplier).toFixed(1))
    };

    console.log('Datos listos para Supabase:', payload);

    try {
      const { error } = await supabase.from('registros_alimentos').insert([payload]); 
      localStorage.removeItem('ironforge_insight_cache');
      
      if (error) {
        console.error('--- ERROR CRÍTICO DE SUPABASE ---', error);
        toast.error(`Error al guardar: ${error.message}`);
        throw error;
      }
      
      await guardarEnRecetario({
        nombre: resultado.alimento,
        calorias: resultado.calorias,
        proteinas: resultado.proteinas,
        carbohidratos: resultado.carbohidratos,
        grasas: resultado.grasas,
        barcode: resultado.barcode
      }, resultado.origen || 'ia');
      
      toast.success(`${resultado.alimento} añadido a ${finalMealType}`);
      setSearchModalOpen(false);
      setSearchQuery('');
      setResultadoAlimento(null);
      fetchAlimentos(fecha);
    } catch (err) {
      console.error('Catch general de inserción:', err);
      toast.error(`Error al guardar alimento: ${err.message || 'Error de red o DB'}`);
    }
  };

  const handleDeleteFood = (id, nombre = "este alimento") => {
    setDeleteModal({ isOpen: true, type: 'food', targetId: id, itemName: nombre });
  };

  const handleManualEntry = async (e) => {
    e.preventDefault();
    if (!manualForm.calorias) return;

    const payload = {
      user_id: user.id,
      fecha: fecha,
      tipo_comida: activeMealType,
      nombre_alimento: manualForm.nombre || 'Registro Rápido',
      porcion: '1 ración',
      calorias: Number(manualForm.calorias),
      proteinas: Number(manualForm.proteinas),
      carbohidratos: Number(manualForm.carbohidratos),
      grasas: Number(manualForm.grasas)
    };

    try {
      const { error } = await supabase.from('registros_alimentos').insert([payload]); 
      localStorage.removeItem('ironforge_insight_cache');
      if (error) throw error;
      
      await guardarEnRecetario({
        nombre: payload.nombre_alimento,
        calorias: payload.calorias,
        proteinas: payload.proteinas,
        carbohidratos: payload.carbohidratos,
        grasas: payload.grasas,
        barcode: null
      }, 'manual');
      
      toast.success(`${payload.nombre_alimento} añadido`);
      setManualEntryOpen(false);
      setSearchModalOpen(false);
      setManualForm({ nombre: 'Registro Rápido', calorias: '', proteinas: 0, carbohidratos: 0, grasas: 0 });
      fetchAlimentos(fecha);
    } catch (err) {
      console.error('Error en registro manual:', err);
      toast.error(`Error manual: ${err.message || 'Desconocido'}`);
    }
  };

  useEffect(() => {
    if (flashItemId) {
      const timer = setTimeout(() => setFlashItemId(null), 800);
      return () => clearTimeout(timer);
    }
  }, [flashItemId]);

  const handleExecuteFastTrack = async (mealType) => {
    setFastTrackSelectorOpen(false);
    setFlashItemId(fastTrackItem.id);

    const payload = {
      user_id: user.id,
      fecha: fecha,
      tipo_comida: mealType,
      nombre_alimento: fastTrackItem.nombre,
      porcion: '100g',
      calorias: fastTrackItem.calorias,
      proteinas: fastTrackItem.proteinas,
      carbohidratos: fastTrackItem.carbohidratos,
      grasas: fastTrackItem.grasas
    };

    try {
      const { error } = await supabase.from('registros_alimentos').insert([payload]); 
      localStorage.removeItem('ironforge_insight_cache');
      if (error) throw error;
      
      await guardarEnRecetario({
        nombre: fastTrackItem.nombre,
        calorias: fastTrackItem.calorias,
        proteinas: fastTrackItem.proteinas,
        carbohidratos: fastTrackItem.carbohidratos,
        grasas: fastTrackItem.grasas,
        barcode: fastTrackItem.barcode
      }, fastTrackItem.origen);

      toast.success(`${fastTrackItem.nombre} añadido rápido a ${mealType}`);
      fetchAlimentos(fecha);
    } catch (err) {
      console.error('Error fast-track:', err);
      toast.error('Error al añadir rápido');
    }
  };

  const handleQuickLog = async (food) => {
    const payload = {
      user_id: user.id,
      fecha: fecha,
      tipo_comida: activeMealType,
      nombre_alimento: food.nombre_alimento,
      porcion: '1 ración',
      calorias: food.calorias,
      proteinas: food.proteinas,
      carbohidratos: food.carbohidratos,
      grasas: food.grasas
    };

    try {
      const { error } = await supabase.from('registros_alimentos').insert([payload]); 
      localStorage.removeItem('ironforge_insight_cache');
      if (error) throw error;
      
      const itemEnRecetario = recetario.find(r => r.nombre === payload.nombre_alimento);
      const origenPrevio = itemEnRecetario ? itemEnRecetario.origen : 'manual';
      const barcodePrevio = itemEnRecetario ? itemEnRecetario.barcode : null;
      
      await guardarEnRecetario({
        nombre: payload.nombre_alimento,
        calorias: payload.calorias,
        proteinas: payload.proteinas,
        carbohidratos: payload.carbohidratos,
        grasas: payload.grasas,
        barcode: barcodePrevio
      }, origenPrevio);

      toast.success(`${payload.nombre_alimento} añadido rápido`);
      fetchAlimentos(fecha);
    } catch (err) {
      console.error('Error en quick log:', err);
      toast.error(`Error rápido: ${err.message || 'Desconocido'}`);
    }
  };

  const handleEditClick = (item) => {
    const currentGrams = parseFloat(item.porcion.replace('g', ''));
    setEditingItemId(item.id);
    setEditingAmount(currentGrams);
  };

  const confirmEditFood = async (item) => {
    if (editingAmount <= 0) return;
    const currentGrams = parseFloat(item.porcion.replace('g', ''));
    if (currentGrams === editingAmount) {
      setEditingItemId(null);
      return;
    }

    const factor = editingAmount / currentGrams;
    const payload = {
      porcion: `${editingAmount}g`,
      calorias: Math.round(item.calorias * factor),
      proteinas: Number((item.proteinas * factor).toFixed(1)),
      carbohidratos: Number((item.carbohidratos * factor).toFixed(1)),
      grasas: Number((item.grasas * factor).toFixed(1))
    };

    try {
      const { error } = await supabase.from('registros_alimentos').update(payload).eq('id', item.id); localStorage.removeItem('ironforge_insight_cache');
      if (error) throw error;
      setEditingItemId(null);
      fetchAlimentos(fecha);
      toast.success('Cantidades actualizadas');
    } catch (err) {
      console.error(err);
      toast.error('Error al actualizar');
    }
  };

  const toggleSection = (type) => {
    setExpandedSections(prev => ({ ...prev, [type]: !prev[type] }));
  };

  // Cálculo de totales
  const totales = alimentos.reduce((acc, curr) => {
    acc.calorias += Number(curr.calorias || 0);
    acc.proteinas += Number(curr.proteinas || 0);
    acc.carbohidratos += Number(curr.carbohidratos || 0);
    acc.grasas += Number(curr.grasas || 0);
    return acc;
  }, { calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 });

  return (
    <div className="space-y-6 pb-24">
      <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-zinc-100 uppercase flex items-center gap-3">
            <Apple className="text-brand-red" size={32} />
            Nutrición
          </h1>
          <p className="text-zinc-500 text-sm tracking-widest uppercase mt-1">
            Registro Dietético
          </p>
        </div>
        <div>
          <input 
            type="date" 
            required 
            value={fecha} 
            onChange={(e) => setFecha(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-sm px-4 py-2 outline-none focus:border-brand-red transition-colors font-mono text-sm uppercase tracking-widest" 
          />
        </div>
      </header>

      {/* Buscador Principal VanishInput */}
      <div className="mb-8">
        <VanishInput 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onSubmit={(e) => {
             e.preventDefault();
             setSearchModalOpen(true);
             if (searchQuery.trim().length > 2) handleSearch(searchQuery);
          }}
          onScanClick={() => setScannerOpen(true)}
          placeholders={["Buscar alimentos, macros o recetas...", "100g de avena", "Pollo a la plancha"]}
        />
      </div>

      {/* Progress Bars (MacroFactor Style) */}
      <MagicCard className="mb-8" contentClassName="w-full h-full p-4 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Balance Diario</h2>
          <button 
            onClick={() => setEditingTargets(!editingTargets)} 
            className="text-[10px] text-zinc-500 hover:text-brand-red font-bold uppercase tracking-widest transition-colors flex items-center gap-1"
          >
            {editingTargets ? 'Cerrar' : 'Configurar Objetivos'}
          </button>
        </div>

        {editingTargets && (
          <form onSubmit={handleSaveTargets} className="mb-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded-sm">
             <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Calorías Meta</label>
                  <input type="number" required value={targetForm.calorias} onChange={(e) => setTargetForm({...targetForm, calorias: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm p-2 outline-none focus:border-brand-red text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Proteínas Meta (g)</label>
                  <input type="number" required value={targetForm.proteinas} onChange={(e) => setTargetForm({...targetForm, proteinas: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm p-2 outline-none focus:border-brand-red text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Carbos Meta (g)</label>
                  <input type="number" required value={targetForm.carbohidratos} onChange={(e) => setTargetForm({...targetForm, carbohidratos: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm p-2 outline-none focus:border-brand-red text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">Grasas Meta (g)</label>
                  <input type="number" required value={targetForm.grasas} onChange={(e) => setTargetForm({...targetForm, grasas: e.target.value})} className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-sm p-2 outline-none focus:border-brand-red text-xs font-mono" />
                </div>
             </div>
             <RippleButton type="submit" className="w-full bg-gradient-to-r from-brand-red to-[#be123c] text-white shadow-[0_0_10px_rgba(225,29,72,0.3)] hover:shadow-[0_0_20px_rgba(225,29,72,0.6)] text-[10px] font-bold uppercase tracking-widest py-3 rounded-sm transition-all border border-brand-red">
               Guardar Metas
             </RippleButton>
          </form>
        )}
        
        <div className="mb-10 mt-4 flex justify-center">
          <MetabolicRing 
            label="Calorías" current={totales.calorias} goal={targets.calorias} 
            colorHex="#e11d48" unit="kcal" size={160} strokeWidth={10} 
          />
        </div>
        
        <div className="flex flex-wrap justify-center gap-4 md:gap-16">
          <MetabolicRing 
            label="Proteínas" current={totales.proteinas} goal={targets.proteinas} 
            colorHex="#be123c" unit="g" size={90} strokeWidth={6} 
          />
          <MetabolicRing 
            label="Carbohidratos" current={totales.carbohidratos} goal={targets.carbohidratos} 
            colorHex="#ea580c" unit="g" size={90} strokeWidth={6} 
          />
          <MetabolicRing 
            label="Grasas" current={totales.grasas} goal={targets.grasas} 
            colorHex="#c2410c" unit="g" size={90} strokeWidth={6} 
          />
        </div>
      </MagicCard>

      {loadingData ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-brand-red" size={32} />
        </div>
      ) : (
        <div className="space-y-4">
          {MEAL_TYPES.map(type => {
            const isExpanded = expandedSections[type];
            const typeAlimentos = alimentos.filter(a => a.tipo_comida === type);
            const typeKcal = typeAlimentos.reduce((sum, a) => sum + Number(a.calorias || 0), 0);

            return (
              <div key={type} className="bg-zinc-950/60 backdrop-blur-md border border-zinc-800/50 rounded-2xl overflow-hidden shadow-xl shadow-black/50 group hover:border-brand-red/50 hover:shadow-[0_0_15px_rgba(225,29,72,0.15)] transition-all duration-300 mb-6">
                {/* Cabecera del Acordeón */}
                <div 
                  className="p-6 bg-transparent flex items-center justify-between cursor-pointer hover:bg-zinc-900/20 transition-colors"
                  onClick={() => toggleSection(type)}
                >
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-sm tracking-widest uppercase text-zinc-200">{type}</h3>
                    <span className="text-xs font-mono text-zinc-500">{Math.round(typeKcal)} kcal</span>
                  </div>
                  {isExpanded ? <ChevronUp size={18} className="text-zinc-500" /> : <ChevronDown size={18} className="text-zinc-500" />}
                </div>

                {/* Contenido */}
                {isExpanded && (
                  <div className="p-4 md:p-6 pt-0">
                    {typeAlimentos.length > 0 ? (
                      <div className="divide-y divide-zinc-800 mb-4">
                        {typeAlimentos.map(item => (
                          <div key={item.id} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-2 group border-b border-zinc-900/50 last:border-0">
                            {editingItemId === item.id ? (
                              <div className="flex-1 flex flex-col md:flex-row gap-2 md:items-center">
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="number" 
                                    value={editingAmount} 
                                    onChange={(e) => setEditingAmount(Number(e.target.value))}
                                    className="w-20 bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-sm px-2 py-1 outline-none focus:border-brand-red text-xs font-mono"
                                  />
                                  <span className="text-zinc-500 text-xs font-mono">g</span>
                                </div>
                                <div className="flex items-center gap-4 mt-2 md:mt-0">
                                  <button onClick={() => confirmEditFood(item)} className="p-2 bg-brand-red/10 text-brand-red hover:bg-brand-red hover:text-white rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors">Guardar</button>
                                  <button onClick={() => setEditingItemId(null)} className="p-2 text-zinc-400 hover:text-zinc-200 text-[10px] font-bold uppercase tracking-widest transition-colors">Cancelar</button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex-1">
                                  <p className="text-sm font-bold text-zinc-200">{item.nombre_alimento}</p>
                                  <p className="text-[10px] uppercase tracking-widest font-mono text-zinc-500 mt-1">
                                    {item.porcion} • {item.proteinas}g P | {item.carbohidratos}g C | {item.grasas}g G
                                  </p>
                                </div>
                                <div className="flex justify-end items-center gap-3 mt-2 md:mt-0">
                                  <span className="font-mono text-brand-red font-bold text-sm mr-2">{item.calorias} kcal</span>
                                  <div className="opacity-100 flex md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200 items-center gap-2">
                                    <button onClick={() => handleEditClick(item)} className="p-2 bg-zinc-900/50 rounded-sm text-[10px] uppercase tracking-widest font-bold text-zinc-400 hover:text-brand-red hover:bg-brand-red/10 transition-colors">Editar</button>
                                    <button onClick={() => handleDeleteFood(item.id)} className="p-2 bg-zinc-900/50 rounded-sm text-[10px] uppercase tracking-widest font-bold text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors">Eliminar</button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-4 text-center">
                         <p className="text-zinc-600 text-[10px] uppercase tracking-widest font-bold">Vacio</p>
                      </div>
                    )}
                    
                    <button 
                      onClick={() => {
                        setActiveMealType(type);
                        setSearchModalOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-brand-red hover:bg-brand-red/10 rounded-sm transition-colors text-xs font-bold uppercase tracking-widest"
                    >
                      <Plus size={16} />
                      Añadir Alimento
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Mi Recetario */}
      <div className="mt-12 mb-24">
        <h2 className="text-xl font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2">
          <BookOpen className="text-brand-red" size={24} />
          Mi Recetario
        </h2>
        
        {/* Filtros */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
          <button 
            onClick={() => setRecetarioFilter('todos')}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${recetarioFilter === 'todos' ? 'bg-brand-red text-white' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}
          >
            Todos
          </button>
          <button 
            onClick={() => setRecetarioFilter('barcode')}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${recetarioFilter === 'barcode' ? 'bg-cyan-500 text-zinc-950' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}
          >
            Escaneados 📷
          </button>
          <button 
            onClick={() => setRecetarioFilter('ia')}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${recetarioFilter === 'ia' ? 'bg-purple-500 text-white' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}
          >
            Creados por IA 🧠
          </button>
          <button 
            onClick={() => setRecetarioFilter('manual')}
            className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors ${recetarioFilter === 'manual' ? 'bg-orange-500 text-white' : 'bg-zinc-900 text-zinc-500 border border-zinc-800'}`}
          >
            Manuales ✍️
          </button>
        </div>

        {/* Lista */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recetario.filter(r => recetarioFilter === 'todos' || r.origen === recetarioFilter).map((item) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => {
                setSelectedRecetarioItem(item);
                setMealSelectorOpen(true);
              }}
              className={`bg-zinc-950/60 backdrop-blur-md border border-zinc-800/50 p-4 rounded-2xl cursor-pointer hover:border-brand-red/50 hover:shadow-[0_0_15px_rgba(225,29,72,0.15)] transition-all group relative overflow-hidden flex flex-col justify-between ${flashItemId === item.id ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : ''}`}
            >
              <div className="flex justify-between items-start mb-4">
                <h4 className="text-white font-bold text-sm tracking-widest uppercase pr-16">{item.nombre}</h4>
                <div className="shrink-0 absolute top-3 right-3 flex items-center gap-2">
                  <div className="flex flex-col items-end gap-1 mr-1">
                    {item.origen === 'barcode' && <span className="text-cyan-500 text-xs">📷</span>}
                    {item.origen === 'ia' && <span className="text-purple-500 text-xs">🧠</span>}
                    {item.origen === 'manual' && <span className="text-orange-500 text-xs">✍️</span>}
                  </div>
                  
                  {/* Botones Edit/Delete siempre visibles para móvil */}
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditRecetarioForm(item);
                        setEditRecetarioModalOpen(true);
                      }}
                      className="p-1.5 rounded-full bg-zinc-900 border border-zinc-700 hover:border-yellow-500 hover:bg-zinc-800 transition-all"
                      title="Editar alimento"
                    >
                      <svg className="w-3.5 h-3.5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        borrarDeRecetario(item.id, item.nombre);
                      }}
                      className="p-1.5 rounded-full bg-zinc-900 border border-zinc-700 hover:border-red-500 hover:bg-zinc-800 transition-all"
                      title="Borrar alimento"
                    >
                      <X size={14} className="text-red-500" />
                    </button>
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setFastTrackItem(item);
                      setFastTrackSelectorOpen(true);
                    }}
                    className={`p-2 rounded-full border transition-all ml-1 ${flashItemId === item.id ? 'bg-green-500/20 border-green-500' : 'bg-zinc-900/80 border-zinc-700 hover:border-cyan-500 hover:bg-zinc-800'}`}
                    title="Añadir rápido"
                  >
                    {flashItemId === item.id ? <Check size={16} className="text-green-500" /> : <Zap size={16} className="text-cyan-500" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-end">
                <div className="flex gap-4 text-xs font-mono text-zinc-500">
                  <span className="text-brand-red font-bold">{item.calorias} kcal</span>
                  <span>P:{item.proteinas}</span>
                  <span>C:{item.carbohidratos}</span>
                  <span>G:{item.grasas}</span>
                </div>
              </div>
            </motion.div>
          ))}
          {recetario.length === 0 && (
             <div className="col-span-full py-12 text-center text-zinc-600 text-xs font-bold uppercase tracking-widest border border-dashed border-zinc-800 rounded-2xl">
               Tu recetario está vacío. Añade alimentos para llenar tu despensa.
             </div>
          )}
        </div>
      </div>

      {/* Panel Superior/Buscador - Modal o Inline */}
      {searchModalOpen && (
        <div className="fixed inset-0 bg-[#050505]/90 backdrop-blur-sm z-50 flex flex-col justify-end pt-12 md:justify-center md:pt-0 px-4 overflow-hidden">
          <div className="w-full max-w-4xl mx-auto flex flex-col bg-zinc-950/80 backdrop-blur-md border border-zinc-800/50 rounded-t-3xl md:rounded-3xl shadow-2xl shadow-black/80 max-h-[85dvh]">
            
            <div className="p-6 border-b border-zinc-900 shrink-0">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-zinc-100 uppercase tracking-widest">
                  Enrutador <span className="text-brand-red font-light">Dual Nutricional</span>
                </h3>
                <button 
                  onClick={() => setSearchModalOpen(false)}
                  className="text-zinc-500 hover:text-zinc-200 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <h3 className="text-sm font-bold text-zinc-200 uppercase tracking-widest flex items-center gap-2">
                <Search size={16} className="text-brand-red" />
                Buscando para: <span className="text-brand-red">{activeMealType}</span>
              </h3>
            </div>

            <div className="p-4 border-b border-zinc-800">
              <div className="flex flex-col md:flex-row gap-2">
                <div className="flex-1 w-full min-w-[250px]">
                  <VanishInput
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (searchQuery.trim().length > 2) handleSearch(searchQuery);
                    }}
                    disabled={isSearching}
                    placeholders={["Buscar alimentos...", "Pechuga de Pollo", "Arroz blanco", "Avena", "Huevo duro"]}
                  />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setScannerOpen(true)}
                    className="flex-1 md:flex-none bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-brand-red hover:shadow-[0_0_15px_rgba(225,29,72,0.3)] hover:border-brand-red px-4 py-3 md:py-0 rounded-2xl transition-all flex items-center justify-center"
                    title="Escanear Código de Barras"
                  >
                    <Barcode size={20} />
                  </button>
                  <button 
                    onClick={() => setManualEntryOpen(true)} 
                    className="flex-1 md:flex-none bg-zinc-900 border border-zinc-700 text-white hover:text-brand-red px-4 py-3 md:py-0 rounded-2xl font-bold tracking-widest text-xs uppercase transition-colors whitespace-nowrap"
                  >
                    Registro Manual
                  </button>
                </div>
              </div>
              <p className="text-[9px] uppercase tracking-widest text-zinc-600 mt-2 font-bold text-right">Powered by IronForge AI & OpenFoodFacts</p>
              
              <div className="mt-4 border-t border-zinc-800 pt-3">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Recientes:</span>
                <div className="flex flex-wrap gap-2 mt-3">
                  {recentFoods.map((food, idx) => (
                    <button 
                      key={idx}
                      onClick={() => handleQuickLog(food)}
                      className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-bold tracking-wide px-3 py-1.5 rounded-sm transition-colors hover:border-[#e11d48] hover:text-[#e11d48] cursor-pointer"
                    >
                      {food.nombre_alimento} - {food.calorias} kcal
                    </button>
                  ))}
                  {recentFoods.length === 0 && <span className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Sin historial</span>}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {searchError && (
                <div className="text-center py-4 mb-4 text-red-500 text-[10px] font-bold uppercase tracking-widest bg-red-500/10 border border-red-500/20 rounded-sm">
                  {searchError}
                </div>
              )}
              {isSearching && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="animate-spin text-brand-red" size={32} />
                  <span className="text-xs uppercase tracking-widest font-bold text-zinc-500">Analizando Datos...</span>
                </div>
              )}
              {!resultadoAlimento && !isSearching && !searchError && (
                <div className="text-center py-12 text-zinc-600 text-xs font-bold uppercase tracking-widest">
                  Realiza una búsqueda para ver resultados.
                </div>
              )}
              
              {resultadoAlimento && !isSearching && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full bg-zinc-950 border border-zinc-800/80 rounded-2xl p-6 flex flex-col gap-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-orange-500 to-blue-500" />
                  
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-white font-black text-xl md:text-2xl tracking-tighter uppercase">{resultadoAlimento.alimento}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="bg-brand-red/10 text-brand-red text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm">
                          {amountToAdd}g
                        </span>
                        <span className="text-zinc-400 font-mono text-sm">{Math.round(resultadoAlimento.calorias * (amountToAdd / 100))} kcal</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-800/50 mb-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Cantidad (g)</span>
                      <input 
                        type="number"
                        min="1"
                        value={amountToAdd}
                        onChange={(e) => setAmountToAdd(Number(e.target.value) || 0)}
                        className="w-20 bg-zinc-950 border border-zinc-700 text-brand-red font-bold text-center rounded-md px-2 py-1 outline-none focus:border-brand-red transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                        <span className="text-cyan-500">Proteínas</span>
                        <span className="text-zinc-300">{(resultadoAlimento.proteinas * (amountToAdd / 100)).toFixed(1)}g</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(((resultadoAlimento.proteinas * (amountToAdd / 100)) / 50) * 100, 100)}%` }}
                          transition={{ duration: 1, delay: 0.1 }}
                          className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]" 
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                        <span className="text-orange-500">Carbohidratos</span>
                        <span className="text-zinc-300">{(resultadoAlimento.carbohidratos * (amountToAdd / 100)).toFixed(1)}g</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(((resultadoAlimento.carbohidratos * (amountToAdd / 100)) / 100) * 100, 100)}%` }}
                          transition={{ duration: 1, delay: 0.2 }}
                          className="h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.6)]" 
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
                        <span className="text-blue-500">Grasas</span>
                        <span className="text-zinc-300">{(resultadoAlimento.grasas * (amountToAdd / 100)).toFixed(1)}g</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(((resultadoAlimento.grasas * (amountToAdd / 100)) / 40) * 100, 100)}%` }}
                          transition={{ duration: 1, delay: 0.3 }}
                          className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.6)]" 
                        />
                      </div>
                    </div>
                  </div>

                  <RippleButton 
                    onClick={() => handleDirectAdd(resultadoAlimento)}
                    className="w-full py-4 bg-gradient-to-r from-brand-red to-[#be123c] text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(225,29,72,0.4)] hover:shadow-[0_0_25px_rgba(225,29,72,0.6)] border border-brand-red flex items-center justify-center gap-2"
                  >
                    <Check size={18} strokeWidth={3} />
                    Añadir a mi registro
                  </RippleButton>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Registro Manual */}
      {manualEntryOpen && (
        <div className="fixed inset-0 bg-[#050505]/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-4 md:p-6 w-[95%] md:w-full max-w-sm shadow-[0_0_20px_rgba(225,29,72,0.15)] overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-black text-white uppercase tracking-widest mb-4 border-b border-zinc-800 pb-2">Registro Rápido</h3>
            <form onSubmit={handleManualEntry} className="space-y-4">
              <div>
                <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Nombre / Descripción</label>
                <input type="text" value={manualForm.nombre} onChange={e => setManualForm({...manualForm, nombre: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-sm p-2 text-white outline-none focus:border-brand-red text-xs" />
              </div>
              <div>
                <label className="block text-[10px] text-brand-red font-bold uppercase tracking-widest mb-1">Calorías (Obligatorio)</label>
                <input type="number" required value={manualForm.calorias} onChange={e => setManualForm({...manualForm, calorias: e.target.value})} className="w-full bg-zinc-900 border border-brand-red/30 focus:border-brand-red rounded-sm p-2 text-brand-red outline-none text-xs font-mono" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">PRO (g)</label>
                  <input type="number" value={manualForm.proteinas} onChange={e => setManualForm({...manualForm, proteinas: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-sm p-2 text-white outline-none focus:border-brand-red text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">CAR (g)</label>
                  <input type="number" value={manualForm.carbohidratos} onChange={e => setManualForm({...manualForm, carbohidratos: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-sm p-2 text-white outline-none focus:border-brand-red text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">GRA (g)</label>
                  <input type="number" value={manualForm.grasas} onChange={e => setManualForm({...manualForm, grasas: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-sm p-2 text-white outline-none focus:border-brand-red text-xs font-mono" />
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-zinc-800">
                <button type="button" onClick={() => setManualEntryOpen(false)} className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 py-3 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors border border-zinc-800">Cancelar</button>
                <RippleButton type="submit" className="flex-1 bg-gradient-to-r from-brand-red to-[#be123c] shadow-[0_0_10px_rgba(225,29,72,0.3)] hover:shadow-[0_0_20px_rgba(225,29,72,0.6)] text-white py-3 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all border border-brand-red">Añadir a la Forja</RippleButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Recetario */}
      {editRecetarioModalOpen && editRecetarioForm && (
        <div className="fixed inset-0 bg-[#050505]/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <div className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800/50 rounded-2xl p-4 md:p-6 w-[95%] md:w-full max-w-sm shadow-[0_0_20px_rgba(234,179,8,0.15)] overflow-y-auto max-h-[90vh]">
            <h3 className="text-lg font-black text-white uppercase tracking-widest mb-4 border-b border-zinc-800 pb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              Editar Recetario
            </h3>
            <form onSubmit={handleEditRecetarioSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Nombre del alimento</label>
                <input type="text" required value={editRecetarioForm.nombre} onChange={e => setEditRecetarioForm({...editRecetarioForm, nombre: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-sm p-2 text-white outline-none focus:border-yellow-500/50 text-xs" />
              </div>
              <div>
                <label className="block text-[10px] text-yellow-500 font-bold uppercase tracking-widest mb-1">Calorías (Obligatorio)</label>
                <input type="number" required value={editRecetarioForm.calorias} onChange={e => setEditRecetarioForm({...editRecetarioForm, calorias: e.target.value})} className="w-full bg-zinc-900 border border-yellow-500/30 focus:border-yellow-500 rounded-sm p-2 text-yellow-500 outline-none text-xs font-mono" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">PRO (g)</label>
                  <input type="number" value={editRecetarioForm.proteinas} onChange={e => setEditRecetarioForm({...editRecetarioForm, proteinas: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-sm p-2 text-white outline-none focus:border-yellow-500 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">CAR (g)</label>
                  <input type="number" value={editRecetarioForm.carbohidratos} onChange={e => setEditRecetarioForm({...editRecetarioForm, carbohidratos: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-sm p-2 text-white outline-none focus:border-yellow-500 text-xs font-mono" />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">GRA (g)</label>
                  <input type="number" value={editRecetarioForm.grasas} onChange={e => setEditRecetarioForm({...editRecetarioForm, grasas: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 rounded-sm p-2 text-white outline-none focus:border-yellow-500 text-xs font-mono" />
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-zinc-800">
                <button type="button" onClick={() => setEditRecetarioModalOpen(false)} className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 py-3 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-colors border border-zinc-800">Cancelar</button>
                <RippleButton type="submit" className="flex-1 bg-gradient-to-r from-yellow-500 to-amber-600 shadow-[0_0_10px_rgba(234,179,8,0.3)] hover:shadow-[0_0_20px_rgba(234,179,8,0.6)] text-white py-3 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all border border-yellow-500">Guardar Cambios</RippleButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Escáner */}
      {scannerOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex flex-col items-center justify-center p-4">
          <div className="relative w-[95%] md:w-full max-w-sm bg-zinc-950/80 backdrop-blur-md border border-cyan-500/50 rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden mb-8">
            <div className="p-4 border-b border-zinc-800/50 text-center">
              <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center justify-center gap-2">
                <Barcode className="text-cyan-500" size={20}/>
                Escáner Óptico
              </h3>
              <p className="text-[10px] text-zinc-500 font-mono tracking-widest mt-1">APUNTA AL CÓDIGO DE BARRAS</p>
            </div>
            <div className="relative p-2 bg-black">
              <div id="reader" className="w-full bg-black rounded-lg overflow-hidden border-2 border-cyan-500 relative aspect-video max-h-[50vh] md:max-h-[60vh]"></div>
              
              {/* Animación Láser IronForge */}
              <motion.div 
                className="absolute left-4 right-4 h-0.5 bg-cyan-500 shadow-[0_0_15px_#06b6d4] z-10 pointer-events-none"
                animate={{ top: ['10%', '90%', '10%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              />
            </div>
          </div>

          <button 
            onClick={() => setScannerOpen(false)} 
            className="fixed bottom-10 px-8 py-3 bg-zinc-900 border border-zinc-700 text-white text-xs font-bold uppercase tracking-widest rounded-full shadow-xl hover:bg-zinc-800 transition-colors flex items-center gap-2"
          >
            <X size={16} /> Cerrar Escáner
          </button>
        </div>
      )}

      {/* Bottom Sheet de Fast-Track */}
      <AnimatePresence>
        {fastTrackSelectorOpen && fastTrackItem && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setFastTrackSelectorOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 rounded-t-3xl p-6 z-[90] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
            >
              <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-6" />
              <h3 className="text-center text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Añadir Rápido (100g)</h3>
              <p className="text-center text-brand-red text-lg font-black tracking-widest uppercase mb-6 truncate px-4">{fastTrackItem.nombre}</p>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                {MEAL_TYPES.map(type => (
                  <RippleButton 
                    key={type}
                    onClick={() => handleExecuteFastTrack(type)}
                    className="bg-zinc-900 border border-zinc-800 hover:border-cyan-500/50 hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-widest py-4 rounded-2xl transition-all flex justify-center items-center gap-2"
                  >
                    <Plus size={16} className="text-cyan-500" />
                    {type}
                  </RippleButton>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal Selector de Comida (Recetario) */}
      {mealSelectorOpen && selectedRecetarioItem && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm relative shadow-2xl shadow-brand-red/10">
            <button onClick={() => setMealSelectorOpen(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white">
              <X size={20} />
            </button>
            <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2 border-b border-zinc-800 pb-2">
              Añadir a...
            </h3>
            <p className="text-brand-red text-sm font-bold uppercase tracking-widest mb-6">{selectedRecetarioItem.nombre}</p>
            
            <div className="space-y-3">
              {MEAL_TYPES.map(type => (
                <RippleButton 
                  key={type}
                  onClick={() => {
                    setActiveMealType(type);
                    setResultadoAlimento({
                       alimento: selectedRecetarioItem.nombre,
                       porcion: '100g', 
                       calorias: selectedRecetarioItem.calorias,
                       proteinas: selectedRecetarioItem.proteinas,
                       carbohidratos: selectedRecetarioItem.carbohidratos,
                       grasas: selectedRecetarioItem.grasas,
                       origen: selectedRecetarioItem.origen,
                       barcode: selectedRecetarioItem.barcode
                    });
                    setAmountToAdd(100);
                    setMealSelectorOpen(false);
                    setSearchModalOpen(true);
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 hover:border-brand-red/50 text-white font-bold text-xs uppercase tracking-widest py-4 rounded-xl transition-all flex justify-between px-6"
                >
                  <span>{type}</span>
                  <Plus size={16} className="text-brand-red" />
                </RippleButton>
              ))}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={executeDeleteModal}
        title={deleteModal.type === 'recetario' ? `¿ELIMINAR ${deleteModal.itemName}?` : '¿ELIMINAR ALIMENTO?'}
        message="Esta acción no se puede deshacer."
      />
    </div>
  );
}


