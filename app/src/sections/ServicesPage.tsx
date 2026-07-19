import { useEffect, useState } from 'react';
import { ChevronDown, ArrowRight, Handshake, TrendingUp, Layers } from 'lucide-react';
import GallerySection from './GallerySection';
import Footer from './Footer';

const servicesList = [
  {
    title: 'Developer Partnerships',
    description: 'Building long-term partnerships through mandates, strategic collaborations, and growth-focused business solutions.',
    icon: Handshake,
  },
  {
    title: 'Sales Acceleration',
    description: 'Driving qualified leads, managing channel partners, executing marketing campaigns, and converting opportunities into sales.',
    icon: TrendingUp,
  },
  {
    title: 'Complete Project Ecosystem',
    description: 'One partner for every stage of development — from concept and approvals to marketing, sales, and handover.',
    icon: Layers,
  },
];

export default function ServicesPage() {
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
      <section className="relative w-full min-h-[90vh] flex items-end pb-24 px-8 lg:px-24 overflow-hidden border-b border-white/8">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(245,245,220,1) 1px,transparent 1px),linear-gradient(90deg,rgba(245,245,220,1) 1px,transparent 1px)', backgroundSize: '80px 80px' }}
        />

        {/* Large background text */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 font-display font-black text-white/[0.03] select-none pointer-events-none leading-none"
          style={{ fontSize: 'clamp(6rem, 15vw, 15rem)' }}
        >
          SERVICES
        </div>

        <div className="relative z-10 max-w-5xl">
          <div
            className="transition-all duration-1000"
            style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(40px)' }}
          >
            <p className="text-reon-red text-xs uppercase tracking-[0.25em] font-semibold mb-6 flex items-center gap-3">
              <span className="inline-block w-8 h-px bg-reon-red" />
              What We Do
            </p>
            <h1
              className="headline-xl text-reon-cream mb-8 leading-tight"
              style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)' }}
            >
              ONE PARTNER.<br />
              <span className="text-reon-red">EVERY REAL ESTATE</span><br />
              SOLUTION.
            </h1>
            <p className="text-reon-gray text-lg leading-loose max-w-3xl">
              Our goal is to provide real estate developers with a <span className="text-reon-cream font-medium">systematic and organized solution.</span> We simplify partnerships, business proposals, and mandate proposals — while delivering a <span className="text-reon-red font-semibold">complete, project-based solution</span> under one roof.
            </p>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20 animate-bounce">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      </section>

      {/* ── SERVICES LIST ── */}
      <section className="px-8 lg:px-24 py-32 border-b border-white/8 relative">
        <div className="max-w-7xl mx-auto">
            <div className="mb-20">
                <p className="text-reon-red text-xs uppercase tracking-[0.25em] font-semibold flex items-center gap-3 mb-6">
                  <span className="inline-block w-8 h-px bg-reon-red" />
                  Our Expertise
                </p>
                <h2 className="headline-lg text-4xl lg:text-5xl leading-tight">
                    Our goal is to provide real estate developers with a <span className="text-reon-red italic">systematic &amp; organized solution.</span>
                </h2>
                <p className="text-reon-gray text-lg leading-loose max-w-3xl mt-6">
                    We simplify partnerships, business proposals, and mandate proposals — while delivering a <span className="text-reon-cream font-medium">complete, project-based solution</span> under one roof.
                </p>
                <p className="text-reon-cream/70 text-base italic mt-4 border-l-2 border-reon-red pl-4">
                    Smart planning. Clear strategy. Strong execution. We help developers position every project for maximum market success.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-14">
                {servicesList.map((service, index) => (
                    <div key={index} className="group p-8 rounded-3xl border border-white/10 bg-reon-green/50 hover:bg-reon-green transition-colors duration-500">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-reon-red/10 transition-all duration-500">
                            <service.icon className="w-8 h-8 text-reon-cream group-hover:text-reon-red transition-colors" />
                        </div>
                        <h3 className="font-display font-black text-2xl text-reon-cream mb-4">{service.title}</h3>
                        <p className="text-reon-gray text-sm leading-loose">
                            {service.description}
                        </p>
                    </div>
                ))}
            </div>
            
            <div className="mt-20 flex justify-center">
                <button 
                  onClick={() => window.open('https://wa.me/918591944460', '_blank')}
                  className="btn-accent flex items-center gap-3 px-8 py-4"
                >
                    Get in Touch <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>
      </section>

      {/* ── GALLERY ── */}
      <div className="border-b border-white/8">
        <GallerySection />
      </div>

      {/* ── FOOTER ── */}
      <Footer />
    </div>
  );
}
