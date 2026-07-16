import { useEffect, useState } from 'react';
import { ChevronDown, ArrowRight } from 'lucide-react';
import Footer from './Footer';

const leadership = [
  {
    name: 'Vikram Ahuja',
    role: 'Founder & Managing Partner',
    bio: 'With over two decades in luxury real estate, Vikram pioneers the mandate-only model in India, bringing a design-first philosophy to property curation.',
    image: '/gallery_apartment.jpg'
  },
  {
    name: 'Natasha Singhal',
    role: 'Head of Creative & Design',
    bio: 'An architect turned curator, Natasha ensures every RE-ON property is presented not just as space, but as an experience in living.',
    image: '/gallery_studio.jpg'
  }
];

export default function AboutUsPage() {
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
          style={{ fontSize: 'clamp(8rem, 20vw, 18rem)' }}
        >
          ABOUT
        </div>

        <div className="relative z-10 max-w-5xl">
          <div
            className="transition-all duration-1000"
            style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(40px)' }}
          >
            <p className="text-reon-red text-xs uppercase tracking-[0.25em] font-semibold mb-6 flex items-center gap-3">
              <span className="inline-block w-8 h-px bg-reon-red" />
              The RE-ON Story
            </p>
            <h1
              className="headline-xl text-reon-cream mb-8 leading-tight"
              style={{ fontSize: 'clamp(3rem, 7vw, 5.5rem)' }}
            >
              WE REDEFINE <span className="text-reon-red">LUXURY</span><br />
              THROUGH DESIGN & CURATION.
            </h1>
            <p className="text-reon-gray text-lg leading-loose max-w-3xl">
              RE-ON is not a traditional brokerage. We are a boutique real estate advisory firm built on a foundation of exclusivity, design appreciation, and uncompromised quality. We partner only with developers and clients who share our vision for extraordinary living spaces.
            </p>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20 animate-bounce">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      </section>

      {/* ── OUR VISION ── */}
      <section className="px-8 lg:px-24 py-32 border-b border-white/8 relative">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 items-center">
            
            <div className="lg:w-1/2 space-y-8">
                <p className="text-reon-red text-xs uppercase tracking-[0.25em] font-semibold flex items-center gap-3">
                  <span className="inline-block w-8 h-px bg-reon-red" />
                  Our Philosophy
                </p>
                <h2 className="headline-lg text-4xl lg:text-5xl leading-tight">
                    Beyond Transactions. <br/> <span className="text-reon-red italic">Building Legacies.</span>
                </h2>
                <div className="space-y-6 text-reon-gray leading-loose text-sm md:text-base">
                    <p>
                        The Indian luxury real estate market is often cluttered with noise. We started RE-ON to provide clarity. We believe that truly great properties require a different approach to representation—one that treats real estate not as a high-volume commodity, but as a carefully curated art form.
                    </p>
                    <p>
                        Our mandate-only model means we are fundamentally aligned with our clients. We only represent a handful of exceptional projects at any given time, allowing us to dedicate our full creative and strategic resources to positioning them correctly in the market and ensuring they reach the right discerning buyers.
                    </p>
                </div>
                
                <button className="btn-accent mt-4 flex items-center gap-3 px-8 py-4">
                    Explore Our Services <ArrowRight className="w-5 h-5" />
                </button>
            </div>

            <div className="lg:w-1/2 w-full h-[600px] relative rounded-3xl overflow-hidden shadow-2xl">
                 <img 
                    src="/design_philosophy_pool.jpg" 
                    alt="Design Philosophy" 
                    className="w-full h-full object-cover scale-105 hover:scale-100 transition-transform duration-1000 ease-out" 
                 />
                 <div className="absolute inset-0 bg-gradient-to-t from-reon-greenDark/80 via-transparent to-transparent pointer-events-none" />
                 
                 <div className="absolute bottom-10 left-10 right-10">
                    <div className="backdrop-blur-md bg-white/5 border border-white/10 p-6 rounded-2xl">
                        <p className="text-xl font-display font-bold text-white mb-2">"True luxury is when functionality meets timeless design."</p>
                        <p className="text-xs uppercase tracking-widest text-reon-gray">- The RE-ON Ethos</p>
                    </div>
                 </div>
            </div>
        </div>
      </section>

      {/* ── LEADERSHIP ── */}
      <section className="px-8 lg:px-24 py-32 bg-reon-green/30 border-b border-white/8">
        <div className="max-w-7xl mx-auto">
            <div className="mb-20">
                <p className="text-reon-red text-xs uppercase tracking-[0.25em] font-semibold flex items-center gap-3 mb-6">
                  <span className="inline-block w-8 h-px bg-reon-red" />
                  The People Behind RE-ON
                </p>
                <h2 className="headline-lg text-4xl lg:text-6xl">
                    LEADERSHIP
                </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
                {leadership.map((leader) => (
                    <div key={leader.name} className="group cursor-pointer">
                        <div className="w-full h-[500px] rounded-3xl overflow-hidden mb-8 relative border border-white/10">
                            <img 
                                src={leader.image} 
                                alt={leader.name} 
                                className="w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700 ease-in-out" 
                            />
                            <div className="absolute inset-0 bg-reon-greenDark/40 group-hover:bg-transparent transition-colors duration-700" />
                        </div>
                        <h3 className="font-display font-black text-3xl text-reon-cream mb-2 group-hover:text-white transition-colors">{leader.name}</h3>
                        <p className="text-reon-red text-xs uppercase tracking-widest font-semibold mb-6">{leader.role}</p>
                        <p className="text-reon-gray text-sm leading-loose max-w-md">
                            {leader.bio}
                        </p>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <Footer />
    </div>
  );
}
