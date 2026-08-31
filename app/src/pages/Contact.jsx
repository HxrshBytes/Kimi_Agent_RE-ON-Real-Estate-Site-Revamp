import { useState } from 'react'
import { MapPin, Phone, Mail, Clock, Send, CheckCircle, ExternalLink } from 'lucide-react'
import { useAdmin } from '../contexts/AdminContext.jsx'
import './Contact.css'

const offices = [
  {
    city: 'Taloja HQ',
    address: 'Shop No - 1, SM Heights, Plot No:34, Taloja Phase 1, Sector-5, Taloja, Panvel, Maharashtra 410208',
    phone: '+91 85919-44460',
    email: 'info@reonrealestatellp.com',
    mapEmbed: 'https://maps.google.com/maps?q=SM+Heights,+Plot+No:34,+Taloja+Phase+1,+Sector-5,+Taloja,+Panvel,+Maharashtra+410208&t=&z=16&ie=UTF8&iwloc=&output=embed',
    mapUrl: 'https://www.google.com/maps/place/SM+Heights/@19.0811667,73.0939474,17z/data=!3m1!4b1!4m6!3m5!1s0x3be7ea0d1fff9eed:0xe9b3604843d02e56!8m2!3d19.0811616!4d73.0965223!16s%2Fg%2F11dzqr38p6?entry=ttu&g_ep=EgoyMDI2MDgxOS4wIKXMDSoASAFQAw%3D%3D'
  },
  {
    city: 'Kharghar Advisory',
    address: 'Shop No 12, Yoganand Complex, Plot No. F 103, Sector 03, Kharghar -410210',
    phone: '+91 85919-44460',
    email: 'info@reonrealestatellp.com',
    mapEmbed: 'https://maps.google.com/maps?q=Yogananda+CHS+LTD.,+Plot+No.+F+103,+Sector+03,+Kharghar+-410210&t=&z=16&ie=UTF8&iwloc=&output=embed',
    mapUrl: 'https://www.google.com/maps/place/Yogananda+CHS+LTD./@19.0302388,73.0574194,17z/data=!3m1!4b1!4m6!3m5!1s0x3be7c3132a6f6891:0x4c39c4d360cfc4b3!8m2!3d19.0302337!4d73.0599943!16s%2Fg%2F11j2zq67f6?entry=ttu&g_ep=EgoyMDI2MDgxOS4wIKXMDSoASAFQAw%3D%3D'
  },
  {
    city: 'Mumbra Advisory',
    address: 'Shop no 22, Central empire mm, valley road kausa mumbra dist, thane 400612.',
    phone: '+91 85919-44460',
    email: 'info@reonrealestatellp.com',
    mapEmbed: 'https://maps.google.com/maps?q=Central+Heights,+MM+Valley+Road,+Kausa,+Mumbra,+Thane+400612&t=&z=16&ie=UTF8&iwloc=&output=embed',
    mapUrl: 'https://www.google.com/maps/place/Central+Heights/@19.1736494,73.0280749,17z/data=!4m10!1m2!2m1!1sCentral+empire+mm,+valley+road+kausa+mumbra+dist,+thane+400612.!3m6!1s0x3be7bf1831f8ddd9:0x9c3864610a595b6a!8m2!3d19.1736039!4d73.0303445!15sCj9DZW50cmFsIGVtcGlyZSBtbSwgdmFsbGV5IHJvYWQga2F1c2EgbXVtYnJhIGRpc3QsIHRoYW5lIDQwMDYxMi6SARJhcGFydG1lbnRfYnVpbGRpbmfgAQA!16s%2Fg%2F11flzfldtj?entry=ttu&g_ep=EgoyMDI2MDgxOS4wIKXMDSoASAFQAw%3D%3D'
  },
]

const faqs = [
  { q: 'Do you charge any fee for consultation?', a: 'No. Our initial consultation is completely free. We only earn a commission from developers when a sale is successfully closed — at no additional cost to you.' },
  { q: 'Are all projects on your platform RERA registered?', a: 'Yes. We strictly list only RERA-registered projects and verified developers.' },
  { q: 'Can NRIs buy property through RE-ON?', a: 'Absolutely. We have a dedicated NRI services team that handles virtual tours, Power of Attorney, FEMA compliance, and all documentation remotely.' },
  { q: 'How quickly can I expect a response?', a: 'We typically respond within 2 business days. For urgent queries, feel free to call us directly at +91 85919-44460.' },
]

