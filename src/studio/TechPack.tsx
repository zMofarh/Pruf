import { useRef, useState } from "react";
import { useI18n } from "@/i18n/context";
import type { PackModel } from "./types";
import type { LabelDesign } from "./label/types";
import type { BoxDesign } from "./box/types";
import { STYLES as BOX_STYLES, BOARDS, FINISHES, DEFAULT_QTY } from "./box/types";
import { CAP_FINISH, GLASS, LIQUID, glassById, finishById, liquidById } from "./materials";
import { ADHESIVES, EFFECTS, ENGRAVE_METHODS, ENGRAVE_POSITIONS, FOILS, LABEL_SET, MATERIALS, PAPERS, cleanProduction } from "./label/types";
import { BOX_EFFECTS, EXTRAS, bottleSpecExtra, bottleSpecSetup, capById, cleanBoxEffects, cleanExtras, decoById, estimateLabel, mouldById, pumpById, weightById, type BottleSpec } from "./spec";
import { estimateBox } from "./box/pricing";
import { buildSpec } from "./box/dielines";
import { useContent } from "@/cms/ContentProvider";
import { SITE } from "@/config/site";

// ورقة المواصفات الفنية (Tech Pack): ما يراه المصنع بالضبط — كل اختيار في الاستوديو على صفحة واحدة
// قابلة للنسخ وللتنزيل PDF (تُرسم كصورة فلا تتأثر بالخطوط العربية في jsPDF).

export interface TechPackInput {
  bottle: PackModel | null;
  cap: PackModel | null;
  glass: string;
  capFinish: string;
  liquid: string;
  spec: BottleSpec;
  label: LabelDesign | null;
  box: BoxDesign | null;
  thumb?: string | null;
}

interface Row {
  k: string;
  v: string;
}
interface Group {
  title: string;
  rows: Row[];
}

