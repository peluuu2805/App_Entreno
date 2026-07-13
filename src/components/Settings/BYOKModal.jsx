import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { X, Save } from 'lucide-react';

export default function BYOKModal({ onClose }) {
  const { keys, updateKeys } = useAuth();
  const [geminiKey, setGeminiKey] = useState('');
  const [fatsecretKey, setFatsecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ msg: '', isError: false });

  useEffect(() => {
    setGeminiKey(keys.gemini || '');
    setFatsecretKey(keys.fatsecret || '');
  }, [keys]);

  const handleSave = async () => {
    setLoading(true);
    setStatus({ msg: '', isError: false });
    
    const { error } = await updateKeys({ 
      gemini: geminiKey.trim() || null, 
      fatsecret: fatsecretKey.trim() || null 
    });

    setLoading(false);
    if (error) {
      setStatus({ msg: 'Error al guardar: ' + error.message, isError: true });
    } else {
      setStatus({ msg: '✅ Claves guardadas correctamente', isError: false });
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex justify-center items-center p-4">
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border-color)] rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-[var(--color-border-color)]">
          <h3 className="text-lg font-bold text-[var(--color-neon-green)] flex items-center gap-2">⚙️ Ajustes — API Keys</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-gray-400 mb-5 leading-relaxed">
            Modelo BYOK: tus claves se almacenan de forma segura y aislada en tu cuenta mediante Row Level Security.
          </p>
          
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">Gemini API Key</label>
              <input 
                type="password" 
                value={geminiKey}
                onChange={e => setGeminiKey(e.target.value)}
                placeholder="Pega tu clave de Google Gemini..."
                className="bg-[#121212] border border-[var(--color-border-color)] rounded-lg px-4 py-2.5 text-sm focus:border-[var(--color-neon-green)] focus:outline-none focus:ring-1 focus:ring-[var(--color-neon-green)]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-300">FatSecret API Key (Nutrición)</label>
              <input 
                type="password" 
                value={fatsecretKey}
                onChange={e => setFatsecretKey(e.target.value)}
                placeholder="Pega tu clave de FatSecret..."
                className="bg-[#121212] border border-[var(--color-border-color)] rounded-lg px-4 py-2.5 text-sm focus:border-[var(--color-neon-green)] focus:outline-none focus:ring-1 focus:ring-[var(--color-neon-green)]"
              />
            </div>
          </div>

          <button 
            onClick={handleSave} 
            disabled={loading}
            className="w-full flex justify-center items-center gap-2 bg-[var(--color-neon-green)] text-black font-bold py-3 rounded-lg hover:bg-[#32e612] transition-colors disabled:opacity-50"
          >
            <Save size={18} />
            {loading ? 'Guardando...' : 'Guardar Claves'}
          </button>

          {status.msg && (
            <p className={`mt-4 text-center text-sm ${status.isError ? 'text-red-500' : 'text-[var(--color-neon-green)]'}`}>
              {status.msg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
