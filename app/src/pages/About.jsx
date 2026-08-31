import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Award, Heart, Target, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import './About.css'

const values = [
  { icon: <Heart size={24} />, title: 'Exclusivity', desc: 'We represent only a handful of exceptional projects at any given time, dedicating full creative and strategic resources to each.' },
  { icon: <Target size={24} />, title: 'Design Appreciation', desc: 'True luxury is when functionality meets timeless design. We curate spaces that are extraordinary — not ordinary.' },
  { icon: <Award size={24} />, title: 'Uncompromised Quality', desc: 'We partner only with RERA-compliant developers who share our vision for extraordinary living spaces.' },
  { icon: <Zap size={24} />, title: 'Client Alignment', desc: 'Our mandate-only model means we are fundamentally aligned with our clients — never just pushing volume.' },
]

const milestones = [
  { year: '2010', event: 'Yassar begins his journey by founding Zara Homes, creating a strategic bridge between developers and buyers.' },
  { year: '2012', event: 'Sanchit enters the real estate domain, bringing civil engineering expertise to the industry.' },
  { year: '2018', event: 'RE-ON Real Estate LLP founded — a boutique advisory firm built on exclusivity and curation.' },
  { year: '2020', event: 'Pivoted to virtual tours during pandemic — served clients remotely with zero service gaps.' },
  { year: '2023', event: 'Revaa Homes launched — upgrading real estate marketing with data-driven funnels and technology.' },
  { year: '2026', event: 'Recognised as Navi Mumbai\'s trusted performance real estate and luxury advisory partner.' },
]