export function techPackGroups(i: TechPackInput, pick: (b: { ar: string; en: string }) => string, t: (ar: string, en: string) => string, num: (n: number, d?: number) => string, rates: Parameters<typeof estimateBox>[2], tiers: Parameters<typeof estimateBox>[3]): { groups: Group[]; totals: Row[] } {
  const qty = i.box?.qty ?? DEFAULT_QTY;
  const groups: Group[] = [];
  const mm = (n: number) => `${num(Math.round(n * 10) / 10)} ${t("مم", "mm")}`;
  if (i.bottle) {
    const b = i.bottle;
    groups.push({
      title: t("العبوة", "Bottle"),
      rows: [
        { k: t("الشكل", "Shape"), v: `${pick(b.name)}${b.source === "ai" ? ` (${t("نموذج AI", "AI model")})` : ""}` },
        { k: t("السعة الاسمية", "Nominal capacity"), v: b.capacityMl ? `${num(b.capacityMl)} ${t("مل", "ml")}` : "—" },
        { k: t("الارتفاع الكلي", "Total height"), v: mm(b.heightMm + (i.cap ? i.cap.heightMm - b.neckMm : 0)) },
        { k: t("المقطع", "Section"), v: b.section === "round" ? t("دائري", "Round") : b.section === "square" ? t("مربع", "Square") : t("بيضاوي", "Oval") },
        { k: t("الزجاج", "Glass"), v: `${pick(glassById(i.glass).name)} · ${pick(weightById(i.spec.weight ?? "standard").name)}` },
        { k: t("السائل في المعاينة", "Liquid in preview"), v: pick(liquidById(i.liquid).name) },
        { k: t("القالب", "Mould"), v: `${pick(mouldById(i.spec.mould ?? "catalogue").name)} · ${t("الحد الأدنى", "MOQ")} ${num(mouldById(i.spec.mould ?? "catalogue").moq)}` },
      ],
    });
    groups.push({
      title: t("الإغلاق والزخرفة", "Closure & decoration"),
      rows: [
        { k: t("الغطاء", "Cap"), v: i.cap ? `${pick(i.cap.name)} · ${pick(finishById(i.capFinish).name)}` : t("بدون غطاء", "No cap") },
        { k: t("آلية الغطاء", "Cap mechanism"), v: pick(capById(i.spec.cap).name) },
        { k: t("المضخة", "Pump"), v: pick(pumpById(i.spec.pump).name) },
        { k: t("زخرفة الزجاج", "Glass decoration"), v: pick(decoById(i.spec.deco).name) },
      ],
    });
  }
  if (i.label?.enabled) {
    const l = i.label;
    const p = cleanProduction(l);
    const txt = (id: "brand" | "name" | "details") => l.texts.find((x) => x.id === id);
    const foils = [...l.texts.filter((x) => x.foil !== "none").map((x) => x.foil), ...(l.logo && l.logo.foil !== "none" ? [l.logo.foil] : []), ...(l.border.enabled && l.border.foil !== "none" ? [l.border.foil] : [])];
    groups.push({
      title: t("الملصق الأمامي", "Front label"),
      rows: [
        { k: t("المقاس", "Size"), v: `${num(l.widthMm)} × ${num(l.heightMm)} ${t("مم", "mm")} · ${t("مركزه على ارتفاع", "centred at")} ${mm(l.centerYmm)}` },
        { k: t("الشكل", "Shape"), v: { rect: t("مستطيل", "Rectangle"), rounded: t("بزوايا دائرية", "Rounded"), oval: t("بيضاوي", "Oval"), arch: t("قوس", "Arch") }[l.shape] },
        { k: t("الخامة", "Stock"), v: `${pick(MATERIALS[p.material].name)} · ${l.paper === "custom" ? l.customColor : pick(PAPERS[l.paper].name)} · ${l.finish === "matte" ? t("مطفأ", "Matte") : t("لامع", "Gloss")}` },
        { k: t("النصوص", "Text"), v: [txt("brand")?.text, txt("name")?.text, txt("details")?.text].filter(Boolean).join(" / ") || "—" },
        { k: t("الفويل", "Foil"), v: foils.length ? [...new Set(foils)].map((f) => pick(FOILS[f as keyof typeof FOILS].name)).join("، ") : t("بدون", "None") },
        { k: t("الشعار", "Logo"), v: l.logo ? `${t("مرفق", "Attached")} · ${num(l.logo.widthMm)} ${t("مم", "mm")}` : t("بدون", "None") },
        { k: t("التأثيرات", "Effects"), v: p.effects.length ? p.effects.map((e) => pick(EFFECTS[e].name)).join("، ") : t("بدون", "None") },
        { k: t("اللاصق", "Adhesive"), v: pick(ADHESIVES[p.adhesive].name) },
        { k: t("طقم الملصقات", "Label set"), v: p.set.length ? p.set.map((x) => pick(LABEL_SET[x].name)).join("، ") : t("الأمامي فقط", "Front only") },
        ...(p.engrave.enabled ? [{ k: t("نقش على الزجاج", "Glass engraving"), v: `${pick(ENGRAVE_METHODS[p.engrave.method].name)} · ${pick(ENGRAVE_POSITIONS[p.engrave.position])}${p.engrave.text ? ` «${p.engrave.text}»` : ""}` }] : []),
      ],
    });
  }
  if (i.box) {
    const b = i.box;
    const spec = buildSpec(b);
    const fx = cleanBoxEffects(b.effects);
    const ex = cleanExtras(b.extras);
    groups.push({
      title: t("العلبة", "Box"),
      rows: [
        { k: t("النوع", "Style"), v: pick(BOX_STYLES.find((s) => s.id === b.style)!.name) },
        { k: t("المقاس الداخلي", "Inner size"), v: `${num(b.L)} × ${num(b.W)} × ${num(b.H)} ${t("مم", "mm")}` },
        { k: t("المقاس الخارجي", "Outer size"), v: `${num(Math.round(spec.outer.w))} × ${num(Math.round(spec.outer.d))} × ${num(Math.round(spec.outer.h))} ${t("مم", "mm")}` },
        { k: t("الخامة", "Board"), v: `${b.board === "custom" ? b.customColor : pick(BOARDS[b.board].name)} · ${pick(FINISHES.find((f) => f.id === b.finish)!.name)} · ${t("البطانة", "lining")} ${b.interior}` },
        { k: t("الطباعة", "Print"), v: `${b.brand} / ${b.name} / ${b.details} · ${b.foil === "none" ? t("حبر", "ink") : `${t("فويل", "foil")} ${pick(FOILS[b.foil as keyof typeof FOILS].name)}`}${b.frame ? ` · ${t("إطار", "frame")}` : ""}${b.useLogo ? ` · ${t("شعار", "logo")}` : ""}` },
        { k: t("التأثيرات", "Effects"), v: fx.length ? fx.map((e) => pick(BOX_EFFECTS.find((x) => x.id === e)!.name)).join("، ") : t("بدون", "None") },
        { k: t("الملحقات", "Extras"), v: ex.length ? ex.map((e) => pick(EXTRAS.find((x) => x.id === e)!.name)).join("، ") : t("بدون", "None") },
      ],
    });
  }
  // الإجماليات التقديرية لكل عبوة
  const bottleExtra = bottleSpecExtra(i.spec);
  const bottleSetup = bottleSpecSetup(i.spec);
  const lbl = i.label?.enabled ? estimateLabel(i.label, qty) : null;
  const bx = i.box ? estimateBox(i.box, qty, rates, tiers) : null;
  const sar = (n: number) => `${num(n, 2)} ${t("ر.س", "SAR")}`;
  const perUnit = bottleExtra + (lbl?.unit ?? 0) + (bx?.unit ?? 0);
  const setup = bottleSetup + (lbl?.setupTotal ?? 0) + (bx?.setupTotal ?? 0);
  const totals: Row[] = [
    { k: t("الكمية", "Quantity"), v: num(qty) },
    { k: t("إضافات العبوة لكل وحدة", "Bottle options per unit"), v: sar(bottleExtra) },
    ...(lbl ? [{ k: t("الملصقات لكل وحدة", "Labels per unit"), v: sar(lbl.unit) }] : []),
    ...(bx ? [{ k: t("العلبة وملحقاتها لكل وحدة", "Box & extras per unit"), v: sar(bx.unit) }] : []),
    { k: t("التجهيز لمرة (قوالب وكليشات)", "One-off tooling"), v: sar(setup) },
    { k: t("إجمالي التغليف التقديري لكل وحدة", "Estimated packaging per unit"), v: sar(perUnit) },
  ];
  return { groups, totals };
}

