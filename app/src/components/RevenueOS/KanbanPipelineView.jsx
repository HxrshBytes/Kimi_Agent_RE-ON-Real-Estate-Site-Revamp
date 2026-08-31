import React, { useState } from 'react'
import {
  Sparkles,
  Phone,
  MessageSquare,
  Building2,
  Calendar,
  DollarSign,
  User,
  ChevronRight,
  Flame,
  Clock,
  ArrowRight,
  Repeat,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Check,
  ShieldAlert,
  GitFork,
  Compass,
  Zap,
} from 'lucide-react'
import {
  CRM_PHASES,
  CRM_STAGES,
  mapLegacyStatusToStage,
  getStageMeta,
  getNextStage,
} from './crmPipelineConstants.js'
import { calculateLeadCadence } from '../../utils/crmAutomationEngine.js'

export default function KanbanPipelineView({
  contacts = [],
  onOpenLeadModal,
  onUpdateStatus,
}) {
  const [boardMode, setBoardMode] = useState('flowchart') // 'flowchart' | 'phases' | 'granular'
  const [activePhaseFilter, setActivePhaseFilter] = useState('all')
  const [selectedFlowchartStage, setSelectedFlowchartStage] = useState(null)

  const handleAdvanceStage = (leadId, currentStage) => {
    const nextStage = getNextStage(currentStage)
    if (nextStage && onUpdateStatus) {
      onUpdateStatus(leadId, nextStage)
    }
  }

  const handleRePitch = (leadId) => {
    if (onUpdateStatus) {
      onUpdateStatus(leadId, 'Fresh Lead')
    }
  }

  // Filter contacts by phase when in granular mode
  const displayedStages = boardMode === 'phases'
    ? CRM_PHASES
    : activePhaseFilter === 'all'
    ? CRM_STAGES
    : CRM_STAGES.filter((s) => s.phaseId === activePhaseFilter)

  return (
    <div className="rev-kanban-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Board Mode Switcher Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          background: 'rgba(8, 42, 31, 0.95)',
          border: '1px solid var(--green-border)',
          borderRadius: 16,
          padding: '1rem 1.35rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
            <Compass size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--cream)' }}>
              Flowchart Pipeline Architecture
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.74rem', color: 'var(--cream-muted)' }}>
              Interactive Sales Funnel Blueprint • Cadence Rules • Automated Loops
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: 3, border: '1px solid var(--green-border)' }}>
            <button
              type="button"
              onClick={() => setBoardMode('flowchart')}
              style={{
                background: boardMode === 'flowchart' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: boardMode === 'flowchart' ? '#fff' : 'var(--cream-muted)',
                border: 'none',
                padding: '0.4rem 0.85rem',
                borderRadius: 8,
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              🗺️ Flowchart Blueprint
            </button>
            <button
              type="button"
              onClick={() => setBoardMode('phases')}
              style={{
                background: boardMode === 'phases' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: boardMode === 'phases' ? '#fff' : 'var(--cream-muted)',
                border: 'none',
                padding: '0.4rem 0.85rem',
                borderRadius: 8,
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              5 Phases Board
            </button>
            <button
              type="button"
              onClick={() => setBoardMode('granular')}
              style={{
                background: boardMode === 'granular' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                color: boardMode === 'granular' ? '#fff' : 'var(--cream-muted)',
                border: 'none',
                padding: '0.4rem 0.85rem',
                borderRadius: 8,
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              18 Granular Stages
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODE 1: INTERACTIVE FLOWCHART BLUEPRINT (DIRECT VISUAL MAP)
          ========================================================================= */}
      {boardMode === 'flowchart' && (
        <div style={{
          background: 'linear-gradient(155deg, rgba(8, 42, 31, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(74, 222, 128, 0.3)',
          borderRadius: 20,
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>
                ● Master Pipeline Flowchart
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--cream-muted)' }}>
                Click any stage node to inspect its live leads or fast-advance deals.
              </span>
            </div>
            {selectedFlowchartStage && (
              <button
                type="button"
                className="btn-outline"
                onClick={() => setSelectedFlowchartStage(null)}
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.74rem', borderColor: 'var(--green-border)', color: 'var(--cream)' }}
              >
                Clear Node Filter (Show Full Blueprint)
              </button>
            )}
          </div>

          {/* Master Flowchart Nodes Grid matching Image 3 + Image 1 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.25rem',
            alignItems: 'start',
          }}>
            {/* PHASE 1: FRESH PROSPECTING */}
            <div style={{
              background: 'rgba(8, 42, 31, 0.85)',
              border: '1px solid rgba(74, 222, 128, 0.4)',
              borderRadius: 16,
              padding: '1.2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              <div style={{ borderBottom: '1px solid rgba(74, 222, 128, 0.2)', paddingBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4ade80', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Phase 1: Fresh Prospecting
                </span>
                <div style={{ fontSize: '0.68rem', color: 'var(--cream-muted)', marginTop: 2 }}>
                  6D/12C Fresh Cadence • 18D/32C Follow-Up
                </div>
              </div>

              {[
                { id: 'New Lead', tat: '6D / 12 Calls (2/day, 4hr gap)', icon: '🟢' },
                { id: 'Fresh Lead', tat: '6D / 12 Calls (2/day, 4hr gap)', icon: '🌱' },
                { id: 'Arrange Follow Up', tat: '18D / 32 Calls (4hr gap)', icon: '📞' },
                { id: 'Site Visit Prospecting', tat: 'Weekly Target', icon: '🚗' },
                { id: 'VAND', tat: 'Visit Arrange (Not Done)', icon: '🔍', note: 'If not done -> Loop to Weekly' },
                { id: 'Weekly Fresh Prospecting', tat: 'Refresh -> Loop to Follow Up', icon: '🔄', isLoop: true },
              ].map((node) => {
                const count = contacts.filter((c) => mapLegacyStatusToStage(c.status) === node.id).length
                const isSelected = selectedFlowchartStage === node.id

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedFlowchartStage(isSelected ? null : node.id)}
                    style={{
                      background: isSelected ? 'rgba(74, 222, 128, 0.25)' : 'rgba(0,0,0,0.35)',
                      border: `1px solid ${isSelected ? '#4ade80' : node.isLoop ? 'rgba(56, 189, 248, 0.4)' : 'rgba(74, 222, 128, 0.2)'}`,
                      borderRadius: 10,
                      padding: '0.65rem 0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--cream)' }}>
                        {node.icon} {node.id}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#4ade80', marginTop: 2 }}>
                        ⚡ {node.tat}
                      </div>
                    </div>
                    <span style={{
                      background: count > 0 ? 'rgba(74, 222, 128, 0.2)' : 'rgba(255,255,255,0.05)',
                      color: count > 0 ? '#4ade80' : 'var(--cream-muted)',
                      border: `1px solid ${count > 0 ? 'rgba(74, 222, 128, 0.4)' : 'transparent'}`,
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: '0.74rem',
                      fontWeight: 800,
                    }}>
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* PHASE 2: EXPLORATION & BOOKING */}
            <div style={{
              background: 'rgba(10, 35, 55, 0.85)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              borderRadius: 16,
              padding: '1.2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              <div style={{ borderBottom: '1px solid rgba(56, 189, 248, 0.2)', paddingBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Phase 2: Exploration &amp; Booking
                </span>
                <div style={{ fontSize: '0.68rem', color: 'var(--cream-muted)', marginTop: 2 }}>
                  Current Week Active • Refresh
                </div>
              </div>

              {[
                { id: 'Exploration', tat: 'Current Week Active', icon: '🧭' },
                { id: 'Weekly Booking Ready', tat: 'Refresh', icon: '🎯' },
                { id: 'Booking Ready', tat: '48h Token Window', icon: '📑' },
              ].map((node) => {
                const count = contacts.filter((c) => mapLegacyStatusToStage(c.status) === node.id).length
                const isSelected = selectedFlowchartStage === node.id

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedFlowchartStage(isSelected ? null : node.id)}
                    style={{
                      background: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(0,0,0,0.35)',
                      border: `1px solid ${isSelected ? '#38bdf8' : 'rgba(56, 189, 248, 0.2)'}`,
                      borderRadius: 10,
                      padding: '0.65rem 0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--cream)' }}>
                        {node.icon} {node.id}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#38bdf8', marginTop: 2 }}>
                        ⚡ {node.tat}
                      </div>
                    </div>
                    <span style={{
                      background: count > 0 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255,255,255,0.05)',
                      color: count > 0 ? '#38bdf8' : 'var(--cream-muted)',
                      border: `1px solid ${count > 0 ? 'rgba(56, 189, 248, 0.4)' : 'transparent'}`,
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: '0.74rem',
                      fontWeight: 800,
                    }}>
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* PHASE 3: NEGOTIATION & CLOSING */}
            <div style={{
              background: 'rgba(45, 38, 10, 0.85)',
              border: '1px solid rgba(251, 191, 36, 0.4)',
              borderRadius: 16,
              padding: '1.2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              <div style={{ borderBottom: '1px solid rgba(251, 191, 36, 0.2)', paddingBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Phase 3: Negotiation &amp; Closing
                </span>
                <div style={{ fontSize: '0.68rem', color: 'var(--cream-muted)', marginTop: 2 }}>
                  Refresh • EOI Same Day Clearance
                </div>
              </div>

              {[
                { id: 'Rate Finalization Pending', tat: 'Developer Pricing Desk', icon: '⚖️' },
                { id: 'Final Negotiation', tat: '24h Decision SLA', icon: '🤝' },
                { id: 'Delay Interest', tat: 'Risk Mitigation Active', icon: '⏳' },
                { id: 'Weekly Closing', tat: 'Refresh Sprint', icon: '🏁' },
                { id: 'EOI', tat: 'Same Day Clearance TAT', icon: '✍️' },
              ].map((node) => {
                const count = contacts.filter((c) => mapLegacyStatusToStage(c.status) === node.id).length
                const isSelected = selectedFlowchartStage === node.id

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedFlowchartStage(isSelected ? null : node.id)}
                    style={{
                      background: isSelected ? 'rgba(251, 191, 36, 0.25)' : 'rgba(0,0,0,0.35)',
                      border: `1px solid ${isSelected ? '#fbbf24' : 'rgba(251, 191, 36, 0.2)'}`,
                      borderRadius: 10,
                      padding: '0.65rem 0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--cream)' }}>
                        {node.icon} {node.id}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#fbbf24', marginTop: 2 }}>
                        ⚡ {node.tat}
                      </div>
                    </div>
                    <span style={{
                      background: count > 0 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255,255,255,0.05)',
                      color: count > 0 ? '#fbbf24' : 'var(--cream-muted)',
                      border: `1px solid ${count > 0 ? 'rgba(251, 191, 36, 0.4)' : 'transparent'}`,
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: '0.74rem',
                      fontWeight: 800,
                    }}>
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* PHASE 4 & 5: WON & LOST RECOVERY */}
            <div style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(248, 113, 113, 0.3)',
              borderRadius: 16,
              padding: '1.2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}>
              <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Phase 4 &amp; 5: Won &amp; Lost Recovery
                </span>
                <div style={{ fontSize: '0.68rem', color: 'var(--cream-muted)', marginTop: 2 }}>
                  Closed Won &amp; Re-Pitch Loop
                </div>
              </div>

              {[
                { id: 'WON', tat: 'Deal Closed & Cleared', icon: '🏆', color: '#10b981' },
                { id: 'SVP/VAND Lost Request', tat: 'Audit & Lost Request', icon: '⚠️', color: '#fb7185' },
                { id: 'Under Review', tat: 'Second Opinion Evaluation', icon: '🔎', color: '#f43f5e' },
                { id: 'Re-Pitch', tat: 'Loops to Fresh Lead (Tue)', icon: '🔁', color: '#38bdf8', isLoop: true },
                { id: 'LOST', tat: 'Archived Pool', icon: '❌', color: '#ef4444' },
              ].map((node) => {
                const count = contacts.filter((c) => mapLegacyStatusToStage(c.status) === node.id).length
                const isSelected = selectedFlowchartStage === node.id

                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedFlowchartStage(isSelected ? null : node.id)}
                    style={{
                      background: isSelected ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0,0,0,0.35)',
                      border: `1px solid ${isSelected ? node.color : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 10,
                      padding: '0.65rem 0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: node.color }}>
                        {node.icon} {node.id}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--cream-muted)', marginTop: 2 }}>
                        ⚡ {node.tat}
                      </div>
                    </div>
                    <span style={{
                      background: count > 0 ? `${node.color}22` : 'rgba(255,255,255,0.05)',
                      color: count > 0 ? node.color : 'var(--cream-muted)',
                      border: `1px solid ${count > 0 ? `${node.color}50` : 'transparent'}`,
                      padding: '2px 8px',
                      borderRadius: 12,
                      fontSize: '0.74rem',
                      fontWeight: 800,
                    }}>
                      {count}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Filtered Stage Leads Panel (When Node is Clicked) */}
          {selectedFlowchartStage && (
            <div style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid var(--green-border)',
              borderRadius: 16,
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--cream)' }}>
                  Active Leads in Stage: <span style={{ color: '#4ade80' }}>{selectedFlowchartStage}</span>
                </h4>
                <span style={{ fontSize: '0.78rem', color: 'var(--cream-muted)' }}>
                  {contacts.filter((c) => mapLegacyStatusToStage(c.status) === selectedFlowchartStage).length} Leads
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.85rem' }}>
                {contacts
                  .filter((c) => mapLegacyStatusToStage(c.status) === selectedFlowchartStage)
                  .map((lead) => renderKanbanCard(lead, onOpenLeadModal, onUpdateStatus, handleAdvanceStage, handleRePitch))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODE 2 & 3: KANBAN BOARD COLUMNS (PHASES & GRANULAR)
          ========================================================================= */}
      {boardMode !== 'flowchart' && (
        <div className="rev-kanban-board" style={{ overflowX: 'auto', paddingBottom: '1rem' }}>
          {boardMode === 'phases' ? (
            CRM_PHASES.map((phase) => {
              const phaseLeads = contacts.filter((c) => {
                const stageId = mapLegacyStatusToStage(c.status)
                return phase.stages.includes(stageId)
              })

              return (
                <div
                  key={phase.id}
                  className="rev-kanban-col"
                  style={{
                    background: phase.bgColor || 'rgba(8, 42, 31, 0.85)',
                    border: `1px solid ${phase.borderColor || 'var(--green-border)'}`,
                    minWidth: '320px',
                    maxWidth: '360px',
                  }}
                >
                  {/* Column Header */}
                  <div className="rev-kanban-col-header" style={{ borderBottom: `2px solid ${phase.color}` }}>
                    <div>
                      <span className="rev-kanban-col-title" style={{ color: phase.color }}>
                        {phase.badge} {phase.title}
                      </span>
                      <div style={{ fontSize: '0.7rem', color: 'var(--cream-muted)', marginTop: 2 }}>
                        {phase.subtitle}
                      </div>
                    </div>
                    <span className="rev-kanban-col-count" style={{ background: `${phase.color}22`, color: phase.color, border: `1px solid ${phase.color}44` }}>
                      {phaseLeads.length}
                    </span>
                  </div>

                  {/* Sub-stages Pill List */}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', padding: '0.5rem 0.75rem', background: 'rgba(0,0,0,0.25)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {phase.stages.map((stName) => {
                      const count = phaseLeads.filter((c) => mapLegacyStatusToStage(c.status) === stName).length
                      return (
                        <span
                          key={stName}
                          style={{
                            fontSize: '0.65rem',
                            background: count > 0 ? `${phase.color}25` : 'rgba(255,255,255,0.05)',
                            color: count > 0 ? phase.color : 'rgba(245,245,220,0.4)',
                            border: `1px solid ${count > 0 ? `${phase.color}50` : 'transparent'}`,
                            padding: '0.15rem 0.4rem',
                            borderRadius: 6,
                            fontWeight: count > 0 ? 700 : 500,
                          }}
                        >
                          {stName} ({count})
                        </span>
                      )
                    })}
                  </div>

                  {/* Lead Cards List */}
                  <div className="rev-kanban-cards-wrap">
                    {phaseLeads.length === 0 ? (
                      <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--cream-muted)', fontSize: '0.78rem', fontStyle: 'italic' }}>
                        No leads in this phase
                      </div>
                    ) : (
                      phaseLeads.map((lead) => renderKanbanCard(lead, onOpenLeadModal, onUpdateStatus, handleAdvanceStage, handleRePitch))
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            displayedStages.map((stage) => {
              const stageLeads = contacts.filter((c) => mapLegacyStatusToStage(c.status) === stage.id)

              return (
                <div
                  key={stage.id}
                  className="rev-kanban-col"
                  style={{
                    background: 'rgba(8, 42, 31, 0.85)',
                    border: `1px solid ${stage.color}44`,
                    minWidth: '290px',
                    maxWidth: '320px',
                  }}
                >
                  <div className="rev-kanban-col-header" style={{ borderBottom: `2px solid ${stage.color}` }}>
                    <div>
                      <span className="rev-kanban-col-title" style={{ color: stage.color, fontSize: '0.88rem' }}>
                        {stage.badge} {stage.label}
                      </span>
                      <div style={{ fontSize: '0.68rem', color: '#fbbf24', marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={10} /> {stage.tat}
                      </div>
                    </div>
                    <span className="rev-kanban-col-count" style={{ background: `${stage.color}22`, color: stage.color, border: `1px solid ${stage.color}44` }}>
                      {stageLeads.length}
                    </span>
                  </div>

                  <div className="rev-kanban-cards-wrap">
                    {stageLeads.length === 0 ? (
                      <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--cream-muted)', fontSize: '0.78rem', fontStyle: 'italic' }}>
                        No leads in stage
                      </div>
                    ) : (
                      stageLeads.map((lead) => renderKanbanCard(lead, onOpenLeadModal, onUpdateStatus, handleAdvanceStage, handleRePitch))
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

/**
 * High-fidelity Kanban lead card renderer with Cadence Progress & Cooldown Guards
 */
function renderKanbanCard(lead, onOpenLeadModal, onUpdateStatus, handleAdvanceStage, handleRePitch) {
  const inqId = lead._id || lead.id
  const currentStage = mapLegacyStatusToStage(lead.status)
  const meta = getStageMeta(currentStage)
  const cadence = calculateLeadCadence(lead)
  const nextStage = getNextStage(currentStage)

  const cleanPhone = (lead.phone || '').replace(/[^\d+]/g, '')
  const waPhone = cleanPhone.startsWith('+') ? cleanPhone.replace('+', '') : `91${cleanPhone.replace(/^0+/, '')}`

  return (
    <div
      key={inqId}
      style={{
        background: 'linear-gradient(145deg, rgba(11, 61, 46, 0.9) 0%, rgba(8, 42, 31, 0.95) 100%)',
        border: '1px solid var(--green-border)',
        borderRadius: 14,
        padding: '0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.6rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Top Header: Identity & Stage Tag */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <User size={13} color="#4ade80" /> {lead.name || 'Inbound Prospect'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--cream-muted)', marginTop: '0.15rem' }}>
            {lead.phone || lead.email || 'No phone'}
          </div>
        </div>

        <span
          style={{
            background: `${meta.color}20`,
            color: meta.color,
            border: `1px solid ${meta.color}50`,
            padding: '0.15rem 0.45rem',
            borderRadius: 8,
            fontSize: '0.68rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          {meta.badge} {currentStage}
        </span>
      </div>

      {/* Cadence Telemetry & Cooldown Badge on Card */}
      {cadence && (
        <div style={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: 8,
          padding: '0.35rem 0.55rem',
          fontSize: '0.68rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: `1px solid ${cadence.isCooldownActive ? 'rgba(251,191,36,0.3)' : 'rgba(74,222,128,0.2)'}`,
        }}>
          <span style={{ color: cadence.cadenceType === 'fresh_6d_12c' ? '#4ade80' : '#38bdf8', fontWeight: 650 }}>
            {cadence.cadenceType === 'fresh_6d_12c' ? `🌱 C: ${cadence.totalCalls}/12 (D ${cadence.daysInPipeline + 1}/6)` : `📞 C: ${cadence.totalCalls}/32 (D ${cadence.daysInPipeline + 1}/18)`}
          </span>
          <span style={{ color: cadence.isCooldownActive ? '#fbbf24' : '#4ade80' }}>
            {cadence.isCooldownActive ? `⏳ Cooldown` : `🟢 Slot Ready`}
          </span>
        </div>
      )}

      {/* Target Property / Budget Strip */}
      {lead.propertyName && (
        <div
          style={{
            background: 'rgba(8, 42, 31, 0.7)',
            border: '1px solid var(--green-border)',
            padding: '0.45rem 0.6rem',
            borderRadius: 8,
            fontSize: '0.76rem',
            color: 'var(--cream)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <Building2 size={13} color="#4ade80" />
          <span style={{ fontWeight: 600, color: 'var(--cream)' }}>{lead.propertyName}</span>
          {lead.budget && (
            <span style={{ marginLeft: 'auto', color: '#fbbf24', fontWeight: 700 }}>
              {lead.budget}
            </span>
          )}
        </div>
      )}

      {/* Turnaround Time (TAT) & Assigned Caller Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--cream-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: '#fbbf24' }}>
          <Clock size={11} /> {meta.tat}
        </span>
        {lead.assignedCallerName || lead.assignedTo?.name ? (
          <span style={{ color: '#4ade80', fontWeight: 600 }}>
            👤 {lead.assignedCallerName || lead.assignedTo?.name}
          </span>
        ) : (
          <span style={{ color: '#f87171', fontStyle: 'italic' }}>Unassigned</span>
        )}
      </div>

      {/* Stage Dropdown Selector right on card */}
      <div style={{ marginTop: '0.1rem' }}>
        <select
          value={currentStage}
          onChange={(e) => onUpdateStatus && onUpdateStatus(inqId, e.target.value)}
          style={{
            width: '100%',
            background: 'rgba(8, 42, 31, 0.95)',
            border: '1px solid var(--green-border)',
            borderRadius: 8,
            padding: '0.3rem 0.5rem',
            color: 'var(--cream)',
            fontSize: '0.74rem',
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
      </div>

      {/* Action Strip */}
      <div
        style={{
          display: 'flex',
          gap: '0.35rem',
          alignItems: 'center',
          marginTop: '0.2rem',
          paddingTop: '0.4rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <button
          type="button"
          className="rev-btn-action rev-btn-action--primary"
          onClick={() => onOpenLeadModal(lead)}
          style={{ padding: '0.35rem 0.55rem', fontSize: '0.72rem', flex: 1 }}
        >
          <Sparkles size={11} /> 360° Twin
        </button>

        {lead.phone && (
          <a
            href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Hi ${lead.name || 'there'}, regarding your property inquiry with RE-ON Real Estate:`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rev-btn-action"
            style={{ padding: '0.35rem 0.55rem', fontSize: '0.72rem', textDecoration: 'none', background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.3)' }}
          >
            <MessageSquare size={11} /> WA
          </a>
        )}

        {nextStage && (
          <button
            type="button"
            className="rev-btn-action"
            onClick={() => handleAdvanceStage(inqId, currentStage)}
            title={`Advance to ${nextStage}`}
            style={{
              padding: '0.35rem 0.55rem',
              fontSize: '0.72rem',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(56, 189, 248, 0.3)',
            }}
          >
            <ArrowRight size={11} /> Next
          </button>
        )}
      </div>
    </div>
  )
}
