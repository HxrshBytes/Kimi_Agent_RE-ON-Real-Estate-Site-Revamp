import { Routes, Route } from 'react-router-dom';
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
import MapSection from './sections/MapSection';
import Footer from './sections/Footer';
import CareerPage from './sections/CareerPage';
import AboutUsPage from './sections/AboutUsPage';
import ContactUsPage from './sections/ContactUsPage';
import ServicesPage from './sections/ServicesPage';

import './index.css';

function Home() {
  return (
    <>
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
      
      {/* Section 10: Map */}
      <MapSection />
      
      {/* Section 11: Footer */}
      <Footer />
    </>
  );
}

function App() {
  return (
    <div className="relative bg-reon-greenDark min-h-screen">
      {/* Grain Overlay */}
      <div className="grain-overlay" />
      
      {/* Navigation */}
      <Navigation />

      {/* Main Content */}
      <main className="relative">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutUsPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/career" element={<CareerPage />} />
          <Route path="/contact" element={<ContactUsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