export default function Contact() {
  const { submitContactInquiry } = useAdmin()
  const [form, setForm] = useState({ name: '', email: '', phone: '', location: '', budget: '', message: '' })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [openFaq, setOpenFaq] = useState(null)

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async e => {
    e.preventDefault()
    setSubmitting(true)
    await submitContactInquiry({
      ...form,
      type: 'General Contact Inquiry',
      source: 'Contact Page',
      submittedAt: new Date().toISOString(),
    })
    setSubmitting(false)
    setSubmitted(true)
  }

  return (
    <div>
      <section className="page-hero">
        <div className="container">
          <h1 className="headline-xl" style={{ fontSize: 'clamp(2.5rem,7vw,5.5rem)', marginTop: '0.75rem' }}>
            Get in <span className="text-red">Touch</span>
          </h1>
          <p style={{ color: 'var(--gray)', marginTop: '1rem', maxWidth: 480 }}>
            Share a few details. We will respond within 2 business days.
          </p>
        </div>
      </section>

      {/* Contact form + info */}
      <section className="section">
        <div className="container contact__grid">
          {/* Form */}
          <div className="contact__form-wrap reveal-on-scroll reveal--left">
            <h2 className="headline-lg" style={{ fontSize: 'clamp(1.6rem,3vw,2.2rem)', marginBottom: '1.75rem' }}>
              TELL US WHAT YOU'RE BUILDING
            </h2>
            {submitted ? (
              <div className="contact__success">
                <CheckCircle size={48} color="#4ade80" />
                <h3>Message Sent!</h3>
                <p>Thank you, {form.name}! We will get back to you within 2 business days.</p>
                <button className="btn-accent" onClick={() => setSubmitted(false)} style={{ marginTop: '1.5rem' }}>Send Another</button>
              </div>
            ) : (
              <form className="contact__form" onSubmit={handleSubmit}>
                <div className="contact__form-row">
                  <div className="contact__field">
                    <label>Full Name *</label>
                    <input name="name" value={form.name} onChange={handleChange} placeholder="Arjun Sharma" required />
                  </div>
                  <div className="contact__field">
                    <label>Phone Number *</label>
                    <input name="phone" value={form.phone} onChange={handleChange} placeholder="+91 85919 44460" required />
                  </div>
                </div>
                <div className="contact__field">
                  <label>Email Address *</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="arjun@example.com" required />
                </div>
                <div className="contact__form-row">
                  <div className="contact__field">
                    <label>Preferred Location</label>
                    <select name="location" value={form.location} onChange={handleChange}>
                      <option value="">Select locality</option>
                      {['Kharghar','Panvel','Taloja','Ulwe','Dronagiri','Ghansoli','Vashi','Airoli'].map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <div className="contact__field">
                    <label>Budget</label>
                    <select name="budget" value={form.budget} onChange={handleChange}>
                      <option value="">Select budget</option>
                      <option>Under ₹50 Lakh</option>
                      <option>₹50L – ₹1 Crore</option>
                      <option>₹1Cr – ₹2 Crore</option>
                      <option>₹2 Crore+</option>
                    </select>
                  </div>
                </div>
                <div className="contact__field">
                  <label>Message *</label>
                  <textarea name="message" value={form.message} onChange={handleChange} rows={4} placeholder="Tell us about your project..." required />
                </div>
                <button type="submit" className="btn-accent contact__submit" disabled={submitting}>
                  <Send size={16} /> {submitting ? 'Submitting to DB...' : 'Send Message'}
                </button>
              </form>
            )}
          </div>

          {/* Info sidebar */}
          <div className="contact__info reveal-on-scroll reveal--right reveal-delay-2">
            <div className="contact__info-card">
              <Phone size={20} className="contact__info-icon" />
              <div>
                <h4>Call Us</h4>
                <a href="tel:+918591944460">+91 85919-44460</a>
                <p>24x7</p>
              </div>
            </div>
            <div className="contact__info-card">
              <Mail size={20} className="contact__info-icon" />
              <div>
                <h4>Email</h4>
                <a href="mailto:info@reonrealestatellp.com">info@reonrealestatellp.com</a>
                <p>Response within 2 business days</p>
              </div>
            </div>
            <div className="contact__info-card">
              <MapPin size={20} className="contact__info-icon" />
              <div>
                <h4>Registered Address</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--cream-muted)', lineHeight: '1.5' }}>
                  Shop No - 1, SM Heights, Plot No:34, Taloja Phase 1, Sector-5, Taloja, Panvel, Maharashtra 410208
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Offices */}
      <section className="section contact__offices-section">
        <div className="container">
          <p className="section-label">Find Us</p>
          <h2 className="headline-lg" style={{ fontSize: 'clamp(2rem,4vw,3rem)', marginBottom: '2.5rem' }}>Our Offices</h2>
          <div className="contact__offices-grid reveal-stagger">
            {offices.map((o) => (
              <div key={o.city} className="contact__office reveal-on-scroll">
                <div className="contact__office-info">
                  <div className="contact__office-header">
                    <h3 className="contact__office-city">{o.city}</h3>
                    <span className="contact__office-badge">
                      <span className="contact__office-dot" />
                      Office
                    </span>
                  </div>
                  <p className="contact__office-addr">
                    <span className="contact__office-icon"><MapPin size={11} /></span>
                    <span>{o.address}</span>
                  </p>
                  <a href={`tel:${o.phone}`} className="contact__office-phone">
                    <span className="contact__office-icon"><Phone size={11} /></span>
                    <span>{o.phone}</span>
                  </a>
                  <a href={`mailto:${o.email}`} className="contact__office-email">
                    <span className="contact__office-icon"><Mail size={11} /></span>
                    <span>{o.email}</span>
                  </a>
                </div>
                
                {o.mapEmbed && (
                  <div className="contact__office-map">
                    <iframe
                      title={`${o.city} Map`}
                      src={o.mapEmbed}
                      loading="lazy"
                      allowFullScreen
                    />
                  </div>
                )}

                {o.mapUrl && (
                  <a
                    href={o.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact__office-directions"
                  >
                    <span>Get Directions</span>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section">
        <div className="container contact__faq-wrap">
          <p className="section-label">Common Questions</p>
          <h2 className="headline-lg" style={{ fontSize: 'clamp(2rem,4vw,3rem)', marginBottom: '2rem' }}>FAQs</h2>
          <div className="contact__faqs reveal-stagger">
            {faqs.map((f, i) => (
              <div key={i} className={`contact__faq reveal-on-scroll${openFaq === i ? ' contact__faq--open' : ''}`}>
                <button className="contact__faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {f.q}
                  <span className="contact__faq-toggle">{openFaq === i ? '−' : '+'}</span>
                </button>
                {openFaq === i && <p className="contact__faq-a">{f.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
