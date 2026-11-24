import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "@/i18n";
import desktopVideo from "@/assets/hero/hero-mobile.mp4.asset.json";
import poster from "@/assets/hero/window-poster.jpg.asset.json";
import blind from "@/assets/hero/blind.webp.asset.json";
import frame from "@/assets/hero/frame.webp.asset.json";

// Canvas 1920x1072 (layers scaled from 2752x1536). Window opening and blind travel in canvas %.
const CW = 1920, CH = 1072;
const WIN = { x: 106, y: 68, w: 1708, h: 951 };
const BLIND_H = 481; // blind bottom edge distance from window top
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

function setScrollLock(locked: boolean) {
  document.documentElement.style.overflow = locked ? "hidden" : "";
  document.body.style.overflow = locked ? "hidden" : "";
}

/** Stage: 0 closed, 1 half open, 2 open, 3 zoomed, 4 playing. */
export function WindowHero({ nextId, reduced }: { nextId: string; reduced: boolean }) {
  const H = t.hero;
  const [stage, setStage] = useState(0);
  const [zoom, setZoom] = useState({ s: 1, x: 0, y: 0 });
  const stageRef = useRef(0);
  const busy = useRef(false);
  const done = useRef(false);
  const sceneRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    const v = videoRef.current;
    if (v) { v.pause(); if (Number.isFinite(v.duration)) v.currentTime = v.duration; }
    setStage(5);
    setScrollLock(false);
    document.getElementById(nextId)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  }, [nextId, reduced]);

  const play = useCallback(() => {
    const v = videoRef.current;
    if (!v) return finish();
    const tryPlay = () => { v.play().catch(() => finish()); };
    if (v.readyState >= 3) tryPlay(); else v.addEventListener("canplay", tryPlay, { once: true });
    window.setTimeout(() => { if (!done.current && (v.paused || v.currentTime === 0)) finish(); }, 4000);
  }, [finish]);

  const computeZoom = useCallback(() => {
    const el = sceneRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const k = r.width / CW;
    const ww = WIN.w * k, wh = WIN.h * k;
    const b = boxRef.current!.getBoundingClientRect();
    const s = Math.max(b.width / ww, b.height / wh) * 1.03;
    const cx = r.left + (WIN.x + WIN.w / 2) * k, cy = r.top + (WIN.y + WIN.h / 2) * k;
    // scale around the scene centre, then shift window centre to viewport centre
    const sx = r.left + r.width / 2, sy = r.top + r.height / 2;
    setZoom({ s, x: b.left + b.width / 2 - (sx + (cx - sx) * s), y: b.top + b.height / 2 - (sy + (cy - sy) * s) });
  }, []);

  const go = useCallback((next: number) => {
    stageRef.current = next;
    setStage(next);
    if (next === 4) play();
  }, [play]);

  const advance = useCallback(() => {
    if (busy.current || done.current) return;
    const cur = stageRef.current;
    if (cur >= 2) return;
    busy.current = true;
    if (reduced) { go(4); window.setTimeout(() => { busy.current = false; }, 700); return; }
    go(cur + 1);
    window.setTimeout(() => {
      if (cur + 1 === 2) {
        computeZoom();
        go(3);
        window.setTimeout(() => { go(4); busy.current = false; }, 1000);
      } else busy.current = false;
    }, 850);
  }, [reduced, go, computeZoom]);

  useEffect(() => {
    if (window.scrollY > 10) { done.current = true; setStage(5); return; }
    setScrollLock(true);
    const measure = () => { const r = boxRef.current?.getBoundingClientRect(); if (r) setBox({ w: window.innerWidth, h: window.innerHeight - r.top }); };
    measure();
    window.addEventListener("resize", measure);
    skipRef.current?.focus({ preventScroll: true });
    let touchY = 0;
    const onWheel = (e: WheelEvent) => { if (done.current) return; e.preventDefault(); if (e.deltaY > 0) advance(); };
    const onTouchStart = (e: TouchEvent) => { touchY = e.touches[0]?.clientY ?? 0; };
    const onTouchMove = (e: TouchEvent) => {
      if (done.current) return;
      e.preventDefault();
      const y = e.touches[0]?.clientY ?? 0;
      if (touchY - y > 30) { touchY = y; advance(); }
    };
    const onKey = (e: KeyboardEvent) => {
      if (done.current) return;
      if (e.key === "Escape") { e.preventDefault(); finish(); return; }
      if (["ArrowDown", "PageDown", " "].includes(e.key) && !(e.target instanceof HTMLButtonElement && e.key === " ")) {
        e.preventDefault(); advance();
      }
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", measure);
      setScrollLock(false);
    };
  }, [advance, finish]);

  const blindShift = stage === 0 ? 0 : stage === 1 ? BLIND_H / 2 : BLIND_H;
  const zoomed = stage >= 3 && !reduced;
  const overlayHidden = reduced && stage >= 4;
  const ease = "cubic-bezier(0.16, 1, 0.3, 1)";

  return (
    <div className="relative bg-cinema" style={{ height: box ? box.h : "100dvh" }}>
      <section ref={boxRef} style={{ height: box ? box.h : "100dvh" }} aria-label={`${H.line1} ${H.line2}`} className="relative w-full overflow-hidden bg-cinema">
        <div
          ref={sceneRef}
          className="absolute left-1/2 top-1/2 [container-type:inline-size]"
          style={{
            width: box ? Math.max(box.w, box.h * (CW / CH)) : "100vw",
            aspectRatio: `${CW} / ${CH}`,
            transform: zoomed
              ? `translate(-50%, -50%) translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})`
              : "translate(-50%, -50%)",
            transition: `transform 1s ${ease}`,
          }}
        >
          <video
            ref={videoRef}
            src={desktopVideo.url}
            poster={poster.url}
            muted
            playsInline
            preload="auto"
            aria-label={H.videoLabel}
            onEnded={finish}
            onError={() => { if (stageRef.current >= 4) finish(); }}
            className="absolute bg-cinema object-cover"
            style={{ left: pct(WIN.x, CW), top: pct(WIN.y, CH), width: pct(WIN.w, CW), height: pct(WIN.h, CH) }}
          />
          <img src={frame.url} alt="" className="pointer-events-none absolute inset-0 h-full w-full"
            style={{ opacity: overlayHidden ? 0 : 1, transition: "opacity 700ms" }} />
          <div className="pointer-events-none absolute overflow-hidden"
            style={{ left: pct(WIN.x, CW), top: pct(WIN.y, CH), width: pct(WIN.w, CW), height: pct(WIN.h, CH),
              opacity: overlayHidden ? 0 : 1, transition: "opacity 700ms" }}>
            <div className="absolute"
              style={{ width: `${(CW / WIN.w) * 100}%`, height: `${(CH / WIN.h) * 100}%`,
                left: `${(-WIN.x / WIN.w) * 100}%`, top: `${(-WIN.y / WIN.h) * 100}%`,
                transform: `translateY(${(-blindShift / CH) * 100}%)`,
                transition: reduced ? "none" : `transform 800ms ${ease}` }}>
              <img src={blind.url} alt="" className="absolute inset-0 h-full w-full" />
              <div aria-hidden="true" className="absolute flex flex-col items-center justify-center text-center font-heading font-bold text-primary"
                style={{ left: 0, right: 0, top: pct(130, CH), height: pct(440, CH), fontSize: "9.6cqw", lineHeight: 1.05 }}>
                <span>{H.line1}</span>
                <span>{H.line2}</span>
              </div>
            </div>
          </div>
        </div>
        <h1 className="sr-only">{H.line1} {H.line2}</h1>
        {stage < 5 && (
          <button ref={skipRef} type="button" onClick={finish} aria-label={H.skipLabel}
            className="fixed bottom-6 left-6 z-40 min-h-11 min-w-11 rounded-full border-2 border-cinema-foreground bg-cinema/60 px-6 py-2 text-lg font-semibold text-cinema-foreground focus-visible:outline-4 focus-visible:outline-offset-2">
            {H.skip}
          </button>
        )}
      </section>
    </div>
  );
}
