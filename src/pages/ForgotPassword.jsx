import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', isError: false });

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMsg({ text: '', isError: false });
    if (!email) return setMsg({ text: 'Por favor, introduce tu email.', isError: true });
    
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/update-password',
    });
    setLoading(false);

    if (error) {
      setMsg({ text: 'Error: ' + error.message, isError: true });
    } else {
      setMsg({ text: 'Revisa tu bandeja de entrada o carpeta de spam para encontrar el enlace de recuperación.', isError: false });
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
            RECUPERAR ACCESO
          </motion.h1>
          <p className="text-zinc-400 text-[10px] tracking-widest uppercase font-bold">
            TE ENVIAREMOS LAS INSTRUCCIONES AL EMAIL
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="flex flex-col gap-6">
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

          <div className="flex flex-col gap-4 mt-2">
            <motion.button 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.98 }}
              type="submit" 
              disabled={loading}
              className="w-full bg-[#e11d48] hover:bg-[#be123c] text-white font-black tracking-widest uppercase transition-colors py-4 rounded-sm text-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando Protocolo...' : 'Enviar Enlace'}
            </motion.button>
          </div>

          {msg.text && (
            <div className={`mt-2 text-center text-[10px] uppercase tracking-widest font-bold ${msg.isError ? 'text-red-500 bg-red-500/10 border border-red-500/20 p-3 rounded-sm' : 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-sm'}`}>
              {msg.text}
            </div>
          )}

          <div className="mt-4 text-center">
            <Link to="/login" className="text-zinc-500 hover:text-zinc-300 text-[10px] uppercase font-bold tracking-widest transition-colors">
              ← Volver a la base
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
