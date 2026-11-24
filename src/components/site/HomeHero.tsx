import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "@/i18n";
import { WindowHero } from "./WindowHero";
import desktopVideo from "@/assets/hero/hero.mp4.asset.json";
import mobileVideo from "@/assets/hero/hero-mobile.mp4.asset.json";
import poster from "@/assets/hero/hero-poster.jpg.asset.json";

type Mode = "pending" | "desktop" | "desktop-reduced" | "mobile" | "reduced";
const TRIGGER = 0.6; // scroll progress at which both lines have left the frame

function setScrollLock(locked: boolean) {
  document.documentElement.style.overflow = locked ? "hidden" : "";
  document.body.style.overflow = locked ? "hidden" : "";
}

export function HomeHero({ nextId }: { nextId: string }) {
  const H = t.hero;
  const [mode, setMode] = useState<Mode>("pending");
  const [progress, setProgress] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [linesVisible, setLinesVisible] = useState(false);
  const played = useRef(false);
  const done = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wide = window.innerWidth >= 768;
    setMode(wide ? (reduced ? "desktop-reduced" : "desktop") : reduced ? "reduced" : "mobile");
    return () => setScrollLock(false);
  }, []);

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    const v = videoRef.current;
    if (v) {
      v.pause();
      if (Number.isFinite(v.duration)) v.currentTime = v.duration; // keep last frame
    }
    setPlaying(false);
    setScrollLock(false);
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(nextId)?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  }, [nextId]);

  const start = useCallback((lock: boolean) => {
    if (played.current) return;
    played.current = true;
    setShowVideo(true);
    setPlaying(true);
    if (lock) setScrollLock(true);
    const v = videoRef.current;
    if (!v) return finish();
    const tryPlay = () => { v.play().catch(() => finish()); };
    v.currentTime = 0;
    if (v.readyState >= 3) tryPlay();
    else { v.addEventListener("canplay", tryPlay, { once: true }); v.load(); }
    // Never leave a black screen: if playback hasn't really started in ~4s, move on.
    window.setTimeout(() => {
      if (v.paused || v.currentTime === 0) finish();
    }, 4000);
  }, [finish]);

  // Desktop: scroll-driven lines, then video
  useEffect(() => {
    if (mode !== "desktop") return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = wrapRef.current;
      if (!el) return;
      const total = el.offsetHeight - window.innerHeight;
      const p = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / Math.max(1, total)));
      setProgress(p);
      if (p >= TRIGGER && !played.current) {
        window.scrollTo({ top: window.scrollY + el.getBoundingClientRect().top + TRIGGER * total, behavior: "instant" as ScrollBehavior });
        start(true);
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [mode, start]);

  // Mobile: short fade of the lines, then video
  useEffect(() => {
    if (mode !== "mobile") return;
    const a = setTimeout(() => setLinesVisible(true), 50);
    const b = setTimeout(() => start(false), 2200);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [mode, start]);

  // Esc skips, focus skip button while playing
  useEffect(() => {
    if (!playing) return;
    skipRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") finish(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, finish]);

  if (mode === "desktop" || mode === "desktop-reduced") return <WindowHero nextId={nextId} reduced={mode === "desktop-reduced"} />;

  const src = mode === "mobile" ? mobileVideo.url : desktopVideo.url;
  const ease = Math.min(1, progress / TRIGGER);
  const shift = 0; // desktop uses WindowHero

  const lines = (
    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center font-heading text-5xl font-bold leading-tight text-cinema-foreground md:text-8xl">
      <span
        className={mode === "mobile" ? `transition-opacity duration-1000 ${linesVisible ? "opacity-100" : "opacity-0"}` : ""}
        style={{ transform: `translate3d(0, ${-shift}vh, 0)`, willChange: "transform" }}
      >{H.line1}</span>
      <span
        className={mode === "mobile" ? `transition-opacity delay-300 duration-1000 ${linesVisible ? "opacity-100" : "opacity-0"}` : ""}
        style={{ transform: `translate3d(0, ${shift}vh, 0)`, willChange: "transform" }}
      >{H.line2}</span>
    </div>
  );

  return (
    <div ref={wrapRef} className={"relative bg-cinema"}>
      <section aria-label={`${H.line1} ${H.line2}`} className={`${playing ? "fixed inset-0 z-40" : "sticky top-0"} h-dvh w-full overflow-hidden bg-cinema`}>
        {mode === "reduced" && !showVideo && (
          <img src={poster.url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        )}
        {(!showVideo || mode === "reduced") && lines}
        {mode !== "pending" && mode !== "reduced" && (
          <video
            ref={videoRef}
            src={src}
            poster={poster.url}
            muted
            playsInline
            preload="auto"
            aria-label={H.videoLabel}
            onEnded={finish}
            onError={() => { if (played.current) finish(); }}
            className={`absolute inset-0 h-full w-full bg-cinema object-cover transition-opacity duration-700 ${showVideo ? "opacity-100" : "opacity-0"}`}
          />
        )}
        {mode === "reduced" && showVideo && (
          <video src={desktopVideo.url} poster={poster.url} controls autoPlay playsInline muted aria-label={H.videoLabel}
            className="absolute inset-0 h-full w-full bg-cinema object-contain" />
        )}
        {mode === "reduced" && !showVideo && (
          <button type="button" onClick={() => setShowVideo(true)}
            className="absolute bottom-10 left-1/2 min-h-11 -translate-x-1/2 rounded-full bg-cinema-foreground px-6 py-3 font-semibold text-cinema">
            {H.watch}
          </button>
        )}
        {playing && (
          <button ref={skipRef} type="button" onClick={finish} aria-label={H.skipLabel}
            className="fixed bottom-6 left-6 z-40 min-h-11 min-w-11 rounded-full border-2 border-cinema-foreground bg-cinema/60 px-6 py-2 text-lg font-semibold text-cinema-foreground focus-visible:outline-4 focus-visible:outline-offset-2">
            {H.skip}
          </button>
        )}
      </section>
    </div>
  );
}
