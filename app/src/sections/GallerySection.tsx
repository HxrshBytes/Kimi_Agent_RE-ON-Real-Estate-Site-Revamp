import { useEffect, useRef, useState } from 'react';
import { X, MapPin, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';

const properties = [
  {
    id: 1,
    title: 'Navya Greens',
    location: 'Vajepur, Panvel, Navi Mumbai, Maharashtra, India',
    image: '/gallery_navya_greens_sunset.png',
    images: [
      '/gallery_navya_greens_sunset.png',
      '/gallery_navya_greens_aerial.jpg',
      '/gallery_navya_greens_map.png',
      '/gallery_navya_greens_plots.jpg',
    ],
    desc: 'A ecosystem more then plotted development where nature , arctitechture and community exist in perfect harmony.',
    tag: ' Plots ',
  },
  {
    id: 2,
    title: ' Square Ornate ',
    location: 'Ghot Taloja, Navi Mumbai, Maharashtra, India',
    image: '/gallery_ornate_facade.jpg',
    images: [
      '/gallery_ornate_facade.jpg',
      '/gallery_ornate.jpg',
      '/gallery_ornate_2bhk.jpg',
      '/gallery_ornate_1bhk.jpg',
      '/gallery_ornate_floorplan.png',
    ],
    desc: 'An ultimate rooftop Apartment at Square Ornate featuring a private terrace garden, direct lift access, play areas, and stunning urban views.',
    tag: 'Apartment · 1 & 2 BHK',
  },
  {
    id: 3,
    title: ' 4D Avanya ',
    location: 'Panvel, Navi Mumbai, Maharashtra, India',
    image: '/gallery_avanya_facade.png',
    images: [
      '/gallery_avanya_facade.png',
      '/gallery_avanya_amenities_1.jpg',
      '/gallery_avanya_amenities_2.jpg',
      '/gallery_avanya_layout.png',
    ],
    desc: 'An architect-designed industrial loft with soaring ceilings, raw textures, and a curated minimalist aesthetic.',
    tag: 'Apartment · 1 & 2 BHK',
  },
];

export default function GallerySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [closing, setClosing] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  useEffect(() => {
    setActiveImageIndex(0);
  }, [activeIndex]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { setIsInView(true); observer.unobserve(entry.target); }
        });
      },
      { threshold: 0.15 }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.body.style.overflow = activeIndex !== null ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [activeIndex]);

  // keyboard nav
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (activeIndex === null) return;
      if (e.key === 'Escape') closePopup();
      if (e.key === 'ArrowRight') setActiveIndex((i) => i !== null ? (i + 1) % properties.length : null);
      if (e.key === 'ArrowLeft') setActiveIndex((i) => i !== null ? (i - 1 + properties.length) % properties.length : null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeIndex]);

  const closePopup = () => {
    setClosing(true);
    setTimeout(() => { setActiveIndex(null); setClosing(false); }, 350);
  };

  const active = activeIndex !== null ? properties[activeIndex] : null;
  const currentImages = active?.images || (active ? [active.image] : []);
  const imageToDisplay = active ? currentImages[activeImageIndex] || active.image : '';

  return (
    <>
      <section
        ref={sectionRef}
        className="relative w-full min-h-screen bg-reon-greenDark py-16 lg:py-0 overflow-hidden"
      >
        {/* Property Cards */}
        <div className="lg:absolute lg:left-[16.5vw] lg:top-[10vh] flex flex-col lg:flex-row gap-6 lg:gap-[2vw] px-4 lg:px-0">
          {properties.map((prop, i) => {
            const delays = ['delay-100', 'delay-200', 'delay-300'];
            const entrances = [
              isInView ? 'opacity-100 translate-x-0 translate-y-0 rotate-0' : 'opacity-0 translate-x-[60vw] translate-y-[18vh] rotate-3',
              isInView ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-[100vh] scale-95',
              isInView ? 'opacity-100 translate-x-0 translate-y-0 rotate-0' : 'opacity-0 translate-x-[60vw] translate-y-[18vh] -rotate-3',
            ];
            return (
              <div
                key={prop.id}
                onClick={() => setActiveIndex(i)}
                className={`
                  relative w-full lg:w-[21vw] h-[60vh] lg:h-[76vh]
                  card-dark overflow-hidden cursor-pointer group
                  transition-all duration-500 ${delays[i]}
                  hover:-translate-y-6 hover:scale-[1.05]
                  hover:shadow-[0_40px_100px_rgba(0,0,0,0.75)]
                  ${entrances[i]}
                `}
              >
                <div className="w-full h-[68%] overflow-hidden">
                  <img src={prop.image} alt={prop.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                </div>
                <div className="absolute top-0 left-0 w-full h-[68%] bg-gradient-to-t from-reon-greenDark/60 to-transparent pointer-events-none" />
                <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:scale-110">
                  <ArrowUpRight className="w-4 h-4 text-white" />
                </div>
                <div className="p-6 pt-5">
                  <p className="text-reon-red text-xs uppercase tracking-widest mb-1 font-semibold">{prop.tag}</p>
                  <h3 className="font-display font-bold text-reon-cream text-xl mb-2 group-hover:text-white transition-colors">{prop.title}</h3>
                  <div className="flex items-center gap-1.5 text-reon-gray text-xs uppercase tracking-widest">
                    <MapPin className="w-3 h-3 text-reon-red" />{prop.location}
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 h-[3px] w-0 bg-reon-red group-hover:w-full transition-all duration-500 ease-out" />
              </div>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════
          FULLSCREEN POPUP
      ══════════════════════════════════ */}
      {active && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center p-4 lg:p-8"
          style={{ animation: closing ? 'backdropOut 0.35s ease forwards' : 'backdropIn 0.4s ease forwards' }}
          onClick={closePopup}
        >
          {/* Blurred backdrop */}
          <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" />

          {/* Popup panel */}
          <div
            className="relative z-10 w-full max-w-[92vw] lg:max-w-[88vw] rounded-[2rem] overflow-hidden
                        shadow-[0_80px_160px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.06)]
                        flex flex-col lg:flex-row"
            style={{ animation: closing ? 'popupOut 0.35s cubic-bezier(0.4,0,1,1) forwards' : 'popupIn 0.5s cubic-bezier(0.22,1,0.36,1) forwards' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ── LEFT: BIG IMAGE ── */}
            <div className="relative lg:w-[62%] h-[50vh] lg:h-[88vh] overflow-hidden flex-shrink-0">
              <img
                key={imageToDisplay}
                src={imageToDisplay}
                alt={active.title}
                className="w-full h-full object-cover"
                style={{ animation: 'imageReveal 0.6s cubic-bezier(0.22,1,0.36,1) both' }}
              />

              {/* Internal Image Navigation Arrows */}
              {currentImages.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImageIndex((prev) => (prev - 1 + currentImages.length) % currentImages.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/80 hover:bg-reon-red hover:border-reon-red hover:text-white transition-all duration-300 z-10 group/imgprev"
                  >
                    <ChevronLeft className="w-5 h-5 group-hover/imgprev:-translate-x-0.5 transition-transform" />
                  </button>
                  <button
                    onClick={() => setActiveImageIndex((prev) => (prev + 1) % currentImages.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/60 border border-white/10 flex items-center justify-center text-white/80 hover:bg-reon-red hover:border-reon-red hover:text-white transition-all duration-300 z-10 group/imgnext"
                  >
                    <ChevronRight className="w-5 h-5 group-hover/imgnext:translate-x-0.5 transition-transform" />
                  </button>

                  {/* Dot Indicators for Images */}
                  <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-2 z-10 bg-black/45 px-3 py-1.5 rounded-full backdrop-blur-sm">
                    {currentImages.map((_, imgIndex) => (
                      <button
                        key={imgIndex}
                        onClick={() => setActiveImageIndex(imgIndex)}
                        className={`rounded-full transition-all duration-300 ${imgIndex === activeImageIndex ? 'w-5 h-2 bg-reon-red' : 'w-2 h-2 bg-white/40 hover:bg-white/70'
                          }`}
                      />
                    ))}
                  </div>
                </>
              )}
              {/* Gradient */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-reon-greenDark/30 pointer-events-none" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

              {/* Tag badge */}
              <div className="absolute top-6 left-6 px-4 py-1.5 rounded-full bg-reon-red/90 backdrop-blur-sm text-white text-xs font-semibold uppercase tracking-widest">
                {active.tag}
              </div>

              {/* Bottom location strip */}
              <div className="absolute bottom-6 left-6 flex items-center gap-2 text-white/80 text-sm">
                <MapPin className="w-4 h-4 text-reon-red" />
                <span className="uppercase tracking-widest text-xs">{active.location}</span>
              </div>

              {/* Slide counter */}
              <div className="absolute bottom-6 right-6 text-white/40 text-xs font-mono tracking-widest">
                {String(activeIndex! + 1).padStart(2, '0')} / {String(properties.length).padStart(2, '0')}
              </div>
            </div>

            {/* ── RIGHT: CONTENT PANEL ── */}
            <div className="lg:w-[38%] bg-reon-greenDark flex flex-col justify-between px-10 py-12 min-h-[44vh] lg:min-h-0">
              {/* Top area */}
              <div>
                {/* Close button */}
                <div className="flex justify-end mb-8">
                  <button
                    onClick={closePopup}
                    className="w-11 h-11 rounded-full border border-white/10 flex items-center justify-center text-white/60
                               hover:bg-reon-red hover:border-reon-red hover:text-white transition-all duration-300 group/close"
                  >
                    <X className="w-5 h-5 group-hover/close:rotate-90 transition-transform duration-300" />
                  </button>
                </div>

                {/* Property name */}
                <h2
                  className="font-display font-black text-reon-cream leading-[0.92] mb-6"
                  style={{ fontSize: 'clamp(2rem, 3.5vw, 3rem)', animation: 'slideUp 0.5s 0.15s both' }}
                >
                  {active.title}
                </h2>

                {/* Divider */}
                <div className="w-12 h-[3px] bg-reon-red mb-6" style={{ animation: 'slideUp 0.5s 0.2s both' }} />

                {/* Description */}
                <p
                  className="text-reon-gray text-sm leading-loose mb-10"
                  style={{ animation: 'slideUp 0.5s 0.25s both' }}
                >
                  {active.desc}
                </p>

                {/* Stats row */}
                <div
                  className="grid grid-cols-2 gap-4 mb-10"
                  style={{ animation: 'slideUp 0.5s 0.3s both' }}
                >
                  {[['Status', 'Active Mandate'], ['Type', active.tag.split('·')[0].trim()]].map(([label, val]) => (
                    <div key={label} className="border border-white/8 rounded-xl p-4">
                      <p className="text-reon-gray text-xs uppercase tracking-widest mb-1">{label}</p>
                      <p className="text-reon-cream text-sm font-semibold">{val}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom controls */}
              <div style={{ animation: 'slideUp 0.5s 0.35s both' }}>
                {/* Prev / Next */}
                <div className="flex items-center gap-3 mb-6">
                  <button
                    onClick={() => setActiveIndex((activeIndex! - 1 + properties.length) % properties.length)}
                    className="w-11 h-11 rounded-full border border-white/10 flex items-center justify-center text-white/60
                               hover:border-white/30 hover:text-white transition-all duration-200"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActiveIndex((activeIndex! + 1) % properties.length)}
                    className="w-11 h-11 rounded-full border border-white/10 flex items-center justify-center text-white/60
                               hover:border-white/30 hover:text-white transition-all duration-200"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  {/* Dot indicators */}
                  <div className="flex gap-2 ml-2">
                    {properties.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveIndex(i)}
                        className={`rounded-full transition-all duration-300 ${i === activeIndex ? 'w-6 h-2 bg-reon-red' : 'w-2 h-2 bg-white/20 hover:bg-white/40'
                          }`}
                      />
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => window.open('https://wa.me/918591944460?text=lets%20start%20together', '_blank')}
                  className="btn-accent w-full text-center py-4 text-sm tracking-wider"
                >
                  Enquire About This Property
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animation keyframes */}
      <style>{`
        @keyframes backdropIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes backdropOut { from { opacity:1 } to { opacity:0 } }

        @keyframes popupIn {
          from { opacity:0; transform: scale(0.88) translateY(60px); }
          to   { opacity:1; transform: scale(1)    translateY(0);    }
        }
        @keyframes popupOut {
          from { opacity:1; transform: scale(1)    translateY(0);    }
          to   { opacity:0; transform: scale(0.92) translateY(40px); }
        }
        @keyframes imageReveal {
          from { opacity:0; transform: scale(1.08); }
          to   { opacity:1; transform: scale(1);    }
        }
        @keyframes slideUp {
          from { opacity:0; transform: translateY(24px); }
          to   { opacity:1; transform: translateY(0);    }
        }
      `}</style>
    </>
  );
}
