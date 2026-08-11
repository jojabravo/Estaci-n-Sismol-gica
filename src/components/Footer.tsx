import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-8 pt-4 border-t border-[rgba(124,141,155,0.28)] font-mono text-[11px] text-[#7C8D9B] leading-relaxed tracking-wide space-y-1">
      <div>
        DATOS: SERVICIO GEOLÓGICO COLOMBIANO / USGS · 10 DE AGOSTO DE 2026
      </div>
      <div>
        I. E. MANUEL JOSÉ CAICEDO · BELLO, ANTIOQUIA · FÍSICA GRADO 11 · PROF. JORGE ARMANDO JARAMILLO BRAVO
      </div>
      <div className="text-[#DCD3C0] opacity-80">
        LAS VELOCIDADES Y ESCALAS SON APROXIMADAS: ESTE ES UN MODELO DIDÁCTICO, NO UNA HERRAMIENTA DE MONITOREO.
      </div>
    </footer>
  );
};
