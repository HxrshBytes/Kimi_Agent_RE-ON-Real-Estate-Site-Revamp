/**
 * RE-ON CRM Pipeline Architecture & Funnel Stage Constants
 * Derived from the official RE-ON real estate sales pipeline flowchart.
 *
 * Workflow Phases:
 * 1. Fresh Prospecting (TAT: 12-35 calls max, Tuesday refresh)
 * 2. Exploration & Booking (TAT: Tuesday refresh)
 * 3. Negotiation & Closing (TAT: Tuesday refresh, EOI Same Day Clearance)
 * 4. Closed Won
 * 5. Review & Lost Recovery (SVP/VAND Lost Request -> Under Review -> Re-Pitch Loop / Lost)
 */

export const CRM_PHASES = [
  {
    id: 'fresh_prospecting',
    title: 'Fresh Prospecting',
    subtitle: '6 Days • 12 Calls Max • 4hr Gap • Tue Refresh',
    color: '#4ade80',
    borderColor: 'rgba(74, 222, 128, 0.4)',
    bgColor: 'rgba(8, 42, 31, 0.85)',
    badge: '🟢',
    cadenceRule: '2 calls/day with 4hr gap • Max 6 days / 12 calls',
    stages: [
      'New Lead',
      'Fresh Lead',
      'Arrange Follow Up',
      'Site Visit Prospecting',
      'VAND',
      'Weekly Fresh Prospecting',
    ],
  },
  {
    id: 'exploration_booking',
    title: 'Exploration & Booking',
    subtitle: 'TAT: Current Week • Tue Refresh',
    color: '#38bdf8',
    borderColor: 'rgba(56, 189, 248, 0.4)',
    bgColor: 'rgba(11, 45, 60, 0.75)',
    badge: '🔵',
    stages: [
      'Exploration',
      'Weekly Booking Ready',
      'Booking Ready',
    ],
  },
  {
    id: 'negotiation_closing',
    title: 'Negotiation & Closing',
    subtitle: 'TAT: Tue Refresh • EOI Same Day Clearance',
    color: '#fbbf24',
    borderColor: 'rgba(251, 191, 36, 0.4)',
    bgColor: 'rgba(45, 38, 10, 0.75)',
    badge: '🟡',
    stages: [
      'Rate Finalization Pending',
      'Final Negotiation',
      'Delay Interest',
      'Weekly Closing',
      'EOI',
    ],
  },
  {
    id: 'won',
    title: 'Closed Won',
    subtitle: 'Deal Closed & Commission Cleared',
    color: '#10b981',
    borderColor: 'rgba(16, 185, 129, 0.5)',
    bgColor: 'rgba(6, 46, 28, 0.85)',
    badge: '🏆',
    stages: [
      'WON',
    ],
  },
  {
    id: 'lost_review',
    title: 'Review & Lost Recovery',
    subtitle: 'SVP/VAND Audit & Re-Pitch Loop',
    color: '#f87171',
    borderColor: 'rgba(248, 113, 113, 0.4)',
    bgColor: 'rgba(45, 15, 15, 0.75)',
    badge: '🔴',
    stages: [
      'SVP/VAND Lost Request',
      'Under Review',
      'Re-Pitch',
      'LOST',
    ],
  },
]

