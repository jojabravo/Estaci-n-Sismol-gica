import React from 'react';
import { VistaTab } from '../types';

interface NavigationProps {
  vistaActiva: VistaTab;
  setVistaActiva: (vista: VistaTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ vistaActiva, setVistaActiva }) => {
  const tabs: { id: VistaTab; label: string }[] = [
    { id: 'portada', label: '0 · Portada' },
    { id: 'particulas', label: '1 · Partículas' },
    { id: 'estacion', label: '2 · Estación' },
    { id: 'triangulacion', label: '3 · Triangulación' },
  ];

  return (
    <nav className="flex gap-1 sm:gap-2 my-4 flex-wrap border-b border-[rgba(124,141,155,0.28)] pb-[1px]" role="tablist">
      {tabs.map((tab) => {
        const selected = vistaActiva === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={selected}
            onClick={() => setVistaActiva(tab.id)}
            className={`font-display text-base sm:text-lg font-semibold uppercase tracking-wider px-4 sm:px-5 py-2.5 rounded-t transition-all relative border border-[rgba(124,141,155,0.28)] border-b-0 ${
              selected
                ? 'bg-[#152430] text-[#EFE9DB] border-[rgba(124,141,155,0.4)] shadow-[inset_0_3px_0_#3FC7C0]'
                : 'bg-transparent text-[#7C8D9B] hover:text-[#EFE9DB] hover:bg-[rgba(21,36,48,0.5)]'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
};
