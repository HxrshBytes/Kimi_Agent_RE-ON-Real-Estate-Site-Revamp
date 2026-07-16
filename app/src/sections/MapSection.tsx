import { useEffect, useRef, useState } from 'react';

export default function MapSection() {
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
      { threshold: 0.1, rootMargin: '0px' }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative w-full h-[400px] lg:h-[500px] bg-reon-greenDark overflow-hidden">
      <div 
        className={`w-full h-full transition-opacity duration-1000 ${
          isInView ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <iframe 
          width="100%" 
          height="100%" 
          style={{ border: 0, filter: 'grayscale(100%) invert(90%) contrast(1.2)' }} 
          loading="lazy" 
          allowFullScreen 
          src="https://maps.google.com/maps?q=SM+Heights,+Sector+5,+Taloja+Phase+1,+Navi+Mumbai&t=&z=16&ie=UTF8&iwloc=&output=embed"
        />
      </div>
    </section>
  );
}
