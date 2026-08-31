import React, { useState, useEffect } from 'react'
import {
  Phone,
  PhoneCall,
  PhoneOff,
  MessageSquare,
  Sparkles,
  User,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  Play,
  Pause,
  Square,
  RotateCcw,
  BookOpen,
  FileText,
  Copy,
  Check,
  Flame,
  Award,
  Zap,
  Target,
  DollarSign,
  Repeat,
  Headphones,
  Shield,
  Layers,
} from 'lucide-react'
import {
  CRM_PHASES,
  CRM_STAGES,
  mapLegacyStatusToStage,
  getStageMeta,
} from './crmPipelineConstants.js'
import {
  calculateLeadCadence,
  calculateLeadPriority,
} from '../../utils/crmAutomationEngine.js'
import { useAdmin } from '../../contexts/AdminContext.jsx'

export default function NeoDoveCRMView({
  contacts = [],
  properties = [],
  callers = [],
  onOpenLeadModal,
  onUpdateStatus,
  onSaveNote,
}) {
  // 1. Caller Session & Queue State
  const [selectedCaller, setSelectedCaller] = useState('all')
  const [activeQueueFilter, setActiveQueueFilter] = useState('all') // 'all' | 'fresh' | 'site_visit' | 'high_intent' | 'overdue' | 'unassigned'
  const [currentLeadIndex, setCurrentLeadIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')

  // 2. Active Call Stopwatch & Tab State
  const [activeTab, setActiveTab] = useState('script') // 'script' | 'objections' | 'whatsapp'
  const [callNotes, setCallNotes] = useState('')
  const [selectedStage, setSelectedStage] = useState('New Lead')
  const [selectedDisposition, setSelectedDisposition] = useState('')
  const [callbackDateTime, setCallbackDateTime] = useState('')
  const [copiedTemplate, setCopiedTemplate] = useState(null)

  const adminContext = useAdmin() || {}
  const { generateScript, generateObjections, generateWhatsApp } = adminContext

  // AI Caches & Loading States (NVIDIA Nemotron)
  const [aiScriptMap, setAiScriptMap] = useState({})
  const [aiObjectionsMap, setAiObjectionsMap] = useState({})
  const [aiWhatsAppMap, setAiWhatsAppMap] = useState({})
  const [aiLoading, setAiLoading] = useState({ script: false, objections: false, whatsapp: false })

  // Call timer state
  const [isCallActive, setIsCallActive] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('')

  // Call Stopwatch
  useEffect(() => {
    let timer = null
    if (isCallActive) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1)
      }, 1000)
    } else {
      clearInterval(timer)
    }
    return () => clearInterval(timer)
  }, [isCallActive])

  // Filter and prioritize Queue using CRM Algorithm
  const queueLeads = contacts
    .filter((c) => {
      // Caller filter
      if (selectedCaller !== 'all') {
        const assigned = c.assignedCallerName || c.assignedTo?.name || ''
        if (selectedCaller === 'unassigned') {
          if (assigned) return false
        } else {
          if (assigned.toLowerCase() !== selectedCaller.toLowerCase()) return false
        }
      }

      // Queue Segment Filter
      const stage = mapLegacyStatusToStage(c.status)
      const type = (c.type || '').toLowerCase()
      const msg = (c.message || '').toLowerCase()
      const src = (c.source || '').toLowerCase()
      const isHighIntent = type.includes('dwell') || type.includes('visit') || type.includes('30s') || src.includes('dwell') || msg.includes('urgent')

      if (activeQueueFilter === 'fresh') {
        if (stage !== 'New Lead' && stage !== 'Fresh Lead') return false
      } else if (activeQueueFilter === 'site_visit') {
        if (!type.includes('visit') && stage !== 'Site Visit Prospecting') return false
      } else if (activeQueueFilter === 'high_intent') {
        if (!isHighIntent) return false
      } else if (activeQueueFilter === 'overdue') {
        const ageDays = c.submittedAt ? (Date.now() - new Date(c.submittedAt).getTime()) / (1000 * 3600 * 24) : 0
        if (ageDays <= 2 || stage === 'WON' || stage === 'LOST') return false
      } else if (activeQueueFilter === 'unassigned') {
        if (c.assignedCallerName || c.assignedTo?.name) return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = (c.name || '').toLowerCase().includes(q)
        const matchPhone = (c.phone || '').toLowerCase().includes(q)
        const matchProp = (c.propertyName || '').toLowerCase().includes(q)
        if (!matchName && !matchPhone && !matchProp) return false
      }

      return true
    })
    .sort((a, b) => calculateLeadPriority(b) - calculateLeadPriority(a))

  // Keep index within bounds
  useEffect(() => {
    if (currentLeadIndex >= queueLeads.length) {
      setCurrentLeadIndex(Math.max(0, queueLeads.length - 1))
    }
  }, [queueLeads.length, currentLeadIndex])

  const activeLead = queueLeads[currentLeadIndex] || null
  const activeLeadCadence = activeLead ? calculateLeadCadence(activeLead) : null

  // Sync state whenever active lead changes
  useEffect(() => {
    if (activeLead) {
      setSelectedStage(mapLegacyStatusToStage(activeLead.status))
      setSelectedDisposition(activeLead.callStatus || '')
      setCallNotes(activeLead.notes || '')
      setIsCallActive(false)
      setCallDuration(0)
    }
  }, [activeLead?._id, activeLead?.id])

  // AI Script Fetcher (NVIDIA Nemotron)
  const fetchAiScript = async (lead, force = false) => {
    if (!lead || !generateScript) return
    const id = lead._id || lead.id
    if (!force && aiScriptMap[id]) return
    setAiLoading((prev) => ({ ...prev, script: true }))
    try {
      const res = await generateScript(id, selectedStage || lead.status)
      if (res && res.script) {
        setAiScriptMap((prev) => ({ ...prev, [id]: res.script }))
      }
    } catch (err) {
      console.warn('[NeoDove] fetchAiScript error:', err)
    } finally {
      setAiLoading((prev) => ({ ...prev, script: false }))
    }
  }

  // AI Objections Fetcher (NVIDIA Nemotron)
  const fetchAiObjections = async (lead, force = false) => {
    if (!lead || !generateObjections) return
    const id = lead._id || lead.id
    if (!force && aiObjectionsMap[id]) return
    setAiLoading((prev) => ({ ...prev, objections: true }))
    try {
      const res = await generateObjections(id)
      if (res && res.objections) {
        setAiObjectionsMap((prev) => ({ ...prev, [id]: res.objections }))
      }
    } catch (err) {
      console.warn('[NeoDove] fetchAiObjections error:', err)
    } finally {
      setAiLoading((prev) => ({ ...prev, objections: false }))
    }
  }

  // AI WhatsApp Fetcher (NVIDIA Nemotron)
  const fetchAiWhatsApp = async (lead, force = false) => {
    if (!lead || !generateWhatsApp) return
    const id = lead._id || lead.id
    if (!force && aiWhatsAppMap[id]) return
    setAiLoading((prev) => ({ ...prev, whatsapp: true }))
    try {
      const res = await generateWhatsApp(id)
      if (res && res.templates) {
        setAiWhatsAppMap((prev) => ({ ...prev, [id]: res.templates }))
      }
    } catch (err) {
      console.warn('[NeoDove] fetchAiWhatsApp error:', err)
    } finally {
      setAiLoading((prev) => ({ ...prev, whatsapp: false }))
    }
  }

  // Trigger prefetching based on active lead and current tab
  useEffect(() => {
    if (activeLead) {
      if (activeTab === 'script') {
        fetchAiScript(activeLead)
      } else if (activeTab === 'objections') {
        fetchAiObjections(activeLead)
      } else if (activeTab === 'whatsapp') {
        fetchAiWhatsApp(activeLead)
      }
    }
  }, [activeLead?._id, activeLead?.id, activeTab, selectedStage])

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Handle Call Start / End with automatic status update
  const handleStartCall = async () => {
    setIsCallActive(true)
    setCallDuration(0)

    if (activeLead) {
      const inqId = activeLead._id || activeLead.id
      const currentStage = mapLegacyStatusToStage(activeLead.status)
      // Automatically advance New Lead to Fresh Lead upon placing first call
      const autoStage = currentStage === 'New Lead' ? 'Fresh Lead' : currentStage
      setSelectedStage(autoStage)

      if (onUpdateStatus) {
        await onUpdateStatus(inqId, autoStage, {
          callStatus: 'Calling / Live',
          lastCallAt: new Date().toISOString(),
        })
      }
    }
  }

  const handleEndCall = () => {
    setIsCallActive(false)
  }

  // Handle instant manual stage change from dropdown
  const handleManualStageChange = async (newStage) => {
    setSelectedStage(newStage)
    if (activeLead && onUpdateStatus) {
      const inqId = activeLead._id || activeLead.id
      await onUpdateStatus(inqId, newStage, {
        status: newStage,
        notes: `${activeLead.notes || ''}\n[Manual Status Change]: Updated to ${newStage} at ${new Date().toLocaleTimeString()}`,
      })
      setSaveSuccessMsg(`✓ Status manually set to ${newStage}!`)
      setTimeout(() => setSaveSuccessMsg(''), 2500)
    }
  }

  // Save disposition and optionally advance to next lead
  const handleSaveDisposition = async (advanceNext = true) => {
    if (!activeLead) return
    const inqId = activeLead._id || activeLead.id

    const nowIso = new Date().toISOString()
    const finalDuration = callDuration
    if (isCallActive) {
      setIsCallActive(false)
    }

    const nextCallCount = (activeLead.callCount || 0) + 1
    const currentStage = mapLegacyStatusToStage(selectedStage || activeLead.status)

    // Compute automatic stage based on disposition & 12-call / 6-day cadence rule
    let finalStage = currentStage
    if (selectedDisposition === 'Interested' || selectedDisposition === 'Callback Requested') {
      finalStage = 'Arrange Follow Up'
    } else if (selectedDisposition === 'Site Visit Confirmed') {
      finalStage = 'Site Visit Prospecting'
    } else if (selectedDisposition === 'Budget Mismatch') {
      finalStage = 'SVP/VAND Lost Request'
    } else if (selectedDisposition === 'Not Interested') {
      finalStage = 'LOST'
    } else if (['Ringing No Answer', 'Busy / Cut Call', 'Switched Off'].includes(selectedDisposition)) {
      // If 12 calls reached in Fresh Lead, auto-escalate to SVP/VAND Lost Request
      if (currentStage === 'New Lead' || currentStage === 'Fresh Lead') {
        if (nextCallCount >= 12) {
          finalStage = 'SVP/VAND Lost Request'
        } else {
          finalStage = 'Fresh Lead'
        }
      } else if (currentStage === 'Arrange Follow Up' && nextCallCount >= 32) {
        finalStage = 'SVP/VAND Lost Request'
      }
    }

    const mins = Math.floor(finalDuration / 60)
    const secs = finalDuration % 60
    const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`

    const newCallLog = {
      timestamp: nowIso,
      duration: finalDuration,
      durationFormatted: durationStr,
      disposition: selectedDisposition || 'Connected',
      stage: finalStage,
      notes: callNotes,
      caller: activeLead.assignedCallerName || activeLead.assignedTo?.name || 'Telecaller',
    }

    const newTimelineEvent = {
      id: `call_${Date.now()}`,
      timestamp: nowIso,
      title: `📞 Phone Consultation (${selectedDisposition || 'Connected'})`,
      detail: `Duration: ${durationStr} • Stage: ${finalStage}${callNotes ? ` • Notes: "${callNotes}"` : ''}`,
      actor: activeLead.assignedCallerName || activeLead.assignedTo?.name || 'Telecaller',
    }

    const updatedCallLogs = [
      ...(Array.isArray(activeLead.callLogs) ? activeLead.callLogs : []),
      newCallLog,
    ]

    const updatedTimeline = [
      ...(Array.isArray(activeLead.timeline) ? activeLead.timeline : []),
      newTimelineEvent,
    ]

    const updatedPayload = {
      status: finalStage,
      callStatus: selectedDisposition || activeLead.callStatus || 'Called',
      notes: callNotes,
      callCount: nextCallCount,
      lastCallAt: nowIso,
      callLogs: updatedCallLogs,
      timeline: updatedTimeline,
      ...(callbackDateTime ? { scheduledCallback: callbackDateTime } : {}),
      ...(selectedDisposition === 'Site Visit Confirmed' ? { visitStatus: 'Scheduled' } : {}),
    }

    if (onUpdateStatus) {
      await onUpdateStatus(inqId, finalStage, updatedPayload)
    }

    if (onSaveNote && callNotes !== activeLead.notes) {
      await onSaveNote(inqId, callNotes)
    }

    setSaveSuccessMsg(`✓ Call logged (${durationStr})! Status updated to "${finalStage}"`)
    setTimeout(() => setSaveSuccessMsg(''), 2500)

    setCallDuration(0)

    if (advanceNext && currentLeadIndex < queueLeads.length - 1) {
      setCurrentLeadIndex((prev) => prev + 1)
    }
  }

  // Quick WhatsApp templates
  const cleanPhone = (activeLead?.phone || '').replace(/[^\d+]/g, '')
  const waPhone = cleanPhone.startsWith('+') ? cleanPhone.replace('+', '') : `91${cleanPhone.replace(/^0+/, '')}`
  const leadName = activeLead?.name || 'Valued Customer'
  const propName = activeLead?.propertyName || 'RE-ON Luxury Residences'
  const propLoc = activeLead?.propertyLocation || activeLead?.location || 'Navi Mumbai'

  const whatsappTemplates = [
    {
      id: 'brochure',
      title: '📄 Brochure & RERA Layout Dossier',
      body: `Hello ${leadName}, thank you for connecting with RE-ON Real Estate! As discussed, please find the verified RERA layout plans, pricing overview, and high-resolution brochure for *${propName}* (${propLoc}).\n\nExplore properties online: https://reonrealty.in/properties\n\nLet me know if you would like me to arrange a personalized site visit!`,
    },
    {
      id: 'site_visit',
      title: '🚗 Site Visit Confirmation & Location Pin',
      body: `Hi ${leadName}, your VIP Site Visit for *${propName}* (${propLoc}) is confirmed! Our property advisor will meet you at the site office lobby.\n\n📍 Location: https://maps.google.com\n📞 Support: +91 98765 43210\n\nLooking forward to showing you the model apartment!`,
    },
    {
      id: 'cost_sheet',
      title: '💰 Cost Sheet & Pre-Launch Payment Plan',
      body: `Dear ${leadName}, here is the customized cost sheet breakdown for *${propName}* including zero floor-rise benefits and current subvention payment milestones.\n\nLet's schedule a 5-minute call to lock your preferred unit before the rate revision.`,
    },
    {
      id: 'followup',
      title: '⏰ Follow-up & Callback Check-in',
      body: `Hi ${leadName}, checking in from RE-ON regarding *${propName}*. Would you have 2 minutes today for a quick update on newly released high-floor units?`,
    },
  ]

  const handleCopyAndSendWhatsApp = (tpl) => {
    setCopiedTemplate(tpl.id)
    navigator.clipboard?.writeText(tpl.body)
    const encoded = encodeURIComponent(tpl.body)
    window.open(`https://wa.me/${waPhone}?text=${encoded}`, '_blank')
    setTimeout(() => setCopiedTemplate(null), 3000)
  }

  const currentStageMeta = getStageMeta(selectedStage || activeLead?.status || 'New Lead')

  if (!activeLead) {
    return (
      <div style={{ padding: '4rem 1.5rem', textAlign: 'center', background: 'rgba(8, 42, 31, 0.6)', borderRadius: 20, border: '1px dashed var(--green-border)' }}>
        <PhoneOff size={48} color="var(--gray)" style={{ margin: '0 auto 1rem auto' }} />
        <h3 style={{ color: 'var(--cream)', marginBottom: '0.5rem' }}>No Active Leads in This Dialer Queue</h3>
        <p style={{ color: 'var(--gray)', fontSize: '0.9rem', maxWidth: 450, margin: '0 auto 1.5rem auto' }}>
          All leads for this queue segment or caller have been contacted or matched. Switch filters or auto-distribute fresh leads.
        </p>
        <button
          type="button"
          className="btn-accent"
          onClick={() => {
            setSelectedCaller('all')
            setActiveQueueFilter('all')
            setSearchQuery('')
          }}
        >
          Reset All Queue Filters
        </button>
      </div>
    )
  }

  return (
    <div className="rev-neodove-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Bar: Telecaller Queue Controls */}
      <div
        style={{
          background: 'rgba(8, 42, 31, 0.95)',
          border: '1px solid var(--green-border)',
          borderRadius: 16,
          padding: '1rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <Headphones size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--cream)', fontWeight: 800 }}>
                NeoDove Telecalling Workstation
              </h3>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
                ● Queue: {queueLeads.length} Leads
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--cream-muted)' }}>
              Sequential Auto-Dialer • Dynamic Scripts • Objection Handling • Fast Dispositions
            </p>
          </div>
        </div>

        {/* Telecaller Switcher & Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.35)', padding: '0.35rem 0.65rem', borderRadius: 10, border: '1px solid var(--green-border)' }}>
            <User size={13} color="#4ade80" />
            <span style={{ fontSize: '0.74rem', color: 'var(--cream-muted)' }}>Caller:</span>
            <select
              value={selectedCaller}
              onChange={(e) => {
                setSelectedCaller(e.target.value)
                setCurrentLeadIndex(0)
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--cream)',
                fontSize: '0.78rem',
                fontWeight: 650,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              <option value="all" style={{ background: '#082A1F' }}>All Callers ({contacts.length})</option>
              <option value="unassigned" style={{ background: '#082A1F' }}>Unassigned Queue</option>
              {callers.map((c) => (
                <option key={c._id || c.id || c.name} value={c.name} style={{ background: '#082A1F' }}>
                  {c.name} {c.active === false ? '(Inactive)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.4)', borderRadius: 8, padding: 2, border: '1px solid var(--green-border)' }}>
            {[
              { id: 'all', label: 'All Queue' },
              { id: 'fresh', label: '🌱 Fresh (12 TAT)' },
              { id: 'site_visit', label: '🚗 Site Visits' },
              { id: 'high_intent', label: '🔥 High Intent' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setActiveQueueFilter(f.id)
                  setCurrentLeadIndex(0)
                }}
                style={{
                  background: activeQueueFilter === f.id ? 'var(--green-light)' : 'transparent',
                  color: activeQueueFilter === f.id ? '#fff' : 'var(--cream-muted)',
                  border: 'none',
                  borderRadius: 6,
                  padding: '0.3rem 0.6rem',
                  fontSize: '0.72rem',
                  fontWeight: 650,
                  cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main 3-Column Workstation Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 320px) minmax(320px, 1fr) minmax(280px, 340px)',
          gap: '1.25rem',
          alignItems: 'start',
        }}
      >
        {/* =========================================================================
            COLUMN 1: PROSPECT IDENTITY & CADENCE SLA DOSSIER
            ========================================================================= */}
        <div
          style={{
            background: 'rgba(8, 42, 31, 0.9)',
            border: '1px solid var(--green-border)',
            borderRadius: 16,
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: '0 6px 25px rgba(0,0,0,0.35)',
          }}
        >
          {/* Header: Lead ID, Index Nav, Next/Prev */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--green-border)', paddingBottom: '0.75rem' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--cream-muted)' }}>
                Lead #{currentLeadIndex + 1} of {queueLeads.length}
              </span>
              <div style={{ fontSize: '0.68rem', color: '#fbbf24', marginTop: 2 }}>
                ⚡ {currentStageMeta.tat}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 4 }}>
              <button
                type="button"
                disabled={currentLeadIndex === 0}
                onClick={() => setCurrentLeadIndex((prev) => Math.max(0, prev - 1))}
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid var(--green-border)',
                  color: 'var(--cream)',
                  borderRadius: 6,
                  padding: '0.3rem 0.55rem',
                  cursor: currentLeadIndex === 0 ? 'not-allowed' : 'pointer',
                  opacity: currentLeadIndex === 0 ? 0.4 : 1,
                }}
                title="Previous Lead"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                disabled={currentLeadIndex >= queueLeads.length - 1}
                onClick={() => setCurrentLeadIndex((prev) => Math.min(queueLeads.length - 1, prev + 1))}
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: '1px solid var(--green-border)',
                  color: 'var(--cream)',
                  borderRadius: 6,
                  padding: '0.3rem 0.55rem',
                  cursor: currentLeadIndex >= queueLeads.length - 1 ? 'not-allowed' : 'pointer',
                  opacity: currentLeadIndex >= queueLeads.length - 1 ? 0.4 : 1,
                }}
                title="Next Lead"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Customer Identity Card */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(74, 222, 128, 0.15)', border: '1px solid rgba(74, 222, 128, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontWeight: 800, fontSize: '1.2rem' }}>
                {(activeLead.name || 'P').charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--cream)', fontWeight: 800 }}>
                  {activeLead.name || 'Anonymous Prospect'}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 4 }}>
                  {activeLead.phone ? (
                    <a
                      href={`tel:${cleanPhone}`}
                      onClick={handleStartCall}
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#fff',
                        padding: '0.28rem 0.75rem',
                        borderRadius: 20,
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        boxShadow: '0 3px 10px rgba(16,185,129,0.35)',
                        cursor: 'pointer',
                      }}
                      title="Click to Call & Start Live Timer"
                    >
                      <PhoneCall size={13} /> {activeLead.phone}
                    </a>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--cream-muted)' }}>
                      📞 No direct phone
                    </span>
                  )}
                </div>
              </div>
            </div>

            {activeLead.email && (
              <div style={{ fontSize: '0.74rem', color: 'var(--cream-muted)', marginTop: '0.45rem' }}>
                ✉️ {activeLead.email}
              </div>
            )}
          </div>

          {/* Cadence & 4-Hour Cooldown Watchdog HUD */}
          {activeLeadCadence && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, rgba(8,42,31,0.6) 100%)',
              border: `1px solid ${activeLeadCadence.isCooldownActive ? 'rgba(251,191,36,0.4)' : 'rgba(74,222,128,0.3)'}`,
              borderRadius: 12,
              padding: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.45rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: activeLeadCadence.cadenceType === 'fresh_6d_12c' ? '#4ade80' : '#38bdf8' }}>
                  {activeLeadCadence.cadenceType === 'fresh_6d_12c' ? '🌱 6-Day / 12-Call Cadence' : '📞 18-Day / 32-Call Cadence'}
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#fbbf24' }}>
                  Day {activeLeadCadence.daysInPipeline + 1}/{activeLeadCadence.maxDays}
                </span>
              </div>

              {/* Cadence Progress Bar */}
              <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 6, height: 6, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, (activeLeadCadence.totalCalls / activeLeadCadence.maxCalls) * 100)}%`,
                  height: '100%',
                  background: activeLeadCadence.isExpired ? '#f87171' : 'linear-gradient(90deg, #10b981, #38bdf8)',
                }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--cream-muted)' }}>
                <span>Calls made: <strong style={{ color: '#fff' }}>{activeLeadCadence.totalCalls}/{activeLeadCadence.maxCalls}</strong></span>
                <span>Today: <strong style={{ color: '#fff' }}>{activeLeadCadence.callsToday}/2 calls</strong></span>
              </div>

              {/* 4-Hour Cooldown Status Indicator */}
              <div style={{
                marginTop: 2,
                padding: '0.35rem 0.55rem',
                borderRadius: 8,
                background: activeLeadCadence.isCooldownActive
                  ? 'rgba(251,191,36,0.15)'
                  : activeLeadCadence.callsToday >= 2
                  ? 'rgba(148,163,184,0.15)'
                  : 'rgba(74,222,128,0.15)',
                border: `1px solid ${
                  activeLeadCadence.isCooldownActive
                    ? 'rgba(251,191,36,0.3)'
                    : activeLeadCadence.callsToday >= 2
                    ? 'rgba(148,163,184,0.3)'
                    : 'rgba(74,222,128,0.3)'
                }`,
                fontSize: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                color: activeLeadCadence.isCooldownActive
                  ? '#fbbf24'
                  : activeLeadCadence.callsToday >= 2
                  ? '#94a3b8'
                  : '#4ade80',
              }}>
                <Clock size={11} />
                <span>
                  {activeLeadCadence.callsToday === 0 && '🟢 Ready for Call #1'}
                  {activeLeadCadence.callsToday === 1 && activeLeadCadence.isCooldownActive && `⏳ 4hr Cooldown: Call #2 at ${activeLeadCadence.nextCallSlot}`}
                  {activeLeadCadence.callsToday === 1 && !activeLeadCadence.isCooldownActive && '🔥 4hr Gap Passed: Call #2 Ready Now!'}
                  {activeLeadCadence.callsToday >= 2 && '🛑 Max 2 Calls Today Reached (Next: Tomorrow 10 AM)'}
                </span>
              </div>
            </div>
          )}

          {/* Current Stage & Assigned Caller Pills */}
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            <span style={{ background: `${currentStageMeta.color}22`, color: currentStageMeta.color, border: `1px solid ${currentStageMeta.color}50`, padding: '0.2rem 0.55rem', borderRadius: 8, fontSize: '0.72rem', fontWeight: 700 }}>
              {currentStageMeta.badge} {selectedStage || activeLead.status || 'New Lead'}
            </span>
            <span style={{ background: 'rgba(0,0,0,0.35)', color: 'var(--cream-muted)', border: '1px solid var(--green-border)', padding: '0.2rem 0.55rem', borderRadius: 8, fontSize: '0.72rem' }}>
              👤 {activeLead.assignedCallerName || activeLead.assignedTo?.name || 'Unassigned'}
            </span>
          </div>

          {/* Target Property Box */}
          {activeLead.propertyName && (
            <div style={{ background: 'rgba(8, 42, 31, 0.75)', border: '1px solid var(--green-border)', borderRadius: 12, padding: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.85rem', fontWeight: 700, color: 'var(--cream)' }}>
                  <Building2 size={14} color="#4ade80" /> {activeLead.propertyName}
                </div>
                {activeLead.propertyId && (
                  <a
                    href={`/properties/${activeLead.propertyId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '0.72rem', color: '#4ade80', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}
                  >
                    View <ExternalLink size={10} />
                  </a>
                )}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--cream-muted)', marginTop: 4 }}>
                📍 {activeLead.propertyLocation || activeLead.location || 'Navi Mumbai'}
              </div>
              {activeLead.budget && (
                <div style={{ fontSize: '0.76rem', color: '#fbbf24', fontWeight: 700, marginTop: 4 }}>
                  Budget: {activeLead.budget}
                </div>
              )}
            </div>
          )}

          {/* Inbound Message / Customer Request */}
          {activeLead.message && (
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '0.65rem', fontSize: '0.76rem', color: 'var(--cream)', fontStyle: 'italic' }}>
              "{activeLead.message}"
            </div>
          )}

          {/* Digital Twin Launcher Button */}
          <button
            type="button"
            className="btn-accent"
            onClick={() => onOpenLeadModal(activeLead)}
            style={{
              width: '100%',
              padding: '0.55rem 0.85rem',
              fontSize: '0.8rem',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              cursor: 'pointer',
            }}
          >
            <Sparkles size={14} /> Open 360° Customer Digital Twin
          </button>
        </div>

        {/* =========================================================================
            COLUMN 2: NEODOVE CALL DESK & DYNAMIC SALES PLAYBOOK
            ========================================================================= */}
        <div
          style={{
            background: 'rgba(8, 42, 31, 0.9)',
            border: '1px solid var(--green-border)',
            borderRadius: 16,
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Dialer Action Strip & Stopwatch */}
          <div
            style={{
              background: isCallActive ? 'rgba(239, 68, 68, 0.12)' : 'rgba(0,0,0,0.35)',
              border: isCallActive ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--green-border)',
              borderRadius: 14,
              padding: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={isCallActive ? handleEndCall : handleStartCall}
                style={{
                  background: isCallActive ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: isCallActive ? '0 0 20px rgba(239,68,68,0.6)' : '0 4px 14px rgba(16,185,129,0.4)',
                  animation: isCallActive ? 'pulse 1.5s infinite' : 'none',
                  transition: 'all 0.2s ease',
                }}
                title={isCallActive ? 'Click to End Call' : 'Click to Call & Start Timer'}
              >
                <PhoneCall size={24} />
              </button>

              <div>
                <div style={{ fontSize: '0.74rem', color: isCallActive ? '#fca5a5' : 'var(--cream-muted)', fontWeight: 650 }}>
                  {isCallActive ? '🔴 Live Call in Progress' : 'Ready to Dial'}
                </div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: isCallActive ? '#f87171' : 'var(--cream)', letterSpacing: '0.04em' }}>
                  {formatTimer(callDuration)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {!isCallActive ? (
                <button
                  type="button"
                  className="btn-accent"
                  onClick={handleStartCall}
                  style={{
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.86rem',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    borderRadius: 12,
                    boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
                    cursor: 'pointer',
                  }}
                >
                  <PhoneCall size={16} /> Start Call &amp; Timer
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEndCall}
                  style={{
                    padding: '0.65rem 1.25rem',
                    fontSize: '0.86rem',
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    boxShadow: '0 4px 16px rgba(239,68,68,0.5)',
                    cursor: 'pointer',
                    animation: 'pulse 1.5s infinite',
                  }}
                >
                  <Square size={16} /> Stop Timer ({formatTimer(callDuration)})
                </button>
              )}
            </div>
          </div>

          {/* Playbook Navigation Tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.35)', padding: 3, borderRadius: 10, border: '1px solid var(--green-border)' }}>
            <button
              type="button"
              onClick={() => setActiveTab('script')}
              style={{
                flex: 1,
                background: activeTab === 'script' ? 'var(--green-light)' : 'transparent',
                color: activeTab === 'script' ? '#fff' : 'var(--cream-muted)',
                border: 'none',
                borderRadius: 7,
                padding: '0.45rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
            >
              <FileText size={13} /> Pitch Script
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('objections')}
              style={{
                flex: 1,
                background: activeTab === 'objections' ? 'var(--green-light)' : 'transparent',
                color: activeTab === 'objections' ? '#fff' : 'var(--cream-muted)',
                border: 'none',
                borderRadius: 7,
                padding: '0.45rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
            >
              <Shield size={13} /> Objections
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('whatsapp')}
              style={{
                flex: 1,
                background: activeTab === 'whatsapp' ? 'var(--green-light)' : 'transparent',
                color: activeTab === 'whatsapp' ? '#fff' : 'var(--cream-muted)',
                border: 'none',
                borderRadius: 7,
                padding: '0.45rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
            >
              <MessageSquare size={13} /> WhatsApp
            </button>
          </div>

          {/* TAB 1: DYNAMIC CALLER SCRIPT */}
          {activeTab === 'script' && (
            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--green-border)', borderRadius: 12, padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4ade80', textTransform: 'uppercase' }}>
                    Stage Script: {selectedStage || activeLead.status || 'New Lead'}
                  </span>
                  {aiScriptMap[activeLead._id || activeLead.id] && (
                    <span style={{ fontSize: '0.66rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', padding: '2px 6px', borderRadius: 6, fontWeight: 700 }}>
                      ⚡ Nemotron AI
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => fetchAiScript(activeLead, true)}
                    disabled={aiLoading.script}
                    style={{
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid var(--green-border)',
                      color: 'var(--cream)',
                      borderRadius: 6,
                      padding: '2px 8px',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    title="Regenerate dynamic pitch with NVIDIA Nemotron LLM"
                  >
                    <Sparkles size={11} color="#38bdf8" />
                    {aiLoading.script ? 'Generating...' : '⚡ AI Refresh'}
                  </button>
                  <span style={{ fontSize: '0.7rem', color: '#fbbf24' }}>
                    🎯 Goal: Lock Site Visit
                  </span>
                </div>
              </div>

              {aiLoading.script && !aiScriptMap[activeLead._id || activeLead.id] ? (
                <div style={{ background: 'rgba(8, 42, 31, 0.5)', border: '1px dashed rgba(56, 189, 248, 0.4)', borderRadius: 10, padding: '1.25rem', textAlign: 'center', color: '#38bdf8', fontSize: '0.82rem' }}>
                  <Sparkles size={18} style={{ animation: 'spin 2s linear infinite', margin: '0 auto 6px auto' }} />
                  <div>Synthesizing personalized pitch with NVIDIA Nemotron...</div>
                </div>
              ) : aiScriptMap[activeLead._id || activeLead.id] ? (
                <div style={{ background: 'rgba(8, 42, 31, 0.85)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: 10, padding: '0.9rem', fontSize: '0.84rem', lineHeight: 1.6, color: '#f1f5f9', whiteSpace: 'pre-wrap' }}>
                  {aiScriptMap[activeLead._id || activeLead.id]}
                </div>
              ) : (
                <div style={{ background: 'rgba(8, 42, 31, 0.7)', border: '1px solid var(--green-border)', borderRadius: 10, padding: '0.85rem', fontSize: '0.84rem', lineHeight: 1.5, color: 'var(--cream)' }}>
                  <p style={{ margin: '0 0 0.5rem 0' }}>
                    <strong>1. Greeting &amp; Hook:</strong><br />
                    <em>"Namaste / Hello {leadName}, this is calling from RE-ON Real Estate. I am following up regarding your inquiry on <strong>{propName}</strong> in {propLoc}."</em>
                  </p>
                  <p style={{ margin: '0 0 0.5rem 0' }}>
                    <strong>2. Need &amp; Budget Discovery (VAND):</strong><br />
                    <em>"Are you primarily looking for self-use or high-growth capital investment? What is your preferred configuration—2BHK or 3BHK?"</em>
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>3. Closing Call to Action:</strong><br />
                    <em>"We have exclusive developer slots open this weekend with sample flat tours. Would <strong>Saturday 11 AM</strong> or <strong>Sunday 4 PM</strong> suit you better?"</em>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: OBJECTION HANDLING REBUTTALS */}
          {activeTab === 'objections' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--cream-muted)' }}>
                  {aiObjectionsMap[activeLead._id || activeLead.id] ? '⚡ NVIDIA Nemotron Tailored Objections' : 'Standard Objection Playbook'}
                </span>
                <button
                  type="button"
                  onClick={() => fetchAiObjections(activeLead, true)}
                  disabled={aiLoading.objections}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--green-border)',
                    color: 'var(--cream)',
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  title="Generate objection rebuttals with NVIDIA Nemotron LLM"
                >
                  <Sparkles size={11} color="#fbbf24" />
                  {aiLoading.objections ? 'Generating...' : '⚡ AI Refresh'}
                </button>
              </div>

              {aiLoading.objections && !aiObjectionsMap[activeLead._id || activeLead.id] ? (
                <div style={{ background: 'rgba(8, 42, 31, 0.5)', border: '1px dashed rgba(251, 191, 36, 0.4)', borderRadius: 10, padding: '1.25rem', textAlign: 'center', color: '#fbbf24', fontSize: '0.82rem' }}>
                  <Sparkles size={18} style={{ animation: 'spin 2s linear infinite', margin: '0 auto 6px auto' }} />
                  <div>Generating real estate rebuttals with Nemotron...</div>
                </div>
              ) : (
                (aiObjectionsMap[activeLead._id || activeLead.id] || [
                  {
                    title: '💸 "Budget is over my limit"',
                    rebuttal: 'We have developer-backed zero-brokerage payment plans and pre-approved loans from HDFC/SBI at 8.40%. We also have high-appreciation inventory starting at ₹45L in adjacent sectors.',
                  },
                  {
                    title: '📍 "Location is too far"',
                    rebuttal: 'With the upcoming Navi Mumbai International Airport, Metro Line 1, and coastal road, commute times are down 40%. Capital appreciation in this pocket is projected at 18% annually.',
                  },
                  {
                    title: '⏳ "Just exploring / not ready yet"',
                    rebuttal: 'Completely understand! Let me send the official RERA catalog, verified layout plans, and pricing sheet on WhatsApp so you have it ready whenever you decide.',
                  },
                  {
                    title: '🤝 "Already looking with another broker"',
                    rebuttal: 'Glad to hear! As direct developer mandate partners, RE-ON guarantees zero-brokerage and direct pre-launch pricing that brokers cannot offer. Let me share our exclusive floor plan.',
                  },
                ]).map((obj, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--green-border)', borderRadius: 10, padding: '0.75rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fbbf24', marginBottom: 4 }}>
                      {obj.title}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--cream)', lineHeight: 1.45 }}>
                      👉 {obj.rebuttal}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: 1-CLICK WHATSAPP TEMPLATES */}
          {activeTab === 'whatsapp' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 2px' }}>
                <span style={{ fontSize: '0.74rem', color: 'var(--cream-muted)' }}>
                  {aiWhatsAppMap[activeLead._id || activeLead.id] ? '⚡ NVIDIA Nemotron Personalized Messages' : 'Standard 1-Click Templates'}
                </span>
                <button
                  type="button"
                  onClick={() => fetchAiWhatsApp(activeLead, true)}
                  disabled={aiLoading.whatsapp}
                  style={{
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--green-border)',
                    color: 'var(--cream)',
                    borderRadius: 6,
                    padding: '2px 8px',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  title="Generate personalized WhatsApp templates with NVIDIA Nemotron LLM"
                >
                  <Sparkles size={11} color="#4ade80" />
                  {aiLoading.whatsapp ? 'Generating...' : '⚡ AI Refresh'}
                </button>
              </div>

              {aiLoading.whatsapp && !aiWhatsAppMap[activeLead._id || activeLead.id] ? (
                <div style={{ background: 'rgba(8, 42, 31, 0.5)', border: '1px dashed rgba(74, 222, 128, 0.4)', borderRadius: 10, padding: '1.25rem', textAlign: 'center', color: '#4ade80', fontSize: '0.82rem' }}>
                  <Sparkles size={18} style={{ animation: 'spin 2s linear infinite', margin: '0 auto 6px auto' }} />
                  <div>Crafting custom WhatsApp messages with Nemotron...</div>
                </div>
              ) : (
                (aiWhatsAppMap[activeLead._id || activeLead.id] || whatsappTemplates).map((tpl, idx) => (
                  <div
                    key={tpl.id || idx}
                    style={{
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid var(--green-border)',
                      borderRadius: 10,
                      padding: '0.75rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.75rem',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--cream)' }}>
                        {tpl.title}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--cream-muted)', marginTop: 2, maxHeight: 36, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {tpl.body?.slice(0, 90)}...
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyAndSendWhatsApp(tpl)}
                      style={{
                        background: copiedTemplate === (tpl.id || idx) ? 'rgba(74, 222, 128, 0.2)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 8,
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {copiedTemplate === (tpl.id || idx) ? (
                        <>
                          <Check size={12} /> Sent!
                        </>
                      ) : (
                        <>
                          <Send size={12} /> Send WA
                        </>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* =========================================================================
            COLUMN 3: NEODOVE INSTANT DISPOSITION & NEXT LEAD ADVANCE
            ========================================================================= */}
        <div
          style={{
            background: 'rgba(8, 42, 31, 0.9)',
            border: '1px solid var(--green-border)',
            borderRadius: 16,
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: '0 6px 25px rgba(0,0,0,0.35)',
          }}
        >
          <div style={{ borderBottom: '1px solid var(--green-border)', paddingBottom: '0.65rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--cream)' }}>
              Call Outcome &amp; Pipeline Stage
            </h4>
            <span style={{ fontSize: '0.72rem', color: 'var(--cream-muted)' }}>
              Log disposition to trigger SLA &amp; follow-up timer
            </span>
          </div>

          {/* Fast Disposition Buttons */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--cream-muted)', marginBottom: 6, fontWeight: 600 }}>
              Call Disposition *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              {[
                { id: 'Interested', label: '🟢 Connected - Interested', stage: 'Arrange Follow Up' },
                { id: 'Site Visit Confirmed', label: '🚗 Site Visit Booked', stage: 'Site Visit Prospecting' },
                { id: 'Callback Requested', label: '⏰ Callback Needed', stage: 'Arrange Follow Up' },
                { id: 'Ringing No Answer', label: '📵 Ringing / No Answer', stage: 'New Lead' },
                { id: 'Busy / Cut Call', label: '📵 Busy / Disconnected', stage: 'New Lead' },
                { id: 'Switched Off', label: '📵 Switched Off', stage: 'New Lead' },
                { id: 'Budget Mismatch', label: '⚠️ Budget Mismatch', stage: 'SVP/VAND Lost Request' },
                { id: 'Not Interested', label: '❌ Not Interested', stage: 'LOST' },
              ].map((disp) => (
                <button
                  key={disp.id}
                  type="button"
                  onClick={() => {
                    setSelectedDisposition(disp.id)
                    setSelectedStage(disp.stage)
                  }}
                  style={{
                    background: selectedDisposition === disp.id ? 'rgba(74, 222, 128, 0.25)' : 'rgba(0,0,0,0.35)',
                    color: selectedDisposition === disp.id ? '#4ade80' : 'var(--cream)',
                    border: `1px solid ${selectedDisposition === disp.id ? '#4ade80' : 'var(--green-border)'}`,
                    borderRadius: 8,
                    padding: '0.45rem 0.55rem',
                    fontSize: '0.72rem',
                    fontWeight: 650,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  {disp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pipeline Stage Dropdown (18 Stages) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--cream-muted)', marginBottom: 4, fontWeight: 600 }}>
              Move to Funnel Stage:
            </label>
            <select
              value={selectedStage}
              onChange={(e) => handleManualStageChange(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--green-border)',
                borderRadius: 8,
                padding: '0.45rem 0.65rem',
                color: 'var(--cream)',
                fontSize: '0.78rem',
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

          {/* Callback Date / Time Picker */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--cream-muted)', marginBottom: 4, fontWeight: 600 }}>
              Scheduled Callback Date &amp; Time:
            </label>
            <input
              type="datetime-local"
              value={callbackDateTime}
              onChange={(e) => setCallbackDateTime(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--green-border)',
                borderRadius: 8,
                padding: '0.4rem 0.65rem',
                color: 'var(--cream)',
                fontSize: '0.78rem',
              }}
            />
          </div>

          {/* Call Notes Textarea */}
          <div>
            <label style={{ display: 'block', fontSize: '0.74rem', color: 'var(--cream-muted)', marginBottom: 4, fontWeight: 600 }}>
              Call Summary &amp; Buyer Notes:
            </label>
            <textarea
              rows={3}
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              placeholder="e.g. Buyer interested in 2BHK on 14th floor. Requested Saturday 11 AM site visit..."
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid var(--green-border)',
                borderRadius: 8,
                padding: '0.5rem 0.65rem',
                color: 'var(--cream)',
                fontSize: '0.78rem',
                resize: 'none',
              }}
            />
          </div>

          {saveSuccessMsg && (
            <div style={{ color: '#4ade80', fontSize: '0.78rem', fontWeight: 600, textAlign: 'center' }}>
              {saveSuccessMsg}
            </div>
          )}

          {/* Action Row: Save & Next vs Save Only */}
          <div style={{ display: 'flex', gap: '0.65rem', marginTop: 'auto' }}>
            <button
              type="button"
              className="btn-outline"
              onClick={() => handleSaveDisposition(false)}
              style={{
                flex: 1,
                padding: '0.6rem 0.75rem',
                fontSize: '0.78rem',
                borderColor: 'var(--green-border)',
                color: 'var(--cream)',
              }}
            >
              Save Only
            </button>

            <button
              type="button"
              className="btn-accent"
              onClick={() => handleSaveDisposition(true)}
              style={{
                flex: 2,
                padding: '0.6rem 0.95rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              }}
            >
              Save &amp; Dial Next ⏭️
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
