import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Zap, Activity, Info, Check, HelpCircle, Volume2 } from 'lucide-react';
import { audioEngine } from '../utils/audio';

interface Ciudad {
  n: string;
  x: number;
  y: number;
}

const VP = 8.0; // km/s
const VS = 4.5; // km/s
const DESLIZ = 2.5; // desplazamiento medio de la ruptura (m)
const MX0 = -220;
const MX1 = 316;
const MY0 = -42;
const MY1 = 272;
const VE = 6; // exageración del relieve emergido
const VB = 2.6; // exageración de la batimetría
const MOHO = 45; // base de la corteza continental (km)

const SLAB: [number, number][] = [
  [-230, 10.5], [-190, 10.8], [-160, 12.5], [-150, 16.5], [-125, 20], [-100, 25],
  [-75, 32], [-50, 43], [-25, 57], [0, 74], [30, 100], [60, 128], [90, 157], [120, 187],
  [150, 218], [180, 250], [210, 282]
];

const RELIEVE: [number, number][] = [
  [-230, -3.6], [-175, -3.7], [-158, -3.9], [-150, -5.8], [-140, -4.2], [-125, -2.8],
  [-108, -1.1], [-95, 0], [-80, 0.05], [-67, 0.04], [-52, 0.6], [-34, 1.7], [-14, 2.7],
  [0, 3.0], [18, 2.4], [40, 1.6], [62, 1.0], [80, 1.0], [100, 1.6], [118, 2.6], [140, 4.4],
  [158, 3.0], [176, 1.7], [198, 1.0], [218, 1.4], [240, 2.4], [262, 2.6], [285, 2.2], [300, 1.6]
];

const CIUDADES: Ciudad[] = [
  { n: "Quibdó", x: -67, y: 0.04 },
  { n: "Pereira", x: 101, y: 1.5 },
  { n: "Armenia", x: 106, y: 1.5 },
  { n: "Manizales", x: 114, y: 2.2 },
  { n: "Cali", x: 198, y: 1.0 },
  { n: "Bello / Medellín", x: 205, y: 1.5 },
  { n: "Bogotá", x: 273, y: 2.6 }
];

