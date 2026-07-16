import { useEffect, useRef, useState } from 'react';

const stats = [
  { value: '18+', label: 'Mandates' },
  { value: '₹340Cr+', label: 'Sales' },
  { value: '4.9/5', label: 'Buyer rating' },
];

export default function InsightSection() {
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
          src="/market_insight_facade.jpg" 
          alt="Market insight"
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
          DATA-LED,<br />DESIGN-DRIVEN
        </h2>
        <p className="text-reon-gray text-sm lg:text-base leading-relaxed mb-6 lg:mb-8 max-w-full lg:max-w-[32vw]">
          We combine local transaction data with architectural storytelling—so pricing is credible and presentation is memorable.
        </p>
        
        {/* Stats Row */}
        <div className="flex gap-4 lg:gap-6 mt-auto">
          {stats.map((stat, index) => (
            <div 
              key={index} 
              className={`transition-all duration-700 ${
                isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
              style={{ transitionDelay: `${300 + index * 80}ms` }}
            >
              <p className="font-display font-bold text-reon-red text-xl lg:text-2xl mb-1">
                {stat.value}
              </p>
              <p className="text-reon-gray text-xs uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Right Thumbnail Chip - Hidden on mobile */}
      <div 
        className={`hidden lg:block absolute left-[62vw] top-[34vh] w-[30vw] h-[32vh] rounded-[22px] overflow-hidden shadow-card transition-all duration-1000 delay-200 ${
          isInView ? 'opacity-100 translate-x-0 translate-y-0' : 'opacity-0 translate-x-[60vw] translate-y-[12vh]'
        }`}
      >
        <img 
          src="/mandate_courtyard.jpg" 
          alt="Insight detail"
          className="w-full h-full object-cover"
        />
      </div>
    </section>
  );
}
