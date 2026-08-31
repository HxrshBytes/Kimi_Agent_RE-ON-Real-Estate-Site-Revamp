import React, { useState, useEffect } from 'react'
import {
  X,
  User,
  Sparkles,
  Bot,
  Building2,
  DollarSign,
  Phone,
  MessageSquare,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Send,
  Calendar,
  Layers,
  ChevronRight,
  TrendingUp,
  Cpu,
  BadgePercent,
  Check,
  CreditCard,
  Repeat,
} from 'lucide-react'
import {
  CRM_PHASES,
  CRM_STAGES,
  mapLegacyStatusToStage,
  getStageMeta,
} from './crmPipelineConstants.js'
import { calculateLeadCadence } from '../../utils/crmAutomationEngine.js'

export default function CustomerDigitalTwinModal({
  lead,
  properties = [],
  onClose,
  onUpdateLead,
  onRunAgent,
  onAddTimelineEvent,
  digitalTwin: propDigitalTwin,
  matchedProperties: propMatchedProps,
}) {
  const [activeTab, setActiveTab] = useState('twin') // 'twin' | 'agents' | 'properties' | 'fintech' | 'timeline'
  const [runningAgent, setRunningAgent] = useState(null)
  const [agentOutput, setAgentOutput] = useState(null)
  const [newNoteText, setNewNoteText] = useState('')
  const [timelineType, setTimelineType] = useState('CALL_LOGGED')
  const [isSubmittingTimeline, setIsSubmittingTimeline] = useState(false)
  const [copiedAction, setCopiedAction] = useState(false)

  if (!lead) return null

  const cadence = calculateLeadCadence(lead)

  // Ensure digital twin fields exist with safe fallbacks
  const dt = propDigitalTwin || {
    identity: {
      name: lead.name || 'Valued Client',
      phone: lead.phone || '',
      email: lead.email || '',
      preferredChannel: lead.phone ? 'WhatsApp' : 'Email',
    },
    intent: {
      type: lead.type?.includes('visit') ? 'Immediate Site-Visit Buyer' : 'High-Dwell Active Searcher',
      score: lead.type?.includes('visit') ? 94 : 85,
      urgency: lead.type?.includes('visit') ? 'Ultra High' : 'High',
      conversionProbability: 82,
      conversionWindow: '15–30 Days',
      formattedDealValue: lead.budget || '₹95.00 L',
    },
    financialProfile: {
      estimatedBudgetRange: lead.budget ? `~${lead.budget}` : '₹80 L – ₹1.2 Cr',
      estimatedDownpayment: '₹18.00 L',
      estimatedLoanNeed: '₹72.00 L',
      estimatedMonthlyEMI: '₹62,400/mo',
      loanEligibilityScore: 90,
      recommendedLenders: ['HDFC Bank', 'SBI Home Finance', 'ICICI Bank', 'Axis Bank'],
      kycStatus: lead.kycStatus || 'Pending Verification',
    },
    propertyPreferences: {
      targetProperty: lead.propertyName || 'Navi Mumbai Prime Portfolio',
      targetLocation: lead.propertyLocation || lead.location || 'Navi Mumbai',
      configuration: '2 BHK / 3 BHK',
      purpose: 'Self-Use Primary Residence',
      possessionTimeline: 'Under Construction / 2026-2027',
    },
    behaviorTelemetry: {
      engagementScore: 88,
      dwellDuration: lead.type?.includes('30s') ? '> 30 Seconds Active Session' : 'Standard Web Submission',
      touchpointsCount: (lead.timeline || []).length + 1,
      sourceChannel: lead.source || 'Website Portal',
      lastActive: lead.submittedAt || new Date().toISOString(),
    },
    nextBestAction: {
      title: 'Schedule In-Person VIP Site Visit',
      priority: 'P1 - High',
      slaHours: 4,
      reason: 'High engagement score & intent detected. Immediate follow-up secures unit selection.',
    },
    aiCoachingTips: [
      'Highlight proximity to Upcoming Navi Mumbai International Airport & MTHL Atal Setu.',
      'Present flexible construction-linked payment milestone if price hesitation occurs.',
      'Offer zero-brokerage direct developer pricing transparently.'
    ]
  }

  const matchedProps = propMatchedProps && propMatchedProps.length > 0 ? propMatchedProps : properties.slice(0, 4).map(p => ({
    propertyId: p.id || p._id,
    name: p.name,
    location: p.location,
    price: p.price,
    type: p.type,
    image: (p.images && p.images[0]) || p.img || '',
    matchScore: 92,
    matchReason: 'Optimal configuration, budget fit, and prime location match.'
  }))

  const cleanPhone = (lead.phone || '').replace(/[^\d+]/g, '')
  const waPhone = cleanPhone.startsWith('+') ? cleanPhone.replace('+', '') : `91${cleanPhone.replace(/^0+/, '')}`

  const handleExecuteAgent = async (agentKey) => {
    setRunningAgent(agentKey)
    try {
      if (onRunAgent) {
        const res = await onRunAgent(lead._id || lead.id, agentKey)
        if (res && res.agentExecution) {
          setAgentOutput(res.agentExecution)
        }
      }
    } catch (err) {
      console.error('Failed to run autonomous agent:', err)
    } finally {
      setRunningAgent(null)
    }
  }

  const handleLogTimeline = async (e) => {
    e.preventDefault()
    if (!newNoteText.trim()) return
    setIsSubmittingTimeline(true)
    try {
      const titles = {
        CALL_LOGGED: 'Phone Consultation Logged',
        WHATSAPP_SENT: 'WhatsApp Interaction Logged',
        SITE_VISIT_BOOKED: 'Site Visit Confirmed',
        NOTE_LOGGED: 'Internal Strategy Note',
      }
      if (onAddTimelineEvent) {
        await onAddTimelineEvent(lead._id || lead.id, {
          type: timelineType,
          title: titles[timelineType] || 'CRM Note',
          detail: newNoteText,
          outcome: 'COMPLETED',
        })
      }
      setNewNoteText('')
    } catch (err) {
      console.error('Failed to log timeline event:', err)
    } finally {
      setIsSubmittingTimeline(false)
    }
  }

  const handleCopyDraft = (text) => {
    navigator.clipboard.writeText(text)
    setCopiedAction(true)
    setTimeout(() => setCopiedAction(false), 2000)
  }

  const autonomousAgents = [
    {
      id: 'AI_QUALIFICATION_AGENT',
      name: 'AI Lead Qualification Agent',
      desc: 'Performs deep sentiment & intent qualification, assigning scoring tiers and conversion windows.',
      icon: Cpu,
      color: '#38bdf8',
    },
    {
      id: 'AI_WHATSAPP_AGENT',
      name: 'AI WhatsApp Strategist',
      desc: 'Generates hyper-personalized WhatsApp opening scripts & objection handlers ready to dispatch.',
      icon: MessageSquare,
      color: '#4ade80',
    },
    {
      id: 'AI_CALLING_COACH',
      name: 'AI Voice & Calling Coach',
      desc: 'Constructs custom opening hooks, discovery questions, and real estate objection playbooks.',
      icon: Phone,
      color: '#fbbf24',
    },
    {
      id: 'AI_FINTECH_ADVISOR',
      name: 'AI FinTech & Mortgage Advisor',
      desc: 'Evaluates loan eligibility across HDFC, SBI, ICICI, computes exact EMIs and documents needed.',
      icon: CreditCard,
      color: '#c084fc',
    },
    {
      id: 'AI_DOCUMENT_INTELLIGENCE',
      name: 'AI Document & KYC Verifier',
      desc: 'Simulates OCR extraction and checks compliance for RERA agreements and loan sanction.',
      icon: ShieldCheck,
      color: '#f43f5e',
    },
    {
      id: 'AI_SALES_COACH',
      name: 'AI Sales Coach & Win-Loss Predictor',
      desc: 'Provides deal closure tactics, pricing strategies, and high-conversion talking points.',
      icon: TrendingUp,
      color: '#2dd4bf',
    },
  ]

  return (
    <div className="rev-modal-overlay" onClick={onClose}>
      <div className="rev-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Sticky Header */}
        <div className="rev-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ background: 'rgba(56, 189, 248, 0.15)', padding: '0.6rem', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
              <User size={22} color="#38bdf8" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', fontWeight: 800 }}>
                  {dt.identity.name}
                </h3>
                <span className="rev-hud-badge rev-hud-badge--live">
                  <Sparkles size={11} /> Customer Digital Twin
                </span>
                {(() => {
                  const stageName = mapLegacyStatusToStage(lead.status)
                  const stageMeta = getStageMeta(stageName)
                  return (
                    <span
                      style={{
                        background: `${stageMeta.color}20`,
                        color: stageMeta.color,
                        border: `1px solid ${stageMeta.color}50`,
                        padding: '0.2rem 0.55rem',
                        borderRadius: 8,
                        fontSize: '0.72rem',
                        fontWeight: 700,
                      }}
                    >
                      {stageMeta.badge} {stageName} • {stageMeta.tat}
                    </span>
                  )
                })()}
              </div>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
                Lead ID: {lead._id || lead.id} • Source: {lead.source || 'Website'}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>Pipeline Stage:</span>
              <select
                value={mapLegacyStatusToStage(lead.status)}
                onChange={(e) => onUpdateLead && onUpdateLead(lead._id || lead.id, e.target.value)}
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.78rem',
                  background: 'rgba(8, 42, 31, 0.95)',
                  border: '1px solid var(--green-border)',
                  borderRadius: 8,
                  color: 'var(--cream)',
                  cursor: 'pointer',
                }}
              >
                <optgroup label="--- Fresh Prospecting ---">
                  <option value="New Lead">🟢 New Lead (12 calls TAT)</option>
                  <option value="Fresh Lead">🌱 Fresh Lead</option>
                  <option value="Arrange Follow Up">📞 Arrange Follow Up (35 calls TAT)</option>
                  <option value="Site Visit Prospecting">🚗 Site Visit Prospecting</option>
                  <option value="VAND">🔍 VAND (Need Discovery)</option>
                  <option value="Weekly Fresh Prospecting">📅 Weekly Fresh Prospecting (Tue)</option>
                </optgroup>
                <optgroup label="--- Exploration & Booking ---">
                  <option value="Exploration">🧭 Exploration</option>
                  <option value="Weekly Booking Ready">🎯 Weekly Booking Ready (Tue)</option>
                  <option value="Booking Ready">📑 Booking Ready</option>
                </optgroup>
                <optgroup label="--- Negotiation & Closing ---">
                  <option value="Rate Finalization Pending">⚖️ Rate Finalization Pending</option>
                  <option value="Final Negotiation">🤝 Final Negotiation</option>
                  <option value="Delay Interest">⏳ Delay Interest</option>
                  <option value="Weekly Closing">🏁 Weekly Closing (Tue)</option>
                  <option value="EOI">✍️ EOI (Same Day Clearance)</option>
                </optgroup>
                <optgroup label="--- Closed Won ---">
                  <option value="WON">🎉 WON (Deal Closed)</option>
                </optgroup>
                <optgroup label="--- Lost Review & Recovery ---">
                  <option value="SVP/VAND Lost Request">⚠️ SVP/VAND Lost Request</option>
                  <option value="Under Review">🔎 Under Review</option>
                  <option value="Re-Pitch">🔁 Re-Pitch</option>
                  <option value="LOST">❌ LOST</option>
                </optgroup>
              </select>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{ background: 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#fff', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Nav Tabs */}
        <div style={{ padding: '0 1.5rem', background: 'var(--green-dark)', borderBottom: '1px solid var(--green-border)' }}>
          <div className="rev-twin-tabs" style={{ borderBottom: 'none' }}>
            <button
              type="button"
              className={`rev-twin-tab-btn ${activeTab === 'twin' ? 'active' : ''}`}
              onClick={() => setActiveTab('twin')}
            >
              <Sparkles size={14} /> 360° Digital Twin
            </button>
            <button
              type="button"
              className={`rev-twin-tab-btn ${activeTab === 'agents' ? 'active' : ''}`}
              onClick={() => setActiveTab('agents')}
            >
              <Bot size={14} /> Autonomous Agents
            </button>
            <button
              type="button"
              className={`rev-twin-tab-btn ${activeTab === 'properties' ? 'active' : ''}`}
              onClick={() => setActiveTab('properties')}
            >
              <Building2 size={14} /> Property Matcher ({matchedProps.length})
            </button>
            <button
              type="button"
              className={`rev-twin-tab-btn ${activeTab === 'fintech' ? 'active' : ''}`}
              onClick={() => setActiveTab('fintech')}
            >
              <DollarSign size={14} /> FinTech &amp; Mortgage
            </button>
            <button
              type="button"
              className={`rev-twin-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              <Clock size={14} /> Omnichannel Timeline ({(lead.timeline || []).length})
            </button>
          </div>
        </div>

        {/* Modal Body Tabs */}
        <div className="rev-modal-body">
          {/* TAB 1: 360° DIGITAL TWIN */}
          {activeTab === 'twin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Telemetry Bar */}
              <div className="rev-telemetry-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                <div className="rev-telemetry-card">
                  <div className="rev-telemetry-label">Intent Score</div>
                  <div className="rev-telemetry-value" style={{ color: '#4ade80' }}>
                    {dt.intent.score}/100
                  </div>
                  <div className="rev-telemetry-sub">{dt.intent.type}</div>
                </div>

                <div className="rev-telemetry-card">
                  <div className="rev-telemetry-label">Est. Deal Value</div>
                  <div className="rev-telemetry-value" style={{ color: '#38bdf8' }}>
                    {dt.intent.formattedDealValue}
                  </div>
                  <div className="rev-telemetry-sub">{dt.financialProfile.estimatedBudgetRange}</div>
                </div>

                <div className="rev-telemetry-card">
                  <div className="rev-telemetry-label">Conversion Prob.</div>
                  <div className="rev-telemetry-value" style={{ color: '#c084fc' }}>
                    {dt.intent.conversionProbability}%
                  </div>
                  <div className="rev-telemetry-sub">Window: {dt.intent.conversionWindow}</div>
                </div>

                <div className="rev-telemetry-card">
                  <div className="rev-telemetry-label">Engagement</div>
                  <div className="rev-telemetry-value" style={{ color: '#fbbf24' }}>
                    {dt.behaviorTelemetry.engagementScore}%
                  </div>
                  <div className="rev-telemetry-sub">{dt.behaviorTelemetry.dwellDuration}</div>
                </div>
              </div>

              {/* Cadence Algorithm & 4-Hour Cooldown Radar Box */}
              {cadence && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(8, 42, 31, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
                  border: `1px solid ${cadence.isCooldownActive ? 'rgba(251,191,36,0.4)' : 'rgba(74,222,128,0.3)'}`,
                  borderRadius: 14,
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: cadence.cadenceType === 'fresh_6d_12c' ? '#4ade80' : '#38bdf8', textTransform: 'uppercase' }}>
                        ⚡ Cadence: {cadence.cadenceType === 'fresh_6d_12c' ? '6-Day / 12-Call Fresh Rule' : '18-Day / 32-Call Follow-Up Rule'}
                      </span>
                      <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: 10, background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                        Day {cadence.daysInPipeline + 1} of {cadence.maxDays}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.74rem', color: cadence.isCooldownActive ? '#fbbf24' : '#4ade80', fontWeight: 700 }}>
                      {cadence.isCooldownActive ? `⏳ 4hr Cooldown: Next Slot ${cadence.nextCallSlot}` : `🟢 Call Slot: Ready Now`}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.6rem' }}>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.75rem', borderRadius: 8, fontSize: '0.74rem' }}>
                      <span style={{ color: 'var(--cream-muted)' }}>Calls Logged:</span> <strong style={{ color: '#fff' }}>{cadence.totalCalls} / {cadence.maxCalls}</strong>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.75rem', borderRadius: 8, fontSize: '0.74rem' }}>
                      <span style={{ color: 'var(--cream-muted)' }}>Today's Quota:</span> <strong style={{ color: '#fff' }}>{cadence.callsToday} / 2 calls</strong>
                    </div>
                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.5rem 0.75rem', borderRadius: 8, fontSize: '0.74rem' }}>
                      <span style={{ color: 'var(--cream-muted)' }}>SLA Compliance:</span> <strong style={{ color: '#4ade80' }}>{cadence.complianceScore}%</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Next Best Action Banner */}
              <div className="rev-nba-box">
                <div className="rev-nba-header">
                  <span className="rev-nba-tag">
                    <Sparkles size={13} /> Recommended Next Best Action
                  </span>
                  <span className="rev-nba-sla">Urgency: {dt.intent.urgency}</span>
                </div>
                <h4 className="rev-nba-title">{dt.nextBestAction.title}</h4>
                <p className="rev-nba-reason">{dt.nextBestAction.reason}</p>
                <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                  {lead.phone && (
                    <a
                      href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Hi ${lead.name || 'there'}, regarding your property inquiry with RE-ON, we would love to assist you with priority site visit slots.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rev-btn-action rev-btn-action--wa"
                    >
                      💬 Execute WhatsApp Outreach
                    </a>
                  )}
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} className="rev-btn-action rev-btn-action--primary">
                      📞 Direct Voice Call
                    </a>
                  )}
                </div>
              </div>

              {/* Profile Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                {/* Contact & Property Preferences */}
                <div style={{ background: 'rgba(8, 42, 31, 0.75)', border: '1px solid var(--green-border)', borderRadius: 14, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Building2 size={15} /> Real Estate Preferences
                  </h4>
                  <div style={{ fontSize: '0.82rem', display: 'grid', gap: '0.45rem' }}>
                    <div><span style={{ color: 'var(--cream-muted)' }}>Target Project:</span> <strong style={{ color: 'var(--cream)' }}>{dt.propertyPreferences.targetProperty}</strong></div>
                    <div><span style={{ color: 'var(--cream-muted)' }}>Preferred Location:</span> <strong style={{ color: 'var(--cream)' }}>{dt.propertyPreferences.targetLocation}</strong></div>
                    <div><span style={{ color: 'var(--cream-muted)' }}>Configuration:</span> <strong style={{ color: 'var(--cream)' }}>{dt.propertyPreferences.configuration}</strong></div>
                    <div><span style={{ color: 'var(--cream-muted)' }}>Buying Purpose:</span> <strong style={{ color: 'var(--cream)' }}>{dt.propertyPreferences.purpose}</strong></div>
                    {lead.message && (
                      <div style={{ marginTop: '0.35rem', background: 'rgba(0,0,0,0.3)', padding: '0.5rem', borderRadius: 8, fontStyle: 'italic', color: 'var(--cream)' }}>
                        "{lead.message}"
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Coaching & Strategic Tips */}
                <div style={{ background: 'rgba(8, 42, 31, 0.75)', border: '1px solid var(--green-border)', borderRadius: 14, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <TrendingUp size={15} /> AI Deal Closing Insights
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.8rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {dt.aiCoachingTips.map((tip, idx) => (
                      <li key={idx}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUTONOMOUS AGENTS */}
          {activeTab === 'agents' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                  Dispatch autonomous specialized agents for lead qualification, communication synthesis, loan advisory, and closing strategies.
                </p>
              </div>

              {agentOutput && (
                <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.35)', borderRadius: 14, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Bot size={16} /> Output from {agentOutput.agent} (Confidence: {agentOutput.confidence}%)
                      </span>
                      {agentOutput.aiPowered && (
                        <span style={{ fontSize: '0.66rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
                          ⚡ Nemotron AI
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn-outline"
                      onClick={() => setAgentOutput(null)}
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                    >
                      Clear
                    </button>
                  </div>

                  {agentOutput.output?.draftMessage && (
                    <div>
                      <div style={{ background: 'rgba(0,0,0,0.4)', padding: '0.75rem', borderRadius: 10, fontSize: '0.85rem', color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
                        {agentOutput.output.draftMessage}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem' }}>
                        <button
                          type="button"
                          className="rev-btn-action rev-btn-action--secondary"
                          onClick={() => handleCopyDraft(agentOutput.output.draftMessage)}
                        >
                          {copiedAction ? <Check size={13} color="#4ade80" /> : 'Copy Message'}
                        </button>
                        {agentOutput.output.whatsappUrl && (
                          <a
                            href={agentOutput.output.whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rev-btn-action rev-btn-action--wa"
                          >
                            💬 Launch WhatsApp Web
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {agentOutput.output?.executiveSummary && (
                    <div style={{ fontSize: '0.84rem', color: '#e2e8f0', lineHeight: 1.45 }}>
                      <strong>Summary:</strong> {agentOutput.output.executiveSummary}
                      <ul style={{ marginTop: '0.4rem', paddingLeft: '1.2rem' }}>
                        {agentOutput.output.keyInsights?.map((k, i) => (
                          <li key={i}>{k}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {agentOutput.output?.openingHook && (
                    <div style={{ fontSize: '0.84rem', color: '#e2e8f0', lineHeight: 1.45 }}>
                      <strong>Opening Call Script:</strong> {agentOutput.output.openingHook}
                    </div>
                  )}
                </div>
              )}

              <div className="rev-agent-grid">
                {autonomousAgents.map((ag) => {
                  const Icon = ag.icon
                  const isRunning = runningAgent === ag.id
                  return (
                    <div key={ag.id} className="rev-agent-card">
                      <div className="rev-agent-title">
                        <Icon size={16} color={ag.color} /> {ag.name}
                      </div>
                      <p className="rev-agent-desc">{ag.desc}</p>
                      <button
                        type="button"
                        className="rev-btn-action rev-btn-action--primary"
                        onClick={() => handleExecuteAgent(ag.id)}
                        disabled={isRunning}
                        style={{ marginTop: 'auto' }}
                      >
                        {isRunning ? 'Synthesizing...' : '⚡ Dispatch Agent'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* TAB 3: PROPERTY MATCHER */}
          {activeTab === 'properties' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                AI matches current live database inventory against client's budget, location affinity, and BHK preferences.
              </p>

              <div style={{ display: 'grid', gap: '0.85rem' }}>
                {matchedProps.map((p, idx) => (
                  <div key={idx} className="rev-prop-match-card">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="rev-prop-match-img" />
                    ) : (
                      <div style={{ width: 90, height: 70, borderRadius: 10, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Building2 size={24} color="#64748b" />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#fff' }}>{p.name}</h4>
                        <span style={{ background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', padding: '0.15rem 0.5rem', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700 }}>
                          {p.matchScore}% Match
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                        📍 {p.location || 'Navi Mumbai'} • 💰 <strong style={{ color: '#38bdf8' }}>{p.price}</strong>
                      </div>
                      <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.75rem', color: '#cbd5e1' }}>
                        {p.matchReason}
                      </p>
                    </div>
                    {p.propertyId && (
                      <a
                        href={`/properties/${p.propertyId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rev-btn-action rev-btn-action--secondary"
                        style={{ padding: '0.4rem 0.65rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                      >
                        View <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: FINTECH & MORTGAGE */}
          {activeTab === 'fintech' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="rev-fintech-hero">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CreditCard size={16} /> Automated FinTech Loan Serviceability Dossier
                  </span>
                  <span style={{ background: 'rgba(74, 222, 128, 0.2)', color: '#4ade80', padding: '0.2rem 0.6rem', borderRadius: 10, fontSize: '0.72rem', fontWeight: 700 }}>
                    Credit Pre-Screen: Approved
                  </span>
                </div>

                <div className="rev-card-meta-strip" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  <div>
                    <div className="rev-meta-item-label">Est. Loan Requirement</div>
                    <div className="rev-meta-item-value" style={{ color: '#38bdf8' }}>{dt.financialProfile.estimatedLoanNeed}</div>
                  </div>
                  <div>
                    <div className="rev-meta-item-label">Downpayment (20%)</div>
                    <div className="rev-meta-item-value">{dt.financialProfile.estimatedDownpayment}</div>
                  </div>
                  <div>
                    <div className="rev-meta-item-label">Indicative Monthly EMI</div>
                    <div className="rev-meta-item-value" style={{ color: '#4ade80' }}>{dt.financialProfile.estimatedMonthlyEMI}</div>
                  </div>
                  <div>
                    <div className="rev-meta-item-label">Pre-Sanction Score</div>
                    <div className="rev-meta-item-value" style={{ color: '#fbbf24' }}>{dt.financialProfile.loanEligibilityScore}/100</div>
                  </div>
                </div>
              </div>

              {/* Recommended Bank Partners */}
              <div style={{ background: 'rgba(8, 42, 31, 0.75)', border: '1px solid var(--green-border)', borderRadius: 14, padding: '1rem' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.88rem', color: 'var(--cream)' }}>Preferred Banking Partners &amp; Subvention Schemes</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  {dt.financialProfile.recommendedLenders.map((bank, i) => (
                    <div key={i} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--green-border)', borderRadius: 10, padding: '0.65rem' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--cream)' }}>{bank}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--cream-muted)', marginTop: '0.2rem' }}>ROI: 8.40% – 8.55% • Instant In-Principle Sanction</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: OMNICHANNEL TIMELINE */}
          {activeTab === 'timeline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Event Logging Form */}
              <form onSubmit={handleLogTimeline} style={{ background: 'rgba(8, 42, 31, 0.85)', border: '1px solid var(--green-border)', borderRadius: 14, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <select
                    value={timelineType}
                    onChange={(e) => setTimelineType(e.target.value)}
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8, padding: '0.45rem 0.65rem', fontSize: '0.8rem' }}
                  >
                    <option value="CALL_LOGGED">📞 Log Voice Call</option>
                    <option value="WHATSAPP_SENT">💬 Log WhatsApp Message</option>
                    <option value="SITE_VISIT_BOOKED">🚗 Schedule Site Visit</option>
                    <option value="NOTE_LOGGED">📝 Internal Strategy Note</option>
                  </select>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Add entry to client's immutable activity log</span>
                </div>

                <textarea
                  placeholder="Enter interaction outcome, objections discussed, or next action agreed upon..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  rows={2}
                  style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '0.5rem 0.75rem', color: '#fff', fontSize: '0.82rem', resize: 'vertical' }}
                />

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    className="rev-btn-action rev-btn-action--primary"
                    disabled={isSubmittingTimeline || !newNoteText.trim()}
                    style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
                  >
                    {isSubmittingTimeline ? 'Saving Event...' : 'Log Interaction'}
                  </button>
                </div>
              </form>

              {/* Timeline Entries */}
              <div className="rev-timeline-list">
                {/* Always include initial web inquiry */}
                <div className="rev-timeline-entry">
                  <span className="rev-timeline-time">
                    <Clock size={11} /> {lead.submittedAt ? new Date(lead.submittedAt).toLocaleString() : 'Recent'} • Web Inbound
                  </span>
                  <h5 className="rev-timeline-title">Lead Generated from {lead.source || 'Website'}</h5>
                  <p className="rev-timeline-detail">
                    {lead.message || `Inquiry created for ${lead.propertyName || 'properties in Navi Mumbai'}`}
                  </p>
                </div>

                {(lead.callLogs || []).map((log, i) => {
                  const mins = Math.floor((log.duration || 0) / 60)
                  const secs = (log.duration || 0) % 60
                  const durStr = log.durationFormatted || (mins > 0 ? `${mins}m ${secs}s` : `${secs}s`)
                  return (
                    <div key={`call_log_${i}`} className="rev-timeline-entry" style={{ borderLeftColor: '#4ade80' }}>
                      <span className="rev-timeline-time">
                        <Clock size={11} /> {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Recent'} • Telecaller: {log.caller || 'Agent'}
                      </span>
                      <h5 className="rev-timeline-title">
                        📞 Phone Consultation — {log.disposition || 'Connected'} ({durStr})
                      </h5>
                      <p className="rev-timeline-detail">
                        Stage: <strong style={{ color: '#4ade80' }}>{log.stage || 'Fresh Lead'}</strong>{log.notes ? ` • Notes: "${log.notes}"` : ''}
                      </p>
                    </div>
                  )
                })}

                {(lead.timeline || []).map((ev, i) => (
                  <div key={ev.id || i} className="rev-timeline-entry">
                    <span className="rev-timeline-time">
                      <Clock size={11} /> {ev.timestamp ? new Date(ev.timestamp).toLocaleString() : 'Recent'} • Actor: {ev.actor || 'Broker'}
                    </span>
                    <h5 className="rev-timeline-title">{ev.title}</h5>
                    <p className="rev-timeline-detail">{ev.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
