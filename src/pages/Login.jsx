import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', isError: false });
  const navigate = useNavigate();
  const { user } = useAuth();

  // If already logged in, redirect
  if (user) {
    navigate('/', { replace: true });
    return null;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setMsg({ text: '', isError: false });
    if (!email || !password) return setMsg({ text: 'Rellena email y contraseña.', isError: true });
    
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      let text = error.message;
      if (text.includes('Invalid login credentials')) text = 'Email o contraseña incorrectos.';
      else if (text.includes('Email not confirmed')) text = 'Confirma tu email antes de iniciar sesión.';
      setMsg({ text, isError: true });
    } else {
      navigate('/', { replace: true });
    }
  };

  const handleRegister = async () => {
    setMsg({ text: '', isError: false });
    if (!email || !password) return setMsg({ text: 'Rellena email y contraseña.', isError: true });
    if (password.length < 6) return setMsg({ text: 'La contraseña debe tener al menos 6 caracteres.', isError: true });

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    setLoading(false);

    if (error) {
      let text = error.message;
      if (text.includes('already registered')) text = 'Este email ya está registrado. Intenta iniciar sesión.';
      setMsg({ text, isError: true });
      return;
    }

    if (data?.user?.identities?.length === 0) {
      setMsg({ text: 'Este email ya está registrado.', isError: true });
    } else if (data.session) {
      navigate('/', { replace: true });
    } else {
      setMsg({ text: 'Cuenta creada. Revisa tu email para confirmar.', isError: false });
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-[url('/bg-login.jpg')] bg-cover bg-center bg-no-repeat p-5">
      
      {/* Capa de Oscurecimiento (Overlay) */}
      <div className="absolute inset-0 bg-black/70 z-0"></div>

      {/* Form Overlay (Glassmorphism) */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="relative z-10 w-full max-w-md p-8 bg-zinc-950/50 backdrop-blur-md border border-[#e11d48]/40 shadow-2xl shadow-black/80 rounded-2xl pointer-events-auto"
      >
        <div className="text-center mb-10">
          <motion.h1 
            animate={{ textShadow: ["0px 0px 0px rgba(225, 29, 72, 0)", "0px 0px 15px rgba(225, 29, 72, 0.6)", "0px 0px 0px rgba(225, 29, 72, 0)"] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            className="text-4xl font-black mb-2 text-zinc-100 tracking-widest uppercase"
          >
            IRONFORGE
          </motion.h1>
          <p className="text-zinc-400 text-[10px] tracking-widest uppercase font-bold">SISTEMA DE GESTIÓN METABÓLICA Y RENDIMIENTO</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-zinc-900/80 text-white border border-zinc-700 px-4 py-3 rounded-sm font-mono text-sm outline-none focus:border-[#e11d48] transition-colors"
              placeholder="operario@ironforge.com" 
              required 
            />
          </div>
          <div className="flex flex-col gap-2 mb-2">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Contraseña</label>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-zinc-900/80 text-white border border-zinc-700 px-4 py-3 rounded-sm font-mono text-sm outline-none focus:border-[#e11d48] transition-colors"
              placeholder="••••••••" 
              minLength="6" 
              required 
            />
          </div>

          <div className="flex flex-col gap-4">
            <motion.button 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.98 }}
              type="submit" 
              disabled={loading}
              className="w-full bg-[#e11d48] hover:bg-[#be123c] text-white font-black tracking-widest uppercase transition-colors py-4 rounded-sm text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Conectando...' : 'Iniciar Sesión'}
            </motion.button>
            
            <div className="text-center mt-2">
              <Link to="/forgot-password" className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 hover:text-zinc-300 transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <div className="flex items-center gap-3 my-2">
              <div className="h-px bg-zinc-800 flex-1"></div>
              <span className="text-zinc-600 text-[10px] uppercase font-bold tracking-widest">Protocolo Alterno</span>
              <div className="h-px bg-zinc-800 flex-1"></div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.98 }}
              type="button" 
              onClick={handleRegister}
              disabled={loading}
              className="w-full bg-transparent text-zinc-400 border border-zinc-800 font-bold py-4 rounded-sm uppercase tracking-widest text-xs transition-colors hover:text-zinc-100 hover:border-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Generando Identidad...' : 'Crear Cuenta Nueva'}
            </motion.button>
          </div>

          {msg.text && (
            <div className={`mt-4 text-center text-[10px] uppercase tracking-widest font-bold ${msg.isError ? 'text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-sm' : 'text-[#e11d48] bg-[#e11d48]/10 border border-[#e11d48]/20 p-3 rounded-sm'}`}>
              {msg.text}
            </div>
          )}
        </form>
      </motion.div>
    </div>
  );
}
