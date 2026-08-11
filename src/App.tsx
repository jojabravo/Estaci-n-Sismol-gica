import React, { useState } from 'react';
import { VistaTab } from './types';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { ParticulasView } from './components/ParticulasView';
import { EstacionView } from './components/EstacionView';
import { TriangulacionView } from './components/TriangulacionView';
import { Footer } from './components/Footer';

export default function App() {
  const [vistaActiva, setVistaActiva] = useState<VistaTab>('particulas');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);

  return (
    <div className="min-h-screen bg-[#0E1820] text-[#EFE9DB] p-4 sm:p-6 md:p-8">
      <div className="max-w-[1180px] mx-auto">
        <Header soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} />

        <Navigation vistaActiva={vistaActiva} setVistaActiva={setVistaActiva} />

        <main className="mt-4">
          {vistaActiva === 'particulas' && <ParticulasView />}
          {vistaActiva === 'estacion' && <EstacionView />}
          {vistaActiva === 'triangulacion' && <TriangulacionView />}
        </main>

        <Footer />
      </div>
    </div>
  );
}
