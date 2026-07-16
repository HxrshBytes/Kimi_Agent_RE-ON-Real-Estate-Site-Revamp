import { useEffect, useRef, useState } from 'react';
import { Mail, MapPin, User } from 'lucide-react';

// RE-ON Logo Component
function ReonLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      <span className="font-display font-bold text-reon-red tracking-tight">RE</span>
      <span className="font-display font-bold text-reon-cream tracking-tight">-ON</span>
    </div>
  );
}

export default function ContactSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isInView, setIsInView] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    message: ''
  });

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Thank you for your message! We will get back to you within 2 business days.');
  };

  return (
    <section ref={sectionRef} className="relative bg-reon-greenDark py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Left Column */}
          <div 
            className={`space-y-6 lg:space-y-8 transition-all duration-700 ${
              isInView ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-[8vw]'
            }`}
          >
            {/* Logo */}
            <div>
              <ReonLogo className="text-3xl lg:text-4xl" />
              <p className="text-reon-gray text-xs lg:text-sm uppercase tracking-[0.2em] mt-1">
                Real Estate Always On
              </p>
            </div>

            <h2 className="headline-lg text-reon-cream text-[clamp(1.8rem,5vw,3.5rem)]">
              TELL US WHAT YOU'RE BUILDING
            </h2>
            <p className="text-reon-gray text-base lg:text-lg leading-relaxed">
              Share a few details. We'll respond within 2 business days.
            </p>
            
            {/* Contact Details */}
            <div className="space-y-4 lg:space-y-5 pt-4">
              {/* Partners */}
              <div className="space-y-3">
                <p className="text-reon-gray text-xs uppercase tracking-wider mb-2">Our Partners</p>
                
                <div className="flex items-center gap-3 lg:gap-4">
                  <div className="w-9 lg:w-10 h-9 lg:h-10 rounded-full bg-reon-green flex items-center justify-center">
                    <User className="w-4 lg:w-5 h-4 lg:h-5 text-reon-red" />
                  </div>
                  <div>
                    <p className="text-reon-cream text-sm lg:text-base font-medium">Sanchit P. Revandkar</p>
                    <p className="text-reon-gray text-xs lg:text-sm">+91 9619 1399 70</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 lg:gap-4">
                  <div className="w-9 lg:w-10 h-9 lg:h-10 rounded-full bg-reon-green flex items-center justify-center">
                    <User className="w-4 lg:w-5 h-4 lg:h-5 text-reon-red" />
                  </div>
                  <div>
                    <p className="text-reon-cream text-sm lg:text-base font-medium">Yassar K. Rawthar</p>
                    <p className="text-reon-gray text-xs lg:text-sm">+91 9930 7777 60</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-reon-greenLight/30 pt-4 space-y-3">
                <div className="flex items-center gap-3 lg:gap-4">
                  <div className="w-9 lg:w-10 h-9 lg:h-10 rounded-full bg-reon-green flex items-center justify-center">
                    <Mail className="w-4 lg:w-5 h-4 lg:h-5 text-reon-red" />
                  </div>
                  <span className="text-reon-cream text-sm lg:text-base">info@reonrealestatellp.com</span>
                </div>
                
                <div className="flex items-start gap-3 lg:gap-4">
                  <div className="w-9 lg:w-10 h-9 lg:h-10 rounded-full bg-reon-green flex items-center justify-center flex-shrink-0 mt-1">
                    <MapPin className="w-4 lg:w-5 h-4 lg:h-5 text-reon-red" />
                  </div>
                  <a 
                    href="https://www.google.co.in/maps/place/SM+Heights/@19.0809489,73.0966298,20.26z/data=!4m14!1m7!3m6!1s0x3be7eb007111c757:0xef5565170b0c2da2!2sTHE+NEST!8m2!3d19.0760238!4d73.0917544!16s%2Fg%2F11nbh3nltw!3m5!1s0x3be7ea0d1fff9eed:0xe9b3604843d02e56!8m2!3d19.0811616!4d73.0965223!16s%2Fg%2F11dzqr38p6?entry=ttu&g_ep=EgoyMDI2MDcxMy4wIKXMDSoASAFQAw%3D%3D"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-reon-cream text-sm lg:text-base leading-relaxed hover:text-reon-red hover:underline transition-colors"
                  >
                    Shop No 1, SM Heights, Plot No. 34, Sector 5,<br />
                    Taloja Phase 1, Navi Mumbai, MH 410208, IN
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div 
            className={`card-dark p-5 lg:p-8 transition-all duration-700 delay-200 ${
              isInView ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-[8vw]'
            }`}
          >
            <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-5">
              <div 
                className={`transition-all duration-500 ${
                  isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[18px]'
                }`}
                style={{ transitionDelay: '300ms' }}
              >
                <label className="block text-reon-gray text-sm mb-2">Name</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Your name"
                  className="w-full"
                  required
                />
              </div>
              <div 
                className={`transition-all duration-500 ${
                  isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[18px]'
                }`}
                style={{ transitionDelay: '360ms' }}
              >
                <label className="block text-reon-gray text-sm mb-2">Email</label>
                <input 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="your@email.com"
                  className="w-full"
                  required
                />
              </div>
              <div 
                className={`transition-all duration-500 ${
                  isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[18px]'
                }`}
                style={{ transitionDelay: '420ms' }}
              >
                <label className="block text-reon-gray text-sm mb-2">Phone</label>
                <input 
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+91 98765 43210"
                  className="w-full"
                />
              </div>
              <div 
                className={`transition-all duration-500 ${
                  isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[18px]'
                }`}
                style={{ transitionDelay: '480ms' }}
              >
                <label className="block text-reon-gray text-sm mb-2">City</label>
                <input 
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="Your city"
                  className="w-full"
                />
              </div>
              <div 
                className={`transition-all duration-500 ${
                  isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[18px]'
                }`}
                style={{ transitionDelay: '540ms' }}
              >
                <label className="block text-reon-gray text-sm mb-2">Message</label>
                <textarea 
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  placeholder="Tell us about your project..."
                  rows={4}
                  className="w-full resize-none"
                  required
                />
              </div>
              <button 
                type="submit" 
                className={`btn-accent w-full transition-all duration-500 ${
                  isInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[18px]'
                }`}
                style={{ transitionDelay: '600ms' }}
              >
                Send message
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
