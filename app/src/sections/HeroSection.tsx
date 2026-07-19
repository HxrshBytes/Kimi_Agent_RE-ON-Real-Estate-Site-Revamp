import { useEffect, useRef, useState } from 'react';

const heroSlides = [
  { src: '/hero_slide1.jpeg', alt: 'Luxury high-rise towers at golden hour' },
  { src: '/hero_slide2.jpeg', alt: 'Under-construction premium towers at sunrise' },
  { src: '/hero_slide3.jpeg', alt: 'Aerial view of premium residential complex' },
];

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Entry animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Intersection observer
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('in-view');
        });
      },
      { threshold: 0.1, rootMargin: '0px' }
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Auto slideshow — change slide every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-screen bg-reon-greenDark overflow-hidden"
    >
      {/* Vignette */}
      <div className="vignette" />

      {/* ── SLIDESHOW BACKGROUND ── */}
      <div className="absolute left-0 top-0 w-full lg:w-[56vw] h-[50vh] lg:h-full overflow-hidden">
        {heroSlides.map((slide, i) => (
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out ${
              i === currentSlide
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-105'
            } ${isVisible ? '' : 'translate-x-[-60vw]'}`}
            style={{
              transform: i === currentSlide
                ? isVisible ? 'translateX(0) scale(1)' : 'translateX(-60vw) scale(1)'
                : 'scale(1.05)',
              transition: i === currentSlide
                ? 'opacity 1s ease-in-out, transform 1s ease-in-out'
                : 'opacity 1s ease-in-out',
            }}
          />
        ))}

        {/* Slide overlay gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-reon-greenDark/40 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-reon-greenDark via-transparent to-transparent lg:hidden pointer-events-none" />

        {/* Slide indicator dots */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`rounded-full transition-all duration-500 ${
                i === currentSlide
                  ? 'w-6 h-2 bg-reon-red'
                  : 'w-2 h-2 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>

      {/* ── RIGHT TEXT PANEL ── */}
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
          <img src="/mainlogo.svg" alt="RE-ON Real Estate" className="h-8 lg:h-10 w-auto object-contain" />
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

        <button
          onClick={() => window.location.href = '/services'}
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
