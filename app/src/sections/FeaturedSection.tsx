import { useEffect, useRef, useState } from 'react';

export default function FeaturedSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2, rootMargin: '0px' }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section 
      ref={sectionRef} 
      className="relative w-full min-h-screen overflow-hidden"
    >
      {/* Background Image */}
      <div 
        className={`absolute inset-0 transition-all duration-1000 ${
          isInView ? 'opacity-100 scale-100' : 'opacity-60 scale-105'
        }`}
      >
        <img 
          src="/gallery_navya_greens.jpg" 
          alt="Navya Greens"
          className="w-full h-full object-cover"
        />
        <div className="image-overlay" />
      </div>

      {/* Floating Property Card */}
      <div 
        className={`absolute left-4 lg:left-[7vw] right-4 lg:right-auto top-[10vh] lg:top-[18vh] w-auto lg:w-[38vw] h-auto lg:h-[64vh] card-dark shadow-card overflow-hidden transition-all duration-1000 delay-200 ${
          isInView ? 'opacity-100 translate-x-0 translate-y-0 rotate-0' : 'opacity-0 -translate-x-[60vw] translate-y-[10vh] -rotate-2'
        }`}
      >
        {/* Card Image */}
        <div className="w-full h-[40vh] lg:h-[52%] overflow-hidden">
          <img 
            src="/gallery_navya_greens.jpg" 
            alt="Navya Greens"
            className={`w-full h-full object-cover transition-all duration-1000 delay-300 ${
              isInView ? 'scale-100 translate-y-0' : 'scale-105 translate-y-[6%]'
            }`}
          />
        </div>
        
        {/* Card Content */}
        <div className="p-5 lg:p-6 flex flex-col">
          <h3 className="font-display font-bold text-reon-cream text-lg lg:text-xl mb-1">
            Navya Greens
          </h3>
          <p className="text-reon-gray text-xs lg:text-sm mb-3 lg:mb-4">
            Navi Mumbai · Premium Residential Plots
          </p>
          <p className="font-display font-bold text-reon-red text-xl lg:text-2xl mb-4 lg:mb-auto">
            On Request
          </p>
          <button className="btn-accent text-sm py-2 lg:py-3 px-4 lg:px-5 w-fit mt-4 lg:mt-0">
            Request details
          </button>
        </div>
      </div>

      {/* Right Side Content */}
      <h2 
        className={`absolute left-4 lg:left-[62vw] right-4 lg:right-auto top-auto lg:top-[44vh] bottom-[15vh] lg:bottom-auto headline-lg text-reon-cream text-[clamp(1.5rem,5vw,3rem)] transition-all duration-1000 delay-400 ${
          isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-[18vw]'
        }`}
      >
        SELECTED WORK
      </h2>
      <p 
        className={`hidden lg:block absolute left-[62vw] top-[54vh] w-[28vw] text-reon-gray text-base leading-relaxed transition-all duration-1000 delay-500 ${
          isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-[18vw]'
        }`}
      >
        We represent a small roster of homes—each chosen for craft, context, and sellability.
      </p>
    </section>
  );
}
