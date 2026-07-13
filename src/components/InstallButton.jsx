import { useState, useEffect } from 'react';
import { Download, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function InstallButton({ isMobile = false }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect if already installed / running in standalone
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      setIsStandalone(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.deferredPrompt = e; // Store globally just in case
    };

    // Check if it fired before React mounted
    if (window.deferredPrompt) {
      setDeferredPrompt(window.deferredPrompt);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (isStandalone) {
      toast.success('IronForge ya está instalado en tu dispositivo.');
      return;
    }

    if (!deferredPrompt) {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      
      if (isIOS) {
        toast('Instalación en iOS (iPhone/iPad)', {
          description: 'Pulsa el botón "Compartir" en la barra inferior de Safari y luego selecciona "Añadir a la pantalla de inicio".',
          duration: 6000,
          icon: <Download size={16} />
        });
      } else {
        toast.error(
          'Instalación no disponible. Si estás en móvil vía Wi-Fi local (HTTP), Chrome bloquea la PWA. Usa HTTPS o activa chrome://flags/#unsafely-treat-insecure-origin-as-secure en tu móvil.',
          { duration: 6000 }
        );
      }
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsStandalone(true);
      toast.success('¡Instalación completada con éxito!');
    }
  };

  // If we want to hide it completely when installed, uncomment this:
  // if (isStandalone) return null;

  if (isMobile) {
    return (
      <button
        onClick={handleInstall}
        className={`flex items-center justify-center gap-2 px-3 py-1.5 border rounded-sm transition-all duration-200 ${
          isStandalone || !deferredPrompt
            ? 'bg-zinc-900 border-zinc-800 text-zinc-500'
            : 'bg-zinc-900 border-zinc-800 hover:border-brand-red hover:bg-zinc-800 text-brand-red'
        }`}
      >
        {isStandalone ? <CheckCircle2 size={14} /> : <Download size={14} />}
        <span className="text-[10px] font-bold tracking-widest uppercase">
          {isStandalone ? 'INSTALADA' : 'APP'}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={handleInstall}
      className={`w-full flex items-center justify-between px-4 py-3 border rounded-sm transition-all duration-200 uppercase group mb-2 ${
        isStandalone || !deferredPrompt
          ? 'bg-zinc-900/50 border-zinc-800/50 text-zinc-500 cursor-not-allowed'
          : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 hover:border-brand-red text-zinc-300 hover:text-brand-red shadow-[0_0_10px_rgba(225,29,72,0.1)] hover:shadow-[0_0_15px_rgba(225,29,72,0.3)]'
      }`}
    >
      <div className="flex items-center gap-3">
        {isStandalone ? (
          <CheckCircle2 size={18} className="text-zinc-500" />
        ) : (
          <Download size={18} className={!deferredPrompt ? "text-zinc-500" : "text-brand-red group-hover:scale-110 transition-transform"} />
        )}
        <span className="font-bold text-xs tracking-widest text-left">
          {isStandalone ? 'APP INSTALADA' : 'INSTALAR APP'}
        </span>
      </div>
    </button>
  );
}
