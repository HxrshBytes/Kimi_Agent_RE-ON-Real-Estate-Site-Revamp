import { useEffect, useRef, useState } from 'react';

const navLinks = ['Work', 'Services', 'Insights', 'Contact', 'Privacy'];

// RE-ON Logo Component
function ReonLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      <span className="font-display font-bold text-reon-red tracking-tight">RE</span>
      <span className="font-display font-bold text-reon-cream tracking-tight">-ON</span>
    </div>
  );
}

export default function Footer() {
  const footerRef = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;

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

    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <footer 
      ref={footerRef} 
      className={`bg-reon-green py-10 lg:py-12 transition-all duration-500 ${
        isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[18px]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        {/* Top Row */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-6 lg:mb-8">
          {/* Logo */}
          <div>
            <ReonLogo className="text-2xl lg:text-3xl" />
            <p className="text-reon-gray text-xs uppercase tracking-[0.15em] mt-1">
              Real Estate Always On
            </p>
          </div>
          
          {/* Nav Links */}
          <nav className="flex flex-wrap justify-center gap-4 lg:gap-6">
            {navLinks.map((link) => (
              <a 
                key={link}
                href="#" 
                className="text-reon-gray hover:text-reon-cream transition-colors text-xs lg:text-sm uppercase tracking-wider"
              >
                {link}
              </a>
            ))}
          </nav>
        </div>

        {/* Divider */}
        <div className="border-t border-reon-cream/10 pt-6 lg:pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-reon-gray text-xs lg:text-sm">
              © 2026 RE-ON Real Estate LLP. All rights reserved.
            </p>
            <p className="text-reon-gray text-xs lg:text-sm">
              www.reonrealestatellp.com
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
