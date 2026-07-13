import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown } from 'lucide-react';

export default function SearchableExerciseSelect({ value, onChange, ejercicios, autoFocus }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const selectedExercise = ejercicios?.find(e => e.id.toString() === value?.toString());

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small timeout to allow render before focus on mobile
      setTimeout(() => inputRef.current.focus(), 50);
    }
  }, [isOpen]);

  const filteredEjercicios = ejercicios?.filter(ej => 
    ej.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div ref={wrapperRef} className="relative flex-1 z-[9999]">
      <div 
        className="h-full min-h-[38px] w-full bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 p-2 rounded-sm focus-within:border-brand-red flex items-center justify-between cursor-pointer"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchTerm('');
        }}
      >
        <span className="uppercase truncate select-none text-[11px] font-bold">
          {selectedExercise ? selectedExercise.nombre : 'SELECCIONA...'}
        </span>
        <ChevronDown size={14} className="text-zinc-500 flex-shrink-0 ml-2" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 w-full z-[100] mt-1 bg-zinc-950 border border-zinc-800 shadow-2xl shadow-black/50 max-h-60 flex flex-col rounded-sm">
          <div className="p-2 border-b border-zinc-800 bg-zinc-900 flex items-center gap-2">
            <Search size={14} className="text-brand-red flex-shrink-0" />
            <input 
              ref={inputRef}
              type="text"
              className="bg-transparent border-none outline-none text-xs text-zinc-100 w-full uppercase placeholder:normal-case placeholder:text-zinc-600"
              placeholder="Buscar ejercicio..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto">
            {filteredEjercicios.length > 0 ? (
              filteredEjercicios.map(ej => (
                <div 
                  key={ej.id}
                  className="p-3 border-b border-zinc-800/30 hover:bg-zinc-800 cursor-pointer text-[11px] uppercase text-zinc-300 transition-colors font-semibold"
                  onClick={() => {
                    onChange(ej.id.toString());
                    setIsOpen(false);
                  }}
                >
                  {ej.nombre}
                </div>
              ))
            ) : (
              <div className="p-4 text-xs text-zinc-500 text-center uppercase font-bold tracking-widest">
                No encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
