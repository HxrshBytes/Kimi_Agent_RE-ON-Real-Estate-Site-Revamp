import { useEffect, useRef, useState } from 'react';

// RE-ON Logo Component
function ReonLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      <span className="font-display font-bold text-reon-red tracking-tight">RE</span>
      <span className="font-display font-bold text-reon-cream tracking-tight">-ON</span>
    </div>
  );
}

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px' }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section 
      ref={sectionRef} 
      className="relative w-full min-h-screen bg-reon-greenDark overflow-hidden"
    >
      {/* Vignette */}
      <div className="vignette" />
      
      {/* Left Image Panel */}
      <div 
        className={`absolute left-0 top-0 w-full lg:w-[56vw] h-[50vh] lg:h-full transition-all duration-1000 ease-out ${
          isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-[60vw]'
        }`}
      >
        <img 
          src="/hero_interior.jpg" 
          alt="Modern interior"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-reon-greenDark/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-reon-greenDark via-transparent to-transparent lg:hidden" />
      </div>

      {/* Right Text Panel */}
      <div 
        className={`absolute left-0 lg:left-[56vw] top-[50vh] lg:top-0 w-full lg:w-[44vw] h-[50vh] lg:h-full bg-reon-greenDark flex flex-col justify-center px-8 lg:px-[4vw] transition-all duration-1000 ease-out delay-200 ${
          isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-[40vw]'
        }`}
      >
        {/* Light leak gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
        
        {/* Logo */}
        <div 
          className={`mb-4 lg:mb-8 transition-all duration-700 delay-300 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <ReonLogo className="text-3xl lg:text-4xl" />
          <p className="text-reon-gray text-xs lg:text-sm uppercase tracking-[0.2em] mt-1">
            Real Estate Always On
          </p>
        </div>

        {/* Headline */}
        <div className="space-y-0 lg:space-y-1 mb-6 lg:mb-10">
          <h1 
            className={`headline-xl text-reon-cream text-[clamp(2rem,8vw,5rem)] lg:text-[clamp(2.5rem,4.5vw,5rem)] transition-all duration-700 delay-400 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-[10vw]'
            }`}
          >
            MANDATE-LED
          </h1>
          <h1 
            className={`headline-xl text-reon-cream text-[clamp(2rem,8vw,5rem)] lg:text-[clamp(2.5rem,4.5vw,5rem)] transition-all duration-700 delay-500 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-[10vw]'
            }`}
          >
            DESIGN-FIRST
          </h1>
          <h1 
            className={`headline-xl text-reon-red text-[clamp(2rem,8vw,5rem)] lg:text-[clamp(2.5rem,4.5vw,5rem)] transition-all duration-700 delay-600 ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-[10vw]'
            }`}
          >
            BUILT TO SELL
          </h1>
        </div>

        {/* Subheadline */}
        <p 
          className={`text-reon-gray text-sm lg:text-base lg:text-lg leading-relaxed max-w-full lg:max-w-[30vw] mb-6 lg:mb-8 transition-all duration-700 delay-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          A boutique real estate studio representing select developers across India.
        </p>

        {/* CTA Button */}
        <button 
          className={`btn-accent w-fit transition-all duration-700 delay-800 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          View selected work
        </button>
      </div>
    </section>
  );
}
