import { Link } from 'react-router-dom'
import { ArrowRight, Home, TrendingUp, FileText, Scale, Users, Building2, Wrench, Palette } from 'lucide-react'
import './Services.css'

const services = [
  { icon: <Home size={28} />, title: "Home Buying Assistance", desc: "End-to-end support from shortlisting to registration. We negotiate the best deals and guide you through every step of purchasing your dream home.", highlights: ["Property shortlisting", "Site visit coordination", "Price negotiation", "Documentation support"] },
  { icon: <TrendingUp size={28} />, title: "Investment Advisory", desc: "Data-driven investment strategies for residential and commercial properties in Navi Mumbai's high-growth corridors like Kharghar and Panvel.", highlights: ["Market analysis reports", "ROI projections", "Portfolio diversification", "Rental yield advisory"] },
  { icon: <Building2 size={28} />, title: "NRI Property Services", desc: "Specialised services for Non-Resident Indians looking to invest or buy property in Navi Mumbai. We handle everything remotely and legally.", highlights: ["Power of attorney support", "Virtual property tours", "FEMA compliance", "Repatriation guidance"] },
  { icon: <FileText size={28} />, title: "Home Loans", desc: "We partner with 20+ leading banks and HFCs to get you the best home loan rates. Our experts handle the entire application process.", highlights: ["Rate comparison tool", "Pre-approval assistance", "Balance transfer", "EMI optimisation"] },
  { icon: <Scale size={28} />, title: "Legal & Documentation", desc: "Our in-house legal team ensures every document is compliant with RERA regulations and Maharashtra state property laws.", highlights: ["Agreement review", "Title verification", "RERA registration", "Stamp duty consultation"] },
  { icon: <Wrench size={28} />, title: "Property Management", desc: "Professional property management for landlords and investors. We handle tenants, maintenance, and rent collection so you don't have to.", highlights: ["Tenant screening", "Rent collection", "Maintenance coordination", "Monthly reporting"] },
  { icon: <Users size={28} />, title: "Resale & Rental", desc: "Looking to sell or rent your property? We leverage our extensive buyer database to get you the best value in the shortest time.", highlights: ["Property valuation", "Professional photography", "Buyer/tenant database", "Agreement drafting"] },
  { 
    icon: <Palette size={28} />, 
    title: "Interior Assistance", 
    desc: "REON provides subtle interior consultation for homes and commercial spaces—covering layouts, colours, lighting, materials and finishes, tailored to your requirements and budget.", 
    highlights: [
      "Space planning and utilization",
      "Material and finish selection",
      "Basic décor and styling guidance",
      "Budget-conscious interior solutions"
    ] 
  },
]

const whyUs = [
  { value: '17+', label: 'Years Experience' },
  { value: '35+', label: 'Developer Partners' },
  { value: '1200+', label: 'Families Served' },
  { value: '98%', label: 'Client Satisfaction' },
]

export default function Services() {
  return (
    <div>
      <section className="page-hero">
        <div className="container">
          <p className="section-label">What We Offer</p>
          <h1 className="headline-xl" style={{ fontSize: 'clamp(2.5rem,7vw,5.5rem)', marginTop: '0.75rem' }}>
            Our <span className="text-red">Services</span>
          </h1>
          <p style={{ color: 'var(--gray)', marginTop: '1rem', maxWidth: 520 }}>
            From finding your first home to managing your investment portfolio — RE-ON is your complete real estate partner.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="section">
        <div className="container">
          <div className="srv__grid reveal-stagger">
            {services.map((s, i) => (
              <div key={s.title} className="srv-card reveal-on-scroll">
                <div className="srv-card__icon">{s.icon}</div>
                <h3 className="srv-card__title">{s.title}</h3>
                <p className="srv-card__desc">{s.desc}</p>
                <ul className="srv-card__list">
                  {s.highlights.map(h => (
                    <li key={h}><span className="srv-card__dot" />  {h}</li>
                  ))}
                </ul>
                <Link to="/contact" className="srv-card__cta">Get Started <ArrowRight size={14} /></Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose RE-ON */}
      <section className="section srv__why">
        <div className="container">
          <div className="srv__why-inner">
            <div className="srv__why-left reveal-on-scroll reveal--left">
              <p className="section-label">Why RE-ON</p>
              <h2 className="headline-lg" style={{ fontSize: 'clamp(2rem,5vw,3.2rem)', marginTop: '0.5rem' }}>
                Navi Mumbai's Most Trusted<br />Real Estate Partner
              </h2>
              <p style={{ color: 'var(--gray)', marginTop: '1rem', lineHeight: 1.7 }}>
                With over 17 years of combined expertise in real estate, we've built lasting relationships with Navi Mumbai's top developers while always keeping our clients' interests first.
              </p>
              <p style={{ color: 'var(--gray)', marginTop: '0.75rem', lineHeight: 1.7 }}>
                Our team of certified real estate consultants, legal advisors, and financial experts work together to give you a seamless, stress-free experience from day one.
              </p>
              <Link to="/contact" className="btn-accent" style={{ marginTop: '2rem' }}>
                Talk to an Expert <ArrowRight size={16} />
              </Link>
            </div>
            <div className="srv__why-stats reveal-on-scroll reveal--right reveal-delay-2">
              {whyUs.map(({ value, label }) => (
                <div key={label} className="srv__why-stat">
                  <span className="srv__why-stat-val">{value}</span>
                  <span className="srv__why-stat-label">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="home__cta-banner">
        <div className="container">
          <div className="home__cta-inner">
            <div className="reveal-on-scroll reveal--left">
              <p className="section-label">Free Consultation</p>
              <h2 className="headline-lg home__cta-title">Not Sure Where to Start?</h2>
              <p style={{ color: 'var(--cream-muted)', marginTop: '0.75rem' }}>Book a free 30-minute consultation with our experts. No pressure, just clarity.</p>
            </div>
            <div className="home__cta-actions reveal-on-scroll reveal--right reveal-delay-2">
              <Link to="/contact" className="btn-accent">Book Now <ArrowRight size={16} /></Link>
              <a href="tel:+919876543210" className="btn-outline">Call Us</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
