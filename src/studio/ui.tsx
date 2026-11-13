import type { ReactNode } from "react";
import { useI18n } from "@/i18n/context";

// عناصر الاختيار الموحّدة في الاستوديو: بطاقة خيار، حبّة تبديل، شريط مقسّم، وعيّنة لون.
// قاعدة واحدة: الحالة المختارة تُقرأ من حافة داكنة وشارة صح، لا من اللون وحده؛ والضغط يصغّر العنصر قليلاً.

const price = (n?: number, num?: (n: number, d?: number) => string) => (n && n > 0 ? <span className="opt-price" dir="ltr">+{num ? num(n, 2) : n.toFixed(2)}</span> : null);

export function OptionGroup({ label, children, cols = 2, className = "" }: { label?: string; children: ReactNode; cols?: 1 | 2 | 3 | 4; className?: string }) {
  return (
    <div role="group" aria-label={label} className={`opt-grid opt-grid-${cols} ${className}`}>
      {children}
    </div>
  );
}

/** بطاقة خيار: أيقونة، عنوان، ملاحظة، سعر الإضافة — للاختيار المفرد (radio) أو المتعدد (checkbox) */
export function OptionCard({ selected, onSelect, title, note, icon, extra, multi = false, disabled = false, compact = false, testId }: { selected: boolean; onSelect: () => void; title: ReactNode; note?: ReactNode; icon?: string; extra?: number; multi?: boolean; disabled?: boolean; compact?: boolean; testId?: string }) {
  const { num } = useI18n();
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      data-testid={testId}
      className={`opt-card ${compact ? "opt-card-compact" : ""} ${selected ? "is-on" : ""}`}
    >
      {icon && <span className="opt-icon" aria-hidden="true"><i className={icon}></i></span>}
      <span className="opt-body">
        <span className="opt-title">{title}</span>
        {note && <span className="opt-note">{note}</span>}
      </span>
      {price(extra, num)}
      <span className="opt-check" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-7" /></svg></span>
    </button>
  );
}

/** حبّة تبديل للاختيار المتعدد الخفيف (تأثيرات، وسوم) */
export function Toggle({ selected, onSelect, children, extra, title }: { selected: boolean; onSelect: () => void; children: ReactNode; extra?: number; title?: string }) {
  const { num } = useI18n();
  return (
    <button type="button" role="checkbox" aria-checked={selected} title={title} onClick={onSelect} className={`opt-pill ${selected ? "is-on" : ""}`}>
      <span className="opt-pill-check" aria-hidden="true"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6-7" /></svg></span>
      {children}
      {price(extra, num)}
    </button>
  );
}

/** شريط مقسّم للاختيار المفرد من 2 – 5 خيارات قصيرة */
export function Seg<T extends string>({ value, onChange, options, label, small = false }: { value: T; onChange: (v: T) => void; options: { id: T; label: ReactNode; swatch?: string; extra?: number }[]; label: string; small?: boolean }) {
  const { num } = useI18n();
  return (
    <div role="radiogroup" aria-label={label} className={`opt-seg ${small ? "opt-seg-sm" : ""}`}>
      {options.map((o) => (
        <button key={o.id} type="button" role="radio" aria-checked={value === o.id} onClick={() => onChange(o.id)} className={`opt-seg-item ${value === o.id ? "is-on" : ""}`}>
          {o.swatch && <span className="opt-swatch-dot" style={{ background: o.swatch }} aria-hidden="true" />}
          {o.label}
          {price(o.extra, num)}
        </button>
      ))}
    </div>
  );
}

/** عيّنة لون/خامة دائرية بحلقة عند الاختيار */
export function Swatch({ selected, onSelect, bg, label }: { selected: boolean; onSelect: () => void; bg: string; label: string }) {
  return (
    <button type="button" role="radio" aria-checked={selected} title={label} onClick={onSelect} className={`opt-swatch ${selected ? "is-on" : ""}`}>
      <span className="opt-swatch-chip" style={{ background: bg }} aria-hidden="true" />
      <span className="opt-swatch-label">{label}</span>
    </button>
  );
}

/** عنوان قسم داخل اللوحة مع رقم خطوة اختياري وملاحظة */
export function Step({ n, title, note }: { n?: number | string; title: string; note?: string }) {
  return (
    <div className="opt-step">
      {n !== undefined && <span className="opt-step-n">{n}</span>}
      <span className="opt-step-t">{title}</span>
      {note && <span className="opt-step-note">{note}</span>}
    </div>
  );
}
