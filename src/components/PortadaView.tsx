import React from 'react';
import { Play, BookOpen, HelpCircle, ArrowRight, Video, Sparkles, CheckSquare, ShieldAlert } from 'lucide-react';
import { VistaTab } from '../types';
import { audioEngine } from '../utils/audio';

interface PortadaViewProps {
  setVistaActiva: (vista: VistaTab) => void;
}

export const PortadaView: React.FC<PortadaViewProps> = ({ setVistaActiva }) => {
  const handleStartLab = () => {
    audioEngine.playClick();
    setVistaActiva('subduccion');
  };

  const preguntas = [
    {
      numero: '01',
      categoria: 'Perspectiva Personal y Humana',
      badgeColor: 'bg-[rgba(242,160,61,0.15)] text-[#F2A03D] border-[rgba(242,160,61,0.3)]',
      icono: <HelpCircle className="w-5 h-5 text-[#F2A03D]" />,
      titulo: 'Sensación y Experiencia Humana ante el Movimiento de la Tierra',
      pregunta:
        '¿Alguna vez has sentido un temblor o sismo en tu vida? Describe con detalle qué sensaciones físicas y emociones experimentaste en ese instante. Si nunca lo has vivido, ¿cómo imaginas la sensación de vulnerabilidad humana cuando la estructura del suelo firme que pisas comienza a fluctuar y vibrar?',
      pauta: 'Responde desde tu experiencia o imaginación, conectando con las emociones de alerta que produce la fuerza de la naturaleza.',
    },
    {
      numero: '02',
      categoria: 'Concepto Físico y Ondulatorio',
      badgeColor: 'bg-[rgba(63,199,192,0.15)] text-[#3FC7C0] border-[rgba(63,199,192,0.3)]',
      icono: <Sparkles className="w-5 h-5 text-[#3FC7C0]" />,
      titulo: 'La Física del Fenómeno: Energía en Movimiento sin Transporte de Materia',
      pregunta:
        'A partir de lo observado en el video, ¿de dónde proviene la descomunal cantidad de energía liberada durante un terremoto y de qué forma esta energía logra viajar miles de kilómetros a través de la roca sólida sin arrastrar ni desplazar la materia del terreno consigo?',
      pauta: 'Relaciona esta pregunta con el concepto clave de la física: "Una onda transporta energía e información, pero NO transporta materia".',
    },
    {
      numero: '03',
      categoria: 'Aplicación Científica y Tecnológica',
      badgeColor: 'bg-[rgba(224,80,63,0.15)] text-[#E0503F] border-[rgba(224,80,63,0.3)]',
      icono: <ShieldAlert className="w-5 h-5 text-[#E0503F]" />,
      titulo: 'Sistemas de Alerta Temprana: El "Retardo" que Salva Vidas',
      pregunta:
        'Sabiendo que las ondas sísmicas se propagan a velocidades gigantescas (varios kilómetros por segundo), ¿por qué la diferencia de velocidad entre la Onda P (longitudinal) y la Onda S (transversal) le permite a la ciencia e ingeniería diseñar alertas sísmicas que ganan segundos vitales antes de las sacudidas destructivas?',
      pauta: 'Piensa en cuál onda llega primero y cuál genera el mayor daño en las estructuras urbanas.',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Banner Section */}
      <section className="relative overflow-hidden rounded-lg bg-gradient-to-b from-[#152430] via-[#111d27] to-[#0E1820] border border-[rgba(124,141,155,0.3)] p-6 sm:p-8 md:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-[rgba(63,199,192,0.06)] rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-[rgba(242,160,61,0.06)] rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="font-mono text-xs px-3 py-1 rounded-full bg-[rgba(242,160,61,0.15)] text-[#F2A03D] border border-[rgba(242,160,61,0.3)] font-medium tracking-wide">
              FÍSICA GRADO 11 · I. E. JOSEFA CAMPOS
            </span>
            <span className="font-mono text-xs px-3 py-1 rounded-full bg-[rgba(63,199,192,0.15)] text-[#3FC7C0] border border-[rgba(63,199,192,0.3)] font-medium tracking-wide">
              BELLO, ANTIOQUIA
            </span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold uppercase tracking-tight text-[#EFE9DB] leading-[0.95] mb-4">
            CUANDO LA TIERRA SE MUEVE:<br />
            <span className="text-[#3FC7C0]">LA FÍSICA OCULTA TRAS EL TEMBLOR</span>
          </h2>

          <p className="text-sm sm:text-base text-[#DCD3C0] leading-relaxed max-w-3xl mb-6">
            Bienvenido a la unidad didáctica interactiva sobre movimiento ondulatorio y sismología. Antes de operar el simulador de laboratorio y calcular la ubicación de epicentros, explora el siguiente video documental e introduce tus reflexiones en el cuaderno.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleStartLab}
              className="flex items-center gap-2 px-6 py-3 rounded bg-[#EFE9DB] hover:bg-white text-[#0E1820] font-display text-base font-bold uppercase tracking-wider transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Ir al Laboratorio Virtual</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="#video-section"
              className="flex items-center gap-2 px-5 py-3 rounded bg-[rgba(124,141,155,0.15)] hover:bg-[rgba(124,141,155,0.25)] text-[#EFE9DB] border border-[rgba(124,141,155,0.3)] font-display text-base font-semibold uppercase tracking-wider transition-colors"
            >
              <Video className="w-5 h-5 text-[#F2A03D]" />
              <span>Ver Video y Preguntas</span>
            </a>
          </div>
        </div>
      </section>

      {/* Video Embed Section */}
      <section id="video-section" className="bg-[#152430] border border-[rgba(124,141,155,0.28)] rounded-lg p-5 sm:p-6 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4 pb-3 border-b border-[rgba(124,141,155,0.2)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[rgba(242,160,61,0.15)] rounded-md text-[#F2A03D]">
              <Video className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display text-xl sm:text-2xl font-bold uppercase text-[#EFE9DB]">
                Video Documental Introductorio
              </h3>
              <p className="font-mono text-xs text-[#7C8D9B]">
                Comportamiento tectónico y liberación de energía en fallas sísmicas
              </p>
            </div>
          </div>
          <span className="font-mono text-xs text-[#3FC7C0] bg-[rgba(63,199,192,0.1)] px-3 py-1 rounded border border-[rgba(63,199,192,0.2)]">
            YouTube HD · Observación Guía
          </span>
        </div>

        {/* Responsive 16:9 Video Player */}
        <div className="relative w-full overflow-hidden rounded-lg bg-[#0E1820] border border-[rgba(124,141,155,0.3)] shadow-2xl aspect-video">
          <iframe
            src="https://www.youtube-nocookie.com/embed/jtuvN-YhEyY?rel=0&modestbranding=1"
            title="Video Introductorio de Terremotos y Ondas Sísmicas"
            className="absolute top-0 left-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        <p className="mt-4 text-xs sm:text-sm text-[#DCD3C0] leading-relaxed border-l-2 border-[#F2A03D] pl-3 py-1">
          <b>Instrucción para la clase:</b> Observa el video atentamente junto a tus compañeros de clase. Presta atención a cómo la tensión acumulada entre placas tectónicas se rompe de forma repentina y cómo las ondas se propagan en todas las direcciones.
        </p>
      </section>

      {/* Reflection Questions for Notebook */}
      <section className="bg-[#152430] border border-[rgba(124,141,155,0.28)] rounded-lg p-5 sm:p-6 md:p-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6 pb-3 border-b border-[rgba(124,141,155,0.2)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[rgba(63,199,192,0.15)] rounded-md text-[#3FC7C0]">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-display text-xl sm:text-2xl font-bold uppercase text-[#EFE9DB]">
                Actividad de Reflexión para el Cuaderno
              </h3>
              <p className="font-mono text-xs text-[#7C8D9B]">
                Responde individualmente las siguientes 3 preguntas guiadas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-xs text-[#DCD3C0] bg-[rgba(239,233,219,0.08)] px-3 py-1.5 rounded border border-[rgba(124,141,155,0.25)]">
            <CheckSquare className="w-4 h-4 text-[#F2A03D]" />
            <span>3 Preguntas Fundamentales</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {preguntas.map((item) => (
            <div
              key={item.numero}
              className="bg-[#0E1820] border border-[rgba(124,141,155,0.2)] rounded-lg p-5 sm:p-6 hover:border-[rgba(124,141,155,0.4)] transition-all relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-lg text-[#7C8D9B]">
                    {item.numero}
                  </span>
                  <span className={`font-mono text-xs font-semibold px-2.5 py-0.5 rounded border ${item.badgeColor}`}>
                    {item.categoria}
                  </span>
                </div>
                <div>{item.icono}</div>
              </div>

              <h4 className="font-display text-lg sm:text-xl font-bold text-[#EFE9DB] mb-2 uppercase tracking-wide">
                {item.titulo}
              </h4>

              <p className="text-sm sm:text-base text-[#EFE9DB] font-medium leading-relaxed mb-4 bg-[rgba(21,36,48,0.6)] p-3.5 rounded border border-[rgba(124,141,155,0.15)]">
                "{item.pregunta}"
              </p>

              <div className="text-xs text-[#7C8D9B] font-mono flex items-start gap-2 bg-[rgba(124,141,155,0.05)] p-2.5 rounded border border-[rgba(124,141,155,0.1)]">
                <span className="text-[#3FC7C0] font-bold">Pauta docente:</span>
                <span className="text-[#DCD3C0]">{item.pauta}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA on Cover */}
        <div className="mt-8 pt-6 border-t border-[rgba(124,141,155,0.2)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[#7C8D9B] font-mono leading-relaxed">
            Una vez registradas tus respuestas en el cuaderno, avanza a la pestaña <b className="text-[#EFE9DB]">1 · Subducción Nazca</b> para experimentar la interacción de placas.
          </div>

          <button
            onClick={handleStartLab}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded bg-[#3FC7C0] hover:bg-[#34b5ae] text-[#0E1820] font-display text-base font-bold uppercase tracking-wider transition-colors shadow-md"
          >
            <span>Iniciar Simulador (1 · Subducción Nazca)</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>
    </div>
  );
};