export default function About() {
  const [isExpanded, setIsExpanded] = useState(false)
  const toggleExpanded = () => setIsExpanded((prev) => !prev)

  return (
    <div>
      <section className="page-hero">
        <div className="container">
          <p className="section-label">The RE-ON Story</p>
          <h1 className="headline-xl" style={{ fontSize: 'clamp(2.5rem,7vw,5.5rem)', marginTop: '0.75rem' }}>
            We Redefine <span className="text-red">Luxury</span>
          </h1>
          <p style={{ color: 'var(--gray)', marginTop: '1rem', maxWidth: 560, lineHeight: 1.7 }}>
            Through Design & Curation. RE-ON is not a traditional brokerage — we are a boutique real estate advisory firm built on exclusivity, design appreciation, and uncompromised quality.
          </p>
        </div>
      </section>

      {/* Philosophy section */}
      <section className="section">
        <div className="container">
          <div className="about__story">
            <div className="about__story-img reveal-on-scroll reveal--left">
              <img src="https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=800&q=80" alt="RE-ON office" />
              <div className="about__story-badge">
                <span className="about__badge-num">17+</span>
                <span className="about__badge-label">Years of Expertise</span>
              </div>
            </div>
            <div className="about__story-text reveal-on-scroll reveal--right reveal-delay-2">
              <p className="section-label">Our Philosophy</p>
              <h2 className="headline-lg" style={{ fontSize: 'clamp(2rem,4vw,3rem)', marginTop: '0.5rem' }}>
                Beyond Transactions. Building Legacies.
              </h2>
              <p style={{ color: 'var(--gray)', marginTop: '1.25rem', lineHeight: 1.8 }}>
                The Indian luxury real estate market is often cluttered with noise. We started RE-ON to provide clarity. We believe that truly great properties require a different approach to representation — one that treats real estate not as a high-volume commodity, but as a carefully curated art form.
              </p>
              <p style={{ color: 'var(--gray)', marginTop: '0.75rem', lineHeight: 1.8 }}>
                Our mandate-only model means we are fundamentally aligned with our clients. We only represent a handful of exceptional projects at any given time, allowing us to dedicate our full creative and strategic resources to positioning them correctly in the market and ensuring they reach the right discerning buyers.
              </p>
              <p style={{ color: 'var(--gray)', marginTop: '0.75rem', lineHeight: 1.8 }}>
                We partner only with developers and clients who share our vision for extraordinary living spaces across Navi Mumbai's prime corridors including Kharghar, Panvel, Taloja, and Ulwe.
              </p>
              <Link to="/services" className="btn-accent" style={{ marginTop: '2rem' }}>
                Explore Our Services <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Design Philosophy Quote */}
      <section className="section" style={{ padding: '3rem 0', textAlign: 'center' }}>
        <div className="container">
          <blockquote style={{ maxWidth: 600, margin: '0 auto', fontStyle: 'italic', color: 'var(--cream)', fontSize: 'clamp(1.2rem, 2.5vw, 1.6rem)', lineHeight: 1.7, borderLeft: '3px solid var(--red)', paddingLeft: '1.5rem' }}>
            "True luxury is when functionality meets timeless design."
            <footer style={{ fontSize: '0.9rem', color: 'var(--gray)', marginTop: '1rem', fontStyle: 'normal' }}>— The RE-ON Ethos</footer>
          </blockquote>
        </div>
      </section>

      {/* Values */}
      <section className="section about__values-section">
        <div className="container">
          <p className="section-label text-center" style={{ justifyContent: 'center' }}>What Drives Us</p>
          <h2 className="headline-lg text-center" style={{ fontSize: 'clamp(2rem,4vw,3rem)', margin: '0.5rem 0 2.5rem' }}>Our Core Values</h2>
          <div className="about__values-grid reveal-stagger">
            {values.map((v, i) => (
              <div key={v.title} className="about__value-card reveal-on-scroll">
                <div className="about__value-icon">{v.icon}</div>
                <h3 className="about__value-title">{v.title}</h3>
                <p className="about__value-desc">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="section">
        <div className="container">
          <p className="section-label">Our Journey</p>
          <h2 className="headline-lg" style={{ fontSize: 'clamp(2rem,4vw,3rem)', marginBottom: '3rem' }}>Milestones</h2>
          <div className="about__timeline reveal-stagger">
            {milestones.map((m) => (
              <div key={m.year} className="about__milestone reveal-on-scroll">
                <span className="about__milestone-year">{m.year}</span>
                <p className="about__milestone-event">{m.event}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="section about__team-section">
        <div className="container">
          <p className="section-label">The People Behind RE-ON</p>
          <h2 className="headline-lg" style={{ fontSize: 'clamp(2rem,4vw,3rem)', marginBottom: '2.5rem' }}>Leadership</h2>
          <div className="about__team-grid reveal-stagger">
            {/* Yassararafat Kareem Rawthar Card */}
            <div className="about__team-card about__team-card--founder reveal-on-scroll">
              <div className="about__team-img">
                <img src="https://reonrealestatellp.com/yassar_new.jpeg" alt="Yassararafat Kareem Rawthar" loading="lazy" />
              </div>
              <div className="about__team-content">
                <h3 className="about__team-name">Yassararafat Kareem Rawthar</h3>
                <p className="about__team-role">FOUNDER &amp; HEAD OF STRATEGIC SALES &amp; MARKETING</p>
                <div className="about__team-bio about__team-bio--rich">
                  <p className="about__founder-lead-sub">
                    16+ Years of Building Real Estate Sales, Marketing &amp; Growth
                  </p>

                  <p className="about__founder-lead-p">
                    My journey in real estate began in 2010, when I founded Zara Homes with a clear objective — to create a strong bridge between real estate developers and the right customers.
                  </p>

                  {isExpanded && (
                    <div className="about__team-bio-expanded">
                      <p>
                        At a time when the real estate market in Taloja, Panvel and Navi Mumbai was rapidly evolving, Zara Homes focused on helping developers strategically market and sell their residential and commercial inventories through the channel partner model.
                      </p>
                      <p>
                        My role was never limited to simply selling properties.
                      </p>
                      <p>
                        I focused on understanding the developer's inventory, identifying the right customer segments, creating sales strategies, developing marketing funnels and generating a consistent flow of investors and end users.
                      </p>

                      <h4 className="about__bio-subheading">The Zara Homes Era — 2010 to 2022</h4>
                      <p>
                        Over 12 years, Zara Homes became a trusted sales and marketing partner for multiple real estate developers.
                      </p>
                      <p>
                        The objective was simple:
                      </p>
                      <blockquote className="about__bio-quote">
                        “Understand the inventory.<br />
                        Understand the market.<br />
                        Find the right customers.<br />
                        Create the right sales funnel.<br />
                        Convert opportunities into transactions”.
                      </blockquote>
                      <p>
                        Through this approach, I developed a reputation for helping developers move inventory within challenging market conditions and creating predictable sales pipelines.
                      </p>
                      <p>
                        The experience taught me that successful real estate sales are not only about property — they are about strategy, timing, positioning, customer psychology and execution.
                      </p>

                      <h4 className="about__bio-subheading">Revaa Homes — The Next Evolution</h4>
                      <p>
                        As the real estate industry changed, so did the way customers discovered and purchased property.
                      </p>
                      <p>
                        Technology, digital marketing, data-driven lead generation and modern sales processes were becoming increasingly important.
                      </p>
                      <p>
                        In 2023, I took the next step in my journey with Revaa Homes.
                      </p>
                      <p>
                        The objective was to upgrade the traditional real estate sales model by combining technology, modern marketing and structured sales systems.
                      </p>
                      <p>
                        The idea was to create a more modern face for real estate marketing — one that could adapt to changing customer behaviour and help developers reach their target audience more effectively.
                      </p>
                      <p>
                        Once again, the focus remained the same:
                      </p>
                      <ul className="about__bio-list">
                        <li>Generate quality enquiries.</li>
                        <li>Build strong sales funnels.</li>
                        <li>Create customer engagement.</li>
                        <li>Convert opportunities.</li>
                        <li>Deliver sales.</li>
                      </ul>
                      <p>
                        Revaa Homes once again strengthened my position as a strategic sales and marketing partner for developers, particularly across the Navi Mumbai real estate market.
                      </p>

                      <h4 className="about__bio-subheading">From Selling Properties to Building Sales Systems</h4>
                      <p>
                        Over the years, I realised that my real strength was not simply selling individual properties.
                      </p>
                      <p>
                        It was building systems that sell inventory.
                      </p>
                      <p>
                        Every project has its own challenges.
                      </p>
                      <ul className="about__bio-list">
                        <li>Different locations require different strategies.</li>
                        <li>Different inventories require different customer profiles.</li>
                        <li>Different market cycles require different sales approaches.</li>
                      </ul>
                      <p>
                        My role has therefore evolved into understanding the complete journey:
                      </p>
                      <p className="about__bio-pipeline">
                        Developer → Inventory → Market Positioning → Marketing → Lead Generation → Sales Funnel → Customer → Transaction
                      </p>
                      <p>
                        The ability to connect these elements has been at the core of my career.
                      </p>

                      <h4 className="about__bio-subheading">16 Years. One Core Philosophy.</h4>
                      <p>
                        With approximately 16 years of experience in real estate sales and marketing, my journey has been built around one fundamental objective:
                      </p>
                      <p className="about__bio-highlight">
                        Helping developers convert inventory into sustainable cash flow.
                      </p>
                      <p>
                        From the early days of traditional channel sales to the era of digital marketing, technology and structured sales funnels, I have continuously adapted my approach to the changing real estate market.
                      </p>
                      <p>
                        My experience spans residential and commercial real estate, with a strong understanding of the Taloja, Panvel and Navi Mumbai markets.
                      </p>
                      <p>
                        I have worked through multiple market cycles, challenging sales environments and changing customer behaviours — continuously upgrading strategies to match the market.
                      </p>

                      <h4 className="about__bio-subheading">Today</h4>
                      <p>
                        Today, my focus is on building the next generation of real estate sales and marketing.
                      </p>
                      <p>
                        Through RE-ON Real Estate, I am working towards creating a more structured, technology-driven and performance-oriented real estate platform.
                      </p>
                      <p>
                        The vision is not simply to become another real estate consultancy.
                      </p>
                      <p>
                        It is to build an organisation that developers can rely on when they need:
                      </p>
                      <ul className="about__bio-list">
                        <li>Strategic Marketing.</li>
                        <li>Qualified Customers.</li>
                        <li>Strong Sales Funnels.</li>
                        <li>Faster Inventory Movement.</li>
                        <li>Predictable Sales Performance.</li>
                      </ul>
                      <p>
                        My journey started with Zara Homes in 2010.
                      </p>
                      <p>
                        It evolved through Revaa Homes in 2023.
                      </p>
                      <p>
                        And today, that experience continues to shape the vision of RE-ON Real Estate.
                      </p>

                      <div className="about__bio-final-quote">
                        <p>“16 Years of Experience.</p>
                        <p>Thousands of Conversations.</p>
                        <p>Multiple Market Cycles.</p>
                        <p>One Constant Objective:</p>
                        <p className="about__bio-final-punch">Turn Real Estate Inventory Into Real Business.”</p>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className="about__show-more-btn"
                    onClick={toggleExpanded}
                  >
                    {isExpanded ? (
                      <>Show Less <ChevronUp size={16} /></>
                    ) : (
                      <>Show More <ChevronDown size={16} /></>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Sanchit Prakash Revandkar Card */}
            <div className="about__team-card about__team-card--founder reveal-on-scroll">
              <div className="about__team-img">
                <img src="https://reonrealestatellp.com/sanchit_new.jpeg" alt="Sanchit Prakash Revandkar" loading="lazy" />
              </div>
              <div className="about__team-content">
                <h3 className="about__team-name">Sanchit Prakash Revandkar</h3>
                <p className="about__team-role">CO-FOUNDER &amp; VISIONARY</p>
                <div className="about__team-bio about__team-bio--rich">
                  <p className="about__founder-lead-sub">
                    Building Businesses. Creating Value. Driving Real Estate Growth.
                  </p>

                  <p className="about__founder-lead-p">
                    Sanchit Prakash Revandkar is an entrepreneur and real estate professional with a strong background spanning construction, real estate development, sales, marketing, and strategic monetisation of real estate inventory.
                  </p>

                  {isExpanded && (
                    <div className="about__team-bio-expanded">
                      <p>
                        His journey in real estate began at the ground level—with construction activities and execution. He started undertaking construction contracts for various real estate developers across Mumbai, gaining practical experience in project execution, developer requirements, construction management, and the commercial realities of the real estate industry.
                      </p>
                      <p>
                        Over time, Sanchit built a strong individual profile and, with a vision to create a more organised construction platform, established Prakash Enterprises.
                      </p>

                      <h4 className="about__bio-subheading">Prakash Enterprises — A One-Stop Construction Solution</h4>
                      <p>
                        Prakash Enterprises was developed as a one-stop solution for real estate developers, operating on a lock-and-key construction model.
                      </p>
                      <p>
                        The objective was simple: allow developers to focus on the broader development and commercial aspects of their projects while Prakash Enterprises managed the construction requirements and execution.
                      </p>
                      <p>
                        Through this journey, Sanchit gained extensive exposure to the complete lifecycle of real estate projects—from construction and contractor management to project economics and developer relationships.
                      </p>

                      <h4 className="about__bio-subheading">Entering Real Estate Operations — SD Developers &amp; Consultants Pvt. Ltd.</h4>
                      <p>
                        In 2017, Sanchit launched SD Developers &amp; Consultants Pvt. Ltd., taking his entrepreneurial journey a step further into the ownership and operation of real estate.
                      </p>
                      <p>
                        The company’s core activities included:
                      </p>
                      <ul className="about__bio-list">
                        <li>Buying and selling real estate</li>
                        <li>Owning and operating apartments and dwellings</li>
                        <li>Ownership and operation of non-residential buildings</li>
                        <li>Development of real estate</li>
                        <li>Subdivision and development of land into saleable lots</li>
                        <li>Strategic monetisation of real estate assets</li>
                      </ul>
                      <p>
                        This phase gave Sanchit valuable experience not only as a service provider to developers but also from the perspective of a real estate owner, operator and developer.
                      </p>

                      <h4 className="about__bio-subheading">NMP Empire Pvt. Ltd. — Creating a Cash-Flow Based Construction Model</h4>
                      <p>
                        Alongside his other ventures, Sanchit co-founded NMP Empire Pvt. Ltd., with a distinctive objective: to create a business model that could support real estate developers through construction services combined with sales and marketing, particularly through barter-based arrangements.
                      </p>
                      <p>
                        The concept was designed around a challenge commonly faced by developers—the need for continuous cash flow during construction.
                      </p>
                      <p>
                        NMP Empire worked with multiple builders in Mumbai, providing construction services under barter arrangements while also supporting developers through an in-house sales and marketing team.
                      </p>
                      <p>
                        This created a more flexible payment structure where part of the consideration for construction services could be received in the form of real estate inventory, which could then be strategically marketed and sold.
                      </p>

                      <h4 className="about__bio-subheading">Turning Inventory Into Construction Cash Flow</h4>
                      <p>
                        This is where Sanchit’s experience in sales strategy and inventory monetisation became a key strength.
                      </p>
                      <p>
                        Rather than simply receiving real estate inventory as payment, his approach was to develop a strategy around how and when that inventory should be sold, with the objective of generating the required cash flow for construction activities.
                      </p>
                      <p>
                        He was personally involved in:
                      </p>
                      <p className="about__bio-pipeline">
                        Inventory Planning → Pricing Strategy → Marketing → Sales Execution → Collection → Cash-Flow Generation
                      </p>
                      <p>
                        The ability to understand the commercial value of inventory, create an appropriate sales strategy and execute sales within a defined timeline became one of his strongest capabilities.
                      </p>
                      <p>
                        His experience has taught him that a real estate project is not successful merely because it is constructed—it must also be commercially structured and monetised effectively.
                      </p>

                      <h4 className="about__bio-subheading">A Focus on Timely Closures</h4>
                      <p>
                        Sanchit is particularly known for his ability to close real estate sales within committed timelines.
                      </p>
                      <p>
                        His approach is strongly execution-oriented. He focuses on understanding the project’s financial requirements, identifying the right inventory to monetise, creating an appropriate sales strategy and driving the sales process with a clear target.
                      </p>
                      <p>
                        The objective is not merely to sell a property, but to ensure that the cash flow generated from sales reaches the project at the right time.
                      </p>
                      <p>
                        This experience has enabled him to work at the intersection of construction, real estate development and sales, giving him a broader understanding of how these three functions need to work together for a project to succeed.
                      </p>

                      <h4 className="about__bio-subheading">The Journey So Far</h4>
                      <p>
                        From starting as an individual construction contractor to building and operating multiple businesses across construction, real estate ownership, development, sales and marketing, Sanchit Prakash Revandkar’s journey has been built on one fundamental principle:
                      </p>
                      <p className="about__bio-highlight">
                        Understand the problem, create a commercial solution and execute it within the required timeline.
                      </p>
                      <p>
                        His experience across the different stages of the real estate ecosystem has given him a unique perspective—from constructing the asset to creating a strategy for selling it and generating the cash flow required to sustain the project.
                      </p>
                      <p>
                        Today, Sanchit continues to explore opportunities in real estate development, construction, land development, strategic sales and real estate monetisation, with a focus on creating commercially viable models that benefit both developers and end customers.
                      </p>

                      <div className="about__bio-final-quote">
                        <p className="about__bio-final-punch">Construction. Development. Sales. Cash Flow. Execution.</p>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className="about__show-more-btn"
                    onClick={toggleExpanded}
                  >
                    {isExpanded ? (
                      <>Show Less <ChevronUp size={16} /></>
                    ) : (
                      <>Show More <ChevronDown size={16} /></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
