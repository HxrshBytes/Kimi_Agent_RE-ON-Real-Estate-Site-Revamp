import { useEffect, useRef, useState } from 'react';

const properties = [
  {
    id: 1,
    title: 'The City Apartment',
    location: 'Bengaluru',
    image: '/gallery_apartment.jpg',
  },
  {
    id: 2,
    title: 'The Garden Villa',
    location: 'Hyderabad',
    image: '/gallery_villa.jpg',
  },
  {
    id: 3,
    title: 'The Studio Loft',
    location: 'Mumbai',
    image: '/gallery_studio.jpg',
  },
];

export default function GallerySection() {
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
      { threshold: 0.15, rootMargin: '0px' }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section 
      ref={sectionRef} 
      className="relative w-full min-h-screen bg-reon-greenDark py-16 lg:py-0 overflow-hidden"
    >
      {/* Left Heading Block */}
      <div 
        className={`lg:absolute lg:left-[7vw] lg:top-[18vh] px-4 lg:px-0 mb-8 lg:mb-0 lg:w-[26vw] transition-all duration-1000 ${
          isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-[12vw]'
        }`}
      >
        <h2 className="headline-lg text-reon-cream text-[clamp(2rem,6vw,3.5rem)] mb-4">
          THREE HOMES
        </h2>
        <p className="text-reon-gray text-base leading-relaxed">
          A snapshot of our current mandate portfolio.
        </p>
      </div>

      {/* Property Cards - Mobile: vertical stack, Desktop: horizontal row */}
      <div className="lg:absolute lg:left-[32vw] lg:top-[18vh] flex flex-col lg:flex-row gap-6 lg:gap-[2vw] px-4 lg:px-0">
        {/* Card A */}
        <div 
          className={`w-full lg:w-[18vw] h-[50vh] lg:h-[64vh] card-dark overflow-hidden group hover:-translate-y-1.5 transition-all duration-1000 delay-100 ${
            isInView ? 'opacity-100 translate-x-0 translate-y-0 rotate-0' : 'opacity-0 translate-x-[60vw] translate-y-[18vh] rotate-3'
          }`}
        >
          <div className={`w-full h-[55%] overflow-hidden transition-all duration-1000 delay-200 ${
            isInView ? 'scale-100 translate-y-0' : 'scale-105 translate-y-[8%]'
          }`}>
            <img 
              src={properties[0].image} 
              alt={properties[0].title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="p-5">
            <h3 className="font-display font-bold text-reon-cream text-lg mb-1">
              {properties[0].title}
            </h3>
            <p className="text-reon-gray text-sm">{properties[0].location}</p>
          </div>
        </div>

        {/* Card B */}
        <div 
          className={`w-full lg:w-[18vw] h-[50vh] lg:h-[64vh] card-dark overflow-hidden group hover:-translate-y-1.5 transition-all duration-1000 delay-200 ${
            isInView ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-[100vh] scale-92'
          }`}
        >
          <div className={`w-full h-[55%] overflow-hidden transition-all duration-1000 delay-300 ${
            isInView ? 'scale-100 translate-y-0' : 'scale-105 translate-y-[8%]'
          }`}>
            <img 
              src={properties[1].image} 
              alt={properties[1].title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="p-5">
            <h3 className="font-display font-bold text-reon-cream text-lg mb-1">
              {properties[1].title}
            </h3>
            <p className="text-reon-gray text-sm">{properties[1].location}</p>
          </div>
        </div>

        {/* Card C */}
        <div 
          className={`w-full lg:w-[18vw] h-[50vh] lg:h-[64vh] card-dark overflow-hidden group hover:-translate-y-1.5 transition-all duration-1000 delay-300 ${
            isInView ? 'opacity-100 translate-x-0 translate-y-0 rotate-0' : 'opacity-0 translate-x-[60vw] translate-y-[18vh] -rotate-3'
          }`}
        >
          <div className={`w-full h-[55%] overflow-hidden transition-all duration-1000 delay-400 ${
            isInView ? 'scale-100 translate-y-0' : 'scale-105 translate-y-[8%]'
          }`}>
            <img 
              src={properties[2].image} 
              alt={properties[2].title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </div>
          <div className="p-5">
            <h3 className="font-display font-bold text-reon-cream text-lg mb-1">
              {properties[2].title}
            </h3>
            <p className="text-reon-gray text-sm">{properties[2].location}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
