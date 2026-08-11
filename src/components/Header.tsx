import React, { useState } from 'react';
import { Volume2, VolumeX, Info, Activity, Radio } from 'lucide-react';
import { audioEngine } from '../utils/audio';

interface HeaderProps {
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ soundEnabled, setSoundEnabled }) => {
  const [showInfoModal, setShowInfoModal] = useState(false);

  const toggleAudio = () => {
    const isMuted = audioEngine.toggleMute();
    setSoundEnabled(!isMuted);
    if (!isMuted) {
      audioEngine.playClick();
    }
  };

  return (
    <>
      <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 border-b border-[rgba(124,141,155,0.28)] pb-4 mb-2">
        <div>
          <div className="flex items-center gap-2 text-[#3FC7C0] font-display font-medium uppercase tracking-[0.22em] text-xs md:text-sm mb-1">
            <Radio className="w-4 h-4 animate-pulse text-[#F2A03D]" />
            <span>Física 11 · Movimiento ondulatorio</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl md:text-5xl uppercase tracking-tight text-[#EFE9DB] leading-none">
            Estación Sismológica
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row md:items-end gap-3 w-full md:w-auto justify-between md:justify-end">
          <div className="font-mono text-xs text-[#7C8D9B] leading-snug tracking-wide text-left md:text-right bg-[#152430] p-2.5 rounded border border-[rgba(124,141,155,0.2)]">
            <div>
              EVENTO <b className="text-[#DCD3C0] font-semibold">10 AGO 2026 · 07:34:00</b>
            </div>
            <div>
              EPICENTRO <b className="text-[#DCD3C0] font-semibold">SAN JOSÉ DEL PALMAR, CHOCÓ</b>
            </div>
            <div>
              MAGNITUD <b className="text-[#DCD3C0] font-semibold">Mw 7,4</b> · PROFUNDIDAD <b className="text-[#DCD3C0] font-semibold">≈100 km</b>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleAudio}
              title={soundEnabled ? 'Desactivar audio de pulsos sísmicos' : 'Activar audio de pulsos sísmicos'}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-[#152430] hover:bg-[rgba(124,141,155,0.2)] text-[#DCD3C0] hover:text-[#EFE9DB] border border-[rgba(124,141,155,0.28)] text-xs font-mono transition-colors"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-[#3FC7C0]" />
                  <span className="hidden sm:inline">Audio ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-[#7C8D9B]" />
                  <span className="hidden sm:inline">Audio OFF</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowInfoModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-[#152430] hover:bg-[rgba(124,141,155,0.2)] text-[#DCD3C0] hover:text-[#EFE9DB] border border-[rgba(124,141,155,0.28)] text-xs font-mono transition-colors"
            >
              <Info className="w-4 h-4 text-[#F2A03D]" />
              <span>Guía rápida</span>
            </button>
          </div>
        </div>
      </header>

      {/* Info Modal */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#152430] border border-[rgba(124,141,155,0.4)] rounded-lg p-6 max-w-xl w-full text-[#EFE9DB] shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-[rgba(124,141,155,0.3)] pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#3FC7C0]" />
                <h3 className="font-display text-xl uppercase font-bold text-[#EFE9DB]">
                  Conceptos Fundamentales de Sismología
                </h3>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="text-[#7C8D9B] hover:text-[#EFE9DB] text-lg font-mono px-2 py-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm leading-relaxed text-[#DCD3C0]">
              <div className="p-3 bg-[rgba(242,160,61,0.1)] border-l-2 border-[#F2A03D] rounded-r">
                <h4 className="font-display text-base font-semibold text-[#F2A03D] uppercase">
                  Ondas P (Primarias / Longitudinales)
                </h4>
                <p className="mt-1 text-xs">
                  Son las más rápidas (v<sub>P</sub> ≈ 6,0 - 9,0 km/s). Compresionales: las partículas del medio vibran paralelamente a la dirección de propagación (como un resorte).
                </p>
              </div>

              <div className="p-3 bg-[rgba(63,199,192,0.1)] border-l-2 border-[#3FC7C0] rounded-r">
                <h4 className="font-display text-base font-semibold text-[#3FC7C0] uppercase">
                  Ondas S (Secundarias / Transversales)
                </h4>
                <p className="mt-1 text-xs">
                  Son más lentas (v<sub>S</sub> ≈ 3,0 - 5,0 km/s). De cizalla: las partículas vibran perpendicularmente a la propagación (como una cuerda). No se propagan en líquidos.
                </p>
              </div>

              <div className="p-3 bg-[rgba(224,80,63,0.1)] border-l-2 border-[#E0503F] rounded-r">
                <h4 className="font-display text-base font-semibold text-[#E0503F] uppercase">
                  Método del Retardo Δt y Triangulación
                </h4>
                <p className="mt-1 text-xs">
                  La diferencia de llegada Δt = t<sub>S</sub> − t<sub>P</sub> aumenta proporcionalmente con la distancia. Con 1 estación se obtiene una circunferencia de igual distancia; con 2 estaciones hay 2 puntos de intersección; con 3 estaciones se determina de forma única el epicentro.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowInfoModal(false)}
                className="px-4 py-2 bg-[#EFE9DB] text-[#0E1820] font-display uppercase font-semibold text-sm rounded hover:bg-white transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
