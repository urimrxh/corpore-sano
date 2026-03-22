import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../style/home.css";
import BookMeeting from "../components/BookMeeting";

/* Short viewBox + shallow fill: a tall strip + slice was cropping to the flat rectangle below the curves (read as a gradient bar). */
const WAVE_VB = { w: 1600, h: 380 };
const WAVE_BASE_Y = 368;
const B = WAVE_BASE_Y;

/** One-line paths; same command structure per layer (M + 3×C + 2×L + Z) for numeric morph. */
const WAVE_LAYERS = [
  {
    className: "hero-wave hero-wave--back",
    gradientId: "hero-wave-grad-back",
    morphDur: 13,
    stops: [
      { offset: "0%", color: "#e8f6f2", opacity: 0.0 },
      { offset: "28%", color: "#d4ebe4", opacity: 0.22 },
      { offset: "62%", color: "#bfe3d8", opacity: 0.42 },
      { offset: "100%", color: "#a8d8ca", opacity: 0.58 },
    ],
    dMorph: [
      `M 0 92 C 200 42 400 132 600 72 C 800 12 1000 122 1200 58 C 1320 28 1460 108 1600 68 L 1600 ${B} L 0 ${B} Z`,
      `M 0 108 C 240 58 440 118 660 92 C 840 28 1040 108 1240 72 C 1300 38 1500 92 1600 52 L 1600 ${B} L 0 ${B} Z`,
      `M 0 78 C 165 28 365 145 555 58 C 785 4 995 135 1215 48 C 1340 18 1460 125 1600 88 L 1600 ${B} L 0 ${B} Z`,
      `M 0 98 C 220 48 420 125 620 82 C 810 18 1010 112 1210 62 C 1330 34 1470 102 1600 72 L 1600 ${B} L 0 ${B} Z`,
    ],
  },
  {
    className: "hero-wave hero-wave--mid",
    gradientId: "hero-wave-grad-mid",
    morphDur: 10,
    stops: [
      { offset: "0%", color: "#d8f0e8", opacity: 0.0 },
      { offset: "30%", color: "#c2e6da", opacity: 0.38 },
      { offset: "68%", color: "#9fd6c4", opacity: 0.62 },
      { offset: "100%", color: "#7fc4ae", opacity: 0.78 },
    ],
    dMorph: [
      `M 0 158 C 220 98 460 228 680 138 C 900 48 1120 218 1320 128 C 1420 88 1520 188 1600 148 L 1600 ${B} L 0 ${B} Z`,
      `M 0 172 C 260 118 500 198 720 162 C 860 58 1100 198 1320 148 C 1405 102 1525 172 1600 132 L 1600 ${B} L 0 ${B} Z`,
      `M 0 142 C 195 78 430 248 640 118 C 920 32 1140 238 1340 108 C 1435 72 1510 205 1600 165 L 1600 ${B} L 0 ${B} Z`,
      `M 0 165 C 235 92 475 218 695 152 C 905 42 1115 208 1315 138 C 1412 95 1512 182 1600 142 L 1600 ${B} L 0 ${B} Z`,
    ],
  },
  {
    className: "hero-wave hero-wave--front",
    gradientId: "hero-wave-grad-front",
    morphDur: 7.5,
    stops: [
      { offset: "0%", color: "#c5e8dc", opacity: 0.0 },
      { offset: "34%", color: "#9fd4c2", opacity: 0.48 },
      { offset: "72%", color: "#6eb89d", opacity: 0.72 },
      { offset: "100%", color: "#4a9f83", opacity: 0.88 },
    ],
    dMorph: [
      `M 0 242 C 280 162 560 312 820 202 C 1080 92 1240 288 1400 208 C 1480 168 1545 262 1600 248 L 1600 ${B} L 0 ${B} Z`,
      `M 0 262 C 310 182 590 288 850 228 C 1040 108 1260 268 1420 188 C 1470 155 1560 242 1600 228 L 1600 ${B} L 0 ${B} Z`,
      `M 0 222 C 250 138 530 328 790 178 C 1110 72 1220 308 1380 228 C 1490 178 1535 278 1600 268 L 1600 ${B} L 0 ${B} Z`,
      `M 0 252 C 295 168 575 302 835 218 C 1060 98 1255 275 1410 198 C 1485 162 1552 252 1600 238 L 1600 ${B} L 0 ${B} Z`,
    ],
  },
];

