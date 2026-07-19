import { useEffect, useRef, useState } from 'react';
import { MapPin, Clock, ArrowUpRight, X, Send, ChevronDown } from 'lucide-react';

/* ─── DATA ─────────────────────────────────────────────────── */
const openings = [
  {
    id: 1,
    role: 'Senior Real Estate Advisor',
    dept: 'Sales & Advisory',
    location: 'Bengaluru',
    type: 'Full-Time',
    desc: 'Lead client relationships and property mandates for ultra-premium residential projects across Bengaluru. You will work directly with developers and HNI buyers to close complex transactions.',
    requirements: [
      '5+ years in luxury real estate advisory',
      'Existing HNI client network',
      'Excellent communication and negotiation skills',
      'Experience with mandated sales models preferred',
    ],
  },
  {
    id: 2,
    role: 'Design & Marketing Lead',
    dept: 'Brand & Creative',
    location: 'Mumbai',
    type: 'Full-Time',
    desc: 'Own the visual identity and content strategy of RE-ON. From property decks to digital campaigns, you will craft brand experiences that reflect our ethos of design-first real estate.',
    requirements: [
      '4+ years in luxury brand or hospitality marketing',
      'Strong portfolio in visual storytelling',
      'Proficiency in Adobe Creative Suite & Figma',
      'Experience with real estate or architecture brands is a plus',
    ],
  },
  {
    id: 3,
    role: 'Property Research Analyst',
    dept: 'Intelligence & Insights',
    location: 'Hyderabad',
    type: 'Full-Time',
    desc: 'Drive market intelligence across our active geographies. You will produce deep-dive reports on micro-markets, pricing trends, and demand dynamics to inform our advisory and mandate decisions.',
    requirements: [
      '2+ years in real estate research or financial analysis',
      'Strong Excel, data modelling and presentation skills',
      'Understanding of Indian residential property markets',
      'MBA or relevant degree preferred',
    ],
  },
  {
    id: 4,
    role: 'Client Experience Associate',
    dept: 'Operations',
    location: 'Bengaluru',
    type: 'Full-Time',
    desc: 'Deliver white-glove service across the client journey — from first inquiry to closing. You will coordinate site visits, manage documentation, and ensure every touchpoint feels premium.',
    requirements: [
      '2+ years in client servicing or luxury hospitality',
      'Highly organised with strong attention to detail',
      'Fluent in English and at least one regional language',
      'Proficiency in CRM tools',
    ],
  },
];

const values = [
  {
    icon: '✦',
    title: 'Mandate-Only',
    body: 'We only work on what we believe in. This keeps our team focused, our advice unbiased, and our results exceptional.',
  },
  {
    icon: '◈',
    title: 'Design-First',
    body: 'From decks to site visits, everything we do reflects an obsession with craft, beauty, and the details that matter.',
  },
  {
    icon: '⬡',
    title: 'Radical Ownership',
    body: 'Every team member owns their domain completely. No hand-holding, no micromanagement — just trust and outcomes.',
  },
  {
    icon: '◇',
    title: 'Always Learning',
    body: 'Markets shift. Tastes evolve. We invest in our people\'s growth because sharp minds build better deals.',
  },
];