export default function TechPack({ input, onClose }: { input: TechPackInput; onClose: () => void }) {
  const { t, pick, num, date } = useI18n();
  const pricing = useContent("pricing");
  const site = useContent("site");
  const { groups, totals } = techPackGroups(input, pick, t, num, pricing.box, pricing.calc.tiers);
  const sheet = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<"" | "pdf" | "copy">("");
  const [note, setNote] = useState("");
  const ref = `TP-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${(input.bottle?.id ?? "X").slice(0, 6).toUpperCase()}`;

  const asText = () => [`${t("ورقة المواصفات", "Tech pack")} ${ref}`, ...groups.flatMap((g) => [``, `## ${g.title}`, ...g.rows.map((r) => `${r.k}: ${r.v}`)]), ``, `## ${t("التقدير", "Estimate")}`, ...totals.map((r) => `${r.k}: ${r.v}`)].join("\n");

  const copy = async () => {
    setBusy("copy");
    try {
      await navigator.clipboard.writeText(asText());
      setNote(t("نُسخت المواصفات", "Copied"));
    } catch {
      setNote(t("تعذّر النسخ — حدّد النص وانسخه", "Couldn't copy — select the text and copy"));
    } finally {
      setBusy("");
    }
  };

  const pdf = async () => {
    if (!sheet.current) return;
    setBusy("pdf");
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const canvas = await html2canvas(sheet.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
      const w = 190, pageH = 277;
      const h = (canvas.height * w) / canvas.width;
      // صفحات متعددة إن طالت الورقة
      let y = 0;
      while (y < h) {
        if (y > 0) doc.addPage();
        doc.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 10, 10 - y, w, h);
        y += pageH;
      }
      doc.save(`${ref}.pdf`);
      setNote(t("نُزّل ملف PDF", "PDF downloaded"));
    } catch {
      setNote(t("تعذّر إنشاء PDF — انسخ النص بدلاً منه", "Couldn't build the PDF — copy the text instead"));
    } finally {
      setBusy("");
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="tp-title" className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-6" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <button type="button" aria-label={t("إغلاق", "Close")} onClick={onClose} className="absolute inset-0 bg-ink-900/60 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-3xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-paper-50 shadow-2xl panel-in">
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-paper-200 bg-paper-50/95 backdrop-blur px-5 py-3">
          <h2 id="tp-title" className="font-display text-lg text-ink-900 me-auto">{t("ورقة المواصفات الفنية", "Technical spec sheet")}</h2>
          <button type="button" onClick={copy} disabled={busy !== ""} className="rounded-full border border-paper-300 bg-white px-4 py-2 text-sm text-ink-900 inline-flex items-center gap-2 disabled:opacity-50"><i className="ri-file-copy-line" aria-hidden="true"></i>{t("نسخ النص", "Copy text")}</button>
          <button type="button" onClick={pdf} disabled={busy !== ""} className="rounded-full bg-ink-900 text-white px-4 py-2 text-sm inline-flex items-center gap-2 disabled:opacity-50" data-testid="techpack-pdf"><i className="ri-file-pdf-2-line" aria-hidden="true"></i>{busy === "pdf" ? t("جاري التجهيز…", "Preparing…") : t("تنزيل PDF", "Download PDF")}</button>
          <button type="button" onClick={onClose} className="w-9 h-9 rounded-full hover:bg-paper-200 text-ink-900" aria-label={t("إغلاق", "Close")}><i className="ri-close-line text-xl" aria-hidden="true"></i></button>
        </div>
        {note && <p role="status" className="px-5 pt-3 text-xs text-accent3-ink">{note}</p>}
        <div ref={sheet} className="bg-white m-4 sm:m-6 rounded-2xl border border-paper-200 p-6 text-ink-900" data-testid="techpack">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-paper-200 pb-4">
            <div>
              <p className="label-mono">{ref}</p>
              <h3 className="mt-1 font-display text-2xl">{t("مواصفات التغليف", "Packaging specification")}</h3>
              <p className="mt-1 text-sm text-paper-600">{site.billing.legalName || pick(SITE.name)} · {date(new Date(), { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
            {input.thumb && <img src={input.thumb} alt="" className="w-28 h-28 object-contain rounded-xl bg-[#F3F1EC]" />}
          </div>
          <div className="mt-4 grid sm:grid-cols-2 gap-x-8 gap-y-5">
            {groups.map((g) => (
              <section key={g.title}>
                <h4 className="text-sm font-medium text-ink-900 mb-2 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-accent2" aria-hidden="true" />{g.title}</h4>
                <dl className="text-xs divide-y divide-paper-100">
                  {g.rows.map((r) => (
                    <div key={r.k} className="grid grid-cols-[7.5rem_1fr] gap-2 py-1.5">
                      <dt className="text-paper-500">{r.k}</dt>
                      <dd className="text-ink-900 break-words">{r.v}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
          <section className="mt-5 rounded-xl bg-paper-50 border border-paper-200 p-4">
            <h4 className="text-sm font-medium text-ink-900 mb-2">{t("التقدير (قبل الضريبة والشحن)", "Estimate (before VAT and shipping)")}</h4>
            <dl className="text-xs grid sm:grid-cols-2 gap-x-8">
              {totals.map((r, idx) => (
                <div key={r.k} className={`flex justify-between gap-3 py-1.5 border-b border-paper-100 ${idx === totals.length - 1 ? "sm:col-span-2 font-medium text-sm border-0 pt-2" : ""}`}>
                  <dt className="text-paper-600">{r.k}</dt>
                  <dd className="font-mono text-ink-900" dir="ltr">{r.v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-[11px] text-paper-500 leading-[1.6]">{t("الأرقام تقديرية للتخطيط من أسعار المنصة؛ العرض الرسمي بعد مراجعة الملفات والعينة. القوالب والكليشات ملك العميل بعد سدادها.", "Planning figures from platform rates; the formal quote follows file and sample review. Dies and tooling belong to the client once paid.")}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
