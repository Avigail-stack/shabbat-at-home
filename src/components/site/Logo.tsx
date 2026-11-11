import { Link } from "@tanstack/react-router";
import { t } from "@/i18n";

export function CandlesMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path d="M11 4c1.6 2 1.6 3.6 0 5-1.6-1.4-1.6-3 0-5z" className="fill-gold stroke-gold-foreground" strokeWidth="0.6" />
      <path d="M21 4c1.6 2 1.6 3.6 0 5-1.6-1.4-1.6-3 0-5z" className="fill-gold stroke-gold-foreground" strokeWidth="0.6" />
      <rect x="9.5" y="11" width="3" height="13" rx="1" className="fill-primary" />
      <rect x="19.5" y="11" width="3" height="13" rx="1" className="fill-primary" />
      <rect x="6" y="24" width="20" height="3" rx="1.5" className="fill-primary" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 text-primary">
      <CandlesMark />
      <span className="font-heading text-2xl font-bold">{t.app.name}</span>
    </Link>
  );
}
