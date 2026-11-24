import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuthUser } from "@/hooks/use-auth-user";
import { buttonVisible, revealedCount } from "@/lib/stack-reveal";
import { t } from "@/i18n";

const L = t.landing;

export function HowItWorksStack({ id }: { id: string }) {
  const steps = L.steps;
  const n = steps.length;
  const wrap = useRef<HTMLElement>(null);
  const [progress, setProgress] = useState(0);
  const [entered, setEntered] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [top, setTop] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const { user } = useAuthUser();
  const navigate = useNavigate();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onScroll = () => {
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const span = el.offsetHeight - window.innerHeight;
      setEntered(r.top < window.innerHeight * 0.6);
      setProgress(span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 1);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);

  const shown = reduced ? n : entered ? revealedCount(progress, n) : 0;
  const done = reduced || buttonVisible(progress, n);

  function start() {
    if (user) return void navigate({ to: "/home" });
    setOpen(true);
  }
  function go(role: "guest" | "host") {
    setOpen(false);
    navigate({ to: "/auth", search: { role } });
  }

  return (
    <section ref={wrap} id={id} aria-labelledby="how-title" className="relative scroll-mt-16"
      style={{ height: reduced ? "auto" : `${n * 100}vh` }}>
      <div className={reduced ? "py-12" : "sticky top-0 flex h-svh flex-col items-center justify-center overflow-hidden py-10"}>
        <h2 id="how-title" className="text-center text-3xl font-bold text-primary md:text-4xl">{L.howTitle}</h2>
        <ol className="relative mx-auto mt-8 w-full max-w-xl [--off:64px] md:[--off:76px]"
          style={{ height: `calc(16rem + ${n - 1} * var(--off))` }}
          onMouseLeave={() => done && setTop(null)}>
          {steps.map((s, i) => {
            const visible = i < shown;
            const z = done && top === i ? 50 : i + 1;
            return (
              <li key={s.title}
                tabIndex={done ? 0 : -1}
                aria-label={`${i + 1}. ${s.title}`}
                onMouseEnter={() => done && setTop(i)}
                onFocus={() => done && setTop(i)}
                onClick={() => done && setTop(top === i ? null : i)}
                className="absolute inset-x-0 rounded-3xl border border-border bg-card p-6 shadow-lg outline-none transition-all duration-500 ease-out focus-visible:ring-4 focus-visible:ring-ring md:p-8"
                style={{
                  top: `calc(${i} * var(--off))`,
                  zIndex: z,
                  opacity: visible ? 1 : 0,
                  transform: visible ? "translateY(0)" : "translateY(60px)",
                  transition: reduced ? "none" : undefined,
                  cursor: done ? "pointer" : "default",
                }}>
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold font-heading text-xl font-bold text-gold-foreground">{i + 1}</span>
                  <h3 className="text-2xl font-bold text-primary md:text-3xl">{s.title}</h3>
                </div>
                <p className="mt-4 min-h-24 text-lg text-muted-foreground">{s.text}</p>
              </li>
            );
          })}
        </ol>
        <div className="mt-8 h-14" style={{ opacity: done ? 1 : 0, transition: reduced ? "none" : "opacity 400ms", pointerEvents: done ? "auto" : "none" }}>
          <Button size="lg" className="min-h-12 px-10 text-lg" onClick={start} tabIndex={done ? 0 : -1} aria-hidden={!done}>{L.start}</Button>
        </div>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-center">{L.start}</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Button size="lg" onClick={() => go("guest")}>{L.chooseGuest}</Button>
            <Button size="lg" variant="gold" onClick={() => go("host")}>{L.chooseHost}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