export const CRM_STAGES = [
  // --- Phase 1: Fresh Prospecting ---
  {
    id: 'New Lead',
    label: 'New Lead',
    phase: 'Fresh Prospecting',
    phaseId: 'fresh_prospecting',
    tat: '6 Days / 12 Calls Max (2 calls/day, 4hr gap)',
    tatType: 'cadence_fresh',
    maxDays: 6,
    maxCalls: 12,
    gapHours: 4,
    color: '#4ade80',
    badge: '🟢',
    description: 'Inbound prospect just ingested. 6-day cadence initiated with 2 calls/day (4hr gap).',
  },
  {
    id: 'Fresh Lead',
    label: 'Fresh Lead',
    phase: 'Fresh Prospecting',
    phaseId: 'fresh_prospecting',
    tat: '6 Days / 12 Calls Max (2 calls/day, 4hr gap)',
    tatType: 'cadence_fresh',
    maxDays: 6,
    maxCalls: 12,
    gapHours: 4,
    color: '#4ade80',
    badge: '🌱',
    description: 'Active inbound lead under 6-day / 12-call telecalling cadence.',
  },
  {
    id: 'Arrange Follow Up',
    label: 'Arrange Follow Up',
    phase: 'Fresh Prospecting',
    phaseId: 'fresh_prospecting',
    tat: '18 Days / 32 Calls Max (2 calls/day, 4hr gap)',
    tatType: 'cadence_followup',
    maxDays: 18,
    maxCalls: 32,
    gapHours: 4,
    color: '#34d399',
    badge: '📞',
    description: 'Follow-up cadence: 18 days window, max 32 calls, 2 calls/day with 4hr gap.',
  },
  {
    id: 'Site Visit Prospecting',
    label: 'Site Visit Prospecting',
    phase: 'Fresh Prospecting',
    phaseId: 'fresh_prospecting',
    tat: 'Weekly Pipeline Target',
    tatType: 'weekly',
    color: '#2dd4bf',
    badge: '🚗',
    description: 'Pitching on-site inspection and model apartment walkthrough.',
  },
  {
    id: 'VAND',
    label: 'VAND (Visit & Need Discovery)',
    phase: 'Fresh Prospecting',
    phaseId: 'fresh_prospecting',
    tat: 'Visit arranged but not done -> Loop to Weekly',
    tatType: 'loop_vand',
    color: '#38bdf8',
    badge: '🔍',
    description: 'Visit arranged. If not completed on schedule, automatically loops to Weekly Fresh Prospecting.',
  },
  {
    id: 'Weekly Fresh Prospecting',
    label: 'Weekly Fresh Prospecting',
    phase: 'Fresh Prospecting',
    phaseId: 'fresh_prospecting',
    tat: 'Refresh -> Loops to Follow Up',
    tatType: 'tuesday_recycle',
    color: '#60a5fa',
    badge: '🔄',
    isMilestone: true,
    description: 'Weekly cohort. If visit not done, Refresh automatically recycles to Arrange Follow Up.',
  },

  // --- Phase 2: Exploration & Booking ---
  {
    id: 'Exploration',
    label: 'Exploration',
    phase: 'Exploration & Booking',
    phaseId: 'exploration_booking',
    tat: 'Current Week Active',
    tatType: 'weekly',
    color: '#818cf8',
    badge: '🧭',
    description: 'Evaluating unit layouts, floor elevations, and amenities.',
  },
  {
    id: 'Weekly Booking Ready',
    label: 'Weekly Booking Ready',
    phase: 'Exploration & Booking',
    phaseId: 'exploration_booking',
    tat: 'Refreshed on Every Tuesday',
    tatType: 'tuesday',
    color: '#a78bfa',
    badge: '🎯',
    isMilestone: true,
    description: 'Shortlisted prime units ready for booking advance.',
  },
  {
    id: 'Booking Ready',
    label: 'Booking Ready',
    phase: 'Exploration & Booking',
    phaseId: 'exploration_booking',
    tat: '48h Token Window',
    tatType: 'hours',
    color: '#c084fc',
    badge: '📑',
    description: 'Token deposit preparation and buyer commitment in progress.',
  },

  // --- Phase 3: Negotiation & Closing ---
  {
    id: 'Rate Finalization Pending',
    label: 'Rate Finalization Pending',
    phase: 'Negotiation & Closing',
    phaseId: 'negotiation_closing',
    tat: 'Developer Approval Pending',
    tatType: 'approval',
    color: '#fbbf24',
    badge: '⚖️',
    description: 'Rate negotiations between developer pricing desk and buyer.',
  },
  {
    id: 'Final Negotiation',
    label: 'Final Negotiation',
    phase: 'Negotiation & Closing',
    phaseId: 'negotiation_closing',
    tat: '24h Decision SLA',
    tatType: 'hours',
    color: '#f59e0b',
    badge: '🤝',
    description: 'Final payment schedule, floor rise waiver, and legal review.',
  },
  {
    id: 'Delay Interest',
    label: 'Delay Interest',
    phase: 'Negotiation & Closing',
    phaseId: 'negotiation_closing',
    tat: 'Risk Mitigation Active',
    tatType: 'risk',
    color: '#fb923c',
    badge: '⏳',
    description: 'Buyer delaying closing; special financing/subvention pitched.',
  },
  {
    id: 'Weekly Closing',
    label: 'Weekly Closing',
    phase: 'Negotiation & Closing',
    phaseId: 'negotiation_closing',
    tat: 'Refreshed on Every Tuesday',
    tatType: 'tuesday',
    color: '#f97316',
    badge: '🏁',
    isMilestone: true,
    description: 'High-probability deals closing in current weekly sprint.',
  },
  {
    id: 'EOI',
    label: 'EOI (Expression of Interest)',
    phase: 'Negotiation & Closing',
    phaseId: 'negotiation_closing',
    tat: 'Same Day Clearance',
    tatType: 'sameday',
    color: '#eab308',
    badge: '✍️',
    isMilestone: true,
    description: 'Signed EOI with token cheque / digital payment clearance.',
  },

  // --- Phase 4: Closed Won ---
  {
    id: 'WON',
    label: 'WON (Deal Closed)',
    phase: 'Closed Won',
    phaseId: 'won',
    tat: 'Completed & Logged',
    tatType: 'complete',
    color: '#10b981',
    badge: '🎉',
    isMilestone: true,
    description: 'Agreement for Sale executed and brokerage credited.',
  },

  // --- Phase 5: Lost / Review / Re-Pitch Loop ---
  {
    id: 'SVP/VAND Lost Request',
    label: 'SVP/VAND Lost Request',
    phase: 'Review & Lost Recovery',
    phaseId: 'lost_review',
    tat: 'Under Manager Review',
    tatType: 'review',
    color: '#fb7185',
    badge: '⚠️',
    description: 'Caller requested drop due to site visit drop or budget gap.',
  },
  {
    id: 'Under Review',
    label: 'Under Review',
    phase: 'Review & Lost Recovery',
    phaseId: 'lost_review',
    tat: 'Audit & Second Opinion',
    tatType: 'review',
    color: '#f43f5e',
    badge: '🔎',
    description: 'Sales Head evaluating deal salvage or project reassignment.',
  },
  {
    id: 'Re-Pitch',
    label: 'Re-Pitch (Recycle to New)',
    phase: 'Review & Lost Recovery',
    phaseId: 'lost_review',
    tat: 'Loops back to Fresh Lead',
    tatType: 'loop',
    color: '#38bdf8',
    badge: '🔁',
    isLoop: true,
    description: 'Repitched with alternative inventory or fresh pricing.',
  },
  {
    id: 'LOST',
    label: 'LOST (Closed Lost)',
    phase: 'Review & Lost Recovery',
    phaseId: 'lost_review',
    tat: 'Archived / Cold Pool',
    tatType: 'archived',
    color: '#ef4444',
    badge: '❌',
    description: 'Permanently dropped / unqualified / non-responsive.',
  },
]

