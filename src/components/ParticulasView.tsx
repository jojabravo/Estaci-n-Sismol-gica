import React, { useState, useEffect, useRef } from 'react';
import { Pause, Play, Volume2, Activity } from 'lucide-react';
import { audioEngine } from '../utils/audio';

export const ParticulasView: React.FC = () => {
  const [frecuencia, setFrecuencia] = useState<number>(0.6);
  const [amplitud, setAmplitud] = useState<number>(14);
  const [corriendo, setCorriendo] = useState<boolean>(true);

  const cvPRef = useRef<HTMLCanvasElement | null>(null);
  const cvSRef = useRef<HTMLCanvasElement | null>(null);
  const parTRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const lastAudioPhasePRef = useRef<number>(0);
  const lastAudioPhaseSRef = useRef<number>(0);

  const NPART = 46;

  // Helper function to draw arrow
  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    text?: string
  ) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2 - 6, y2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 8, y2 - 4);
    ctx.lineTo(x2 - 8, y2 + 4);
    ctx.closePath();
    ctx.fill();

    if (text) {
      ctx.font = '11px ui-monospace, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(text, x2, y2 - 8);
    }
  };

  const testWaveP = () => {
    audioEngine.playWaveP(0.9);
  };

  const testWaveS = () => {
    audioEngine.playWaveS(1.0);
  };

  useEffect(() => {
    const renderCanvases = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      if (corriendo) {
        parTRef.current += dt;
      }

      const t = parTRef.current;
      const w = 2 * Math.PI * frecuencia;
      const k = (2 * Math.PI) / 230;
      const marcada = Math.round(NPART * 0.52);

      // Play periodic sound pops on compression/displacement cycles
      if (corriendo && !audioEngine.getMuted()) {
        const cycleP = Math.floor((w * t) / (2 * Math.PI));
        if (cycleP > lastAudioPhasePRef.current) {
          lastAudioPhasePRef.current = cycleP;
          audioEngine.playWaveP(0.25);
        }

        const cycleS = Math.floor((w * t + Math.PI / 2) / (2 * Math.PI));
        if (cycleS > lastAudioPhaseSRef.current) {
          lastAudioPhaseSRef.current = cycleS;
          audioEngine.playWaveS(0.25);
        }
      }

      // --- Onda P (Longitudinal) ---
      if (cvPRef.current) {
        const cv = cvPRef.current;
        const dpr = window.devicePixelRatio || 1;
        const W_css = cv.clientWidth || 600;
        const H_css = 150;

        if (cv.width !== Math.round(W_css * dpr) || cv.height !== Math.round(H_css * dpr)) {
          cv.width = Math.round(W_css * dpr);
          cv.height = Math.round(H_css * dpr);
        }

        const ctx = cv.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, W_css, H_css);

          const y = H_css / 2;
          const dx = W_css / (NPART + 1);

          // Center axis
          ctx.strokeStyle = 'rgba(124, 141, 155, 0.25)';
          ctx.setLineDash([2, 4]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(W_css, y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw particles
          for (let i = 0; i < NPART; i++) {
            const x0 = dx * (i + 1);
            const x = x0 + amplitud * Math.sin(k * x0 - w * t);
            const esMarcada = i === marcada;

            if (esMarcada) {
              // Equilibrium indicator line for highlighted particle
              ctx.strokeStyle = 'rgba(224, 80, 63, 0.5)';
              ctx.setLineDash([3, 3]);
              ctx.beginPath();
              ctx.moveTo(x0, y - 40);
              ctx.lineTo(x0, y + 40);
              ctx.stroke();
              ctx.setLineDash([]);
            }

            ctx.beginPath();
            ctx.arc(x, y, esMarcada ? 6.5 : 4, 0, Math.PI * 2);
            ctx.fillStyle = esMarcada ? '#E0503F' : '#F2A03D';
            ctx.globalAlpha = esMarcada ? 1 : 0.85;
            ctx.fill();
            ctx.globalAlpha = 1;
          }

          drawArrow(ctx, W_css - 96, 24, W_css - 24, 24, '#DCD3C0', 'avance');
        }
      }

      // --- Onda S (Transversal) ---
      if (cvSRef.current) {
        const cv = cvSRef.current;
        const dpr = window.devicePixelRatio || 1;
        const W_css = cv.clientWidth || 600;
        const H_css = 150;

        if (cv.width !== Math.round(W_css * dpr) || cv.height !== Math.round(H_css * dpr)) {
          cv.width = Math.round(W_css * dpr);
          cv.height = Math.round(H_css * dpr);
        }

        const ctx = cv.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, W_css, H_css);

          const y0 = H_css / 2;
          const dx = W_css / (NPART + 1);

          // Center axis
          ctx.strokeStyle = 'rgba(124, 141, 155, 0.25)';
          ctx.setLineDash([2, 4]);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, y0);
          ctx.lineTo(W_css, y0);
          ctx.stroke();
          ctx.setLineDash([]);

          // Connecting wave line
          ctx.beginPath();
          for (let i = 0; i < NPART; i++) {
            const x = dx * (i + 1);
            const y = y0 - amplitud * 2.4 * Math.sin(k * x - w * t);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = 'rgba(63, 199, 192, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Particles
          for (let i = 0; i < NPART; i++) {
            const x = dx * (i + 1);
            const y = y0 - amplitud * 2.4 * Math.sin(k * x - w * t);
            const esMarcada = i === marcada;

            if (esMarcada) {
              ctx.strokeStyle = 'rgba(224, 80, 63, 0.5)';
              ctx.setLineDash([3, 3]);
              ctx.beginPath();
              ctx.moveTo(x - 46, y0);
              ctx.lineTo(x + 46, y0);
              ctx.stroke();
              ctx.setLineDash([]);
            }

            ctx.beginPath();
            ctx.arc(x, y, esMarcada ? 6.5 : 4, 0, Math.PI * 2);
            ctx.fillStyle = esMarcada ? '#E0503F' : '#3FC7C0';
            ctx.globalAlpha = esMarcada ? 1 : 0.85;
            ctx.fill();
            ctx.globalAlpha = 1;
          }

          drawArrow(ctx, W_css - 96, 24, W_css - 24, 24, '#DCD3C0', 'avance');
        }
      }

      animFrameRef.current = requestAnimationFrame(renderCanvases);
    };

    animFrameRef.current = requestAnimationFrame(renderCanvases);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [frecuencia, amplitud, corriendo]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start animate-fadeIn">
      <div className="flex flex-col gap-4 min-w-0">
        {/* Canvas Onda P */}
        <div className="bg-[#152430] border border-[rgba(124,141,155,0.28)] rounded-md p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="font-display uppercase tracking-widest text-xs sm:text-sm font-semibold text-[#7C8D9B] flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#F2A03D]"></span>
              Onda P · Longitudinal · El Resorte
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={testWaveP}
                className="flex items-center gap-1 text-xs font-mono bg-[rgba(242,160,61,0.15)] hover:bg-[rgba(242,160,61,0.25)] text-[#F2A03D] border border-[rgba(242,160,61,0.3)] px-2.5 py-1 rounded transition-colors"
                title="Escuchar síntesis acústica de la Onda P"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Escuchar Onda P</span>
              </button>
              <span className="font-mono text-xs text-[#F2A03D] bg-[rgba(242,160,61,0.1)] px-2 py-0.5 rounded">
                Compresión
              </span>
            </div>
          </div>
          <div className="bg-[#0E1820] rounded border border-[rgba(124,141,155,0.15)] overflow-hidden">
            <canvas ref={cvPRef} className="w-full block h-[150px]" />
          </div>
          <p className="text-[11px] font-mono text-[#F2A03D] mt-2 flex items-center gap-1.5 opacity-90">
            <Activity className="w-3.5 h-3.5" />
            <span>Acoustics P: Golpe seco de alta velocidad y compresión rápida (alta frecuencia).</span>
          </p>
        </div>

        {/* Canvas Onda S */}
        <div className="bg-[#152430] border border-[rgba(124,141,155,0.28)] rounded-md p-3 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h2 className="font-display uppercase tracking-widest text-xs sm:text-sm font-semibold text-[#7C8D9B] flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#3FC7C0]"></span>
              Onda S · Transversal · La Cuerda
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={testWaveS}
                className="flex items-center gap-1 text-xs font-mono bg-[rgba(63,199,192,0.15)] hover:bg-[rgba(63,199,192,0.25)] text-[#3FC7C0] border border-[rgba(63,199,192,0.3)] px-2.5 py-1 rounded transition-colors"
                title="Escuchar síntesis acústica de la Onda S"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Escuchar Onda S</span>
              </button>
              <span className="font-mono text-xs text-[#3FC7C0] bg-[rgba(63,199,192,0.1)] px-2 py-0.5 rounded">
                Cizalla
              </span>
            </div>
          </div>
          <div className="bg-[#0E1820] rounded border border-[rgba(124,141,155,0.15)] overflow-hidden">
            <canvas ref={cvSRef} className="w-full block h-[150px]" />
          </div>
          <p className="text-[11px] font-mono text-[#3FC7C0] mt-2 flex items-center gap-1.5 opacity-90">
            <Activity className="w-3.5 h-3.5" />
            <span>Acoustics S: Retumbo grave, vibración ondulante transversal de cizalla (baja frecuencia / sub-bass).</span>
          </p>
        </div>

        {/* Educational note */}
        <p className="text-xs sm:text-sm text-[#DCD3C0] leading-relaxed border-l-2 border-[#3FC7C0] pl-3 py-1 my-1">
          Siga <b className="text-[#E0503F]">únicamente la partícula roja</b>. En la onda P vibra hacia adelante y hacia atrás, en la misma dirección en que avanza la perturbación. En la onda S sube y baja, perpendicular al avance. En los dos casos regresa siempre a su línea de origen: <b className="text-[#EFE9DB]">ninguna partícula viaja con la onda</b>. Lo que viaja es la energía.
        </p>
      </div>

      {/* Controls Sidebar */}
      <aside className="bg-[#152430] border border-[rgba(124,141,155,0.28)] rounded-md p-4 flex flex-col gap-4">
        <button
          onClick={() => {
            setCorriendo(!corriendo);
            audioEngine.playClick();
          }}
          className="w-full flex items-center justify-center gap-2 font-display text-sm font-semibold uppercase tracking-wider bg-[#EFE9DB] text-[#0E1820] py-2.5 px-4 rounded hover:bg-white transition-opacity"
        >
          {corriendo ? (
            <>
              <Pause className="w-4 h-4" /> Pausar
            </>
          ) : (
            <>
              <Play className="w-4 h-4" /> Reanudar
            </>
          )}
        </button>

        {/* Sound Demo Panel */}
        <div className="p-2.5 rounded border border-[rgba(124,141,155,0.2)] bg-[#0E1820] space-y-2">
          <div className="text-[11px] font-display uppercase tracking-wider text-[#7C8D9B] font-semibold">
            Demostración Acústica
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            <button
              onClick={testWaveP}
              className="flex items-center justify-between text-left text-xs font-mono text-[#F2A03D] bg-[rgba(242,160,61,0.1)] hover:bg-[rgba(242,160,61,0.2)] border border-[rgba(242,160,61,0.25)] px-2.5 py-1.5 rounded transition-colors"
            >
              <span>1. Pulso Onda P</span>
              <Volume2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={testWaveS}
              className="flex items-center justify-between text-left text-xs font-mono text-[#3FC7C0] bg-[rgba(63,199,192,0.1)] hover:bg-[rgba(63,199,192,0.2)] border border-[rgba(63,199,192,0.25)] px-2.5 py-1.5 rounded transition-colors"
            >
              <span>2. Retumbo Onda S</span>
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <label className="font-display uppercase tracking-wider text-xs font-semibold text-[#7C8D9B]">
                Frecuencia
              </label>
              <output className="font-mono text-sm text-[#EFE9DB]">
                {frecuencia.toFixed(2).replace('.', ',')} Hz
              </output>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.4"
              step="0.05"
              value={frecuencia}
              onChange={(e) => setFrecuencia(parseFloat(e.target.value))}
            />
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-1">
              <label className="font-display uppercase tracking-wider text-xs font-semibold text-[#7C8D9B]">
                Amplitud
              </label>
              <output className="font-mono text-sm text-[#EFE9DB]">
                {amplitud}
              </output>
            </div>
            <input
              type="range"
              min="4"
              max="24"
              step="1"
              value={amplitud}
              onChange={(e) => setAmplitud(parseInt(e.target.value, 10))}
            />
          </div>
        </div>

        {/* Readouts */}
        <div className="border-t border-[rgba(124,141,155,0.28)] pt-3 text-xs font-mono space-y-2">
          <div className="flex justify-between items-center py-1">
            <span className="text-[#7C8D9B] uppercase text-[11px]">Dirección vibración P</span>
            <span className="text-[#F2A03D] font-semibold">↔ paralela</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-[#7C8D9B] uppercase text-[11px]">Dirección vibración S</span>
            <span className="text-[#3FC7C0] font-semibold">↕ perpendicular</span>
          </div>
          <div className="flex justify-between items-center py-1">
            <span className="text-[#7C8D9B] uppercase text-[11px]">Avance de la onda</span>
            <span className="text-[#EFE9DB] font-semibold">→ derecha</span>
          </div>
          <div className="flex justify-between items-center p-2.5 rounded border border-[rgba(124,141,155,0.28)] bg-[rgba(63,199,192,0.07)] mt-2">
            <span className="text-[#7C8D9B] uppercase text-[11px]">Masa transportada</span>
            <span className="text-[#EFE9DB] font-bold text-sm">0 kg</span>
          </div>
        </div>

        <p className="text-xs text-[#DCD3C0] leading-normal border-l-2 border-[#3FC7C0] pl-2.5 pt-0.5">
          Compare con el resorte y la cuerda que su profesor tiene al frente. La pantalla no reemplaza el experimento: lo confirma.
        </p>
      </aside>
    </div>
  );
};

