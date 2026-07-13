import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, ScanBarcode } from "lucide-react";
import { cn } from "../lib/utils";

export function VanishInput({
  placeholders = ["Buscar alimentos, macros o recetas..."],
  onChange,
  onSubmit,
  value,
  disabled = false,
  className,
  onScanClick
}) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [isVanishing, setIsVanishing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    let interval;
    if (!isFocused && !value) {
      interval = setInterval(() => {
        setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isFocused, value, placeholders.length]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value && onSubmit) {
      // Trigger vanish animation
      setIsVanishing(true);
      onSubmit(e);
      setTimeout(() => {
        setIsVanishing(false);
        // We assume the parent clears the value, but if not we reset vanishing state anyway
      }, 400);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "relative w-full max-w-xl mx-auto bg-zinc-900/50 backdrop-blur-md rounded-full overflow-hidden transition-all duration-300",
        isFocused ? "border-cyan-500 ring-1 ring-cyan-500/50 shadow-[0_0_20px_rgba(6,182,212,0.3)] bg-zinc-900/80" : "border border-zinc-800 shadow-[0_4px_20px_rgba(0,0,0,0.5)]",
        className
      )}
    >
      <div className="relative flex items-center w-full px-4 py-3">
        {/* Placeholder Animations */}
        <AnimatePresence mode="popLayout">
          {!value && (
            <motion.p
              key={currentPlaceholder}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="absolute left-12 text-zinc-500 font-medium pointer-events-none sm:text-sm text-xs truncate right-14"
            >
              {placeholders[currentPlaceholder]}
            </motion.p>
          )}
        </AnimatePresence>

        <Search className={cn("w-5 h-5 mr-3 transition-colors duration-300", isFocused || value ? "text-cyan-500" : "text-zinc-500")} />

        <div className="relative flex-1 h-full flex items-center">
          <AnimatePresence mode="wait">
            {!isVanishing ? (
              <motion.input
                key="input-visible"
                initial={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                ref={inputRef}
                type="text"
                value={value}
                onChange={onChange}
                disabled={disabled}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="w-full bg-transparent text-zinc-100 placeholder-transparent outline-none border-none sm:text-sm text-xs font-medium"
              />
            ) : (
              <motion.div key="input-vanishing" className="w-full h-full" />
            )}
          </AnimatePresence>
        </div>

        {onScanClick && (
          <motion.button
            type="button"
            onClick={onScanClick}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileTap={{ scale: 0.95 }}
            className="ml-2 w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 text-cyan-500 flex items-center justify-center hover:bg-cyan-500/20 transition-colors shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
          >
            <ScanBarcode className="w-4 h-4" />
          </motion.button>
        )}

        <motion.button
          type="submit"
          disabled={!value || disabled}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: value ? 1 : 0.8, opacity: value ? 1 : 0 }}
          whileTap={{ scale: 0.95 }}
          className="ml-2 w-8 h-8 rounded-full bg-cyan-500 text-zinc-950 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
        >
          {disabled ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </motion.button>
      </div>
    </form>
  );
}
