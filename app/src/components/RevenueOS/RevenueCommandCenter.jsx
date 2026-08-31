import React, { useState } from 'react'
import {
  Sparkles,
  TrendingUp,
  DollarSign,
  Activity,
  AlertTriangle,
  Search,
  Bot,
  LayoutGrid,
  Kanban,
  BarChart3,
  Download,
  Flame,
  Clock,
  Filter,
  CheckCircle2,
  Repeat,
  Calendar,
  Layers,
  Headphones,
  PhoneCall,
  MessageSquare,
  Users,
  Zap,
  Play,
  RotateCcw,
  Check,
  ShieldAlert,
} from 'lucide-react'
import {
  CRM_PHASES,
  CRM_STAGES,
  mapLegacyStatusToStage,
} from './crmPipelineConstants.js'
import { calculateLeadCadence } from '../../utils/crmAutomationEngine.js'

export default function RevenueCommandCenter({
  contacts = [],
  properties = [],
  callers = [],
  viewMode = 'cards',
  setViewMode,
  onAskCRM,
  askCrmResponse,
  isAsking,
  onExportCSV,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  propertyFilter,
  setPropertyFilter,
  callerFilter,
  setCallerFilter,
  onAutoDistribute,
  isDistributing,
  uniqueProperties = [],
  onRunAutomationEngine,
  onExecuteTuesdayRefresh,
  automationResult = null,
  isAutomating = false,
}) {
  const [naturalQuery, setNaturalQuery] = useState('')

  // Calculate high-fidelity pipeline metrics
  const totalLeads = contacts.length
  const activeCallers = (callers || []).filter((c) => c.active !== false)
  const unassignedLeads = contacts.filter(
    (c) => !c.assignedTo?.name && !c.assignedCallerName
  )
  const leadsPerCaller = activeCallers.length > 0 ? Math.round(totalLeads / activeCallers.length) : 0

  let totalPipelineValue = 0
  let highIntentCount = 0
  let atRiskCount = 0
  let tat12CallsCount = 0
  let weeklyTuesdayCount = 0
  let eoiSameDayCount = 0
  let wonCount = 0
  let lostRecoveryCount = 0

  // Cadence Telemetry counters
  let freshCadenceCount = 0
  let followupCadenceCount = 0
  let cooldownCount = 0
  let call2DueCount = 0
  let cadenceExpiredCount = 0
  let tuesdayRefreshEligibleCount = 0

  contacts.forEach((c) => {
    // Estimate deal value
    let num = 8500000 // 85L baseline
    if (c.budget) {
      const bStr = String(c.budget).toLowerCase()
      const cr = bStr.match(/([\d.]+)\s*(cr|crore)/)
      const l = bStr.match(/([\d.]+)\s*(l|lac|lakh)/)
      if (cr) num = parseFloat(cr[1]) * 10000000
      else if (l) num = parseFloat(l[1]) * 100000
      else {
        const rawNum = parseFloat(bStr.replace(/[^\d.]/g, ''))
        if (rawNum > 0) num = rawNum
      }
    } else if (c.propertyName && properties.length) {
      const p = properties.find((pr) => (pr.name || '').toLowerCase() === c.propertyName.toLowerCase())
      if (p && p.price) {
        const pStr = String(p.price).toLowerCase()
        const cr = pStr.match(/([\d.]+)\s*(cr|crore)/)
        const l = pStr.match(/([\d.]+)\s*(l|lac|lakh)/)
        if (cr) num = parseFloat(cr[1]) * 10000000
        else if (l) num = parseFloat(l[1]) * 100000
      }
    }
    totalPipelineValue += num

    const type = (c.type || '').toLowerCase()
    const msg = (c.message || '').toLowerCase()
    const src = (c.source || '').toLowerCase()
    const stage = mapLegacyStatusToStage(c.status)

    if (type.includes('dwell') || type.includes('visit') || type.includes('30s') || src.includes('dwell') || msg.includes('urgent')) {
      highIntentCount++
    }

    if (stage === 'New Lead' || stage === 'Fresh Lead') {
      tat12CallsCount++
    }
    if (stage === 'Weekly Fresh Prospecting' || stage === 'Weekly Booking Ready' || stage === 'Weekly Closing') {
      weeklyTuesdayCount++
    }
    if (stage === 'EOI') {
      eoiSameDayCount++
    }
    if (stage === 'WON') {
      wonCount++
    }
    if (stage === 'LOST' || stage === 'Under Review' || stage === 'SVP/VAND Lost Request' || stage === 'Re-Pitch') {
      lostRecoveryCount++
    }

    // Cadence engine telemetry per lead
    const cadence = calculateLeadCadence(c)
    if (cadence) {
      if (cadence.cadenceType === 'fresh_6d_12c') freshCadenceCount++
      if (cadence.cadenceType === 'followup_18d_32c') followupCadenceCount++
      if (cadence.isCooldownActive) cooldownCount++
      if (cadence.callsToday === 1 && !cadence.isCooldownActive) call2DueCount++
      if (cadence.isExpired) cadenceExpiredCount++
      if (stage === 'Weekly Fresh Prospecting' || stage === 'Re-Pitch') tuesdayRefreshEligibleCount++
    }

    const ageDays = c.submittedAt ? (Date.now() - new Date(c.submittedAt).getTime()) / (1000 * 3600 * 24) : 0
    if ((stage === 'New Lead' || stage === 'Fresh Lead') && ageDays > 2) {
      atRiskCount++
    }
  })

  const forecastedRevenue = Math.round(totalPipelineValue * 0.28)

  const formatCr = (val) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`
    if (val >= 100000) return `₹${(val / 100000).toFixed(1)} L`
    return `₹${val.toLocaleString('en-IN')}`
  }

  const handleAskSubmit = (e) => {
    e.preventDefault()
    if (!naturalQuery.trim()) return
    if (onAskCRM) onAskCRM(naturalQuery.trim())
  }

  const quickPrompts = [
    'Show high-intent dwell leads >30s',
    'Which deals are closing this week?',
    'List uncontacted fresh leads for callers',
    'Show buyers interested in Kharghar',
  ]

  return (
    <div className="rev-command-center" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.75rem' }}>
      {/* Top Header Bar with Luxury Branding */}
      <div className="rev-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'rgba(8, 42, 31, 0.95)', border: '1px solid var(--green-border)', borderRadius: 16, padding: '1rem 1.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg, rgba(74,222,128,0.2) 0%, rgba(16,185,129,0.1) 100%)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
            <Activity size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--cream)' }}>
                RE-ON <span style={{ color: '#4ade80' }}>Autonomous CRM OS</span>
              </h2>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(74,222,128,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.4)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 1.5s infinite' }} />
                100% Autonomous Heartbeat Active
              </span>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--cream-muted)' }}>
              All Refreshes Automated • 4hr Cooldown Unlocks • 6D/12C Fresh Cadence • 18D/32C Follow-Up • VAND Loops • Refresh Engine
            </p>
          </div>
        </div>

        {/* View Switcher Tabs + Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: 3, border: '1px solid var(--green-border)' }}>
            <button
              type="button"
              className={`rev-view-tab-btn ${viewMode === 'inquiries' || viewMode === 'cards' ? 'active' : ''}`}
              onClick={() => setViewMode('inquiries')}
              style={{
                background: viewMode === 'inquiries' || viewMode === 'cards' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: viewMode === 'inquiries' || viewMode === 'cards' ? '#fff' : 'var(--cream-muted)',
                border: 'none',
                padding: '0.4rem 0.85rem',
                borderRadius: 7,
                fontSize: '0.78rem',
                fontWeight: 650,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <MessageSquare size={13} /> Inquiries ({contacts.length})
            </button>
            <button
              type="button"
              className={`rev-view-tab-btn ${viewMode === 'neodove' ? 'active' : ''}`}
              onClick={() => setViewMode('neodove')}
              style={{
                background: viewMode === 'neodove' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: viewMode === 'neodove' ? '#fff' : 'var(--cream-muted)',
                border: 'none',
                padding: '0.4rem 0.85rem',
                borderRadius: 7,
                fontSize: '0.78rem',
                fontWeight: 650,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Headphones size={13} /> NeoDove Dialer
            </button>
            <button
              type="button"
              className={`rev-view-tab-btn ${viewMode === 'callers' ? 'active' : ''}`}
              onClick={() => setViewMode('callers')}
              style={{
                background: viewMode === 'callers' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: viewMode === 'callers' ? '#fff' : 'var(--cream-muted)',
                border: 'none',
                padding: '0.4rem 0.85rem',
                borderRadius: 7,
                fontSize: '0.78rem',
                fontWeight: 650,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Users size={13} /> Team ({callers.length})
            </button>
            <button
              type="button"
              className={`rev-view-tab-btn ${viewMode === 'analytics' ? 'active' : ''}`}
              onClick={() => setViewMode('analytics')}
              style={{
                background: viewMode === 'analytics' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: viewMode === 'analytics' ? '#fff' : 'var(--cream-muted)',
                border: 'none',
                padding: '0.4rem 0.85rem',
                borderRadius: 7,
                fontSize: '0.78rem',
                fontWeight: 650,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <BarChart3 size={13} /> Analytics
            </button>
          </div>

          <button
            type="button"
            className="btn-outline"
            onClick={onExportCSV}
            style={{
              padding: '0.45rem 0.85rem',
              fontSize: '0.78rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              borderColor: 'var(--green-border)',
              color: 'var(--cream)',
            }}
          >
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* ═══ AUTONOMOUS CRM ENGINE CONTROL & CADENCE HUD ═══ */}
      <div style={{
        background: 'linear-gradient(145deg, rgba(8, 42, 31, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%)',
        border: '1px solid rgba(74, 222, 128, 0.3)',
        borderRadius: 18,
        padding: '1.25rem 1.4rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(74, 222, 128, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
              <Zap size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>
                  CRM Cadence Algorithm &amp; Auto-Pilot
                </h3>
                {call2DueCount > 0 && (
                  <span style={{ fontSize: '0.7rem', padding: '2px 7px', borderRadius: 12, background: 'rgba(251, 191, 36, 0.2)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.4)', fontWeight: 700 }}>
                    🔥 {call2DueCount} Call #2 Ready (4hr Gap Passed)
                  </span>
                )}
              </div>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--cream-muted)' }}>
                Automated 2-call daily cadence (4hr spacing), VAND site visit loops, and Tuesday cohort recycling.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-accent"
              onClick={onRunAutomationEngine}
              disabled={isAutomating}
              style={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                padding: '0.55rem 1.15rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                borderRadius: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
              }}
            >
              <Play size={13} className={isAutomating ? 'spin' : ''} />
              {isAutomating ? 'Running Algorithm...' : '⚡ Run Cadence Engine'}
            </button>

            <button
              type="button"
              className="btn-outline"
              onClick={onExecuteTuesdayRefresh}
              disabled={isAutomating}
              style={{
                borderColor: 'rgba(56, 189, 248, 0.4)',
                color: '#38bdf8',
                padding: '0.55rem 1rem',
                fontSize: '0.82rem',
                fontWeight: 650,
                borderRadius: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <RotateCcw size={13} className={isAutomating ? 'spin' : ''} />
              Refresh ({tuesdayRefreshEligibleCount})
            </button>
          </div>
        </div>

        {/* Cadence Telemetry Chips */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(74, 222, 128, 0.2)', borderRadius: 12, padding: '0.75rem 0.9rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>🌱 Fresh Cadence (6D / 12C)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#4ade80', margin: '3px 0' }}>{freshCadenceCount}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--cream-muted)' }}>Max 2 calls/day • 4hr gap</div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 12, padding: '0.75rem 0.9rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>📞 Follow-Up (18D / 32C)</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8', margin: '3px 0' }}>{followupCadenceCount}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--cream-muted)' }}>18-day active consultation</div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(251, 191, 36, 0.2)', borderRadius: 12, padding: '0.75rem 0.9rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>⏳ 4-Hr Cooldown Active</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fbbf24', margin: '3px 0' }}>{cooldownCount}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--cream-muted)' }}>Protected spacing window</div>
          </div>

          <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(167, 139, 250, 0.2)', borderRadius: 12, padding: '0.75rem 0.9rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>🔁 Refresh Pool</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#a78bfa', margin: '3px 0' }}>{tuesdayRefreshEligibleCount}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--cream-muted)' }}>VAND &amp; Re-Pitch Recycled</div>
          </div>
        </div>

        {/* Automation Execution Toast / Result */}
        {automationResult && (
          <div style={{
            background: 'rgba(74, 222, 128, 0.12)',
            border: '1px solid rgba(74, 222, 128, 0.3)',
            borderRadius: 10,
            padding: '0.65rem 1rem',
            fontSize: '0.82rem',
            color: '#86efac',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <CheckCircle2 size={16} />
            <span>{automationResult}</span>
          </div>
        )}
      </div>

      {/* Telemetry Metric Cards */}
      <div className="rev-telemetry-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
        <div className="rev-telemetry-card" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--green-border)', borderRadius: 12, padding: '0.85rem 1rem' }}>
          <div className="rev-telemetry-label" style={{ fontSize: '0.74rem', color: 'var(--cream-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <DollarSign size={13} color="#4ade80" /> Pipeline Gross Value
          </div>
          <div className="rev-telemetry-value" style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--cream)', margin: '4px 0' }}>
            {formatCr(totalPipelineValue)}
          </div>
          <div className="rev-telemetry-sub" style={{ fontSize: '0.7rem', color: '#4ade80' }}>
            Forecast: {formatCr(forecastedRevenue)}
          </div>
        </div>

        <div className="rev-telemetry-card" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--green-border)', borderRadius: 12, padding: '0.85rem 1rem' }}>
          <div className="rev-telemetry-label" style={{ fontSize: '0.74rem', color: 'var(--cream-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Clock size={13} color="#4ade80" /> Fresh Leads (12 Calls TAT)
          </div>
          <div className="rev-telemetry-value" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#4ade80', margin: '4px 0' }}>
            {tat12CallsCount}
          </div>
          <div className="rev-telemetry-sub" style={{ fontSize: '0.7rem', color: 'var(--cream-muted)' }}>
            {unassignedLeads.length} Unassigned to Callers
          </div>
        </div>

        <div className="rev-telemetry-card" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--green-border)', borderRadius: 12, padding: '0.85rem 1rem' }}>
          <div className="rev-telemetry-label" style={{ fontSize: '0.74rem', color: 'var(--cream-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Calendar size={13} color="#38bdf8" /> Weekly Cohorts (Tue Refresh)
          </div>
          <div className="rev-telemetry-value" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38bdf8', margin: '4px 0' }}>
            {weeklyTuesdayCount}
          </div>
          <div className="rev-telemetry-sub" style={{ fontSize: '0.7rem', color: 'var(--cream-muted)' }}>
            Prospecting / Booking / Closing
          </div>
        </div>

        <div className="rev-telemetry-card" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--green-border)', borderRadius: 12, padding: '0.85rem 1rem' }}>
          <div className="rev-telemetry-label" style={{ fontSize: '0.74rem', color: 'var(--cream-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Sparkles size={13} color="#fbbf24" /> EOI Clearance (Same Day)
          </div>
          <div className="rev-telemetry-value" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#fbbf24', margin: '4px 0' }}>
            {eoiSameDayCount}
          </div>
          <div className="rev-telemetry-sub" style={{ fontSize: '0.7rem', color: '#10b981' }}>
            🏆 {wonCount} Deals WON
          </div>
        </div>

        <div className="rev-telemetry-card" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--green-border)', borderRadius: 12, padding: '0.85rem 1rem' }}>
          <div className="rev-telemetry-label" style={{ fontSize: '0.74rem', color: 'var(--cream-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Repeat size={13} color="#f87171" /> Re-Pitch / Recovery Pool
          </div>
          <div className="rev-telemetry-value" style={{ fontSize: '1.35rem', fontWeight: 800, color: lostRecoveryCount > 0 ? '#fb7185' : 'var(--cream)', margin: '4px 0' }}>
            {lostRecoveryCount}
          </div>
          <div className="rev-telemetry-sub" style={{ fontSize: '0.7rem', color: 'var(--cream-muted)' }}>
            Review &amp; Re-Pitch Salvage
          </div>
        </div>
      </div>

      {/* "Ask CRM" Natural Language AI Query Bar */}
      <div className="rev-ask-crm-wrap" style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid var(--green-border)', borderRadius: 14, padding: '0.85rem' }}>
        <form onSubmit={handleAskSubmit} className="rev-ask-crm-form" style={{ display: 'flex', gap: '0.65rem', alignItems: 'center' }}>
          <Sparkles size={18} color="#4ade80" />
          <input
            type="text"
            className="rev-ask-crm-input"
            placeholder="✨ Ask CRM (e.g. 'Show leads in Weekly Closing stage', 'Which fresh leads need 12-call follow up?')..."
            value={naturalQuery}
            onChange={(e) => setNaturalQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'rgba(8, 42, 31, 0.8)',
              border: '1px solid var(--green-border)',
              borderRadius: 10,
              padding: '0.55rem 0.85rem',
              color: 'var(--cream)',
              fontSize: '0.85rem',
            }}
          />
          <button
            type="submit"
            className="btn-accent"
            style={{
              padding: '0.55rem 1.1rem',
              fontSize: '0.82rem',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              whiteSpace: 'nowrap',
              border: 'none',
              borderRadius: 10,
              color: '#fff',
              fontWeight: 650,
              cursor: 'pointer',
            }}
            disabled={isAsking}
          >
            {isAsking ? 'Thinking...' : 'Ask AI'}
          </button>
        </form>

        <div className="rev-ask-crm-chips" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.65rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--cream-muted)', fontWeight: 600 }}>Quick Prompts:</span>
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="rev-ask-chip"
              onClick={() => {
                setNaturalQuery(prompt)
                if (onAskCRM) onAskCRM(prompt)
              }}
              style={{
                background: 'rgba(74, 222, 128, 0.1)',
                border: '1px solid rgba(74, 222, 128, 0.25)',
                color: 'var(--cream)',
                borderRadius: 8,
                padding: '0.25rem 0.6rem',
                fontSize: '0.72rem',
                cursor: 'pointer',
              }}
            >
              {prompt}
            </button>
          ))}
        </div>

        {askCrmResponse && (
          <div className="rev-ask-crm-response" style={{ marginTop: '0.75rem', background: 'rgba(8, 42, 31, 0.9)', border: '1px solid rgba(74, 222, 128, 0.3)', borderRadius: 10, padding: '0.75rem 1rem', display: 'flex', gap: '0.65rem', color: 'var(--cream)', fontSize: '0.85rem' }}>
            <Bot size={18} color="#4ade80" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <strong style={{ color: '#4ade80' }}>AI Analysis:</strong> {askCrmResponse}
            </div>
          </div>
        )}
      </div>

      {/* Standard Filters Toolbar */}
      <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <Search size={14} color="var(--cream-muted)" style={{ position: 'absolute', left: 12, top: 12 }} />
          <input
            type="text"
            placeholder="Search by name, phone, email, notes, stage..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(8, 42, 31, 0.85)',
              border: '1px solid var(--green-border)',
              borderRadius: 10,
              padding: '0.55rem 0.75rem 0.55rem 2.2rem',
              color: 'var(--cream)',
              fontSize: '0.85rem',
            }}
          />
        </div>

        {/* Granular Flowchart Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            background: 'rgba(8, 42, 31, 0.85)',
            border: '1px solid var(--green-border)',
            borderRadius: 10,
            padding: '0.55rem 0.85rem',
            color: 'var(--cream)',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          <option value="all">All 18 Pipeline Stages</option>

          <optgroup label="--- Phase Groups ---">
            <option value="phase:fresh_prospecting">🟢 All Fresh Prospecting (6 stages)</option>
            <option value="phase:exploration_booking">🔵 All Exploration &amp; Booking (3 stages)</option>
            <option value="phase:negotiation_closing">🟡 All Negotiation &amp; Closing (5 stages)</option>
            <option value="phase:won">🏆 Closed WON</option>
            <option value="phase:lost_review">🔴 All Lost &amp; Review (4 stages)</option>
          </optgroup>

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
            <option value="EOI">✍️ EOI (Same Day)</option>
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

        {/* Lead Type Filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            background: 'rgba(8, 42, 31, 0.85)',
            border: '1px solid var(--green-border)',
            borderRadius: 10,
            padding: '0.55rem 0.85rem',
            color: 'var(--cream)',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Lead Channels</option>
          <option value="Dwell">⭐ Dwell Leads (&gt;30s)</option>
          <option value="Brochure">📥 Brochure Downloads</option>
          <option value="SiteVisit">🚗 Site Visits</option>
          <option value="Property">🏢 Property Inquiries</option>
          <option value="General">✉️ General Contact</option>
        </select>

        {/* Property Filter */}
        <select
          value={propertyFilter}
          onChange={(e) => setPropertyFilter(e.target.value)}
          style={{
            background: 'rgba(8, 42, 31, 0.85)',
            border: '1px solid var(--green-border)',
            borderRadius: 10,
            padding: '0.55rem 0.85rem',
            color: 'var(--cream)',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Properties ({uniqueProperties.length})</option>
          {uniqueProperties.map((pName) => (
            <option key={pName} value={pName}>{pName}</option>
          ))}
        </select>

        {/* Telecaller Filter */}
        <select
          value={callerFilter || 'all'}
          onChange={(e) => setCallerFilter(e.target.value)}
          style={{
            background: 'rgba(8, 42, 31, 0.85)',
            border: '1px solid rgba(74, 222, 128, 0.4)',
            borderRadius: 10,
            padding: '0.55rem 0.85rem',
            color: '#86efac',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <option value="all">👥 All Callers ({activeCallers.length} active)</option>
          <option value="unassigned">⚠️ Unassigned Leads ({unassignedLeads.length})</option>
          {activeCallers.map((c) => (
            <option key={c._id || c.name} value={c.name}>
              👤 {c.name} ({contacts.filter(ct => ct.assignedCallerName === c.name || ct.assignedTo?.name === c.name).length} leads)
            </option>
          ))}
        </select>



        {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all' || propertyFilter !== 'all' || (callerFilter && callerFilter !== 'all')) && (
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              setSearchQuery('')
              setStatusFilter('all')
              setTypeFilter('all')
              setPropertyFilter('all')
              if (setCallerFilter) setCallerFilter('all')
            }}
            style={{
              padding: '0.55rem 0.85rem',
              fontSize: '0.8rem',
              borderColor: 'var(--green-border)',
              color: 'var(--cream)',
            }}
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}