const ROMANO = ["–", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

function focoEn(prof: number): { x: number; d: number } {
  for (let i = 0; i < SLAB.length - 1; i++) {
    const [x1, d1] = SLAB[i];
    const [x2, d2] = SLAB[i + 1];
    if (d2 <= d1) continue;
    if (prof >= d1 && prof <= d2) {
      const f = (prof - d1) / (d2 - d1);
      return { x: x1 + f * (x2 - x1), d: prof };
    }
  }
  if (prof < SLAB[0][1]) return { x: SLAB[0][0], d: prof };
  return { x: SLAB[SLAB.length - 1][0], d: prof };
}

function altura(x: number): number {
  for (let i = 0; i < RELIEVE.length - 1; i++) {
    const [x1, h1] = RELIEVE[i];
    const [x2, h2] = RELIEVE[i + 1];
    if (x >= x1 && x <= x2) {
      const f = (x - x1) / (x2 - x1);
      return h1 + f * (h2 - h1);
    }
  }
  return x < RELIEVE[0][0] ? RELIEVE[0][1] : RELIEVE[RELIEVE.length - 1][1];
}

function yTopo(x: number): number {
  const h = altura(x);
  return h >= 0 ? -h * VE : -h * VB;
}

function datosCiudad(c: Ciudad, prof: number, mag: number) {
  const f = focoEn(prof);
  const de = Math.abs(c.x - f.x);
  const dh = Math.hypot(de, prof);
  const tp = dh / VP;
  const ts = dh / VS;
  const I = 1.5 * mag - 4.5 * Math.log10(Math.max(dh, 1)) + 4.5;
  return { de, dh, tp, ts, dt: ts - tp, I: Math.max(0, I) };
}

function romano(I: number): string {
  return ROMANO[Math.max(0, Math.min(12, Math.round(I)))];
}

function rnd(s: number): number {
  const x = Math.sin(s * 127.1) * 43758.5453;
  return x - Math.floor(x) - 0.5;
}

export const SubduccionView: React.FC = () => {
  const [fase, setFase] = useState<'reposo' | 'acumulando' | 'ruptura' | 'propagando' | 'fin'>('reposo');
  const [t, setT] = useState<number>(0);
  const [anios, setAnios] = useState<number>(0);
  const [esfuerzo, setEsfuerzo] = useState<number>(0);

  const [prof, setProf] = useState<number>(103);
  const [mag, setMag] = useState<number>(7.4);
  const [conv, setConv] = useState<number>(6.0);
  const [vel, setVel] = useState<number>(1);
  const [verP, setVerP] = useState<boolean>(true);
  const [verS, setVerS] = useState<boolean>(true);
  const [selCiudadIdx, setSelCiudadIdx] = useState<number>(5); // Medellín/Bello

  const [respuestasUser, setRespuestasUser] = useState<{ [key: number]: number }>({});

  const cvRef = useRef<HTMLCanvasElement | null>(null);
  const sismoRef = useRef<HTMLCanvasElement | null>(null);
  const escenaBoxRef = useRef<HTMLDivElement | null>(null);

  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // Track station sound arrivals
  const stationPAudioRef = useRef<{ [key: number]: boolean }>({});
  const stationSAudioRef = useRef<{ [key: number]: boolean }>({});

  // Preguntas Saber 11
  const ITEMS = [
    {
      p: "En la estación de Pereira el sismógrafo registró la onda S 12,0 s después de la onda P. Si v_P = 8,0 km/s y v_S = 4,5 km/s, la distancia de la estación al hipocentro es aproximadamente:",
      o: ["54 km", "96 km", "123 km", "180 km"],
      c: 2,
      e: "Δt = d/v_S − d/v_P = d(1/4,5 − 1/8) = d(0,0972 s/km). Entonces d = 12,0 / 0,0972 ≈ 123 km. Coincide con √(68² + 103²), que es justamente la distancia hipocentral de Pereira en el evento real."
    },
    {
      p: "El sismo del 10 de agosto tuvo M = 7,4. ¿Cuántas veces más energía liberó que uno de M = 6,4?",
      o: ["10 veces", "≈ 32 veces", "100 veces", "2 veces"],
      c: 1,
      e: "log E = 1,5M + 4,8. Al subir 1,0 en magnitud, log E aumenta 1,5, de modo que la energía se multiplica por 10¹'⁵ ≈ 31,6. La escala es logarítmica: la amplitud se multiplica por 10, pero la energía por 32."
    },
    {
      p: "El evento se sintió en Bogotá, Ecuador y Panamá, y sin embargo la destrucción se concentró en Pereira, Manizales y Cali. La mejor explicación física es que:",
      o: [
        "la magnitud fue muy alta y por eso llegó lejos, sin más",
        "el foco a 103 km reparte la energía sobre un área enorme, así que ninguna ciudad estuvo muy cerca del foco pero muchas quedaron a distancia parecida",
        "las ondas P se reflejaron en la superficie y regresaron",
        "el sismo ocurrió en el contacto entre las dos placas"
      ],
      c: 1,
      e: "Al ser d_hipo = √(Δ² + h²) con h = 103 km, la distancia mínima posible al foco era 103 km. El gradiente de intensidad se suaviza: no hay un punto de sacudimiento extremo, pero un área muy grande recibe intensidad moderada-alta. Además fue un sismo intraplaca profundo, dentro de la placa de Nazca, no en el contacto entre placas."
    },
    {
      p: "Un estudiante afirma: «como la placa de Nazca avanza 6 cm cada año, el terremoto se produjo por lo que se movió ese año». La afirmación es incorrecta porque:",
      o: [
        "la placa en realidad no se mueve",
        "la energía se acumula elásticamente durante décadas y se libera de golpe en segundos",
        "el movimiento de 6 cm/año ocurre solo en la superficie",
        "los 6 cm/año se transforman directamente en calor"
      ],
      c: 1,
      e: "La roca se comporta como un resorte: almacena energía potencial elástica mientras se deforma. Acumular los ~2,5 m de desplazamiento de una ruptura de M 7,4 a 6 cm/año toma unos 40 años. Esa energía se libera en apenas 12,5 s de ruptura. Es el ciclo sísmico: carga lenta, descarga súbita."
    }
  ];

  const handleRuptura = useCallback(() => {
    setFase('ruptura');
    setT(0);
    setEsfuerzo(1);
    stationPAudioRef.current = {};
    stationSAudioRef.current = {};
    audioEngine.playArrivalPulse('S');
  }, []);

  const handleReiniciar = useCallback(() => {
    setFase('reposo');
    setT(0);
    setAnios(0);
    setEsfuerzo(0);
    stationPAudioRef.current = {};
    stationSAudioRef.current = {};
    audioEngine.playClick();
  }, []);

  const handleRunToggle = useCallback(() => {
    audioEngine.playClick();
    if (fase === 'acumulando') {
      setFase('reposo');
    } else if (fase === 'reposo') {
      setFase('acumulando');
    } else {
      handleReiniciar();
      setFase('acumulando');
    }
  }, [fase, handleReiniciar]);

  // Main Render Loop
  useEffect(() => {
    const drawCrossSection = (
      ctx: CanvasRenderingContext2D,
      W: number,
      H: number,
      K: number,
      currFase: string,
      currT: number,
      currAnios: number,
      currEsfuerzo: number
    ) => {
      ctx.clearRect(0, 0, W, H);
      const F = Math.round(K * 4.6);

      const SX = (x: number) => (x - MX0) * K;
      const SY = (d: number) => (d - MY0) * K;

      // ----- cielo -----
      const cielo = ctx.createLinearGradient(0, 0, 0, SY(0));
      cielo.addColorStop(0, "#0C1218");
      cielo.addColorStop(1, "#1A2530");
      ctx.fillStyle = cielo;
      ctx.fillRect(0, 0, W, SY(0));

      // ----- manto -----
      const manto = ctx.createLinearGradient(0, SY(0), 0, H);
      manto.addColorStop(0, "#26343F");
      manto.addColorStop(1, "#141D26");
      ctx.fillStyle = manto;
      ctx.fillRect(0, SY(0), W, H - SY(0));

      // ----- cuña astenosférica caliente -----
      ctx.save();
      const gA = ctx.createRadialGradient(SX(70), SY(115), K * 6, SX(70), SY(115), K * 95);
      gA.addColorStop(0, "rgba(226,84,44,.32)");
      gA.addColorStop(1, "rgba(226,84,44,0)");
      ctx.fillStyle = gA;
      ctx.beginPath();
      ctx.arc(SX(70), SY(115), K * 95, 0, 7);
      ctx.fill();
      ctx.restore();

      // Helper trazar slab
      const trazarSlab = () => {
        ctx.beginPath();
        SLAB.forEach(([x, d], i) => (i ? ctx.lineTo(SX(x), SY(d)) : ctx.moveTo(SX(x), SY(d))));
      };

      // ----- placa de Nazca (litósfera oceánica, 80 km) -----
      const T_slab = 80;
      ctx.save();
      trazarSlab();
      for (let i = SLAB.length - 1; i >= 0; i--) {
        const a = SLAB[Math.max(0, i - 1)];
        const b = SLAB[Math.min(SLAB.length - 1, i + 1)];
        let ux = b[0] - a[0];
        let uy = b[1] - a[1];
        const L = Math.hypot(ux, uy) || 1;
        ux /= L;
        uy /= L;
        ctx.lineTo(SX(SLAB[i][0] - uy * T_slab), SY(SLAB[i][1] + ux * T_slab));
      }
      ctx.closePath();
      const gN = ctx.createLinearGradient(SX(-200), SY(0), SX(190), SY(270));
      gN.addColorStop(0, "#5A93A8");
      gN.addColorStop(0.5, "#3E6E7E");
      gN.addColorStop(1, "#213C46");
      ctx.fillStyle = gN;
      ctx.fill();
      ctx.strokeStyle = "rgba(165,220,236,.55)";
      ctx.lineWidth = Math.max(1, K * 0.8);
      ctx.stroke();
      ctx.restore();

      // marcas que viajan sobre el slab
      if (currFase === "acumulando") {
        ctx.save();
        ctx.fillStyle = "rgba(200,240,252,.75)";
        for (let k = 0; k < 9; k++) {
          const s = ((currAnios * 0.9) / 40 + k / 9) % 1;
          const idx = s * (SLAB.length - 1);
          const i0 = Math.floor(idx);
          const f = idx - i0;
          const a = SLAB[i0];
          const b = SLAB[Math.min(SLAB.length - 1, i0 + 1)];
          const px = SX(a[0] + f * (b[0] - a[0]));
          const py = SY(a[1] + f * (b[1] - a[1]));
          ctx.beginPath();
          ctx.arc(px, py, K * 1.1, 0, 7);
          ctx.fill();
        }
        ctx.restore();
      }

      // ----- placa Suramericana: corteza continental + prisma -----
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(SX(-150), SY(yTopo(-150)));
      for (const [x] of RELIEVE) {
        if (x > -150) ctx.lineTo(SX(x), SY(yTopo(x)));
      }
      ctx.lineTo(SX(MX1), SY(yTopo(MX1)));
      ctx.lineTo(SX(MX1), SY(MOHO));
      for (let i = SLAB.length - 1; i >= 0; i--) {
        const [x, d] = SLAB[i];
        if (x >= -150 && x <= MX1) ctx.lineTo(SX(x), SY(Math.min(d, MOHO)));
      }
      ctx.lineTo(SX(-150), SY(16.5));
      ctx.closePath();
      const gC = ctx.createLinearGradient(0, SY(-28), 0, SY(MOHO + 6));
      gC.addColorStop(0, "#D6AC57");
      gC.addColorStop(0.4, "#A8843F");
      gC.addColorStop(1, "#584425");
      ctx.fillStyle = gC;
      ctx.fill();
      ctx.strokeStyle = "rgba(245,220,165,.5)";
      ctx.lineWidth = Math.max(1, K * 0.7);
      ctx.stroke();
      ctx.restore();

      // ----- océano Pacífico -----
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(SX(MX0), SY(0));
      for (const [x] of RELIEVE) {
        if (x <= -95) ctx.lineTo(SX(x), SY(yTopo(x)));
      }
      ctx.lineTo(SX(-95), SY(0));
      ctx.closePath();
      ctx.fillStyle = "rgba(46,102,122,.9)";
      ctx.fill();
      ctx.strokeStyle = "rgba(150,205,225,.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // volcán del arco (Cordillera Central)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(SX(131), SY(yTopo(131)));
      ctx.lineTo(SX(140), SY(-4.4 * VE));
      ctx.lineTo(SX(149), SY(yTopo(149)));
      ctx.closePath();
      ctx.fillStyle = "rgba(226,84,44,.35)";
      ctx.fill();
      ctx.restore();

      // ----- rejilla de profundidad -----
      ctx.save();
      ctx.font = `${F}px 'IBM Plex Mono',monospace`;
      ctx.strokeStyle = "rgba(150,175,192,.13)";
      ctx.lineWidth = 1;
      ctx.fillStyle = "rgba(150,175,192,.55)";
      ctx.textAlign = "right";
      for (let d = 50; d <= 250; d += 50) {
        ctx.beginPath();
        ctx.moveTo(0, SY(d));
        ctx.lineTo(W, SY(d));
        ctx.stroke();
        ctx.fillText(`${d} km`, W - K * 3, SY(d) - K * 1.6);
      }
      ctx.restore();

      // ----- flecha de convergencia -----
      ctx.save();
      const fy = SY(46);
      const fx = SX(-212);
      const lg = K * 46;
      ctx.strokeStyle = "rgba(190,240,255,.95)";
      ctx.fillStyle = "rgba(190,240,255,.95)";
      ctx.lineWidth = Math.max(1.5, K * 1.0);
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + lg, fy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(fx + lg, fy);
      ctx.lineTo(fx + lg - K * 7, fy - K * 4.2);
      ctx.lineTo(fx + lg - K * 7, fy + K * 4.2);
      ctx.closePath();
      ctx.fill();
      ctx.textAlign = "left";
      ctx.font = `600 ${Math.round(K * 5)}px 'IBM Plex Mono',monospace`;
      ctx.fillText(`${conv.toFixed(1).replace(".", ",")} cm/año`, fx, fy + K * 9);
      ctx.restore();

      // ----- hipocentro -----
      const f = focoEn(prof);
      const hx = SX(f.x);
      const hy = SY(f.d);

      // Frente de ondas
      if (currFase === "propagando" || currFase === "fin") {
        ctx.save();
        const frente = (rgb: string, r: number, peso: number) => {
          if (r <= 0) return;
          ctx.beginPath();
          ctx.arc(hx, hy, r, 0, 7);
          ctx.strokeStyle = `rgba(${rgb},.9)`;
          ctx.lineWidth = Math.max(1.2, K * peso);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(hx, hy, Math.max(0, r - K * 7), 0, 7);
          ctx.strokeStyle = `rgba(${rgb},.32)`;
          ctx.lineWidth = Math.max(1, K * peso * 0.7);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(hx, hy, Math.max(0, r - K * 14), 0, 7);
          ctx.strokeStyle = `rgba(${rgb},.14)`;
          ctx.lineWidth = Math.max(1, K * peso * 0.6);
          ctx.stroke();
        };

        if (verP) frente("255,209,102", VP * currT * K, 1.0);
        if (verS) frente("255,107,74", VS * currT * K, 1.35);
        ctx.restore();
      }

      if (currFase !== "reposo" && currFase !== "acumulando") {
        const brillo = currFase === "ruptura" ? 1 : Math.max(0, 1 - currT / 8);
        ctx.save();
        ctx.globalAlpha = 0.3 + 0.7 * brillo;
        const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, K * 28);
        g.addColorStop(0, "rgba(255,245,205,1)");
        g.addColorStop(0.32, "rgba(255,178,76,.7)");
        g.addColorStop(1, "rgba(226,84,44,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(hx, hy, K * 28, 0, 7);
        ctx.fill();
        ctx.restore();
      }

      // Vertical hipocentro -> epicentro
      const ey = SY(yTopo(f.x));
      ctx.save();
      ctx.setLineDash([K * 2, K * 2.6]);
      ctx.strokeStyle = "rgba(255,209,102,.6)";
      ctx.lineWidth = Math.max(1, K * 0.5);
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx, ey);
      ctx.stroke();
      ctx.restore();

      // Estrella hipocentro
      const estrella = (x: number, y: number, r: number) => {
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 5;
          const rr = i % 2 ? r * 0.42 : r;
          i ? ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fillStyle = "#FFF3C4";
        ctx.fill();
        ctx.strokeStyle = "#E2542C";
        ctx.lineWidth = Math.max(1, K * 0.6);
        ctx.stroke();
        ctx.restore();
      };
      estrella(hx, hy, K * 4.8);

      ctx.save();
      ctx.font = `600 ${Math.round(K * 4.8)}px 'IBM Plex Mono',monospace`;
      ctx.fillStyle = "#FFD166";
      ctx.textAlign = "left";
      ctx.fillText(`hipocentro · ${prof} km`, hx + K * 7, hy + K * 1.8);
      ctx.restore();

      // Triángulo epicentro
      const triangulo = (x: number, y: number, r: number, color: string) => {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x, y - r * 1.4);
        ctx.lineTo(x - r, y - r * 3);
        ctx.lineTo(x + r, y - r * 3);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
      };
      triangulo(hx, ey, K * 3.4, "#FFD166");

      ctx.save();
      ctx.font = `${Math.round(K * 4.4)}px 'IBM Plex Mono',monospace`;
      ctx.fillStyle = "#FFD166";
      ctx.textAlign = "center";
      ctx.fillText("epicentro", hx, ey - K * 13);
      ctx.restore();

      // ----- Ciudades -----
      const NIVEL = [0, 0, 1, 2, 3, 0, 1];
      CIUDADES.forEach((c, i) => {
        const d = datosCiudad(c, prof, mag);
        const px = SX(c.x);
        const py = SY(yTopo(c.x));
        let sac = 0;
        if ((currFase === "propagando" || currFase === "fin") && currT > d.tp) {
          const desde = currT - (currT > d.ts ? d.ts : d.tp);
          const amp = (currT > d.ts ? 1 : 0.3) * Math.exp(-desde / 12) * Math.max(0, d.I - 2) / 6;
          sac = Math.sin(currT * 26 + i) * amp * K * 2.6;

          // Play Audio on wave hit for selected city
          if (i === selCiudadIdx) {
            if (currT >= d.tp && !stationPAudioRef.current[i]) {
              stationPAudioRef.current[i] = true;
              audioEngine.playWaveP(0.6);
            }
            if (currT >= d.ts && !stationSAudioRef.current[i]) {
              stationSAudioRef.current[i] = true;
              audioEngine.playWaveS(0.8);
            }
          }
        }

        const sel = i === selCiudadIdx;
        const alto = K * (5.2 + (sel ? 2.4 : 0));
        const dy = NIVEL[i] * K * 6.2;
        ctx.save();
        ctx.translate(sac, 0);
        ctx.fillStyle = sel ? "#FFD166" : "rgba(230,238,244,.85)";
        ctx.fillRect(px - K * 1.4, py - alto, K * 2.8, alto);
        ctx.beginPath();
        ctx.moveTo(px, py - alto - dy - K * 1.2);
        ctx.lineTo(px, py - alto);
        ctx.stroke();
        ctx.strokeStyle = sel ? "rgba(255,209,102,.5)" : "rgba(230,238,244,.35)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.font = `${sel ? "600 " : ""}${Math.round(K * 4.4)}px 'IBM Plex Sans',sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = sel ? "#FFD166" : "rgba(214,226,236,.92)";
        ctx.fillText(c.n, px, py - alto - dy - K * 2.6);
        if ((currFase === "propagando" || currFase === "fin") && currT > d.tp) {
          ctx.font = `600 ${Math.round(K * 4.2)}px 'IBM Plex Mono',monospace`;
          ctx.fillStyle = currT > d.ts ? "#FF6B4A" : "#FFD166";
          ctx.fillText(currT > d.ts ? `S · ${romano(d.I)}` : "P", px, py - alto - dy - K * 8.2);
        }
        ctx.restore();
      });

      // ----- rótulos -----
      ctx.save();
      ctx.textAlign = "left";
      ctx.font = `600 ${Math.round(K * 5.4)}px 'IBM Plex Sans',sans-serif`;
      ctx.fillStyle = "rgba(198,240,252,.95)";
      ctx.fillText("PLACA DE NAZCA · oceánica, fría, densa", SX(-214), SY(104));
      ctx.fillStyle = "rgba(252,228,172,.95)";
      ctx.fillText("PLACA SURAMERICANA · continental", SX(-6), SY(38));
      ctx.font = `${Math.round(K * 4.8)}px 'IBM Plex Sans',sans-serif`;
      ctx.fillStyle = "rgba(160,182,198,.7)";
      ctx.fillText("manto astenosférico", SX(-214), SY(198));
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(190,235,248,.85)";
      ctx.font = `${Math.round(K * 4.4)}px 'IBM Plex Mono',monospace`;
      ctx.fillText("fosa", SX(-150), SY(-3.5));
      ctx.fillText("Océano Pacífico", SX(-192), SY(-3.5));
      ctx.restore();

      // ----- barra de esfuerzo -----
      if (currFase === "acumulando" || currFase === "reposo") {
        const bw = K * 72;
        const bh = K * 4.2;
        const bx = K * 8;
        const by = SY(MY1) - K * 13;
        ctx.save();
        ctx.fillStyle = "rgba(14,20,26,.9)";
        ctx.fillRect(bx - K * 3, by - K * 8, bw + K * 6, bh + K * 13);
        ctx.strokeStyle = "rgba(150,175,192,.5)";
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, bw, bh);
        ctx.fillStyle = "#E2542C";
        ctx.fillRect(bx, by, bw * currEsfuerzo, bh);
        ctx.font = `${Math.round(K * 4.2)}px 'IBM Plex Mono',monospace`;
        ctx.fillStyle = "rgba(226,234,240,.9)";
        ctx.textAlign = "left";
        ctx.fillText("energía elástica acumulada", bx, by - K * 2.4);
        ctx.restore();
      }
    };

    const drawSeismogram = (
      ctx: CanvasRenderingContext2D,
      SW: number,
      SH: number,
      currFase: string,
      currT: number
    ) => {
      ctx.clearRect(0, 0, SW, SH);
      const c = CIUDADES[selCiudadIdx];
      const d = datosCiudad(c, prof, mag);
      const m = SH * 0.5;
      const VENTANA = 120;
      const esc = SW / VENTANA;

      // Papel milimetrado
      ctx.save();
      ctx.strokeStyle = "rgba(90,83,68,.16)";
      ctx.lineWidth = 1;
      for (let time = 0; time <= VENTANA; time += 10) {
        ctx.beginPath();
        ctx.moveTo(time * esc, 0);
        ctx.lineTo(time * esc, SH);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(90,83,68,.3)";
      ctx.beginPath();
      ctx.moveTo(0, m);
      ctx.lineTo(SW, m);
      ctx.stroke();
      ctx.fillStyle = "rgba(90,83,68,.75)";
      ctx.font = `${Math.round(SH * 0.075)}px 'IBM Plex Mono',monospace`;
      for (let time = 0; time <= VENTANA; time += 20) {
        ctx.fillText(`${time}s`, time * esc + 3, SH - 4);
      }
      ctx.restore();

      const activo = currFase === "propagando" || currFase === "fin";
      const tMax = activo ? Math.min(currT, VENTANA) : 0;

      // Amplitud base
      const A = Math.min(
        SH * 0.46,
        SH * 0.34 * Math.pow(10, 0.55 * (mag - 7.4)) * Math.pow(200 / Math.max(d.dh, 40), 1.6)
      );
      const RUIDO = SH * 0.006 + A * 0.02;

      ctx.save();
      ctx.strokeStyle = "#1B2430";
      ctx.lineWidth = Math.max(1, SH * 0.008);
      ctx.beginPath();
      for (let px = 0; px <= SW; px++) {
        const time = px / esc;
        if (time > tMax) break;
        let v = rnd(time * 47 + selCiudadIdx) * RUIDO;
        if (time > d.tp) {
          const u = time - d.tp;
          v += Math.sin(u * 17.5) * A * 0.3 * Math.exp(-u / 6) + rnd(time * 91) * A * 0.09 * Math.exp(-u / 6);
        }
        if (time > d.ts) {
          const u = time - d.ts;
          v +=
            Math.sin(u * 8.2) * A * Math.exp(-u / 11) +
            Math.sin(u * 3.1 + 1.2) * A * 0.55 * Math.exp(-u / 22) +
            rnd(time * 211) * A * 0.28 * Math.exp(-u / 16);
        }
        v = Math.max(-SH * 0.47, Math.min(SH * 0.47, v));
        px ? ctx.lineTo(px, m + v) : ctx.moveTo(px, m + v);
      }
      ctx.stroke();
      ctx.restore();

      // Marcas P y S
      [
        [d.tp, "P", "#B8862A"],
        [d.ts, "S", "#C4442A"]
      ].forEach(([time, label, col]) => {
        const timeVal = Number(time);
        if (!activo || timeVal > tMax) return;
        ctx.save();
        ctx.strokeStyle = String(col);
        ctx.lineWidth = Math.max(1, SH * 0.009);
        ctx.beginPath();
        ctx.moveTo(timeVal * esc, SH * 0.06);
        ctx.lineTo(timeVal * esc, SH * 0.94);
        ctx.stroke();
        ctx.fillStyle = String(col);
        ctx.font = `600 ${Math.round(SH * 0.11)}px 'IBM Plex Mono',monospace`;
        ctx.fillText(`${label} ${timeVal.toFixed(1)}s`, timeVal * esc + 4, SH * 0.15);
        ctx.restore();
      });
    };

    const animate = (now: number) => {
      const dtSec = Math.min(0.05, (now - lastTimeRef.current) / 1000);
      lastTimeRef.current = now;

      setFase((prevFase) => {
        if (prevFase === 'acumulando') {
          setAnios((prevA) => {
            const nextA = prevA + dtSec * 5.2;
            const nextE = (nextA * conv / 100) / DESLIZ;
            setEsfuerzo(Math.min(1, nextE));
            if (nextE >= 1) {
              setTimeout(() => handleRuptura(), 0);
              return prevA;
            }
            return nextA;
          });
        } else if (prevFase === 'ruptura') {
          setT((prevT) => {
            const nextT = prevT + dtSec * vel;
            if (nextT >= 1.2) {
              return nextT;
            }
            return nextT;
          });
          setFase((f) => (f === 'ruptura' && t >= 1.2 ? 'propagando' : f));
        } else if (prevFase === 'propagando') {
          setT((prevT) => {
            const nextT = prevT + dtSec * vel;
            if (nextT > 150) {
              setFase('fin');
            }
            return nextT;
          });
        }
        return prevFase;
      });

      // Canvas setup & rendering
      if (cvRef.current) {
        const cv = cvRef.current;
        const ctx = cv.getContext('2d');
        if (ctx) {
          const width = cv.parentElement?.clientWidth || 1000;
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const aspecto = (MX1 - MX0) / (MY1 - MY0);
          const height = width / aspecto;

          if (cv.width !== Math.round(width * dpr) || cv.height !== Math.round(height * dpr)) {
            cv.width = Math.round(width * dpr);
            cv.height = Math.round(height * dpr);
            cv.style.height = `${height}px`;
          }

          const K = cv.width / (MX1 - MX0);
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          drawCrossSection(ctx, cv.width, cv.height, K, fase, t, anios, esfuerzo);
        }
      }

      if (sismoRef.current) {
        const sc = sismoRef.current;
        const ctx = sc.getContext('2d');
        if (ctx) {
          const width = sc.parentElement?.clientWidth || 1000;
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          const height = 150;

          if (sc.width !== Math.round(width * dpr) || sc.height !== Math.round(height * dpr)) {
            sc.width = Math.round(width * dpr);
            sc.height = Math.round(height * dpr);
            sc.style.height = `${height}px`;
          }

          drawSeismogram(ctx, sc.width, sc.height, fase, t);
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [fase, t, anios, esfuerzo, prof, mag, conv, vel, verP, verS, selCiudadIdx, handleRuptura]);

  const selCiudad = CIUDADES[selCiudadIdx];
  const datosSel = datosCiudad(selCiudad, prof, mag);

  // Calculations for Physics Cards
  const E_joules = Math.pow(10, 1.5 * mag + 4.8);
  const hiroshima_bombs = E_joules / 6.3e13;

  const M0 = Math.pow(10, 1.5 * mag + 9.1);
  const mu = 7e10;
  const Area = M0 / (mu * DESLIZ) / 1e6; // km²
  const lado = Math.sqrt(Area);
  const anios_ruptura = DESLIZ / (conv / 100);

  const R_felt = Math.pow(10, (mag + 1) / 3);
  const r_sup = Math.sqrt(Math.max(0, R_felt * R_felt - prof * prof));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <section className="bg-[#152430] border border-[rgba(124,141,155,0.28)] rounded-lg p-5 sm:p-6 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[rgba(124,141,155,0.2)]">
          <div>
            <div className="text-[11px] font-mono tracking-widest text-[#7C8D9B] uppercase mb-1">
              CORTE TRANSVERSAL W–E · PLACA DE NAZCA BAJO SURAMÉRICA
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-[#EFE9DB]">
              CUANDO UNA PLACA <span className="text-[#E0503F]">SE HUNDE</span> Y SE ROMPE POR DENTRO
            </h2>
            <p className="text-xs sm:text-sm text-[#DCD3C0] mt-1 max-w-3xl leading-relaxed">
              Simulación del sismo del 10 de agosto de 2026. No fue un choque en el contacto entre placas: fue una ruptura <i>dentro</i> de la placa de Nazca, a 103 km bajo el Chocó.
            </p>
          </div>

          {/* Ficha Evento */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-[#0E1820] p-3 rounded border border-[rgba(124,141,155,0.2)] font-mono text-xs">
            <div>
              <span className="text-[#7C8D9B] block text-[10px] uppercase">MAGNITUD</span>
              <span className="text-[#F2A03D] font-bold text-base">{mag.toFixed(1)} Mw</span>
            </div>
            <div>
              <span className="text-[#7C8D9B] block text-[10px] uppercase">PROFUNDIDAD</span>
              <span className="text-[#3FC7C0] font-bold text-base">{prof} km</span>
            </div>
            <div>
              <span className="text-[#7C8D9B] block text-[10px] uppercase">EPICENTRO</span>
              <span className="text-[#EFE9DB] font-semibold">San José del Palmar</span>
            </div>
          </div>
        </div>

        {/* Interactive Main Canvas Box */}
        <div className="mt-4">
          <div ref={escenaBoxRef} className="overflow-x-auto overflow-y-hidden bg-[#0E141A] rounded border border-[rgba(124,141,155,0.3)] shadow-inner">
            <div className="min-w-[900px]">
              <canvas ref={cvRef} className="w-full block" />
            </div>
          </div>

          {/* Status HUD Bar */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 font-mono text-xs bg-[#0E1820] p-3 rounded border border-[rgba(124,141,155,0.2)]">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded text-[11px] font-semibold uppercase tracking-wide border ${
                fase === 'ruptura' || fase === 'propagando'
                  ? 'bg-[rgba(224,80,63,0.2)] text-[#E0503F] border-[rgba(224,80,63,0.4)] animate-pulse'
                  : 'bg-[rgba(124,141,155,0.15)] text-[#7C8D9B] border-[rgba(124,141,155,0.3)]'
              }`}>
                {fase === 'reposo' && 'En reposo'}
                {fase === 'acumulando' && 'Acumulando esfuerzo'}
                {fase === 'ruptura' && 'Ruptura en curso'}
                {fase === 'propagando' && 'Ondas viajando'}
                {fase === 'fin' && 'Evento registrado'}
              </span>

              <span className="text-[#DCD3C0]">
                {fase === 'acumulando' || fase === 'reposo' ? (
                  <>
                    <b className="text-[#F2A03D]">{Math.round(anios)} años</b> transcurridos · deformación acumulada{' '}
                    <b className="text-[#3FC7C0]">{(anios * conv / 100).toFixed(2)} m</b> / {DESLIZ.toFixed(1)} m
                  </>
                ) : (
                  <>
                    t = <b className="text-[#F2A03D]">{t.toFixed(1)} s</b> · Frente P a{' '}
                    <b className="text-[#F2A03D]">{(VP * t).toFixed(0)} km</b> · Frente S a{' '}
                    <b className="text-[#E0503F]">{(VS * t).toFixed(0)} km</b>
                  </>
                )}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRunToggle}
                className={`px-3.5 py-1.5 rounded font-display text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors ${
                  fase === 'acumulando'
                    ? 'bg-[#F2A03D] text-[#0E1820]'
                    : 'bg-[#EFE9DB] text-[#0E1820] hover:bg-white'
                }`}
              >
                {fase === 'acumulando' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{fase === 'acumulando' ? 'Pausar' : 'Acumular Esfuerzo'}</span>
              </button>

              <button
                onClick={handleRuptura}
                className="px-3.5 py-1.5 rounded bg-[#E0503F] hover:bg-[#d04231] text-[#EFE9DB] font-display text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-md"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Liberar Energía</span>
              </button>

              <button
                onClick={handleReiniciar}
                className="px-3 py-1.5 rounded bg-[rgba(124,141,155,0.2)] hover:bg-[rgba(124,141,155,0.3)] text-[#DCD3C0] font-display text-xs font-semibold uppercase tracking-wider flex items-center gap-1 transition-colors"
                title="Reiniciar Simulación"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Sliders Grid */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-[#0E1820] p-4 rounded border border-[rgba(124,141,155,0.2)] font-mono text-xs">
            <div>
              <div className="flex justify-between text-[#7C8D9B] mb-1">
                <span>Profundidad Hipocentro:</span>
                <span className="text-[#3FC7C0] font-bold">{prof} km</span>
              </div>
              <input
                type="range"
                min={20}
                max={220}
                value={prof}
                onChange={(e) => setProf(Number(e.target.value))}
                className="w-full accent-[#3FC7C0]"
              />
            </div>

            <div>
              <div className="flex justify-between text-[#7C8D9B] mb-1">
                <span>Magnitud (Mw):</span>
                <span className="text-[#F2A03D] font-bold">{mag.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={4.5}
                max={8.5}
                step={0.1}
                value={mag}
                onChange={(e) => setMag(Number(e.target.value))}
                className="w-full accent-[#F2A03D]"
              />
            </div>

            <div>
              <div className="flex justify-between text-[#7C8D9B] mb-1">
                <span>Convergencia Nazca-Suramérica:</span>
                <span className="text-[#EFE9DB] font-bold">{conv.toFixed(1)} cm/año</span>
              </div>
              <input
                type="range"
                min={1}
                max={12}
                step={0.5}
                value={conv}
                onChange={(e) => setConv(Number(e.target.value))}
                className="w-full accent-[#EFE9DB]"
              />
            </div>

            <div>
              <div className="flex justify-between text-[#7C8D9B] mb-1">
                <span>Velocidad Reproducción:</span>
                <span className="text-[#EFE9DB] font-bold">{vel}×</span>
              </div>
              <input
                type="range"
                min={1}
                max={8}
                value={vel}
                onChange={(e) => setVel(Number(e.target.value))}
                className="w-full accent-[#EFE9DB]"
              />
            </div>

            <div>
              <div className="text-[#7C8D9B] mb-1">Estación de Registro Seleccionada:</div>
              <select
                value={selCiudadIdx}
                onChange={(e) => setSelCiudadIdx(Number(e.target.value))}
                className="w-full bg-[#152430] border border-[rgba(124,141,155,0.3)] rounded px-2.5 py-1.5 text-[#EFE9DB] font-sans text-xs font-medium focus:outline-none focus:border-[#3FC7C0]"
              >
                {CIUDADES.map((c, idx) => (
                  <option key={idx} value={idx}>
                    {c.n}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-[#7C8D9B] mb-1">Visibilidad de Ondas:</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setVerP(!verP)}
                  className={`flex-1 py-1 px-2 rounded border text-xs font-bold transition-colors ${
                    verP
                      ? 'bg-[rgba(242,160,61,0.2)] text-[#F2A03D] border-[#F2A03D]'
                      : 'bg-[#152430] text-[#7C8D9B] border-[rgba(124,141,155,0.2)]'
                  }`}
                >
                  Onda P
                </button>
                <button
                  onClick={() => setVerS(!verS)}
                  className={`flex-1 py-1 px-2 rounded border text-xs font-bold transition-colors ${
                    verS
                      ? 'bg-[rgba(224,80,63,0.2)] text-[#E0503F] border-[#E0503F]'
                      : 'bg-[#152430] text-[#7C8D9B] border-[rgba(124,141,155,0.2)]'
                  }`}
                >
                  Onda S
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Live Seismogram Section */}
      <section className="bg-[#EDE6D6] rounded-lg p-4 sm:p-5 text-[#1B2430] shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-[#C8BFB0] font-mono text-xs uppercase tracking-wide">
          <div className="font-bold text-sm text-[#0E1820]">
            Sismograma Digital — <span className="text-[#C4442A]">{selCiudad.n}</span>
          </div>
          <div className="text-[#7A7261]">Escala de Tiempo: 0 - 120 Segundos</div>
        </div>

        <div className="bg-[#EDE6D6] rounded overflow-hidden">
          <canvas ref={sismoRef} className="w-full block h-[150px]" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mt-3 font-mono text-xs">
          <div className="bg-[#E2D9C8] p-2 rounded">
            <span className="text-[#7A7261] block text-[10px] uppercase font-bold">DIST. EPICENTRAL</span>
            <span className="text-[#1B2430] font-bold text-sm">{datosSel.de.toFixed(0)} km</span>
          </div>
          <div className="bg-[#E2D9C8] p-2 rounded">
            <span className="text-[#7A7261] block text-[10px] uppercase font-bold">DIST. HIPOCENTRAL</span>
            <span className="text-[#1B2430] font-bold text-sm">{datosSel.dh.toFixed(0)} km</span>
          </div>
          <div className="bg-[#E2D9C8] p-2 rounded">
            <span className="text-[#7A7261] block text-[10px] uppercase font-bold">LLEGADA Onda P (tP)</span>
            <span className="text-[#B8862A] font-bold text-sm">{datosSel.tp.toFixed(1)} s</span>
          </div>
          <div className="bg-[#E2D9C8] p-2 rounded">
            <span className="text-[#7A7261] block text-[10px] uppercase font-bold">LLEGADA Onda S (tS)</span>
            <span className="text-[#C4442A] font-bold text-sm">{datosSel.ts.toFixed(1)} s</span>
          </div>
          <div className="bg-[#E2D9C8] p-2 rounded">
            <span className="text-[#7A7261] block text-[10px] uppercase font-bold">DESFASE Δt = tS - tP</span>
            <span className="text-[#1B2430] font-bold text-sm">{datosSel.dt.toFixed(1)} s</span>
          </div>
          <div className="bg-[#E2D9C8] p-2 rounded">
            <span className="text-[#7A7261] block text-[10px] uppercase font-bold">INTENSIDAD EST.</span>
            <span className="text-[#C4442A] font-bold text-sm">{romano(datosSel.I)}</span>
          </div>
        </div>
      </section>

      {/* Cities Intensity Table */}
      <section className="bg-[#152430] border border-[rgba(124,141,155,0.28)] rounded-lg p-5">
        <h3 className="font-display text-xl font-bold uppercase text-[#EFE9DB] mb-1">
          Lo que sintió cada ciudad en el modelo
        </h3>
        <p className="text-xs text-[#7C8D9B] mb-4">
          Distancias epicentrales reales del corte. Haz clic en una fila para enfocar la estación en el sismógrafo.
        </p>

        <div className="overflow-x-auto rounded border border-[rgba(124,141,155,0.2)]">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="bg-[#212C3A] text-[#7C8D9B] uppercase text-[10px]">
                <th className="p-2.5">Ciudad</th>
                <th className="p-2.5 text-right">Δ Epicentral (km)</th>
                <th className="p-2.5 text-right">Dist. Hipocentral (km)</th>
                <th className="p-2.5 text-right">tP (s)</th>
                <th className="p-2.5 text-right">tS (s)</th>
                <th className="p-2.5 text-right">Δt (s)</th>
                <th className="p-2.5 text-right">Intensidad Mercalli</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(124,141,155,0.15)] bg-[#152430]">
              {CIUDADES.map((c, i) => {
                const d = datosCiudad(c, prof, mag);
                const isSelected = i === selCiudadIdx;
                return (
                  <tr
                    key={i}
                    onClick={() => {
                      setSelCiudadIdx(i);
                      audioEngine.playClick();
                    }}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#212C3A] text-[#F2A03D] font-bold' : 'hover:bg-[rgba(33,44,58,0.5)] text-[#DCD3C0]'
                    }`}
                  >
                    <td className="p-2.5 font-sans font-semibold">{c.n}</td>
                    <td className="p-2.5 text-right">{d.de.toFixed(0)}</td>
                    <td className="p-2.5 text-right">{d.dh.toFixed(0)}</td>
                    <td className="p-2.5 text-right">{d.tp.toFixed(1)}</td>
                    <td className="p-2.5 text-right">{d.ts.toFixed(1)}</td>
                    <td className="p-2.5 text-right">{d.dt.toFixed(1)}</td>
                    <td className="p-2.5 text-right font-bold text-[#F2A03D]">{romano(d.I)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Physics Breakdown Grid */}
      <section className="bg-[#152430] border border-[rgba(124,141,155,0.28)] rounded-lg p-5">
        <h3 className="font-display text-xl font-bold uppercase text-[#EFE9DB] mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-[#3FC7C0]" />
          <span>La Física detrás del Fenómeno</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-[#0E1820] border-l-2 border-[#E0503F] p-4 rounded border border-[rgba(124,141,155,0.2)]">
            <h4 className="font-display text-sm font-bold text-[#EFE9DB] uppercase mb-1">1. Energía Liberada</h4>
            <div className="font-mono text-xs text-[#F2A03D] bg-[#152430] p-1.5 rounded my-2 border border-[rgba(124,141,155,0.2)]">
              log₁₀E = 1,5·M + 4,8
            </div>
            <p className="text-xs text-[#7C8D9B] leading-relaxed">
              Con M = {mag.toFixed(1)}, E ≈ <b className="text-[#EFE9DB]">{E_joules.toExponential(2)} J</b>, equivalente a unas{' '}
              <b className="text-[#F2A03D]">{hiroshima_bombs < 1 ? hiroshima_bombs.toFixed(2) : Math.round(hiroshima_bombs).toLocaleString()}</b> bombas de Hiroshima. Subir 1.0 de magnitud multiplica la energía por 10¹'⁵ ≈ <b className="text-[#3FC7C0]">32 veces</b>.
            </p>
          </div>

          <div className="bg-[#0E1820] border-l-2 border-[#3FC7C0] p-4 rounded border border-[rgba(124,141,155,0.2)]">
            <h4 className="font-display text-sm font-bold text-[#EFE9DB] uppercase mb-1">2. Localizar el Foco con Δt</h4>
            <div className="font-mono text-xs text-[#3FC7C0] bg-[#152430] p-1.5 rounded my-2 border border-[rgba(124,141,155,0.2)]">
              d = Δt / (1/vS − 1/vP)
            </div>
            <p className="text-xs text-[#7C8D9B] leading-relaxed">
              Con vP = 8,0 km/s y vS = 4,5 km/s, cada segundo de retraso entre P y S equivale a <b className="text-[#EFE9DB]">10,3 km</b> de distancia al foco. Tres estaciones bastan para cruzar circunferencias y hallar el punto.
            </p>
          </div>

          <div className="bg-[#0E1820] border-l-2 border-[#F2A03D] p-4 rounded border border-[rgba(124,141,155,0.2)]">
            <h4 className="font-display text-sm font-bold text-[#EFE9DB] uppercase mb-1">3. Pitágoras bajo Tierra</h4>
            <div className="font-mono text-xs text-[#F2A03D] bg-[#152430] p-1.5 rounded my-2 border border-[rgba(124,141,155,0.2)]">
              d_hipo = √(Δ_epic² + h²)
            </div>
            <p className="text-xs text-[#7C8D9B] leading-relaxed">
              Con h = {prof} km, ninguna ciudad estuvo nunca a menos de {prof} km del foco, aunque estuviera justo encima. Eso reparte el sacudimiento en vez de concentrarlo destructivamente en un solo punto.
            </p>
          </div>

          <div className="bg-[#0E1820] border-l-2 border-[#3FC7C0] p-4 rounded border border-[rgba(124,141,155,0.2)]">
            <h4 className="font-display text-sm font-bold text-[#EFE9DB] uppercase mb-1">4. Deformación Acumulada</h4>
            <div className="font-mono text-xs text-[#3FC7C0] bg-[#152430] p-1.5 rounded my-2 border border-[rgba(124,141,155,0.2)]">
              M₀ = μ·A·D
            </div>
            <p className="text-xs text-[#7C8D9B] leading-relaxed">
              Con μ = 70 GPa y D = 2,5 m, el área de ruptura sería de unos <b className="text-[#EFE9DB]">{Math.round(Area).toLocaleString()} km²</b> (≈ {lado.toFixed(0)} × {lado.toFixed(0)} km). A {conv.toFixed(1)} cm/año, acumular esa tensión toma <b className="text-[#F2A03D]">{Math.round(anios_ruptura)} años</b>.
            </p>
          </div>

          <div className="bg-[#0E1820] border-l-2 border-[#F2A03D] p-4 rounded border border-[rgba(124,141,155,0.2)]">
            <h4 className="font-display text-sm font-bold text-[#EFE9DB] uppercase mb-1">5. Alcance de Percepción</h4>
            <div className="font-mono text-xs text-[#F2A03D] bg-[#152430] p-1.5 rounded my-2 border border-[rgba(124,141,155,0.2)]">
              d_sentido ≈ 10^((M+1)/3) km
            </div>
            <p className="text-xs text-[#7C8D9B] leading-relaxed">
              Radio de percepción desde el foco: <b className="text-[#EFE9DB]">{R_felt.toFixed(0)} km</b> ({r_sup.toFixed(0)} km en superficie). Al ser M {mag >= 7 ? '>= 7, cruza fronteras internacionales (Ecuador, Panamá)' : '< 7, queda más confinado regionalmente'}.
            </p>
          </div>

          <div className="bg-[#0E1820] border-l-2 border-[#E0503F] p-4 rounded border border-[rgba(124,141,155,0.2)]">
            <h4 className="font-display text-sm font-bold text-[#EFE9DB] uppercase mb-1">6. Por qué dura "Tanto"</h4>
            <div className="font-mono text-xs text-[#E0503F] bg-[#152430] p-1.5 rounded my-2 border border-[rgba(124,141,155,0.2)]">
              Ruptura vs Coda
            </div>
            <p className="text-xs text-[#7C8D9B] leading-relaxed">
              La ruptura duró unos 12,5 s, pero las reflexiones en capas tectónicas y ondas de superficie estiran la sacudida percibida en ciudades lejanas hasta varios minutos.
            </p>
          </div>
        </div>
      </section>

      {/* Saber 11 Questions */}
      <section className="bg-[#152430] border border-[rgba(124,141,155,0.28)] rounded-lg p-5">
        <h3 className="font-display text-xl font-bold uppercase text-[#EFE9DB] mb-1 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-[#F2A03D]" />
          <span>Preguntas tipo Saber 11</span>
        </h3>
        <p className="text-xs text-[#7C8D9B] mb-4">
          Evalúa tu conocimiento científico con estas preguntas conceptuales de la Prueba Saber 11.
        </p>

        <div className="space-y-4">
          {ITEMS.map((item, idx) => {
            const userAns = respuestasUser[idx];
            return (
              <div key={idx} className="bg-[#0E1820] border border-[rgba(124,141,155,0.2)] rounded-lg p-4">
                <div className="font-mono text-xs text-[#F2A03D] font-bold uppercase mb-1">Ítem {idx + 1}</div>
                <p className="text-sm text-[#EFE9DB] mb-3 leading-relaxed">{item.p}</p>

                <div className="grid grid-cols-1 gap-2">
                  {item.o.map((op, optIdx) => {
                    const isSelected = userAns === optIdx;
                    const isCorrect = optIdx === item.c;
                    let btnClass = "bg-[#152430] border-[rgba(124,141,155,0.25)] text-[#DCD3C0] hover:border-[#3FC7C0]";

                    if (userAns !== undefined) {
                      if (isCorrect) {
                        btnClass = "bg-[rgba(95,191,155,0.16)] border-[#5FBF9B] text-[#5FBF9B] font-bold";
                      } else if (isSelected) {
                        btnClass = "bg-[rgba(226,84,44,0.15)] border-[#E2542C] text-[#E2542C]";
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        onClick={() => {
                          setRespuestasUser({ ...respuestasUser, [idx]: optIdx });
                          audioEngine.playClick();
                        }}
                        className={`text-left text-xs p-2.5 rounded border transition-colors flex items-center justify-between ${btnClass}`}
                      >
                        <span>
                          <b>{String.fromCharCode(65 + optIdx)}.</b> {op}
                        </span>
                        {userAns !== undefined && isCorrect && <Check className="w-4 h-4 text-[#5FBF9B]" />}
                      </button>
                    );
                  })}
                </div>

                {userAns !== undefined && (
                  <div className="mt-3 p-3 bg-[rgba(95,191,155,0.1)] border-l-2 border-[#5FBF9B] text-xs text-[#DCD3C0] rounded-r leading-relaxed">
                    <b className="text-[#5FBF9B] block mb-0.5">Explicación Física:</b>
                    {item.e}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
