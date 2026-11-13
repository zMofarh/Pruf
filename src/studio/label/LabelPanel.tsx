import { useId, useMemo, useState, type ReactNode } from "react";
import { estimateLabel } from "../spec";
import { OptionCard, OptionGroup, Seg, Swatch, Toggle } from "../ui";
import { useI18n } from "@/i18n/context";
import type { PackModel } from "../types";
import { FONTS } from "./fonts";
import { defaultSize, makeTemplate, TEMPLATES, type TemplateId } from "./templates";
import { ADHESIVES, EFFECTS, ENGRAVE_MAX, ENGRAVE_METHODS, ENGRAVE_POSITIONS, FOILS, LABEL_SET, MATERIALS, PAPERS, SHAPES, cleanProduction, type Foil, type FontId, type LabelAdhesive, type LabelDesign, type LabelEffect, type LabelMaterial, type LabelSetItem, type LabelText, type Paper } from "./types";

const chip = (on: boolean) =>
  `rounded-full px-3 py-1.5 text-xs border transition-colors ${on ? "bg-ink-900 text-white border-ink-900" : "bg-white/70 border-paper-200 text-paper-700 hover:border-ink-900"}`;
const input = "w-full bg-white border border-paper-200 focus:border-ink-900 rounded-xl px-3 py-2 text-sm outline-none";

