import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const navLinks = ['Work', 'Services', 'About', 'Career', 'Contact'];

export default function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Desktop Navigation */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-300 ${
          isScrolled 
            ? 'bg-reon-greenDark/95 backdrop-blur-md py-4' 
            : 'bg-transparent py-6'
        }`}
      >
        <div className="max-w-7xl mx-auto px-8 flex justify-between items-center">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src="/mainlogo.svg"
              alt="RE-ON Real Estate"
              className="h-10 lg:h-12 w-auto transition-all duration-300 object-contain"
            />
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link 
                key={link}
                to={link === 'Career' ? '/career' : link === 'About' ? '/about' : link === 'Contact' ? '/contact' : '/'}
                className="text-reon-gray hover:text-reon-cream transition-colors text-sm uppercase tracking-wider"
              >
                {link}
              </Link>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden text-reon-cream"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div 
        className={`fixed inset-0 bg-reon-greenDark z-[1001] transition-transform duration-300 md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full p-8">
          {/* Close Button */}
          <div className="flex justify-end">
            <button 
              className="text-reon-cream"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Mobile Links */}
          <div className="flex flex-col items-center justify-center flex-1 gap-8">
            {navLinks.map((link) => (
              <Link 
                key={link}
                to={link === 'Career' ? '/career' : link === 'About' ? '/about' : link === 'Contact' ? '/contact' : '/'}
                className="text-reon-cream text-2xl font-display font-bold uppercase tracking-wider"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link}
              </Link>
            ))}
          </div>

          {/* CTA */}
          <button className="btn-accent w-full">
            Start a project
          </button>
        </div>
      </div>
    </>
  );
}
