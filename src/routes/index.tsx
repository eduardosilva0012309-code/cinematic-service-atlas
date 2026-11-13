import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect, useRef, type MouseEvent } from "react";
import { getVitrine, type Service, type WithImage } from "@/lib/vitrine.functions";

const Scene3D = lazy(() => import("@/components/Scene3D"));

export const vitrineQuery = queryOptions({ queryKey: ["vitrine"], queryFn: () => getVitrine() });

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(vitrineQuery),
  head: () => ({
    meta: [
      { title: "Rost — Vitrine de serviços" },
      { name: "description", content: "Branding, sites, tráfego e audiovisual com estética cinematográfica. Conheça os serviços da Rost." },
      { property: "og:title", content: "Rost — Vitrine de serviços" },
      { property: "og:description", content: "Serviços criativos com estética cinematográfica." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.setAttribute("data-visible", "true")),
      { threshold: 0.15 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
}

function Index() {
  const { data } = useSuspenseQuery(vitrineQuery);
  const { settings: s, services } = data;
  useReveal();
  const words = s.hero_title.split(" ");

  return (
    <div className="grain relative min-h-screen overflow-x-hidden">
      <ClientOnly fallback={null}>
        <Suspense fallback={null}>
          <Scene3D />
        </Suspense>
      </ClientOnly>
      <div className="vignette pointer-events-none fixed inset-0 -z-[5]" />

      <header className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-6 md:px-12">
        <span className="font-display text-3xl tracking-[0.3em] text-gold-gradient uppercase">{s.brand}</span>
        <a href={s.cta_link} target="_blank" rel="noreferrer" className="glass rounded-full border px-5 py-2 text-xs tracking-[0.25em] uppercase text-champagne transition hover:border-gold hover:shadow-gold">
          {s.cta_label}
        </a>
      </header>

      <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
        {s.image_src && (
          <img src={s.image_src} alt="" className="animate-kenburns absolute inset-0 -z-10 h-full w-full object-cover opacity-25" />
        )}
        <p className="animate-rise mb-8 text-xs tracking-[0.5em] uppercase text-gold">{s.hero_kicker}</p>
        <h1 className="font-display max-w-5xl text-5xl leading-[0.95] font-medium md:text-8xl">
          {words.map((w, i) => (
            <span key={i} className={`animate-rise inline-block pr-[0.25em] ${i >= words.length - 2 ? "italic text-gold-gradient" : ""}`} style={{ animationDelay: `${0.2 + i * 0.12}s` }}>
              {w}
            </span>
          ))}
        </h1>
        <p className="animate-rise mt-8 max-w-xl text-base text-muted-foreground md:text-lg" style={{ animationDelay: "1.2s" }}>
          {s.hero_subtitle}
        </p>
        <a href="#servicos" className="animate-rise mt-14 flex flex-col items-center gap-3 text-[10px] tracking-[0.4em] uppercase text-muted-foreground" style={{ animationDelay: "1.6s" }}>
          Explore
          <span className="h-16 w-px bg-gold-gradient" />
        </a>
      </section>

      <div className="glass overflow-hidden border-y py-5">
        <div className="animate-marquee flex w-max gap-12 whitespace-nowrap font-display text-3xl italic text-champagne/70">
          {[...services, ...services, ...services, ...services].map((x, i) => (
            <span key={i} className="flex items-center gap-12">{x.title}<span className="text-gold">✦</span></span>
          ))}
        </div>
      </div>

      <section id="servicos" className="mx-auto max-w-7xl px-6 py-32 md:px-12">
        <div data-reveal className="reveal mb-20 text-center">
          <p className="mb-4 text-xs tracking-[0.5em] uppercase text-gold">Serviços</p>
          <h2 className="font-display text-4xl md:text-6xl">O que criamos para <span className="italic text-gold-gradient">você</span></h2>
        </div>
        <div className="flex flex-col gap-28">
          {services.map((sv, i) => <ServiceCard key={sv.id} sv={sv} i={i} />)}
        </div>
      </section>

      <section data-reveal className="reveal flex flex-col items-center px-6 pb-32 text-center">
        <h2 className="font-display max-w-3xl text-4xl md:text-7xl">Pronto para ser <span className="italic text-gold-gradient">inesquecível?</span></h2>
        <a href={s.cta_link} target="_blank" rel="noreferrer" className="bg-gold-gradient shadow-gold mt-12 rounded-full px-10 py-4 text-sm font-semibold tracking-[0.25em] uppercase text-primary-foreground transition hover:scale-105">
          {s.cta_label}
        </a>
        {s.instagram_link && (
          <a href={s.instagram_link} target="_blank" rel="noreferrer" className="mt-6 text-xs tracking-[0.3em] uppercase text-muted-foreground hover:text-gold">Instagram</a>
        )}
      </section>

      <footer className="border-t px-6 py-8 text-center text-xs tracking-widest text-muted-foreground">{s.footer_text}</footer>
    </div>
  );
}

function ServiceCard({ sv, i }: { sv: WithImage<Service>; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1200px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
    el.style.setProperty("--mx", `${(x + 0.5) * 100}%`);
    el.style.setProperty("--my", `${(y + 0.5) * 100}%`);
  };
  const reset = () => { if (ref.current) ref.current.style.transform = ""; };
  const flip = i % 2 === 1;

  return (
    <article data-reveal className={`reveal grid items-center gap-10 md:grid-cols-2 md:gap-16`}>
      <div className={flip ? "md:order-2" : ""}>
        <div ref={ref} onMouseMove={onMove} onMouseLeave={reset} className="group relative aspect-[4/5] overflow-hidden rounded-2xl border shadow-gold transition-transform duration-300 ease-out will-change-transform">
          {sv.image_src ? (
            <img src={sv.image_src} alt={sv.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-[2s] group-hover:scale-110" />
          ) : (
            <div className="glass flex h-full w-full items-center justify-center">
              <span className="font-display text-[10rem] italic text-gold-gradient">{String(i + 1).padStart(2, "0")}</span>
            </div>
          )}
          <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" style={{ background: "radial-gradient(circle at var(--mx) var(--my), color-mix(in oklab, var(--gold) 35%, transparent), transparent 45%)" }} />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        </div>
      </div>
      <div className={flip ? "md:order-1 md:text-right" : ""}>
        <span className="font-display text-xl italic text-gold">{String(i + 1).padStart(2, "0")} — {sv.tagline}</span>
        <h3 className="font-display mt-3 text-5xl md:text-7xl">{sv.title}</h3>
        <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{sv.description}</p>
        <a href={sv.button_link} target="_blank" rel="noreferrer" className="glass mt-10 inline-flex items-center gap-3 rounded-full border border-gold/40 px-8 py-4 text-xs font-semibold tracking-[0.25em] uppercase text-champagne transition hover:bg-gold hover:text-primary-foreground hover:shadow-gold">
          {sv.button_label} <span aria-hidden>→</span>
        </a>
      </div>
    </article>
  );
}
