import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import ContactSection from './ContactSection';
import MapSection from './MapSection';
import Footer from './Footer';

export default function ContactUsPage() {
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative bg-reon-greenDark min-h-screen text-reon-cream">
      <div className="grain-overlay" />

      {/* ── HERO ── */}
      <section className="relative w-full min-h-[70vh] flex items-end pb-24 px-8 lg:px-24 overflow-hidden border-b border-white/8">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(245,245,220,1) 1px,transparent 1px),linear-gradient(90deg,rgba(245,245,220,1) 1px,transparent 1px)', backgroundSize: '80px 80px' }}
        />

        {/* Large background text */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 font-display font-black text-white/[0.03] select-none pointer-events-none leading-none"
          style={{ fontSize: 'clamp(6rem, 15vw, 15rem)' }}
        >
          CONTACT
        </div>

        <div className="relative z-10 max-w-5xl">
          <div
            className="transition-all duration-1000"
            style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(40px)' }}
          >
            <p className="text-reon-red text-xs uppercase tracking-[0.25em] font-semibold mb-6 flex items-center gap-3">
              <span className="inline-block w-8 h-px bg-reon-red" />
              Get In Touch
            </p>
            <h1
              className="headline-xl text-reon-cream mb-8 leading-tight"
              style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)' }}
            >
              LET'S START <span className="text-reon-red">BUILDING</span><br />
              TOGETHER.
            </h1>
            <p className="text-reon-gray text-lg leading-loose max-w-3xl">
              Whether you're looking for an exclusive property or want to discuss a potential partnership, we're here to help you navigate the luxury real estate market.
            </p>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20 animate-bounce">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      </section>

      {/* ── CONTACT SECTION ── */}
      <ContactSection />

      {/* ── MAP SECTION ── */}
      <MapSection />

      {/* ── FOOTER ── */}
      <Footer />
    </div>
  );
}