const PATH_NUM_COUNT = 24;

function extractPathNums(d) {
  const m = d.trim().match(/-?\d+\.?\d*/g);
  return m ? m.map(Number) : [];
}

function buildWavePath(nums) {
  const [
    m0,
    m1,
    c1x1,
    c1y1,
    c1x2,
    c1y2,
    c1x,
    c1y,
    c2x1,
    c2y1,
    c2x2,
    c2y2,
    c2x,
    c2y,
    c3x1,
    c3y1,
    c3x2,
    c3y2,
    c3x,
    c3y,
    lx1,
    ly1,
    lx2,
    ly2,
  ] = nums;
  return `M ${m0} ${m1} C ${c1x1} ${c1y1} ${c1x2} ${c1y2} ${c1x} ${c1y} C ${c2x1} ${c2y1} ${c2x2} ${c2y2} ${c2x} ${c2y} C ${c3x1} ${c3y1} ${c3x2} ${c3y2} ${c3x} ${c3y} L ${lx1} ${ly1} L ${lx2} ${ly2} Z`;
}

function smoothstep(t) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

function HeroWavePaths({ reducedMotion }) {
  const pathRefs = useRef([]);

  useEffect(() => {
    if (reducedMotion) return undefined;

    const prepared = WAVE_LAYERS.map((layer) => {
      const frames = layer.dMorph.map((d) => extractPathNums(d));
      if (
        frames.some((f) => f.length !== PATH_NUM_COUNT) ||
        frames.length !== 4
      ) {
        return null;
      }
      return { frames, durSec: layer.morphDur };
    });

    if (prepared.some((p) => p == null)) return undefined;

    const startOffsets = [0, -2.2, -4.5].map((s) => s * 1000);

    let raf = 0;
    const tick = (now) => {
      prepared.forEach((p, li) => {
        const el = pathRefs.current[li];
        if (!el || !p) return;
        let elapsedSec = (now + startOffsets[li]) / 1000;
        elapsedSec =
          ((elapsedSec % p.durSec) + p.durSec) % p.durSec;
        const t = elapsedSec / p.durSec;
        const seg = t * 4;
        const i = Math.floor(seg) % 4;
        const f = seg - Math.floor(seg);
        const u = smoothstep(f);
        const a = p.frames[i];
        const b = p.frames[(i + 1) % 4];
        const blended = a.map((v, idx) => v + (b[idx] - v) * u);
        el.setAttribute("d", buildWavePath(blended));
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reducedMotion]);

  return WAVE_LAYERS.map((layer, i) => (
    <g key={layer.gradientId} className={layer.className}>
      <path
        ref={(el) => {
          pathRefs.current[i] = el;
        }}
        d={layer.dMorph[0]}
        fill={`url(#${layer.gradientId})`}
      />
    </g>
  ));
}

function Home() {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <section className="hero">
      <div className="hero-waves" aria-hidden="true">
        <svg
          className="hero-waves-svg"
          viewBox={`0 0 ${WAVE_VB.w} ${WAVE_VB.h}`}
          preserveAspectRatio="xMaxYMin slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {WAVE_LAYERS.map((layer) => (
              <linearGradient
                key={layer.gradientId}
                id={layer.gradientId}
                gradientUnits="userSpaceOnUse"
                x1="0"
                y1="0"
                x2={String(WAVE_VB.w)}
                y2="0"
              >
                {layer.stops.map((stop, j) => (
                  <stop
                    key={j}
                    offset={stop.offset}
                    stopColor={stop.color}
                    stopOpacity={stop.opacity}
                  />
                ))}
              </linearGradient>
            ))}
          </defs>

          <HeroWavePaths reducedMotion={reducedMotion} />
        </svg>
      </div>

      <div className="container hero-inner">
        <h1 className="text-[#103152] text-[32px] md:text-[48px] font-semibold">
          Online nutrition consultations made simple.
        </h1>

        <p>
          Corpore Sano helps you schedule free online meetings with our
          nutrition specialists in a simple and comfortable way.
        </p>

        <BookMeeting />

        <div className="hero-actions">
          <Link to="/book-meeting" className="btn btn-primary">
            Book a Free Meeting
          </Link>
          <Link to="/nutritionists" className="btn btn-secondary">
            Meet Our Nutritionists
          </Link>
        </div>
      </div>
    </section>
  );
}

export default Home;
