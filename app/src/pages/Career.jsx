import { useState } from 'react'
import { Briefcase, MapPin, Clock, ArrowRight, ChevronDown, ChevronUp, Wallet, TrendingUp, GraduationCap, HeartHandshake } from 'lucide-react'
import './Career.css'

const openings = [
  { id: 1, title: 'Senior Real Estate Consultant', dept: 'Sales', location: 'Kharghar, Navi Mumbai', type: 'Full-time', exp: '3–6 years', desc: 'We are looking for an experienced real estate consultant to join our high-performing sales team. You will manage client relationships, conduct site visits, and close deals across residential projects in Navi Mumbai.' },
  { id: 2, title: 'Property Investment Advisor', dept: 'Advisory', location: 'Panvel, Navi Mumbai', type: 'Full-time', exp: '2–5 years', desc: 'Guide HNI clients and NRIs in building profitable real estate portfolios. You will conduct market analysis, present investment opportunities, and manage long-term client relationships.' },
  { id: 3, title: 'Digital Marketing Manager', dept: 'Marketing', location: 'Remote / Navi Mumbai', type: 'Full-time', exp: '3–5 years', desc: 'Lead our digital marketing efforts including SEO, paid campaigns, social media, and content strategy. You will own the brand presence and generate quality leads for our sales team.' },
  { id: 4, title: 'Legal & Documentation Executive', dept: 'Legal', location: 'Taloja, Navi Mumbai', type: 'Full-time', exp: '1–3 years', desc: 'Assist clients with property documentation, RERA verification, title checks, and registration. Knowledge of Maharashtra property laws and stamp duty regulations is essential.' },
  { id: 5, title: 'Home Loan Relationship Manager', dept: 'Finance', location: 'Ulwe, Navi Mumbai', type: 'Full-time', exp: '2–4 years', desc: 'Partner with banks and HFCs to help clients secure the best home loan deals. You will manage the end-to-end loan application process and maintain strong lender relationships.' },
  { id: 6, title: 'Junior Property Consultant', dept: 'Sales', location: 'Navi Mumbai (Multiple)', type: 'Full-time', exp: '0–2 years', desc: 'An exciting opportunity for fresh graduates or early-career professionals passionate about real estate. Full training provided. Great commission structure and growth potential.' },
]

const perks = [
  { icon: <Wallet size={26} />, title: 'Competitive Pay', desc: 'Industry-leading CTC with performance bonuses and attractive commission structures.' },
  { icon: <TrendingUp size={26} />, title: 'Fast Growth', desc: 'Clear promotion paths with quarterly reviews. Many of our managers started as juniors.' },
  { icon: <GraduationCap size={26} />, title: 'Learning & Development', desc: 'Regular training workshops, certifications, and access to industry events.' },
  { icon: <HeartHandshake size={26} />, title: 'Work-Life Balance', desc: 'Flexible hours, 24 paid leaves, and a culture that respects your personal time.' },
]

function JobCard({ job }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`job-card${open ? ' job-card--open' : ''}`}>
      <div className="job-card__header" onClick={() => setOpen(!open)}>
        <div className="job-card__meta">
          <span className="badge">{job.dept}</span>
          <h3 className="job-card__title">{job.title}</h3>
          <div className="job-card__tags">
            <span><MapPin size={12} /> {job.location}</span>
            <span><Clock size={12} /> {job.type}</span>
            <span><Briefcase size={12} /> {job.exp}</span>
          </div>
        </div>
        <button className="job-card__toggle">
          {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>
      {open && (
        <div className="job-card__body">
          <p>{job.desc}</p>
          <a href="mailto:careers@reon.com?subject=Application: ${job.title}" className="btn-accent" style={{ marginTop: '1.25rem', display: 'inline-flex', gap: '0.5rem' }}>
            Apply Now <ArrowRight size={16} />
          </a>
        </div>
      )}
    </div>
  )
}

export default function Career() {
  return (
    <div>
      <section className="page-hero">
        <div className="container">
          <p className="section-label">Join Our Team</p>
          <h1 className="headline-xl" style={{ fontSize: 'clamp(2.5rem,7vw,5.5rem)', marginTop: '0.75rem' }}>
            Build Your<br /><span className="text-red">Career</span> with<br />RE-ON
          </h1>
          <p style={{ color: 'var(--gray)', marginTop: '1rem', maxWidth: 500 }}>
            We are always looking for passionate, driven individuals who share our commitment to excellence in real estate.
          </p>
        </div>
      </section>

      {/* Perks */}
      <section className="section">
        <div className="container">
          <p className="section-label">Why RE-ON</p>
          <h2 className="headline-lg" style={{ fontSize: 'clamp(2rem,4vw,3rem)', marginBottom: '2.5rem' }}>Why Work With Us</h2>
          <div className="career__perks-grid reveal-stagger">
            {perks.map((p) => (
              <div key={p.title} className="career__perk reveal-on-scroll">
                <span className="career__perk-icon">{p.icon}</span>
                <h3 className="career__perk-title">{p.title}</h3>
                <p className="career__perk-desc">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Openings */}
      <section className="section career__openings-section">
        <div className="container">
          <p className="section-label">Open Roles</p>
          <h2 className="headline-lg" style={{ fontSize: 'clamp(2rem,4vw,3rem)', marginBottom: '2.5rem' }}>Current Openings</h2>
          <div className="career__openings reveal-stagger">
            {openings.map((job) => (
              <div key={job.id} className="reveal-on-scroll">
                <JobCard job={job} />
              </div>
            ))}
          </div>
          <div className="career__general-apply">
            <p>Don't see a role that fits? Send us your resume anyway.</p>
            <a href="mailto:careers@reon.com" className="btn-accent">
              General Application <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