/**
 * Maps legacy/freeform lead status string to one of our standard flowchart stages
 */
export function mapLegacyStatusToStage(status) {
  if (!status) return 'New Lead'
  const s = String(status).trim()

  // Exact match
  const exact = CRM_STAGES.find((st) => st.id.toLowerCase() === s.toLowerCase() || st.label.toLowerCase() === s.toLowerCase())
  if (exact) return exact.id

  const low = s.toLowerCase()
  if (low === 'new') return 'New Lead'
  if (low.includes('fresh')) return 'Fresh Lead'
  if (low.includes('qualif') || low.includes('follow') || low.includes('arrange')) return 'Arrange Follow Up'
  if (low.includes('site visit') || low.includes('visit scheduled')) return 'Site Visit Prospecting'
  if (low.includes('contact') || low.includes('discovery') || low.includes('vand')) return 'VAND'
  if (low.includes('explor')) return 'Exploration'
  if (low.includes('booking ready')) return 'Booking Ready'
  if (low.includes('convert') || low.includes('negotiat')) return 'Final Negotiation'
  if (low.includes('rate') || low.includes('finaliz')) return 'Rate Finalization Pending'
  if (low.includes('eoi')) return 'EOI'
  if (low.includes('won') || low.includes('closed won') || low.includes('closed')) return 'WON'
  if (low.includes('repitch') || low.includes('re-pitch')) return 'Re-Pitch'
  if (low.includes('review') || low.includes('lost request')) return 'Under Review'
  if (low.includes('lost')) return 'LOST'

  return 'New Lead'
}

/**
 * Returns metadata for a stage
 */
export function getStageMeta(stageId) {
  const normalized = mapLegacyStatusToStage(stageId)
  return CRM_STAGES.find((s) => s.id === normalized) || CRM_STAGES[0]
}

/**
 * Returns the parent phase object for a stage
 */
export function getPhaseForStage(stageId) {
  const meta = getStageMeta(stageId)
  return CRM_PHASES.find((p) => p.id === meta.phaseId) || CRM_PHASES[0]
}

/**
 * Sequential stage transition progression helper
 */
export const STAGE_PROGRESSION_ORDER = [
  'New Lead',
  'Fresh Lead',
  'Arrange Follow Up',
  'Site Visit Prospecting',
  'VAND',
  'Weekly Fresh Prospecting',
  'Exploration',
  'Weekly Booking Ready',
  'Booking Ready',
  'Rate Finalization Pending',
  'Final Negotiation',
  'Delay Interest',
  'Weekly Closing',
  'EOI',
  'WON',
]

export function getNextStage(currentStage) {
  const current = mapLegacyStatusToStage(currentStage)
  const idx = STAGE_PROGRESSION_ORDER.indexOf(current)
  if (idx >= 0 && idx < STAGE_PROGRESSION_ORDER.length - 1) {
    return STAGE_PROGRESSION_ORDER[idx + 1]
  }
  return null
}
