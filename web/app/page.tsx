"use client";

import { useEffect } from "react";
import Link from "next/link";
import Lenis from "lenis";
import { ArrowRight, EyeOff, FileText, Home, Landmark, Lock, Wallet, Zap } from "lucide-react";
import { Particles } from "@/components/ui/particles";
import { ZoomParallax } from "@/components/ui/zoom-parallax";
import WarpDriveShader from "@/components/ui/warp-drive-shader";
import { AnimeNavBar } from "@/components/ui/anime-navbar";
import { CipherText } from "@/components/cipher-text";
import { LandingHeader } from "@/components/landing-header";
import { FadeIn } from "@/components/fade-in";
import { SiteFooter } from "@/components/site-footer";
import { StatsStrip } from "@/components/stats-strip";

const navItems = [
  { name: "Home", url: "/", icon: Home },
  { name: "How it works", url: "#how", icon: FileText },
  { name: "Why FHE", url: "#why", icon: Lock },
  { name: "Financing", url: "#composable", icon: Landmark },
  { name: "Launch", url: "/dashboard", icon: Wallet },
];

const parallaxImages = [
  { src: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1280&h=720&fit=crop&auto=format&q=80", alt: "Encrypted circuitry", caption: "euint64" },
  { src: "https://images.unsplash.com/photo-1526628953301-3e589a6a8b74?w=1280&h=720&fit=crop&auto=format&q=80", alt: "Data grid", caption: "ciphertext" },
  { src: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=800&fit=crop&auto=format&q=80", alt: "Network", caption: "on-chain" },
  { src: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1280&h=720&fit=crop&auto=format&q=80", alt: "Encryption", caption: "FHE.select" },
  { src: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&h=800&fit=crop&auto=format&q=80", alt: "Ledger", caption: "cUSDT" },
  { src: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=1280&h=720&fit=crop&auto=format&q=80", alt: "Finance", caption: "settled" },
  { src: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1280&h=720&fit=crop&auto=format&q=80", alt: "Markets", caption: "financed" },
];

export default function Landing() {
  useEffect(() => {
    const lenis = new Lenis();
    // Expose so the nav can smooth-scroll to sections.
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    let raf: number;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
      lenis.destroy();
    };
  }, []);

  return (
    <div className="relative">
      <LandingHeader />
      <AnimeNavBar items={navItems} defaultActive="Home" />

      {/* HERO */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 pb-16 pt-28 text-center sm:pt-32">
        <WarpDriveShader variant="absolute" intensity={0.5} color="#E5B045" />
        <div className="tessellation pointer-events-none absolute inset-0" />
        <Particles className="absolute inset-0" quantity={70} ease={80} color="#F3D9A0" refresh />

        <div className="relative z-10 mx-auto max-w-4xl">
          <span className="chip mx-auto mb-8 inline-flex border-gold/40 text-gold">
            Built on the Zama Protocol · FHEVM
          </span>

          <h1 className="font-display text-5xl font-light leading-[1.05] tracking-tight sm:text-7xl">
            Invoices that the
            <br />
            blockchain <span className="italic text-gold">can’t read.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-base text-paper-dim sm:text-lg">
            Cifra is confidential invoicing with instant financing. Amounts are encrypted
            end-to-end on a public chain, and you can sell an unpaid invoice for cash to a pool
            that funds it without ever seeing the number.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3 text-2xl sm:text-3xl">
            <span className="num text-paper-faint tracking-widest">•••••</span>
            <ArrowRight className="h-5 w-5 text-paper-faint" />
            <CipherText value="$12,400.00" className="text-gold" loop durationMs={1400} />
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/dashboard" className="btn-primary">
              Launch app <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a href="#how" className="btn-ghost">
              How it works
            </a>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-ink" />
      </section>

      {/* LIVE STATS */}
      <StatsStrip />

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-28 px-5 py-28">
        <FadeIn>
          <SectionLabel>How it works</SectionLabel>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-light leading-tight sm:text-4xl">
            Private money that <span className="italic text-gold">flows</span>, not just hides.
          </h2>
        </FadeIn>
        <div className="mt-14 grid gap-px overflow-hidden border border-rule bg-rule sm:grid-cols-3">
          {[
            { n: "01", t: "Issue", d: "Create an invoice with an encrypted amount. The public chain only sees a ciphertext handle, nothing more." },
            { n: "02", t: "Get paid now", d: "Sell the unpaid invoice to the pool. It advances cash computed on encrypted data, gated by on-ciphertext risk rules." },
            { n: "03", t: "Settle", d: "Your client pays in cUSDT. The loan auto-settles to the pool. Every figure stays encrypted end-to-end." },
          ].map((s, i) => (
            <FadeIn key={s.n} delay={i * 0.1} className="bg-ink-2 p-7">
              <div className="num text-xs text-gold">{s.n}</div>
              <div className="mt-3 font-display text-xl">{s.t}</div>
              <p className="mt-2 text-sm text-paper-dim">{s.d}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* PARALLAX SHOWCASE */}
      <section className="relative">
        <FadeIn className="relative z-10 flex h-[45vh] flex-col items-center justify-center px-5 text-center">
          <SectionLabel>Encrypted by design</SectionLabel>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-light leading-tight sm:text-4xl">
            Scroll into the ciphertext.
          </h2>
        </FadeIn>
        <ZoomParallax images={parallaxImages} />
      </section>

      {/* WHY FHE */}
      <section id="why" className="mx-auto max-w-6xl scroll-mt-28 px-5 py-28">
        <FadeIn>
          <SectionLabel>Why FHE</SectionLabel>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-light leading-tight sm:text-4xl">
            The pool funds an invoice it <span className="italic text-gold">cannot read.</span>
          </h2>
        </FadeIn>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {[
            { icon: EyeOff, t: "Nothing leaks", d: "Balances and invoice amounts are euint64 ciphertext. Only you and your counterparty can decrypt them." },
            { icon: Zap, t: "Instant liquidity", d: "Turn net-30 receivables into cash today. A multi-trillion-dollar industry, now private." },
            { icon: Lock, t: "Composable privacy", d: "Money enters, moves, finances, and settles, all encrypted. Not one silo, but a chain of confidential finance." },
          ].map((f, i) => (
            <FadeIn key={f.t} delay={i * 0.1} className="card">
              <f.icon className="h-5 w-5 text-gold" />
              <div className="mt-4 font-display text-xl">{f.t}</div>
              <p className="mt-2 text-sm text-paper-dim">{f.d}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* COMPOSABILITY CTA */}
      <section id="composable" className="relative scroll-mt-28 overflow-hidden border-t border-rule">
        <div className="tessellation pointer-events-none absolute inset-0" />
        <FadeIn className="relative z-10 mx-auto max-w-3xl px-5 py-28 text-center">
          <h2 className="font-display text-4xl font-light leading-tight sm:text-5xl">
            Ship you an invoice.
            <br />
            <span className="italic text-gold">Never show the number.</span>
          </h2>
          <div className="mt-10 flex justify-center">
            <Link href="/dashboard" className="btn-primary">
              Launch Cifra <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </FadeIn>
      </section>

      <SiteFooter />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-gold">{children}</span>
  );
}
