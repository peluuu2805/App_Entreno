import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', isError: false });
  const navigate = useNavigate();

  // Opcional: Podrías comprobar aquí si el usuario realmente viene con un hash válido
  // pero Supabase Auth Listener lo hará y te autenticará si el token es válido.
  
  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setMsg({ text: '', isError: false });

    if (!password) return setMsg({ text: 'Por favor, introduce tu nueva contraseña.', isError: true });
    if (password.length < 6) return setMsg({ text: 'La contraseña debe tener al menos 6 caracteres.', isError: true });
    
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: password
    });
    setLoading(false);

    if (error) {
      setMsg({ text: 'Error al actualizar: ' + error.message, isError: true });
    } else {
      setMsg({ text: 'Contraseña actualizada con éxito. Abriendo escotillas...', isError: false });
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen w-full relative flex items-center justify-center bg-[url('/bg-login.jpg')] bg-cover bg-center bg-no-repeat p-5">
      {/* Capa de Oscurecimiento (Overlay) */}
      <div className="absolute inset-0 bg-black/80 z-0"></div>

      {/* Form Overlay (Glassmorphism) */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="relative z-10 w-full max-w-md p-8 bg-zinc-950/50 backdrop-blur-md border border-[#e11d48]/40 shadow-2xl shadow-black/80 rounded-2xl pointer-events-auto"
      >
        <div className="text-center mb-8">
          <motion.h1 
            className="text-3xl font-black mb-2 text-zinc-100 tracking-widest uppercase font-bebas"
          >
            NUEVA CONTRASEÑA
          </motion.h1>
          <p className="text-zinc-400 text-[10px] tracking-widest uppercase font-bold">
            ESTABLECE TU NUEVA LLAVE DE ACCESO
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Nueva Contraseña</label>
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

          <div className="flex flex-col gap-4 mt-2">
            <motion.button 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.98 }}
              type="submit" 
              disabled={loading}
              className="w-full bg-[#e11d48] hover:bg-[#be123c] text-white font-black tracking-widest uppercase transition-colors py-4 rounded-sm text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando...' : 'Actualizar y Entrar'}
            </motion.button>
          </div>

          {msg.text && (
            <div className={`mt-2 text-center text-[10px] uppercase tracking-widest font-bold ${msg.isError ? 'text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-sm' : 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-sm'}`}>
              {msg.text}
            </div>
          )}
        </form>
      </motion.div>
    </div>
  );
}
