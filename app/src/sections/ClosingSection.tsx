import { useEffect, useRef, useState } from 'react';

export default function ClosingSection() {
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
          isInView ? 'opacity-100 scale-100' : 'opacity-70 scale-105'
        }`}
      >
        <img 
          src="/closing_aerial.jpg" 
          alt="Closing aerial"
          className="w-full h-full object-cover"
        />
        <div className="image-overlay" />
      </div>

      {/* Centered Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <h2 
          className={`headline-xl text-reon-cream text-[clamp(2rem,10vw,6rem)] mb-4 lg:mb-6 transition-all duration-1000 ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[18vh]'
          }`}
        >
          LET'S BUILD THE NEXT ICON
        </h2>
        <p 
          className={`text-reon-gray text-base lg:text-lg lg:text-xl max-w-[90vw] lg:max-w-[44vw] mb-8 lg:mb-10 transition-all duration-1000 delay-100 ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          If you're a developer with a product that values design, we should talk.
        </p>
        <button 
          onClick={() => window.open('https://wa.me/918591944460', '_blank')}
          className={`btn-accent transition-all duration-1000 delay-200 ${
            isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          Start a conversation
        </button>
      </div>
    </section>
  );
}
