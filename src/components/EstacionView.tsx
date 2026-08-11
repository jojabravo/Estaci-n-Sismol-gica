import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';
import { audioEngine } from '../utils/audio';

export const EstacionView: React.FC = () => {
  const PROF = 100; // km depth

  const [dist, setDist] = useState<number>(195);
  const [vp, setVp] = useState<number>(8.0);
  const [vs, setVs] = useState<number>(4.5);
  const [vel, setVel] = useState<number>(2);

  const [estT, setEstT] = useState<number>(0);
  const [corriendo, setCorriendo] = useState<boolean>(false);

  const cvCorteRef = useRef<HTMLCanvasElement | null>(null);
  const cvSismoRef = useRef<HTMLCanvasElement | null>(null);

  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const estTRef = useRef<number>(0);
  const corriendoRef = useRef<boolean>(false);

  const playedAudioPRef = useRef<boolean>(false);
  const playedAudioSRef = useRef<boolean>(false);

  // Sync state refs for animation loop
  useEffect(() => {
    corriendoRef.current = corriendo;
  }, [corriendo]);

  const getParams = useCallback(() => {
    const validVs = Math.min(vs, vp - 0.5);
    const tp = dist / vp;
    const ts = dist / validVs;
    const epi = Math.sqrt(Math.max(0, dist * dist - PROF * PROF));
    const total = Math.max(60, ts * 1.55);
    return { d: dist, vp, vs: validVs, tp, ts, dt: ts - tp, epi, total };
  }, [dist, vp, vs]);

  // Handle reset
  const handleReset = () => {
    setEstT(0);
    estTRef.current = 0;
    setCorriendo(false);
    corriendoRef.current = false;
    playedAudioPRef.current = false;
    playedAudioSRef.current = false;
    audioEngine.playClick();
  };

  // Waveform amplitude function
  const trazo = (t: number, q: ReturnType<typeof getParams>) => {
    if (t < 0) return 0;
    const ruido = (0.035 * (Math.sin(t * 37.1) + Math.sin(t * 61.7) + Math.sin(t * 13.9))) / 3;
    let y = ruido;
    if (t >= q.tp) {
      const u = t - q.tp;
      y += 0.34 * Math.exp(-u / 7) * Math.sin(u * 17.5) + 0.1 * Math.exp(-u / 16) * Math.sin(u * 9.1);
    }
    if (t >= q.ts) {
      const u = t - q.ts;
      y +=
        1.0 * Math.exp(-u / 13) * Math.sin(u * 7.3) +
        0.42 * Math.exp(-u / 22) * Math.sin(u * 4.1 + 1.1) +
        0.18 * Math.exp(-u / 30) * Math.sin(u * 11.7 + 0.4);
    }
    return y;
  };

  useEffect(() => {
    // Reset played audio flags if dist/vp/vs change
    playedAudioPRef.current = false;
    playedAudioSRef.current = false;
  }, [dist, vp, vs]);

  useEffect(() => {
    const render = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      const q = getParams();

      if (corriendoRef.current) {
        estTRef.current += dt * vel;

        // Check audio arrival triggers
        if (!playedAudioPRef.current && estTRef.current >= q.tp) {
          playedAudioPRef.current = true;
          audioEngine.playArrivalPulse('P');
        }
        if (!playedAudioSRef.current && estTRef.current >= q.ts) {
          playedAudioSRef.current = true;
          audioEngine.playArrivalPulse('S');
        }

        if (estTRef.current >= q.total) {
          estTRef.current = q.total;
          setCorriendo(false);
          corriendoRef.current = false;
        }
        setEstT(estTRef.current);
      }

      const t = estTRef.current;

      // Draw Earth Cross Section (Corte)
      if (cvCorteRef.current) {
        const cv = cvCorteRef.current;
        const dpr = window.devicePixelRatio || 1;
        const W_css = cv.clientWidth || 600;
        const H_css = 230;

        if (cv.width !== Math.round(W_css * dpr) || cv.height !== Math.round(H_css * dpr)) {
          cv.width = Math.round(W_css * dpr);
          cv.height = Math.round(H_css * dpr);
        }

        const ctx = cv.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, W_css, H_css);

          const supY = 46;
          const base = H_css - 14;
          const kmY = (base - supY) / 260;
          const rangoX = Math.max(320, q.epi * 1.22);
          const cx = W_css * 0.1;
          const kmX = (W_css * 0.86) / rangoX;

          // Crust & Mantle
          ctx.fillStyle = 'rgba(124, 98, 72, 0.30)';
          ctx.fillRect(0, supY, W_css, 50 * kmY);
          ctx.fillStyle = 'rgba(59, 47, 59, 0.42)';
          ctx.fillRect(0, supY + 50 * kmY, W_css, base - (supY + 50 * kmY));

          // Depth grid lines
          ctx.font = '10px ui-monospace, monospace';
          ctx.textAlign = 'left';
          for (let z = 50; z <= 250; z += 50) {
            const y = supY + z * kmY;
            ctx.strokeStyle = 'rgba(124, 141, 155, 0.16)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W_css, y);
            ctx.stroke();
            ctx.fillStyle = 'rgba(124, 141, 155, 0.7)';
            ctx.fillText(z + ' km', 6, y - 4);
          }

          const hx = cx;
          const hy = supY + PROF * kmY;

          // Wavefronts (clipped beneath surface)
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, supY, W_css, base - supY);
          ctx.clip();

          const waveFronts: [number, string, number][] = [
            [q.vp * t, '#F2A03D', 2.4],
            [q.vs * t, '#3FC7C0', 2.4],
          ];

          waveFronts.forEach(([r, color, lw]) => {
            if (r <= 0) return;
            for (let n = 0; n < 3; n++) {
              const rr = r - n * 26;
              if (rr <= 0) continue;
              ctx.beginPath();
              ctx.ellipse(hx, hy, rr * kmX, rr * kmY, 0, 0, Math.PI * 2);
              ctx.strokeStyle = color;
              ctx.globalAlpha = (1 - n * 0.3) * 0.85;
              ctx.lineWidth = lw - n * 0.7;
              ctx.stroke();
            }
            ctx.globalAlpha = 1;
          });
          ctx.restore();

          // Surface boundary line
          ctx.strokeStyle = '#DCD3C0';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, supY);
          ctx.lineTo(W_css, supY);
          ctx.stroke();

          // Hypocenter (foco)
          ctx.beginPath();
          ctx.arc(hx, hy, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#E0503F';
          ctx.fill();
          ctx.strokeStyle = 'rgba(224, 80, 63, 0.4)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(hx, hy, 11, 0, Math.PI * 2);
          ctx.stroke();

          ctx.beginPath();
          ctx.setLineDash([3, 4]);
          ctx.moveTo(hx, hy);
          ctx.lineTo(hx, supY);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#E0503F';
          ctx.font = '11px ui-monospace, monospace';
          ctx.textAlign = 'left';
          ctx.fillText('hipocentro', hx + 15, hy + 4);
          ctx.fillStyle = '#DCD3C0';
          ctx.fillText('epicentro', hx + 4, supY - 8);

          // Station on surface
          const sx = cx + q.epi * kmX;
          const llegoP = t >= q.tp;
          const llegoS = t >= q.ts;
          const sacude = llegoS
            ? Math.sin(t * 22) * 3.2 * Math.exp(-(t - q.ts) / 14)
            : llegoP
            ? Math.sin(t * 40) * 1.1 * Math.exp(-(t - q.tp) / 8)
            : 0;

          ctx.save();
          ctx.translate(sacude, 0);
          ctx.fillStyle = llegoS ? '#3FC7C0' : llegoP ? '#F2A03D' : '#DCD3C0';
          ctx.fillRect(sx - 9, supY - 19, 18, 19);
          ctx.fillStyle = '#0E1820';
          ctx.fillRect(sx - 4, supY - 13, 8, 8);
          ctx.restore();

          ctx.fillStyle = '#DCD3C0';
          ctx.textAlign = 'center';
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('estación', sx, supY - 25);

          // Hypocentral distance ray
          ctx.strokeStyle = 'rgba(239, 233, 219, 0.35)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(hx, hy);
          ctx.lineTo(sx, supY);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = 'rgba(239, 233, 219, 0.85)';
          ctx.textAlign = 'center';
          ctx.fillText(q.d + ' km', (hx + sx) / 2 + 26, (hy + supY) / 2 + 14);
        }
      }

      // Draw Seismogram (Sismograma)
      if (cvSismoRef.current) {
        const cv = cvSismoRef.current;
        const dpr = window.devicePixelRatio || 1;
        const W_css = cv.clientWidth || 600;
        const H_css = 200;

        if (cv.width !== Math.round(W_css * dpr) || cv.height !== Math.round(H_css * dpr)) {
          cv.width = Math.round(W_css * dpr);
          cv.height = Math.round(H_css * dpr);
        }

        const ctx = cv.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, W_css, H_css);

          const mI = 8,
            mD = 8,
            mS = 30,
            mB = 26;
          const x0 = mI,
            x1 = W_css - mD,
            ejeY = (mS + (H_css - mB)) / 2,
            altura = (H_css - mB - mS) / 2;
          const tx = (timeVal: number) => x0 + (timeVal / q.total) * (x1 - x0);

          // Paper background
          ctx.fillStyle = 'rgba(239, 233, 219, 0.94)';
          ctx.fillRect(x0, mS, x1 - x0, H_css - mB - mS);

          // Millimeter grid
          ctx.strokeStyle = 'rgba(124, 141, 155, 0.22)';
          ctx.lineWidth = 1;
          ctx.font = '10px ui-monospace, monospace';
          ctx.textAlign = 'center';
          const paso = q.total > 90 ? 20 : 10;
          for (let timeVal = 0; timeVal <= q.total; timeVal += paso) {
            const x = tx(timeVal);
            ctx.beginPath();
            ctx.moveTo(x, mS);
            ctx.lineTo(x, H_css - mB);
            ctx.stroke();
            ctx.fillStyle = '#7C8D9B';
            ctx.fillText(timeVal + 's', x, H_css - mB + 14);
          }

          ctx.strokeStyle = 'rgba(124, 141, 155, 0.3)';
          ctx.beginPath();
          ctx.moveTo(x0, ejeY);
          ctx.lineTo(x1, ejeY);
          ctx.stroke();

          // Arrival markers for P and S
          const arrivals: [number, string, string][] = [
            [q.tp, '#F2A03D', 'P'],
            [q.ts, '#3FC7C0', 'S'],
          ];

          arrivals.forEach(([arrivalT, color, label]) => {
            if (t < arrivalT || arrivalT > q.total) return;
            const x = tx(arrivalT);
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(x, mS);
            ctx.lineTo(x, H_css - mB);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(x - 6, mS - 2);
            ctx.lineTo(x + 6, mS - 2);
            ctx.lineTo(x, mS + 7);
            ctx.closePath();
            ctx.fill();

            ctx.font = 'bold 13px ui-monospace, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(label, x, mS - 8);
          });

          // Delay bracket Δt
          if (t >= q.ts && q.ts <= q.total) {
            const a = tx(q.tp),
              b = tx(q.ts),
              y = H_css - mB - 9;
            ctx.strokeStyle = '#E0503F';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(a, y - 5);
            ctx.lineTo(a, y);
            ctx.lineTo(b, y);
            ctx.lineTo(b, y - 5);
            ctx.stroke();

            const txt = `Δt = ${q.dt.toFixed(1).replace('.', ',')} s`;
            ctx.font = 'bold 12px ui-monospace, monospace';
            ctx.textAlign = 'center';
            const mw = ctx.measureText(txt).width;
            ctx.fillStyle = 'rgba(239, 233, 219, 0.95)';
            ctx.fillRect((a + b) / 2 - mw / 2 - 5, y - 19, mw + 10, 15);
            ctx.fillStyle = '#E0503F';
            ctx.fillText(txt, (a + b) / 2, y - 7);
          }

          // Seismogram trace
          ctx.beginPath();
          const N = Math.max(2, Math.floor(x1 - x0));
          for (let i = 0; i <= N; i++) {
            const timeVal = (i / N) * q.total;
            if (timeVal > t) break;
            const y = ejeY - trazo(timeVal, q) * altura * 0.86;
            if (i === 0) ctx.moveTo(tx(timeVal), y);
            else ctx.lineTo(tx(timeVal), y);
          }
          ctx.strokeStyle = '#1B2A34';
          ctx.lineWidth = 1.3;
          ctx.lineJoin = 'round';
          ctx.stroke();

          // Needle timeline indicator
          if (t > 0 && t < q.total) {
            const x = tx(t);
            ctx.strokeStyle = '#E0503F';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, mS);
            ctx.lineTo(x, H_css - mB);
            ctx.stroke();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [getParams, vel]);

  const q = getParams();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start animate-fadeIn">
      <div className="flex flex-col gap-4 min-w-0">
        {/* Cross section panel */}
        <div className="bg-[#152430] border border-[rgba(124,141,155,0.28)] rounded-md p-3 sm:p-4">
          <h2 className="font-display uppercase tracking-widest text-xs sm:text-sm font-semibold text-[#7C8D9B] mb-2">
            Corte de la Tierra · Frentes de Onda
          </h2>
          <div className="bg-[#0E1820] rounded border border-[rgba(124,141,155,0.15)] overflow-hidden">
            <canvas ref={cvCorteRef} className="w-full block h-[230px]" />
          </div>
          <div className="flex flex-wrap gap-4 font-mono text-xs text-[#7C8D9B] mt-2.5">
            <span className="flex items-center gap-1.5">
              <i className="inline-block w-5 h-1 bg-[#F2A03D] rounded-full"></i>
              Frente de onda P
            </span>
            <span className="flex items-center gap-1.5">
              <i className="inline-block w-5 h-1 bg-[#3FC7C0] rounded-full"></i>
              Frente de onda S
            </span>
            <span className="flex items-center gap-1.5">
              <i className="inline-block w-5 h-1 bg-[#E0503F] rounded-full"></i>
              Hipocentro (foco)
            </span>
          </div>
        </div>

        {/* Seismogram panel */}
        <div className="bg-[#152430] border border-[rgba(124,141,155,0.28)] rounded-md p-3 sm:p-4">
          <h2 className="font-display uppercase tracking-widest text-xs sm:text-sm font-semibold text-[#7C8D9B] mb-2">
            Sismograma
          </h2>
          <div className="bg-[#0E1820] rounded border border-[rgba(124,141,155,0.15)] overflow-hidden">
            <canvas ref={cvSismoRef} className="w-full block h-[200px]" />
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[#DCD3C0] leading-relaxed border-l-2 border-[#3FC7C0] pl-3 py-1 my-1">
          El registro no queda en silencio después de la onda S. Esa cola larga se llama <b className="text-[#EFE9DB]">coda</b>: son ondas reflejadas y refractadas que siguen llegando por caminos distintos. Por eso la gente sintió el sismo durante mucho más tiempo del que duró la ruptura, que fue de apenas <b className="text-[#EFE9DB]">12,5 segundos</b>.
        </p>
      </div>

      {/* Controls sidebar */}
      <aside className="bg-[#152430] border border-[rgba(124,141,155,0.28)] rounded-md p-4 flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setCorriendo(!corriendo);
              audioEngine.playClick();
            }}
            className="flex items-center justify-center gap-1.5 font-display text-sm font-semibold uppercase tracking-wider bg-[#EFE9DB] text-[#0E1820] py-2 px-3 rounded hover:bg-white transition-opacity"
          >
            {corriendo ? (
              <>
                <Pause className="w-4 h-4" /> Pausar
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Reproducir
              </>
            )}
          </button>
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-1.5 font-display text-sm font-semibold uppercase tracking-wider bg-transparent text-[#7C8D9B] border border-[rgba(124,141,155,0.28)] hover:text-[#EFE9DB] hover:border-[#7C8D9B] py-2 px-3 rounded transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Reiniciar
          </button>
        </div>

        {/* Sound Demo Buttons */}
        <div className="p-2.5 rounded border border-[rgba(124,141,155,0.2)] bg-[#0E1820] space-y-2">
          <div className="text-[11px] font-display uppercase tracking-wider text-[#7C8D9B] font-semibold flex items-center justify-between">
            <span>Audio de Llegada Sísmica</span>
            <Volume2 className="w-3.5 h-3.5 text-[#3FC7C0]" />
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => audioEngine.playArrivalPulse('P')}
              className="text-xs font-mono text-[#F2A03D] bg-[rgba(242,160,61,0.1)] hover:bg-[rgba(242,160,61,0.2)] border border-[rgba(242,160,61,0.25)] py-1 px-2 rounded transition-colors text-center"
              title="Escuchar llegada de Onda P"
            >
              Llegada P
            </button>
            <button
              onClick={() => audioEngine.playArrivalPulse('S')}
              className="text-xs font-mono text-[#3FC7C0] bg-[rgba(63,199,192,0.1)] hover:bg-[rgba(63,199,192,0.2)] border border-[rgba(63,199,192,0.25)] py-1 px-2 rounded transition-colors text-center"
              title="Escuchar llegada de Onda S"
            >
              Llegada S
            </button>
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-3.5">
          <div>
            <div className="flex justify-between items-baseline mb-1">
              <label className="font-display uppercase tracking-wider text-xs font-semibold text-[#7C8D9B]">
                Distancia al hipocentro
              </label>
              <output className="font-mono text-xs font-semibold text-[#EFE9DB]">{dist} km</output>
            </div>
            <input
              type="range"
              min="110"
              max="600"
              step="5"
              value={dist}
              onChange={(e) => {
                setDist(parseInt(e.target.value, 10));
                setEstT(0);
                estTRef.current = 0;
              }}
            />
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-1">
              <label className="font-display uppercase tracking-wider text-xs font-semibold text-[#7C8D9B]">
                Velocidad onda P
              </label>
              <output className="font-mono text-xs font-semibold text-[#EFE9DB]">
                {vp.toFixed(1).replace('.', ',')} km/s
              </output>
            </div>
            <input
              type="range"
              min="6"
              max="9"
              step="0.1"
              value={vp}
              onChange={(e) => {
                setVp(parseFloat(e.target.value));
                setEstT(0);
                estTRef.current = 0;
              }}
            />
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-1">
              <label className="font-display uppercase tracking-wider text-xs font-semibold text-[#7C8D9B]">
                Velocidad onda S
              </label>
              <output className="font-mono text-xs font-semibold text-[#EFE9DB]">
                {vs.toFixed(1).replace('.', ',')} km/s
              </output>
            </div>
            <input
              type="range"
              min="3"
              max="5"
              step="0.1"
              value={vs}
              onChange={(e) => {
                setVs(parseFloat(e.target.value));
                setEstT(0);
                estTRef.current = 0;
              }}
            />
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-1">
              <label className="font-display uppercase tracking-wider text-xs font-semibold text-[#7C8D9B]">
                Velocidad de reloj
              </label>
              <output className="font-mono text-xs font-semibold text-[#EFE9DB]">×{vel}</output>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={vel}
              onChange={(e) => setVel(parseInt(e.target.value, 10))}
            />
          </div>
        </div>

        {/* Readout panel */}
        <div className="border-t border-[rgba(124,141,155,0.28)] pt-3 text-xs font-mono space-y-2">
          <div className="flex justify-between items-center py-0.5">
            <span className="text-[#7C8D9B] uppercase text-[11px]">Tiempo transcurrido</span>
            <span className="text-[#EFE9DB] font-semibold">{estT.toFixed(1).replace('.', ',')} s</span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-[#7C8D9B] uppercase text-[11px]">Llegada onda P</span>
            <span className="text-[#F2A03D] font-semibold">
              {estT >= q.tp ? `${q.tp.toFixed(1).replace('.', ',')} s` : 'en camino…'}
            </span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-[#7C8D9B] uppercase text-[11px]">Llegada onda S</span>
            <span className="text-[#3FC7C0] font-semibold">
              {estT >= q.ts ? `${q.ts.toFixed(1).replace('.', ',')} s` : 'en camino…'}
            </span>
          </div>

          <div className="p-2 rounded border border-[rgba(124,141,155,0.28)] bg-[rgba(63,199,192,0.07)] space-y-1 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-[#7C8D9B] uppercase text-[11px]">
                Retardo Δt = t<sub>S</sub> − t<sub>P</sub>
              </span>
              <span className="text-[#3FC7C0] font-bold text-sm">
                {estT >= q.ts ? `${q.dt.toFixed(1).replace('.', ',')} s` : '—'}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-center py-0.5">
            <span className="text-[#7C8D9B] uppercase text-[11px]">Distancia epicentral</span>
            <span className="text-[#EFE9DB] font-semibold">
              {estT >= q.ts ? `${Math.round(q.epi)} km` : '—'}
            </span>
          </div>
        </div>

        <p className="text-xs text-[#DCD3C0] leading-normal border-l-2 border-[#3FC7C0] pl-2.5 pt-0.5">
          <b className="font-mono text-[#EFE9DB]">d = Δt ÷ (1/v<sub>S</sub> − 1/v<sub>P</sub>)</b>
          <br />
          Con esa sola resta de tiempos, una estación calcula a qué distancia ocurrió el sismo.
        </p>
      </aside>
    </div>
  );
};
