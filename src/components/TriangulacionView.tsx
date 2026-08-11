import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, CheckCircle2, MapPin, Radio } from 'lucide-react';
import { StationData, CityReference } from '../types';
import { audioEngine } from '../utils/audio';

export const TriangulacionView: React.FC = () => {
  const EPI = { lat: 4.9, lon: -76.23, nom: 'San José del Palmar' };

  const ESTACIONES: StationData[] = [
    { id: 0, nom: 'Medellín', lat: 6.25, lon: -75.57, r: 166, dt: 18.8 },
    { id: 1, nom: 'Cali', lat: 3.44, lon: -76.52, r: 165, dt: 18.8 },
    { id: 2, nom: 'Bogotá', lat: 4.71, lon: -74.07, r: 239, dt: 25.2 },
  ];

  const OTRAS: CityReference[] = [
    { nom: 'Quibdó', lat: 5.69, lon: -76.66 },
    { nom: 'Pereira', lat: 4.81, lon: -75.69 },
    { nom: 'Manizales', lat: 5.07, lon: -75.52 },
  ];

  const COSTA: [number, number][] = [
    [7.6, -77.3],
    [7.0, -77.4],
    [6.5, -77.4],
    [6.0, -77.42],
    [5.5, -77.3],
    [5.0, -77.4],
    [4.5, -77.5],
    [4.0, -77.42],
    [3.5, -77.4],
    [3.0, -77.52],
    [2.4, -77.7],
  ];

  const KMDEG = 110.6;
  const [trazados, setTrazados] = useState<number[]>([]);
  const cvMapaRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const toggleEstacion = (id: number) => {
    if (trazados.includes(id)) {
      setTrazados(trazados.filter((item) => item !== id));
    } else {
      setTrazados([...trazados, id]);
    }
    audioEngine.playClick();
  };

  const resetTri = () => {
    setTrazados([]);
    audioEngine.playClick();
  };

  useEffect(() => {
    const renderMap = () => {
      if (cvMapaRef.current) {
        const cv = cvMapaRef.current;
        const dpr = window.devicePixelRatio || 1;
        const W_css = cv.clientWidth || 600;
        const H_css = 430;

        if (cv.width !== Math.round(W_css * dpr) || cv.height !== Math.round(H_css * dpr)) {
          cv.width = Math.round(W_css * dpr);
          cv.height = Math.round(H_css * dpr);
        }

        const ctx = cv.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, W_css, H_css);

          const lonMin = -78.1,
            lonMax = -73.3,
            latMin = 2.3,
            latMax = 7.9;
          const esc = Math.min(W_css / (lonMax - lonMin), H_css / (latMax - latMin));
          const offX = (W_css - esc * (lonMax - lonMin)) / 2;
          const offY = (H_css - esc * (latMax - latMin)) / 2;

          const X = (lon: number) => offX + (lon - lonMin) * esc;
          const Y = (lat: number) => offY + (latMax - lat) * esc;
          const R = (km: number) => (km / KMDEG) * esc;

          // Lat/Lon grid
          ctx.font = '10px ui-monospace, monospace';
          ctx.lineWidth = 1;
          ctx.strokeStyle = 'rgba(124, 141, 155, 0.15)';
          ctx.fillStyle = 'rgba(124, 141, 155, 0.55)';

          for (let lo = -78; lo <= -73; lo++) {
            const x = X(lo);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, H_css);
            ctx.stroke();
            ctx.textAlign = 'center';
            ctx.fillText(Math.abs(lo) + '°O', x, H_css - 5);
          }

          for (let la = 3; la <= 7; la++) {
            const y = Y(la);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W_css, y);
            ctx.stroke();
            ctx.textAlign = 'left';
            ctx.fillText(la + '°N', 5, y - 4);
          }

          // Pacific ocean polygon
          ctx.beginPath();
          COSTA.forEach(([la, lo], i) => (i ? ctx.lineTo(X(lo), Y(la)) : ctx.moveTo(X(lo), Y(la))));
          ctx.lineTo(0, Y(2.4));
          ctx.lineTo(0, Y(7.6));
          ctx.closePath();
          ctx.fillStyle = 'rgba(63, 199, 192, 0.07)';
          ctx.fill();

          ctx.strokeStyle = 'rgba(63, 199, 192, 0.34)';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          COSTA.forEach(([la, lo], i) => (i ? ctx.lineTo(X(lo), Y(la)) : ctx.moveTo(X(lo), Y(la))));
          ctx.stroke();

          ctx.save();
          ctx.translate(X(-77.85), Y(6.6));
          ctx.rotate(-Math.PI / 2);
          ctx.fillStyle = 'rgba(63, 199, 192, 0.5)';
          ctx.textAlign = 'center';
          ctx.font = '11px ui-monospace, monospace';
          ctx.fillText('OCÉANO PACÍFICO', 0, 0);
          ctx.restore();

          // Reference cities
          OTRAS.forEach((c) => {
            ctx.beginPath();
            ctx.arc(X(c.lon), Y(c.lat), 2.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(124, 141, 155, 0.65)';
            ctx.fill();
            ctx.font = '10px ui-monospace, monospace';
            ctx.textAlign = 'left';
            ctx.fillText(c.nom, X(c.lon) + 6, Y(c.lat) + 3);
          });

          // Active station distance circles
          trazados.forEach((idx, orden) => {
            const e = ESTACIONES[idx];
            ctx.beginPath();
            ctx.arc(X(e.lon), Y(e.lat), R(e.r), 0, Math.PI * 2);
            ctx.strokeStyle = '#3FC7C0';
            ctx.globalAlpha = 0.75;
            ctx.lineWidth = 1.8;
            ctx.setLineDash(orden === 0 ? [] : [6, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.globalAlpha = 0.06;
            ctx.fillStyle = '#3FC7C0';
            ctx.fill();
            ctx.globalAlpha = 1;

            // Radius line
            const ang = -0.9 - orden * 0.7;
            ctx.strokeStyle = 'rgba(63, 199, 192, 0.45)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(X(e.lon), Y(e.lat));
            ctx.lineTo(X(e.lon) + Math.cos(ang) * R(e.r), Y(e.lat) + Math.sin(ang) * R(e.r));
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#3FC7C0';
            ctx.font = '11px ui-monospace, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(
              e.r + ' km',
              X(e.lon) + Math.cos(ang) * R(e.r) * 0.58,
              Y(e.lat) + Math.sin(ang) * R(e.r) * 0.58 - 5
            );
          });

          // All stations
          ESTACIONES.forEach((e) => {
            const activa = trazados.includes(e.id);
            const x = X(e.lon),
              y = Y(e.lat);
            ctx.beginPath();
            ctx.arc(x, y, 5.5, 0, Math.PI * 2);
            ctx.fillStyle = activa ? '#3FC7C0' : '#DCD3C0';
            ctx.fill();
            ctx.strokeStyle = '#0E1820';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = activa ? '#3FC7C0' : '#DCD3C0';
            ctx.font = '600 13px ui-monospace, monospace';
            ctx.textAlign = 'left';
            ctx.fillText(e.nom, x + 10, y - 2);

            ctx.font = '10px ui-monospace, monospace';
            ctx.fillStyle = 'rgba(124, 141, 155, 0.8)';
            ctx.fillText(`Δt = ${e.dt.toFixed(1).replace('.', ',')} s`, x + 10, y + 11);
          });

          // Epicenter (unlocked when 3 stations selected)
          if (trazados.length >= 3) {
            const x = X(EPI.lon),
              y = Y(EPI.lat);
            const pulso = (Math.sin(Date.now() / 380) + 1) / 2;

            ctx.beginPath();
            ctx.arc(x, y, 10 + pulso * 7, 0, Math.PI * 2);
            ctx.strokeStyle = '#E0503F';
            ctx.globalAlpha = 0.55 - pulso * 0.35;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.globalAlpha = 1;

            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#E0503F';
            ctx.fill();
            ctx.strokeStyle = '#0E1820';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#E0503F';
            ctx.font = '600 12px ui-monospace, monospace';
            ctx.textAlign = 'center';
            ctx.fillText('EPICENTRO', x, y + 22);

            ctx.fillStyle = 'rgba(239, 233, 219, 0.85)';
            ctx.font = '11px ui-monospace, monospace';
            ctx.fillText(EPI.nom, x, y + 35);
          }
        }
      }

      if (trazados.length >= 3) {
        animFrameRef.current = requestAnimationFrame(renderMap);
      }
    };

    renderMap();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [trazados]);

  const n = trazados.length;

  const posText =
    n === 0
      ? 'infinitas'
      : n === 1
      ? 'toda una circunferencia'
      : n === 2
      ? 'dos puntos'
      : 'una sola';

  const noteText =
    n === 0
      ? 'Cada estación mide su propio retardo Δt y con él calcula a qué distancia ocurrió el sismo. Pero no sabe en qué dirección. Agregue las estaciones una por una.'
      : n === 1
      ? 'Con una sola estación, el epicentro puede estar en cualquier punto de esa circunferencia. Sabemos la distancia, no la dirección.'
      : n === 2
      ? 'Dos circunferencias se cortan en dos puntos. Ya casi, pero todavía hay ambigüedad.'
      : 'Las tres circunferencias se cortan en un único punto: San José del Palmar, Chocó. Esto es exactamente lo que hace el Servicio Geológico Colombiano, con decenas de estaciones en lugar de tres.';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start animate-fadeIn">
      <div className="flex flex-col gap-4 min-w-0">
        <div className="bg-[#152430] border border-[rgba(124,141,155,0.28)] rounded-md p-3 sm:p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display uppercase tracking-widest text-xs sm:text-sm font-semibold text-[#7C8D9B] flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#3FC7C0]" />
              Occidente Colombiano · Localización del Epicentro
            </h2>
            {n >= 3 && (
              <span className="font-mono text-xs text-[#E0503F] bg-[rgba(224,80,63,0.15)] px-2.5 py-0.5 rounded flex items-center gap-1 font-semibold animate-pulse">
                <Radio className="w-3.5 h-3.5" /> Epicentro Localizado
              </span>
            )}
          </div>
          <div className="bg-[#0E1820] rounded border border-[rgba(124,141,155,0.15)] overflow-hidden">
            <canvas ref={cvMapaRef} className="w-full block h-[430px]" />
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[#DCD3C0] leading-relaxed border-l-2 border-[#3FC7C0] pl-3 py-1 my-1">
          {noteText}
        </p>
      </div>

      {/* Sidebar controls */}
      <aside className="bg-[#152430] border border-[rgba(124,141,155,0.28)] rounded-md p-4 flex flex-col gap-4">
        <div className="space-y-2">
          {ESTACIONES.map((est) => {
            const activa = trazados.includes(est.id);
            return (
              <button
                key={est.id}
                onClick={() => toggleEstacion(est.id)}
                className={`w-full flex items-center justify-between text-left p-2.5 rounded border transition-colors ${
                  activa
                    ? 'border-[#3FC7C0] bg-[rgba(63,199,192,0.1)] text-[#EFE9DB]'
                    : 'border-[rgba(124,141,155,0.28)] text-[#DCD3C0] hover:border-[#7C8D9B] hover:text-[#EFE9DB]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-semibold text-[#7C8D9B]">
                    0{est.id + 1}
                  </span>
                  <span className="text-xs font-semibold">{est.nom}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-[#7C8D9B]">
                    Δt = {est.dt.toFixed(1).replace('.', ',')}s
                  </span>
                  {activa && <CheckCircle2 className="w-4 h-4 text-[#3FC7C0]" />}
                </div>
              </button>
            );
          })}
        </div>

        <button
          onClick={resetTri}
          className="w-full flex items-center justify-center gap-1.5 font-display text-sm font-semibold uppercase tracking-wider bg-transparent text-[#7C8D9B] border border-[rgba(124,141,155,0.28)] hover:text-[#EFE9DB] hover:border-[#7C8D9B] py-2 px-3 rounded transition-colors"
        >
          <RotateCcw className="w-4 h-4" /> Borrar círculos
        </button>

        {/* Readout stats */}
        <div className="border-t border-[rgba(124,141,155,0.28)] pt-3 text-xs font-mono space-y-2">
          <div className="flex justify-between items-center py-0.5">
            <span className="text-[#7C8D9B] uppercase text-[11px]">Círculos trazados</span>
            <span className="text-[#EFE9DB] font-semibold">{n} de 3</span>
          </div>
          <div className="flex justify-between items-center py-0.5">
            <span className="text-[#7C8D9B] uppercase text-[11px]">Posiciones posibles</span>
            <span className="text-[#3FC7C0] font-semibold">{posText}</span>
          </div>

          <div className="p-2.5 rounded border border-[rgba(124,141,155,0.28)] bg-[rgba(224,80,63,0.08)] mt-2">
            <span className="text-[#7C8D9B] uppercase text-[11px] block mb-1">Epicentro</span>
            <span className="text-[#E0503F] font-bold text-sm block">
              {n >= 3 ? 'San José del Palmar, Chocó' : 'sin determinar'}
            </span>
          </div>
        </div>

        <p className="text-xs text-[#DCD3C0] leading-normal border-l-2 border-[#3FC7C0] pl-2.5 pt-0.5">
          El retardo entrega la distancia al <b>hipocentro</b>. Para dibujar el círculo sobre el mapa hay que descontar la profundidad con Pitágoras:
          <br />
          <b className="font-mono text-[11px] text-[#EFE9DB] block mt-1">
            d<sub>epicentral</sub> = √(d<sub>hipo</sub>² − 100²)
          </b>
        </p>
      </aside>
    </div>
  );
};
