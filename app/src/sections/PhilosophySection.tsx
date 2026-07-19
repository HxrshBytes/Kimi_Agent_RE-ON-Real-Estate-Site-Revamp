import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PhilosophySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);
  const navigate = useNavigate();

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
          src="/design_philosophy_pool.jpg" 
          alt="Design philosophy"
          className="w-full h-full object-cover"
        />
        <div className="image-overlay" />
      </div>

      {/* Left Info Card */}
      <div 
        className={`absolute left-4 lg:left-[7vw] right-4 lg:right-auto top-[10vh] lg:top-[20vh] w-auto lg:w-[40vw] h-auto lg:h-[60vh] card-dark p-6 lg:p-8 flex flex-col justify-center transition-all duration-1000 ${
          isInView ? 'opacity-100 translate-x-0 rotate-0' : 'opacity-0 -translate-x-[60vw] -rotate-2'
        }`}
      >
        <h2 className="headline-lg text-reon-cream text-[clamp(1.5rem,5vw,3.2rem)] mb-4 lg:mb-6">
          CRAFT OVER<br />VOLUME
        </h2>
        <p className="text-reon-gray text-sm lg:text-base leading-relaxed mb-6 lg:mb-8 max-w-full lg:max-w-[32vw]">
          We document materials, light, and proportion—then translate them into a sales narrative that feels like architecture journalism.
        </p>
        <button className="btn-accent w-fit" onClick={() => navigate('/services')}>
          See our process
        </button>
      </div>

      {/* Right Thumbnail Chip - Hidden on mobile */}
      <div 
        className={`hidden lg:block absolute left-[62vw] top-[34vh] w-[30vw] h-[32vh] rounded-[22px] overflow-hidden shadow-card transition-all duration-1000 delay-200 ${
          isInView ? 'opacity-100 translate-x-0 translate-y-0' : 'opacity-0 translate-x-[60vw] translate-y-[12vh]'
        }`}
      >
        <img 
          src="/featured_courtyard.jpg" 
          alt="Craft detail"
          className="w-full h-full object-cover"
        />
      </div>
    </section>
  );
}
