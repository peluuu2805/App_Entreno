import React, { useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { cn } from "../lib/utils";

export const MagicCard = ({
  children,
  className,
  gradientSize = 250,
  gradientColor = "rgba(225, 29, 72, 0.15)", // Rojo Neón intenso
  gradientBorder = "rgba(249, 115, 22, 1)", // Naranja brillante
  contentClassName = "items-center justify-center p-6",
}) => {
  const mouseX = useMotionValue(-gradientSize);
  const mouseY = useMotionValue(-gradientSize);
  const cardRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  const handlePointerMove = (e) => {
    if (!cardRef.current) return;
    const { left, top } = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  const handlePointerEnter = () => setIsHovered(true);
  const handlePointerLeave = () => {
    setIsHovered(false);
    mouseX.set(-gradientSize);
    mouseY.set(-gradientSize);
  };

  return (
    <div
      ref={cardRef}
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(
        "relative flex w-full overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl transition-all duration-300 touch-pan-y",
        className
      )}
    >
      <div className="absolute inset-0 z-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
      
      {/* Borde base inactivo */}
      <div className="absolute inset-0 rounded-2xl border border-zinc-800/50 transition-opacity duration-300 pointer-events-none" 
           style={{ opacity: isHovered ? 0 : 1 }} />
      
      {/* Luz interior que sigue al toque/cursor */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: useMotionTemplate`
            radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientColor}, transparent 100%)
          `,
        }}
      />
      
      {/* Borde luminoso reactivo al cursor */}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background: useMotionTemplate`
            radial-gradient(${gradientSize}px circle at ${mouseX}px ${mouseY}px, ${gradientBorder}, transparent 100%) border-box
          `,
          WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          border: "2px solid transparent",
        }}
      />
      
      {/* Contenido */}
      <div className={cn("relative z-10 w-full h-full flex flex-col", contentClassName)}>
        {children}
      </div>
    </div>
  );
};