function Range({ label, value, min, max, step = 0.5, unit = "mm", onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  const { num, t } = useI18n();
  const u = unit === "mm" ? t("مم", "mm") : unit;
  return (
    <label className="block">
      <span className="flex justify-between text-[11px] text-paper-500 mb-1">
        <span>{label}</span>
        <span className="font-mono text-ink-900">{num(Math.round(value * 10) / 10)} {u}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={Math.min(max, Math.max(min, value))} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-ink-900" />
    </label>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-2xl bg-white/70 border border-paper-200 p-4 space-y-3">
      <legend className="sr-only">{title}</legend>
      <p className="text-xs text-paper-500" aria-hidden="true">{title}</p>
      {children}
    </fieldset>
  );
}

export function FoilPicker({ value, onChange, label }: { value: Foil; onChange: (f: Foil) => void; label: string }) {
  const { t, pick } = useI18n();
  return (
    <Seg
      small
      label={label}
      value={value}
      onChange={onChange}
      options={[{ id: "none" as Foil, label: t("حبر", "Ink") }, ...(Object.keys(FOILS) as Exclude<Foil, "none">[]).map((f) => ({ id: f as Foil, label: `${t("فويل", "Foil")} ${pick(FOILS[f].name)}`, swatch: FOILS[f].color }))]}
    />
  );
}

/** يقرأ الشعار ويصغّره (أقصى ضلع 800 بكسل) مع الحفاظ على الشفافية */
async function readLogo(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const k = Math.min(1, 800 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * k));
    c.height = Math.max(1, Math.round(img.naturalHeight * k));
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** سعر الملصق بخامته وتأثيراته وطقمه ونقشه — يتحدث مع كل اختيار */
function LabelPrice({ design, qty }: { design: LabelDesign; qty: number }) {
  const { t, pick, num } = useI18n();
  const e = useMemo(() => estimateLabel(design, qty), [design, qty]);
  const money = (n: number) => t(`${num(n, 2)} ر.س`, `SAR ${num(n, 2)}`);
  const id = useId();
  return (
    <section aria-labelledby={`${id}-h`} className="rounded-2xl bg-ink-900 text-white p-5" data-testid="label-price">
      <h3 id={`${id}-h`} className="text-sm text-white/60">{t("السعر التقديري للملصقات لكل عبوة", "Estimated labels per bottle")}</h3>
      <p className="mt-1 font-display text-3xl" dir="ltr" style={{ textAlign: "start" }} aria-live="polite" data-testid="label-unit-price">{money(e.unit)}</p>
      <p className="mt-1 text-xs text-white/60">{t(`الإجمالي ${num(e.total)} ر.س لـ ${num(e.qty)} عبوة${e.setupTotal ? ` · تجهيز لمرة ${num(e.setupTotal)} ر.س` : ""}`, `Total SAR ${num(e.total)} for ${num(e.qty)} bottles${e.setupTotal ? ` · one-off setup SAR ${num(e.setupTotal)}` : ""}`)}</p>
      <details className="mt-3 group">
        <summary className="cursor-pointer text-xs text-white/70 hover:text-white list-none inline-flex items-center gap-1"><i className="ri-arrow-down-s-line group-open:rotate-180 transition-transform" aria-hidden="true"></i>{t("التفاصيل", "Breakdown")}</summary>
        <dl className="mt-2 space-y-1 text-xs" data-testid="label-breakdown">
          {e.variable.map((l) => (
            <div key={l.key} className="flex justify-between gap-3"><dt className="text-white/60">{pick(l.label)}</dt><dd className="font-mono" dir="ltr">{money(l.value)}</dd></div>
          ))}
          {e.setup.map((l) => (
            <div key={l.key} className="flex justify-between gap-3"><dt className="text-white/60">{pick(l.label)} ÷ {num(e.qty)}</dt><dd className="font-mono" dir="ltr">{money(l.value / e.qty)}</dd></div>
          ))}
        </dl>
      </details>
      <p className="mt-3 text-[11px] text-white/45 leading-[1.6]">{t("تقديري قبل الضريبة؛ الكمية من تبويب العلبة. العرض الرسمي بعد مراجعة الملفات.", "Estimate before VAT; quantity from the Box tab. The formal quote follows file review.")}</p>
    </section>
  );
}

export default function LabelPanel({ design, onChange, bottle, onExport, qty = 1000 }: { design: LabelDesign; onChange: (d: LabelDesign) => void; bottle: PackModel; onExport: (kind: "pdf" | "png") => Promise<void>; qty?: number }) {
  const { t, pick } = useI18n();
  const prod = cleanProduction(design);
  const [busy, setBusy] = useState<"" | "pdf" | "png">("");
  const [logoError, setLogoError] = useState("");
  const fit = defaultSize(bottle);
  const zone = fit.zone;
  const maxW = Math.round(Math.min(110, fit.perimeter * 0.9));
  const set = (patch: Partial<LabelDesign>) => onChange({ ...design, ...patch });
  const setText = (id: LabelText["id"], patch: Partial<LabelText>) => onChange({ ...design, texts: design.texts.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const half = design.heightMm / 2;

  const applyTemplate = (id: TemplateId) => {
    // نحتفظ بنصوص العميل عند تبديل القالب
    const brand = design.texts.find((x) => x.id === "brand")?.text;
    const name = design.texts.find((x) => x.id === "name")?.text;
    const next = makeTemplate(id, bottle, brand || undefined, name || undefined);
    onChange({ ...next, logo: design.logo });
  };

  const exportAs = async (kind: "pdf" | "png") => {
    setBusy(kind);
    try {
      await onExport(kind);
    } finally {
      setBusy("");
    }
  };

  const textLabels: Record<LabelText["id"], string> = { brand: t("اسم البراند", "Brand name"), name: t("اسم العطر", "Fragrance name"), details: t("سطر التفاصيل", "Details line") };

  return (
    <div className="space-y-4">
      <LabelPrice design={design} qty={qty} />
      <Section title={t("قالب البداية", "Starting template")}>
        <OptionGroup label={t("قالب البداية", "Starting template")} cols={3}>
          {TEMPLATES.map((x) => (
            <OptionCard key={x.id} compact selected={false} onSelect={() => applyTemplate(x.id)} title={pick(x.name)} />
          ))}
        </OptionGroup>
      </Section>

      <Section title={t("النصوص", "Text")}>
        {design.texts.map((x) => (
          <div key={x.id} className="rounded-xl border border-paper-200 bg-white p-3 space-y-2">
            <label className="block">
              <span className="block text-[11px] text-paper-500 mb-1">{textLabels[x.id]}</span>
              <input value={x.text} onChange={(e) => setText(x.id, { text: e.target.value })} maxLength={40} dir="auto" className={input} />
            </label>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2 items-center">
              <select value={x.font} onChange={(e) => setText(x.id, { font: e.target.value as FontId })} aria-label={`${textLabels[x.id]} — ${t("الخط", "font")}`} className={input}>
                {(Object.keys(FONTS) as FontId[]).map((f) => <option key={f} value={f}>{pick(FONTS[f].name)}</option>)}
              </select>
              <button type="button" onClick={() => setText(x.id, { weight: x.weight === 700 ? 400 : 700 })} aria-pressed={x.weight === 700} className={`${chip(x.weight === 700)} font-bold`} aria-label={t("عريض", "Bold")}>B</button>
              <input type="color" value={x.color} onChange={(e) => setText(x.id, { color: e.target.value })} aria-label={`${textLabels[x.id]} — ${t("اللون", "colour")}`} className="w-9 h-9 rounded-full border border-paper-200 bg-white p-0.5" disabled={x.foil !== "none"} />
            </div>
            <FoilPicker value={x.foil} onChange={(f) => setText(x.id, { foil: f })} label={`${textLabels[x.id]} — ${t("التشطيب", "finish")}`} />
            <div className="grid grid-cols-2 gap-3">
              <Range label={t("الحجم", "Size")} value={x.sizeMm} min={1.5} max={16} step={0.1} onChange={(v) => setText(x.id, { sizeMm: v })} />
              <Range label={t("الموضع", "Position")} value={Math.round(x.y * 100)} min={5} max={95} step={1} unit="%" onChange={(v) => setText(x.id, { y: v / 100 })} />
            </div>
          </div>
        ))}
      </Section>

      <Section title={t("الشعار", "Logo")}>
        {design.logo ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <img src={design.logo.dataUrl} alt={t("الشعار المرفوع", "Uploaded logo")} className="w-14 h-14 object-contain rounded-lg bg-[repeating-conic-gradient(#eee_0_25%,#fff_0_50%)] bg-[length:12px_12px]" />
              <button type="button" onClick={() => set({ logo: null })} className="text-xs text-red-700 underline underline-offset-4">{t("إزالة الشعار", "Remove logo")}</button>
            </div>
            <FoilPicker value={design.logo.foil} onChange={(f) => set({ logo: { ...design.logo!, foil: f } })} label={t("تشطيب الشعار", "Logo finish")} />
            <div className="grid grid-cols-2 gap-3">
              <Range label={t("العرض", "Width")} value={design.logo.widthMm} min={4} max={Math.round(design.widthMm * 0.9)} onChange={(v) => set({ logo: { ...design.logo!, widthMm: v } })} />
              <Range label={t("الموضع", "Position")} value={Math.round(design.logo.y * 100)} min={5} max={95} step={1} unit="%" onChange={(v) => set({ logo: { ...design.logo!, y: v / 100 } })} />
            </div>
          </div>
        ) : (
          <label className="block rounded-xl border-2 border-dashed border-paper-300 hover:border-ink-900 p-4 text-center text-sm text-paper-600 cursor-pointer">
            <input
              type="file"
              accept="image/png,image/svg+xml,image/jpeg,image/webp"
              className="sr-only"
              aria-label={t("رفع الشعار", "Upload logo")}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                if (f.size > 5 * 1024 * 1024) return setLogoError(t("الملف أكبر من 5 ميغابايت.", "File is larger than 5 MB."));
                setLogoError("");
                try {
                  // نفسح مكاناً للشعار في الأعلى: ننقل النصوص إلى النطاق 45–88% مع الحفاظ على ترتيبها
                  const ys = design.texts.map((x) => x.y);
                  const lo = Math.min(...ys), hi = Math.max(...ys);
                  const texts = design.texts.map((x) => ({ ...x, y: hi > lo ? 0.45 + ((x.y - lo) / (hi - lo)) * 0.43 : 0.6 }));
                  onChange({ ...design, texts, logo: { dataUrl: await readLogo(f), widthMm: Math.round(design.widthMm * 0.28), y: 0.2, foil: "none" } });
                } catch {
                  setLogoError(t("تعذّرت قراءة الصورة.", "Couldn't read the image."));
                }
              }}
            />
            <i className="ri-image-add-line me-1" aria-hidden="true"></i>
            {t("ارفع شعارك (PNG شفاف أو SVG يعطي أفضل نتيجة)", "Upload your logo (transparent PNG or SVG works best)")}
          </label>
        )}
        {logoError && <p role="alert" className="text-xs text-red-700">{logoError}</p>}
      </Section>

      <Section title={t("الورق والتشطيب", "Paper & finish")}>
        <div role="radiogroup" aria-label={t("الورق", "Paper")} className="flex flex-wrap gap-1 items-start">
          {(Object.keys(PAPERS) as Exclude<Paper, "custom">[]).map((p) => (
            <Swatch key={p} selected={design.paper === p} onSelect={() => set({ paper: p })} bg={PAPERS[p].swatch} label={pick(PAPERS[p].name)} />
          ))}
          <label className={`opt-swatch cursor-pointer ${design.paper === "custom" ? "is-on" : ""}`}>
            <span className="opt-swatch-chip overflow-hidden grid place-items-center" style={{ background: design.customColor }}>
              <input type="color" value={design.customColor} onChange={(e) => set({ paper: "custom", customColor: e.target.value })} className="w-9 h-9 opacity-0 cursor-pointer" aria-label={t("لون مخصص", "Custom colour")} />
            </span>
            <span className="opt-swatch-label">{t("مخصص", "Custom")}</span>
          </label>
        </div>
        <Seg label={t("التشطيب", "Finish")} value={design.finish} onChange={(finish) => set({ finish })} options={[{ id: "matte" as const, label: t("مطفأ", "Matte") }, { id: "gloss" as const, label: t("لامع", "Gloss") }]} />
        <label className="flex items-center gap-2 text-sm text-ink-900">
          <input type="checkbox" checked={design.border.enabled} onChange={(e) => set({ border: { ...design.border, enabled: e.target.checked } })} className="w-4 h-4 accent-ink-900" />
          {t("إطار داخلي", "Inner frame")}
        </label>
        {design.border.enabled && <FoilPicker value={design.border.foil} onChange={(f) => set({ border: { ...design.border, foil: f } })} label={t("تشطيب الإطار", "Frame finish")} />}
      </Section>

      <Section title={t("خامة الملصق والتأثيرات", "Label stock & effects")}>
        <div data-testid="label-material">
          <OptionGroup label={t("الخامة", "Stock")} cols={2}>
            {(Object.keys(MATERIALS) as LabelMaterial[]).map((m) => (
              <OptionCard key={m} compact selected={prod.material === m} onSelect={() => set({ material: m })} title={pick(MATERIALS[m].name)} note={pick(MATERIALS[m].note)} extra={MATERIALS[m].perUnit} />
            ))}
          </OptionGroup>
        </div>
        <div>
          <p className="text-[11px] text-paper-500 mb-1.5">{t("التأثيرات (تُصنَّع وتُسعَّر؛ لا تظهر في المعاينة ثلاثية الأبعاد)", "Effects (made and priced; not shown in the 3D preview)")}</p>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("التأثيرات", "Effects")} data-testid="label-effects">
            {(Object.keys(EFFECTS) as LabelEffect[]).map((e) => {
              const on = prod.effects.includes(e);
              return <Toggle key={e} selected={on} title={pick(EFFECTS[e].note)} extra={EFFECTS[e].perUnit} onSelect={() => set({ effects: on ? prod.effects.filter((x) => x !== e) : [...prod.effects, e] })}>{pick(EFFECTS[e].name)}</Toggle>;
            })}
          </div>
        </div>
        <div>
          <p className="text-[11px] text-paper-500 mb-1.5">{t("اللاصق", "Adhesive")}</p>
          <Seg label={t("اللاصق", "Adhesive")} value={prod.adhesive} onChange={(adhesive) => set({ adhesive })} options={(Object.keys(ADHESIVES) as LabelAdhesive[]).map((a) => ({ id: a, label: pick(ADHESIVES[a].name), extra: ADHESIVES[a].perUnit }))} />
        </div>
      </Section>

      <Section title={t("طقم الملصقات", "Label set")}>
        <p className="text-[11px] text-paper-500">{t("الملصق الأمامي هو ما تصمّمه هنا؛ أضف ما يُطبع معه بالهوية نفسها.", "The front label is what you design here; add what prints with it in the same identity.")}</p>
        <div data-testid="label-set">
          <OptionGroup label={t("طقم الملصقات", "Label set")} cols={2}>
            {(Object.keys(LABEL_SET) as LabelSetItem[]).map((k) => {
              const on = prod.set.includes(k);
              return <OptionCard key={k} multi compact selected={on} onSelect={() => set({ set: on ? prod.set.filter((x) => x !== k) : [...prod.set, k] })} title={pick(LABEL_SET[k].name)} note={pick(LABEL_SET[k].note)} icon={LABEL_SET[k].icon} extra={LABEL_SET[k].perUnit} />;
            })}
          </OptionGroup>
        </div>
      </Section>

      <Section title={t("نقش على الزجاج", "Glass engraving")}>
        <label className="flex items-center justify-between gap-3 text-sm text-ink-900">
          <span>{t("انقش نصاً أو اسماً على الزجاجة نفسها", "Engrave text or a name on the bottle itself")}</span>
          <input type="checkbox" role="switch" checked={prod.engrave.enabled} onChange={(e) => set({ engrave: { ...prod.engrave, enabled: e.target.checked } })} className="w-5 h-5 accent-ink-900" data-testid="engrave-switch" />
        </label>
        {prod.engrave.enabled && (
          <div className="space-y-3">
            <label className="block">
              <span className="block text-[11px] text-paper-500 mb-1">{t(`النص (حتى ${ENGRAVE_MAX} حرفاً)`, `Text (up to ${ENGRAVE_MAX} characters)`)}</span>
              <input value={prod.engrave.text} maxLength={ENGRAVE_MAX} dir="auto" onChange={(e) => set({ engrave: { ...prod.engrave, text: e.target.value } })} className={input} placeholder={t("مثال: لِسارة · 2026", "e.g. For Sara · 2026")} data-testid="engrave-text" />
            </label>
            <OptionGroup label={t("طريقة النقش", "Method")} cols={3}>
              {(Object.keys(ENGRAVE_METHODS) as (keyof typeof ENGRAVE_METHODS)[]).map((m) => (
                <OptionCard key={m} compact selected={prod.engrave.method === m} onSelect={() => set({ engrave: { ...prod.engrave, method: m } })} title={pick(ENGRAVE_METHODS[m].name)} extra={ENGRAVE_METHODS[m].perUnit} />
              ))}
            </OptionGroup>
            <Seg label={t("موضع النقش", "Position")} value={prod.engrave.position} onChange={(position) => set({ engrave: { ...prod.engrave, position } })} options={(Object.keys(ENGRAVE_POSITIONS) as (keyof typeof ENGRAVE_POSITIONS)[]).map((pos) => ({ id: pos, label: pick(ENGRAVE_POSITIONS[pos]) }))} />
            <p className="text-[11px] text-paper-500 leading-[1.6]">{pick(ENGRAVE_METHODS[prod.engrave.method].note)} · {t("النقش لا يظهر في المعاينة ويُعتمد على عينة فعلية.", "Engraving isn't previewed and is approved on a physical sample.")}</p>
          </div>
        )}
      </Section>

      <Section title={t("الشكل والمقاس", "Shape & size")}>
        <Seg label={t("شكل الملصق", "Label shape")} value={design.shape} onChange={(shape) => set({ shape })} options={SHAPES.map((x) => ({ id: x.id, label: pick(x.name) }))} />
        <div className="grid grid-cols-2 gap-3">
          <Range label={t("العرض", "Width")} value={design.widthMm} min={15} max={maxW} onChange={(v) => set({ widthMm: v })} />
          <Range
            label={t("الارتفاع", "Height")}
            value={design.heightMm}
            min={10}
            max={Math.floor(zone.height)}
            onChange={(v) => set({ heightMm: v, centerYmm: Math.min(zone.top - v / 2, Math.max(zone.bottom + v / 2, design.centerYmm)) })}
          />
        </div>
        <Range label={t("الارتفاع عن القاعدة", "Height from base")} value={design.centerYmm} min={zone.bottom + half} max={Math.max(zone.bottom + half, zone.top - half)} onChange={(v) => set({ centerYmm: v })} />
        <p className="text-[11px] text-paper-500">{t(`المساحة المتاحة على الجسم ${Math.round(zone.height)} مم ارتفاعاً، ومحيطه ${Math.round(fit.perimeter)} مم.`, `Available body area: ${Math.round(zone.height)} mm tall, ${Math.round(fit.perimeter)} mm around.`)}</p>
      </Section>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => exportAs("pdf")} disabled={busy !== ""} className="rounded-full bg-ink-900 text-white px-4 py-2.5 text-sm inline-flex items-center gap-2 disabled:opacity-50">
          <i className="ri-file-pdf-2-line" aria-hidden="true"></i>
          {busy === "pdf" ? t("جاري التجهيز…", "Preparing…") : t("ملف الطباعة PDF", "Print-ready PDF")}
        </button>
        <button type="button" onClick={() => exportAs("png")} disabled={busy !== ""} className="rounded-full border border-paper-300 bg-white px-4 py-2.5 text-sm text-ink-900 inline-flex items-center gap-2 disabled:opacity-50">
          <i className="ri-image-line" aria-hidden="true"></i>
          {t("صورة الملصق PNG", "Label PNG")}
        </button>
      </div>
      <p className="text-[11px] text-paper-500 leading-[1.7]">{t("ملف PDF بالمقاس الحقيقي، بهامش قص 3 مم وعلامات القص، وخط القص في صفحة مستقلة. يراجعه فريقنا قبل الطباعة.", "Real-size PDF with 3 mm bleed and crop marks, and the cut line on its own page. Our team reviews it before printing.")}</p>
    </div>
  );
}
