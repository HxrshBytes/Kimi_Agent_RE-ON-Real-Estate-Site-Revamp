import Navigation from './components/Navigation';
import HeroSection from './sections/HeroSection';
import FeaturedSection from './sections/FeaturedSection';
import GallerySection from './sections/GallerySection';
import MandateSection from './sections/MandateSection';
import PartnershipSection from './sections/PartnershipSection';
import PhilosophySection from './sections/PhilosophySection';
import InsightSection from './sections/InsightSection';
import ClosingSection from './sections/ClosingSection';
import ContactSection from './sections/ContactSection';
import Footer from './sections/Footer';

import './index.css';

function App() {
  return (
    <div className="relative bg-reon-greenDark min-h-screen">
      {/* Grain Overlay */}
      <div className="grain-overlay" />
      
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="relative">
        {/* Section 1: Hero */}
        <HeroSection />
        
        {/* Section 2: Featured Property */}
        <FeaturedSection />
        
        {/* Section 3: Gallery */}
        <GallerySection />
        
        {/* Section 4: Mandate Model */}
        <MandateSection />
        
        {/* Section 5: Partnership */}
        <PartnershipSection />
        
        {/* Section 6: Philosophy */}
        <PhilosophySection />
        
        {/* Section 7: Insight */}
        <InsightSection />
        
        {/* Section 8: Closing */}
        <ClosingSection />
        
        {/* Section 9: Contact */}
        <ContactSection />
        
        {/* Section 10: Footer */}
        <Footer />
      </main>
    </div>
  );
}

export default App;
