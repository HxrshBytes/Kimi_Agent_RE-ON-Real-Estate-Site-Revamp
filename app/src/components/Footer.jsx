import { Link } from 'react-router-dom'
import { MapPin, Phone, Mail, Instagram, Facebook, Youtube, ArrowRight } from 'lucide-react'
import './Footer.css'

function ThreadsIcon({ size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 192 192"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block' }}
    >
      <path
        d="M141.537 88.9883C140.71 88.5919 139.87 88.2104 139.019 87.8451C137.537 60.5382 122.616 44.905 97.5619 44.745C97.4184 44.7443 97.2748 44.7443 97.1311 44.745C75.808 44.745 57.5132 58.7424 50.0827 80.8986C43.2081 101.397 48.0694 123.774 62.7758 139.297C77.4822 154.82 99.4149 160.778 120.088 154.88C138.411 149.652 153.308 135.347 159.458 116.923C161.42 111.037 158.204 104.664 152.274 102.716C146.344 100.767 139.948 103.963 137.986 109.849C133.568 123.084 122.868 133.364 109.704 137.12C94.8839 141.353 79.1601 137.078 68.6186 125.952C58.0771 114.826 54.5888 98.7844 59.5168 84.0933C64.9744 67.8282 78.4354 57.545 94.1311 57.545C94.2393 57.5443 94.3475 57.5443 94.4556 57.545C112.562 57.6606 123.513 69.3175 125.042 90.0461C117.842 88.6657 110.155 88.3512 102.164 89.1171C79.8051 91.2612 65.3458 104.996 66.8675 123.011C67.6258 131.989 72.3396 139.814 79.9149 144.646C87.4902 149.479 97.0543 150.774 106.376 148.232C118.661 144.884 128.093 136.031 133.003 123.639C136.786 128.406 141.42 132.392 146.732 135.341C151.782 138.146 158.128 136.372 160.952 131.355C163.776 126.338 162.007 120.033 156.957 117.228C150.312 113.538 144.922 107.962 141.537 101.129C142.607 97.0427 143.14 92.9363 143.14 88.9883H141.537ZM103.35 135.539C98.4239 136.883 93.3644 136.198 89.3621 133.645C85.3597 131.092 82.8687 126.963 82.4697 122.239C81.6504 112.551 90.0464 103.626 103.626 102.325C108.971 101.812 114.281 102.164 119.387 103.332C116.892 122.616 110.155 133.684 103.35 135.539Z"
      />
    </svg>
  )
}

const quickLinks = [
  { to: '/properties', label: 'Properties' },
  { to: '/services', label: 'Our Services' },
  { to: '/about', label: 'About Us' },
  { to: '/blog', label: 'Blogs' },
  { to: '/news', label: 'Real Estate News' },
  { to: '/career', label: 'Career' },
  { to: '/contact', label: 'Contact' },
]

const localities = ['Kharghar', 'Panvel', 'Taloja', 'Ulwe', 'Dronagiri', 'Ghansoli', 'Vashi', 'Airoli']

export default function Footer() {
  return (
    <footer className="footer">
      {/* Full-width Map Banner */}
      <div className="footer__map-banner">
        <iframe
          title="SM Heights Location - RE-ON Real Estate"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3770.3!2d73.0965223!3d19.0811616!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7ea0d1fff9eed%3A0xe9b3604843d02e56!2sSM%20Heights!5e0!3m2!1sen!2sin!4v1723376738000!5m2!1sen!2sin"
          width="100%"
          height="340"
          style={{ border: 0, display: 'block' }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div className="container">
        <div className="footer__top">
          {/* Brand */}
          <div className="footer__brand">
            <Link to="/" className="footer__logo" aria-label="RE-ON Real Estate">
              <div className="footer__logo-wrap">
                <img src="/images/reon-logo.png" alt="RE-ON Real Estate" className="footer__logo-img" />
              </div>
            </Link>
            <p className="footer__tagline">
              Navi Mumbai's most trusted real estate partner. We help you find, buy and invest in properties that grow your future.
            </p>
            <div className="footer__socials">
              <a href="#" aria-label="Instagram"><Instagram size={18} /></a>
              <a href="#" aria-label="Facebook"><Facebook size={18} /></a>
              <a href="#" aria-label="Threads"><ThreadsIcon size={18} /></a>
              <a href="#" aria-label="YouTube"><Youtube size={18} /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer__col">
            <h4 className="footer__col-title">Quick Links</h4>
            <ul>
              {quickLinks.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="footer__link">
                    <ArrowRight size={13} /> {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Localities */}
          <div className="footer__col">
            <h4 className="footer__col-title">Localities</h4>
            <ul>
              {localities.map(loc => (
                <li key={loc}>
                  <Link to="/properties" className="footer__link">
                    <ArrowRight size={13} /> {loc}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="footer__col">
            <h4 className="footer__col-title">Contact</h4>
            <ul className="footer__contact-list">
              <li>
                <MapPin size={15} />
                <span>Shop No - 1, SM Heights, Plot No:34,<br />Taloja Phase 1, Sector-5, Taloja,<br />Panvel, Maharashtra 410208</span>
              </li>
              <li>
                <Phone size={15} />
                <a href="tel:+918591944460">+91 85919-44460</a>
              </li>
              <li>
                <Mail size={15} />
                <a href="mailto:info@reonrealestatellp.com">info@reonrealestatellp.com</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer__bottom">
          <p>© {new Date().getFullYear()} RE-ON Real Estate LLP. All rights reserved.</p>
          <div className="footer__bottom-links">
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Use</a>
            <a href="https://maharera.maharashtra.gov.in/" target="_blank" rel="noopener noreferrer">MahaRERA Registered</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