/* ─── APPLICATION MODAL ────────────────────────────────────── */
function ApplyModal({ job, onClose }: { job: typeof openings[0]; onClose: () => void }) {
  const [sent, setSent] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center p-4 lg:p-8"
      style={{ animation: 'backdropIn 0.3s ease forwards' }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" />
      <div
        className="relative z-10 w-full max-w-2xl rounded-3xl overflow-hidden bg-reon-greenDark border border-white/8 shadow-[0_60px_120px_rgba(0,0,0,0.8)]"
        style={{ animation: 'popupIn 0.45s cubic-bezier(0.22,1,0.36,1) forwards' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative px-8 pt-8 pb-6 border-b border-white/8">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/50 hover:bg-reon-red hover:border-reon-red hover:text-white transition-all duration-200 group"
          >
            <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
          </button>
          <p className="text-reon-red text-xs uppercase tracking-widest font-semibold mb-2">{job.dept}</p>
          <h3 className="font-display font-black text-reon-cream text-2xl">{job.role}</h3>
          <div className="flex items-center gap-4 mt-3 text-reon-gray text-xs uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-reon-red" />{job.location}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" />{job.type}</span>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          {sent ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-reon-red/20 border border-reon-red/40 flex items-center justify-center mx-auto mb-5">
                <Send className="w-7 h-7 text-reon-red" />
              </div>
              <h4 className="font-display font-bold text-reon-cream text-xl mb-3">Application Submitted</h4>
              <p className="text-reon-gray text-sm leading-relaxed max-w-sm mx-auto">
                Thank you for your interest. Our team will review your profile and be in touch within 5–7 business days.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-reon-gray text-xs uppercase tracking-widest mb-2">Full Name *</label>
                  <input required placeholder="Arjun Sharma" className="w-full" />
                </div>
                <div>
                  <label className="block text-reon-gray text-xs uppercase tracking-widest mb-2">Email *</label>
                  <input required type="email" placeholder="arjun@example.com" className="w-full" />
                </div>
              </div>
              <div>
                <label className="block text-reon-gray text-xs uppercase tracking-widest mb-2">Phone</label>
                <input placeholder="+91 85919-44460" className="w-full" />
              </div>
              <div>
                <label className="block text-reon-gray text-xs uppercase tracking-widest mb-2">LinkedIn / Portfolio URL</label>
                <input placeholder="https://linkedin.com/in/yourname" className="w-full" />
              </div>
              <div>
                <label className="block text-reon-gray text-xs uppercase tracking-widest mb-2">Why RE-ON? *</label>
                <textarea required rows={4} placeholder="Tell us what draws you to this role and to RE-ON..." className="w-full resize-none" />
              </div>
              <button type="submit" className="btn-accent w-full flex items-center justify-center gap-2 py-4 mt-2">
                <Send className="w-4 h-4" />
                Submit Application
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── JOB CARD ─────────────────────────────────────────────── */
function JobCard({ job, index, onApply }: { job: typeof openings[0]; index: number; onApply: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="border border-white/8 rounded-2xl overflow-hidden transition-all duration-700"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(40px)',
        transitionDelay: `${index * 120}ms`,
      }}
    >
      {/* Card Header */}
      <button
        className="w-full text-left px-8 py-6 flex items-center justify-between gap-4 group hover:bg-white/[0.03] transition-colors duration-200"
        onClick={() => setOpen(!open)}
      >
        <div className="flex-1">
          <p className="text-reon-red text-xs uppercase tracking-widest font-semibold mb-2">{job.dept}</p>
          <h3 className="font-display font-bold text-reon-cream text-xl mb-3 group-hover:text-white transition-colors">{job.role}</h3>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-reon-gray text-xs uppercase tracking-wider">
              <MapPin className="w-3 h-3 text-reon-red" />{job.location}
            </span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span className="flex items-center gap-1.5 text-reon-gray text-xs uppercase tracking-wider">
              <Clock className="w-3 h-3" />{job.type}
            </span>
          </div>
        </div>
        <div className={`w-10 h-10 rounded-full border border-white/10 flex items-center justify-center flex-shrink-0 text-white/40 transition-all duration-300 ${open ? 'bg-reon-red border-reon-red text-white rotate-180' : 'group-hover:border-white/30 group-hover:text-white'}`}>
          <ChevronDown className="w-5 h-5" />
        </div>
      </button>

      {/* Expandable details */}
      <div
        className="overflow-hidden transition-all duration-500 ease-in-out"
        style={{ maxHeight: open ? '600px' : '0px' }}
      >
        <div className="px-8 pb-8 border-t border-white/8 pt-6">
          <p className="text-reon-gray text-sm leading-loose mb-6">{job.desc}</p>
          <div className="mb-8">
            <p className="text-reon-cream text-xs uppercase tracking-widest font-semibold mb-4">What We're Looking For</p>
            <ul className="space-y-2.5">
              {job.requirements.map((req, i) => (
                <li key={i} className="flex items-start gap-3 text-reon-gray text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-reon-red flex-shrink-0 mt-2" />
                  {req}
                </li>
              ))}
            </ul>
          </div>
          <button
            onClick={() => window.open('https://wa.me/918591944460', '_blank')}
            className="btn-accent flex items-center gap-2 px-8 py-3.5"
          >
            Apply for This Role
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ─────────────────────────────────────────────── */
export default function CareerPage() {
  const [applyJob, setApplyJob] = useState<typeof openings[0] | null>(null);
  const [heroVisible, setHeroVisible] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const t = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative bg-reon-greenDark min-h-screen">
      <div className="grain-overlay" />

      {/* ── HERO ── */}
      <section className="relative w-full min-h-[90vh] flex items-end pb-24 px-8 lg:px-24 overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(245,245,220,1) 1px,transparent 1px),linear-gradient(90deg,rgba(245,245,220,1) 1px,transparent 1px)', backgroundSize: '80px 80px' }}
        />

        {/* Large background text */}
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 font-display font-black text-white/[0.03] select-none pointer-events-none leading-none"
          style={{ fontSize: 'clamp(8rem, 20vw, 18rem)' }}
        >
          CAREERS
        </div>

        <div className="relative z-10 max-w-5xl">
          <div
            className="transition-all duration-1000"
            style={{ opacity: heroVisible ? 1 : 0, transform: heroVisible ? 'translateY(0)' : 'translateY(40px)' }}
          >
            <p className="text-reon-red text-xs uppercase tracking-[0.25em] font-semibold mb-6 flex items-center gap-3">
              <span className="inline-block w-8 h-px bg-reon-red" />
              Join RE-ON
            </p>
            <h1
              className="headline-xl text-reon-cream mb-8"
              style={{ fontSize: 'clamp(3rem, 8vw, 6.5rem)' }}
            >
              BUILD THE FUTURE<br />
              <span className="text-reon-red">OF REAL ESTATE.</span>
            </h1>
            <p className="text-reon-gray text-lg leading-loose max-w-2xl">
              We are a boutique real estate studio obsessed with design, mandates, and delivering outcomes that matter. 
              If you are exceptional at what you do and want to work in a focused, high-trust environment — we should talk.
            </p>
          </div>

        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/20 animate-bounce">
          <span className="text-xs uppercase tracking-widest">Scroll</span>
          <ChevronDown className="w-4 h-4" />
        </div>
      </section>

      {/* ── VALUES ── */}
      <section className="px-8 lg:px-24 py-24 border-t border-white/8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-16 gap-6">
            <h2 className="headline-lg text-reon-cream" style={{ fontSize: 'clamp(2rem,5vw,3rem)' }}>
              HOW WE WORK
            </h2>
            <p className="text-reon-gray text-sm leading-loose max-w-md">
              Culture isn't ping-pong tables. It's the shared set of beliefs that drives everything we build together.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {values.map((v) => (
              <div
                key={v.title}
                className="border border-white/8 rounded-2xl p-7 hover:border-white/20 hover:bg-white/[0.03] transition-all duration-300 group"
              >
                <span className="text-reon-red text-3xl block mb-5 group-hover:scale-110 transition-transform duration-300 origin-left">{v.icon}</span>
                <h3 className="font-display font-bold text-reon-cream text-lg mb-3">{v.title}</h3>
                <p className="text-reon-gray text-sm leading-loose">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OPEN ROLES ── */}
      <section className="px-8 lg:px-24 py-24 border-t border-white/8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-14">
            <p className="text-reon-red text-xs uppercase tracking-[0.25em] font-semibold mb-4 flex items-center gap-3">
              <span className="inline-block w-8 h-px bg-reon-red" />
              Open Positions — {new Date().getFullYear()}
            </p>
            <h2 className="headline-lg text-reon-cream" style={{ fontSize: 'clamp(2rem,5vw,3rem)' }}>
              {openings.length} ROLES AVAILABLE
            </h2>
          </div>

          <div className="space-y-4">
            {openings.map((job, i) => (
              <JobCard key={job.id} job={job} index={i} onApply={() => setApplyJob(job)} />
            ))}
          </div>
        </div>
      </section>

      {/* ── OPEN APPLICATION ── */}
      <section className="px-8 lg:px-24 py-24 border-t border-white/8 bg-reon-green/30">
        <div className="max-w-4xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-10">
          <div>
            <p className="text-reon-red text-xs uppercase tracking-[0.25em] font-semibold mb-4">Don't see your role?</p>
            <h2 className="font-display font-black text-reon-cream text-3xl mb-3 leading-tight">
              Send an Open<br />Application
            </h2>
            <p className="text-reon-gray text-sm leading-loose max-w-md">
              If you are exceptional and believe RE-ON is the right place for you, reach out. We always make room for the right people.
            </p>
          </div>
          <button
            onClick={() => window.open('https://wa.me/918591944460', '_blank')}
            className="btn-accent flex items-center gap-2 px-10 py-5 whitespace-nowrap text-base"
          >
            Get In Touch
            <ArrowUpRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-8 lg:px-24 py-10 border-t border-white/8 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center">
          <img src="/mainlogo.svg" alt="RE-ON" className="h-8 w-auto" style={{ filter: 'brightness(0) invert(1)' }} />
        </div>
        <p className="text-reon-gray text-xs">© {new Date().getFullYear()} RE-ON Real Estate LLP. All rights reserved.</p>
      </footer>

      {/* ── APPLY MODAL ── */}
      {applyJob && <ApplyModal job={applyJob} onClose={() => setApplyJob(null)} />}

      {/* Keyframes */}
      <style>{`
        @keyframes backdropIn { from { opacity:0 } to { opacity:1 } }
        @keyframes popupIn {
          from { opacity:0; transform:scale(0.90) translateY(50px); }
          to   { opacity:1; transform:scale(1)    translateY(0);    }
        }
      `}</style>
    </div>
  );
}
