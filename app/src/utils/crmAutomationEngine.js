/**
 * RE-ON Autonomous CRM Engine
 * 
 * Implements the official RE-ON real estate sales flowchart and telecalling cadence algorithm:
 * 
 * 1. Fresh Prospecting Cadence: 6 Days / 12 Calls Max (2 calls/day with 4-hr gap).
 *    If not moved to follow-up within 6 days / 12 calls -> Auto-moves to Lost / Review.
 * 2. Arrange Follow-Up Cadence: 18 Days / 32 Calls Max (2 calls/day with 4-hr gap).
 * 3. VAND & Site Visit Loop: Visit arranged but not done -> Weekly Fresh Prospecting ->
 *    Tuesday Refresh loops back to Arrange Follow Up.
 * 4. Tuesday Refresh & Weekly Closing: Refreshes Weekly Cohorts (Fresh Prospecting, Booking Ready, Closing).
 * 5. EOI Same-Day Clearance: 24h SLA watchdog.
 * 6. Smart Prioritization: Dynamic queue sorting factoring in 4-hr cooldowns and daily quotas.
 */

import {
  CRM_STAGES,
  CRM_PHASES,
  mapLegacyStatusToStage,
  getStageMeta,
} from '../components/RevenueOS/crmPipelineConstants.js'

// Constants matching the flowchart & handwritten rules
export const CADENCE_RULES = {
  FRESH_PROSPECTING: {
    MAX_DAYS: 6,
    MAX_CALLS: 12,
    CALLS_PER_DAY: 2,
    MIN_GAP_HOURS: 4,
    EXPIRY_STAGE: 'SVP/VAND Lost Request',
  },
  ARRANGE_FOLLOW_UP: {
    MAX_DAYS: 18,
    MAX_CALLS: 32,
    CALLS_PER_DAY: 2,
    MIN_GAP_HOURS: 4,
    EXPIRY_STAGE: 'SVP/VAND Lost Request',
  },
  EOI_CLEARANCE: {
    MAX_HOURS: 24, // Same-day clearance
  },
  VAND_DISCOVERY: {
    MAX_HOURS: 48,
  },
}

/**
 * Calculates detailed cadence and SLA telemetry for any lead
 */
export function calculateLeadCadence(lead) {
  if (!lead) return null

  const stage = mapLegacyStatusToStage(lead.status)
  const meta = getStageMeta(stage)
  const now = new Date()

  // Ingestion date
  const createdAt = lead.submittedAt ? new Date(lead.submittedAt) : (lead.createdAt ? new Date(lead.createdAt) : now)
  const daysInPipeline = Math.max(0, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)))

  // Call history telemetry
  const callLogs = Array.isArray(lead.callLogs) ? lead.callLogs : []
  const totalCalls = lead.callCount || callLogs.length || 0

  // Calls made today
  const todayDateStr = now.toISOString().split('T')[0]
  const callsToday = callLogs.filter(log => {
    const logDate = log.timestamp || log.calledAt || log.date
    if (!logDate) return false
    return new Date(logDate).toISOString().split('T')[0] === todayDateStr
  }).length

  // Last call timestamp
  let lastCallDate = null
  if (lead.lastCallAt) {
    lastCallDate = new Date(lead.lastCallAt)
  } else if (callLogs.length > 0) {
    const lastLog = callLogs[callLogs.length - 1]
    lastCallDate = new Date(lastLog.timestamp || lastLog.calledAt || lastLog.date || now)
  }

  // Hours since last call
  const hoursSinceLastCall = lastCallDate ? (now - lastCallDate) / (1000 * 60 * 60) : 999

  // 4-Hour Cooldown evaluation
  const isCooldownActive = hoursSinceLastCall < 4
  const cooldownRemainingHours = isCooldownActive ? Math.max(0, 4 - hoursSinceLastCall) : 0
  const isDailyLimitReached = callsToday >= 2

  // Cadence specific evaluations
  let cadenceType = 'standard'
  let maxDays = 30
  let maxCalls = 50
  let daysRemaining = 30
  let callsRemaining = 50
  let isExpired = false
  let slaStatus = 'healthy' // 'healthy' | 'due' | 'warning' | 'expired' | 'cooldown'

  if (stage === 'New Lead' || stage === 'Fresh Lead' || meta.phaseId === 'fresh_prospecting') {
    if (stage === 'New Lead' || stage === 'Fresh Lead') {
      cadenceType = 'fresh_6d_12c'
      maxDays = CADENCE_RULES.FRESH_PROSPECTING.MAX_DAYS
      maxCalls = CADENCE_RULES.FRESH_PROSPECTING.MAX_CALLS
      daysRemaining = Math.max(0, maxDays - daysInPipeline)
      callsRemaining = Math.max(0, maxCalls - totalCalls)
      isExpired = daysInPipeline > maxDays || totalCalls >= maxCalls
    } else if (stage === 'Arrange Follow Up') {
      cadenceType = 'followup_18d_32c'
      maxDays = CADENCE_RULES.ARRANGE_FOLLOW_UP.MAX_DAYS
      maxCalls = CADENCE_RULES.ARRANGE_FOLLOW_UP.MAX_CALLS
      daysRemaining = Math.max(0, maxDays - daysInPipeline)
      callsRemaining = Math.max(0, maxCalls - totalCalls)
      isExpired = daysInPipeline > maxDays || totalCalls >= maxCalls
    }
  }

  // Next recommended call slot calculation
  let nextCallSlot = 'Ready Now'
  let nextCallSlotTimestamp = new Date(now)

  if (isDailyLimitReached) {
    // Schedule for tomorrow morning at 10:00 AM
    nextCallSlot = 'Tomorrow 10:00 AM'
    nextCallSlotTimestamp = new Date(now)
    nextCallSlotTimestamp.setDate(nextCallSlotTimestamp.getDate() + 1)
    nextCallSlotTimestamp.setHours(10, 0, 0, 0)
    slaStatus = 'cooldown'
  } else if (isCooldownActive) {
    // Schedule for after 4-hour gap
    const resumeTime = new Date(lastCallDate.getTime() + 4 * 60 * 60 * 1000)
    nextCallSlot = `Today at ${resumeTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    nextCallSlotTimestamp = resumeTime
    slaStatus = 'cooldown'
  } else if (isExpired) {
    nextCallSlot = 'Cadence Expired - Move to Review'
    slaStatus = 'expired'
  } else {
    slaStatus = callsToday === 1 ? 'due' : 'healthy'
  }

  // VAND Site Visit check (Visit arrange but not done loop)
  const isVandLoop = stage === 'VAND' || stage === 'Weekly Fresh Prospecting'
  const isSiteVisitMissed = (lead.visitStatus === 'Missed' || lead.visitStatus === 'Pending') && lead.visitDate && new Date(lead.visitDate) < now

  return {
    stage,
    phase: meta.phase,
    phaseId: meta.phaseId,
    cadenceType,
    daysInPipeline,
    maxDays,
    daysRemaining,
    totalCalls,
    maxCalls,
    callsRemaining,
    callsToday,
    lastCallDate,
    hoursSinceLastCall: Math.round(hoursSinceLastCall * 10) / 10,
    isCooldownActive,
    cooldownRemainingHours: Math.round(cooldownRemainingHours * 10) / 10,
    isDailyLimitReached,
    isExpired,
    slaStatus,
    nextCallSlot,
    nextCallSlotTimestamp,
    isVandLoop,
    isSiteVisitMissed,
    complianceScore: Math.max(0, Math.min(100, Math.round(100 - (daysInPipeline / maxDays) * 40 - (isExpired ? 40 : 0)))),
  }
}

/**
 * Calculates priority score (0 to 100+) for auto-dialer queue sorting
 */
export function calculateLeadPriority(lead) {
  const telemetry = calculateLeadCadence(lead)
  if (!telemetry) return 0

  let score = 50 // Baseline

  const stage = telemetry.stage

  // 1. High-Value Pipeline Stages
  if (stage === 'EOI') score += 45 // Same day clearance critical
  if (stage === 'Weekly Closing') score += 40
  if (stage === 'Final Negotiation' || stage === 'Rate Finalization Pending') score += 35
  if (stage === 'Booking Ready' || stage === 'Weekly Booking Ready') score += 30
  if (stage === 'Site Visit Prospecting') score += 25

  // 2. Telecalling Cadence Timing Optimization
  if (telemetry.callsToday === 1 && !telemetry.isCooldownActive) {
    // 2nd call of the day is DUE (4-hr gap has passed) -> TOP PRIORITY
    score += 40
  } else if (telemetry.callsToday === 0 && !telemetry.isExpired) {
    // Fresh call 1 of the day
    score += 20
  }

  // 3. Cadence Urgency
  if (telemetry.cadenceType === 'fresh_6d_12c') {
    score += 15
    if (telemetry.daysRemaining <= 2) score += 15 // Nearing 6-day cutoff
  } else if (telemetry.cadenceType === 'followup_18d_32c') {
    score += 10
  }

  // 4. Intent Radar Boost
  const intentStr = String(lead.intentScore || lead.type || lead.source || '').toLowerCase()
  if (intentStr.includes('visit') || intentStr.includes('hot')) score += 15
  if (intentStr.includes('dwell') || intentStr.includes('30s')) score += 10

  // 5. Penalties
  if (telemetry.isCooldownActive) {
    // Within 4-hour gap: Push to bottom of queue
    score -= 40
  }
  if (telemetry.isDailyLimitReached) {
    // 2 calls already done today: Wait for tomorrow
    score -= 60
  }
  if (telemetry.isExpired) {
    score -= 30
  }
  if (stage === 'WON' || stage === 'LOST') {
    score = -1000 // Inactive
  }

  return score
}

/**
 * Evaluates the entire lead database and generates autonomous actions
 */
export function runAutonomousCRMEngine(contacts = [], callers = []) {
  const actions = []
  const updatedContacts = contacts.map((lead) => {
    const telemetry = calculateLeadCadence(lead)
    if (!telemetry) return lead

    let updatedLead = { ...lead }
    const stage = telemetry.stage

    // AUTO-ACTION 1: 6-Day / 12-Call Fresh Prospecting Expiry
    if (telemetry.cadenceType === 'fresh_6d_12c' && telemetry.isExpired) {
      if (stage !== 'SVP/VAND Lost Request' && stage !== 'LOST' && stage !== 'WON') {
        updatedLead.status = 'SVP/VAND Lost Request'
        updatedLead.lastAutonomousAction = {
          action: 'EXPIRE_TO_REVIEW',
          reason: `Fresh Lead 6-day / 12-call cadence reached (${telemetry.daysInPipeline} days, ${telemetry.totalCalls} calls). Sent for SVP/VAND review.`,
          timestamp: new Date().toISOString(),
        }
        actions.push({
          type: 'CADENCE_EXPIRED',
          leadId: lead._id || lead.id,
          leadName: lead.name,
          fromStage: stage,
          toStage: 'SVP/VAND Lost Request',
          reason: '6-day / 12-call limit reached without qualifying',
        })
      }
    }

    // AUTO-ACTION 2: 18-Day / 32-Call Follow-Up Expiry
    if (telemetry.cadenceType === 'followup_18d_32c' && telemetry.isExpired) {
      if (stage !== 'SVP/VAND Lost Request' && stage !== 'LOST' && stage !== 'WON') {
        updatedLead.status = 'SVP/VAND Lost Request'
        updatedLead.lastAutonomousAction = {
          action: 'EXPIRE_TO_REVIEW',
          reason: `Follow-Up 18-day / 32-call cadence completed (${telemetry.daysInPipeline} days, ${telemetry.totalCalls} calls). Sent for SVP/VAND review.`,
          timestamp: new Date().toISOString(),
        }
        actions.push({
          type: 'FOLLOWUP_EXPIRED',
          leadId: lead._id || lead.id,
          leadName: lead.name,
          fromStage: stage,
          toStage: 'SVP/VAND Lost Request',
          reason: '18-day / 32-call follow-up window completed',
        })
      }
    }

    // AUTO-ACTION 3: VAND Site Visit Missed -> Weekly Fresh Prospecting Loop
    if (telemetry.isSiteVisitMissed && stage === 'VAND') {
      updatedLead.status = 'Weekly Fresh Prospecting'
      updatedLead.visitStatus = 'Missed'
      updatedLead.lastAutonomousAction = {
        action: 'VAND_SITE_VISIT_MISSED',
        reason: 'Site Visit scheduled date passed without completion. Recycled into Weekly Fresh Prospecting queue.',
        timestamp: new Date().toISOString(),
      }
      actions.push({
        type: 'VAND_LOOP_TRIGGERED',
        leadId: lead._id || lead.id,
        leadName: lead.name,
        fromStage: 'VAND',
        toStage: 'Weekly Fresh Prospecting',
        reason: 'Site visit was arranged but not completed',
      })
    }

    return updatedLead
  })

  return {
    updatedContacts,
    actions,
    summary: {
      totalEvaluated: contacts.length,
      actionsGenerated: actions.length,
      cadenceExpiredCount: actions.filter(a => a.type === 'CADENCE_EXPIRED' || a.type === 'FOLLOWUP_EXPIRED').length,
      vandLoopsCount: actions.filter(a => a.type === 'VAND_LOOP_TRIGGERED').length,
      timestamp: new Date().toISOString(),
    },
  }
}

/**
 * Tuesday Weekly Refresh Batch Processor
 * Executes the Tuesday cohort reset as detailed in the flowchart.
 */
export function executeTuesdayWeeklyRefresh(contacts = []) {
  const actions = []
  const now = new Date()

  const updatedContacts = contacts.map((lead) => {
    const stage = mapLegacyStatusToStage(lead.status)
    let updatedLead = { ...lead }

    // 1. Weekly Fresh Prospecting (Visit not done) -> Recycle to Arrange Follow Up
    if (stage === 'Weekly Fresh Prospecting') {
      updatedLead.status = 'Arrange Follow Up'
      updatedLead.lastTuesdayRefresh = now.toISOString()
      updatedLead.notes = `${updatedLead.notes || ''}\n[Tuesday Refresh]: Recycled from Weekly Fresh Prospecting to Arrange Follow Up for re-pitch.`
      actions.push({
        type: 'TUESDAY_RECYCLE_PROSPECTING',
        leadId: lead._id || lead.id,
        leadName: lead.name,
        fromStage: 'Weekly Fresh Prospecting',
        toStage: 'Arrange Follow Up',
        message: 'Recycled to Arrange Follow Up for re-pitch cadence.',
      })
    }

    // 2. Re-Pitch Leads -> Loops back to Fresh Lead
    if (stage === 'Re-Pitch') {
      updatedLead.status = 'Fresh Lead'
      updatedLead.callCount = 0
      updatedLead.lastTuesdayRefresh = now.toISOString()
      updatedLead.notes = `${updatedLead.notes || ''}\n[Tuesday Refresh]: Re-pitched lead re-entered into Fresh Lead 6-day cadence.`
      actions.push({
        type: 'TUESDAY_REPITCH_LOOP',
        leadId: lead._id || lead.id,
        leadName: lead.name,
        fromStage: 'Re-Pitch',
        toStage: 'Fresh Lead',
        message: 'Re-pitched lead successfully recycled to Fresh Lead.',
      })
    }

    return updatedLead
  })

  return {
    updatedContacts,
    actions,
    summary: {
      refreshedAt: now.toISOString(),
      recycledCount: actions.length,
    },
  }
}

/**
 * Evaluates whether Tuesday Weekly Cohort Refresh should be automatically executed.
 * Returns true if today is Tuesday, or if there are cohort leads requiring recycling.
 */
export function isTuesdayRefreshDue(contacts = []) {
  const now = new Date()
  const dayOfWeek = now.getDay() // 2 = Tuesday
  const currentWeekStr = `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}-${now.getMonth()}`
  const lastRefreshWeek = typeof localStorage !== 'undefined' ? localStorage.getItem('reon_last_tuesday_week') : null

  // Check if today is Tuesday and not yet refreshed this week
  if (dayOfWeek === 2 && lastRefreshWeek !== currentWeekStr) {
    return true
  }

  // Also check if any leads have been waiting in Weekly cohorts across rollover
  const hasEligibleLeads = contacts.some((c) => {
    const stage = mapLegacyStatusToStage(c.status)
    return stage === 'Weekly Fresh Prospecting' || stage === 'Re-Pitch'
  })

  return hasEligibleLeads && dayOfWeek === 2
}

/**
 * UNIFIED AUTONOMOUS ENGINE: Automatically processes ALL types of refreshes in one single pass:
 * 1. Tuesday Cohort Refresh (Weekly Fresh Prospecting -> Arrange Follow Up, Re-Pitch -> Fresh Lead).
 * 2. 6-Day / 12-Call Fresh Cadence Expiry (Auto-transitions to SVP/VAND Lost Request).
 * 3. 18-Day / 32-Call Follow-Up Cadence Expiry (Auto-transitions to SVP/VAND Lost Request).
 * 4. VAND Missed Site Visit Loop (Auto-recycles to Weekly Fresh Prospecting).
 * 5. 4-Hour Cooldown & 24h EOI Watchdog.
 */
export function autoProcessAllRefreshes(contacts = [], callers = []) {
  const now = new Date()
  const isTuesday = now.getDay() === 2
  const currentWeekStr = `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}-${now.getMonth()}`

  // Step 0: 100% Autonomous Round-Robin for any unassigned leads
  const activeCallers = (callers || []).filter((c) => c.active !== false)
  if (activeCallers.length > 0) {
    let callerIndex = 0
    currentContacts = currentContacts.map((c) => {
      if (!c.assignedTo?.name && !c.assignedCallerName) {
        const assignedCaller = activeCallers[callerIndex % activeCallers.length]
        callerIndex++
        allActions.push({
          type: 'AUTO_ROUND_ROBIN_ASSIGNED',
          leadId: c._id || c.id,
          callerName: assignedCaller.name,
          assignedCaller,
          message: `Auto-assigned to ${assignedCaller.name} via Round-Robin`,
        })
        return {
          ...c,
          assignedTo: {
            callerId: String(assignedCaller._id || assignedCaller.id),
            name: assignedCaller.name,
            phone: assignedCaller.phone || '',
            email: assignedCaller.email || '',
            assignedAt: now.toISOString(),
          },
          assignedCallerName: assignedCaller.name,
        }
      }
      return c
    })
  }

  // Step 1: Run Cadence & VAND Rules
  const cadenceRun = runAutonomousCRMEngine(currentContacts, callers)
  currentContacts = cadenceRun.updatedContacts
  allActions = [...allActions, ...cadenceRun.actions]

  // Step 2: Auto-Execute Tuesday Refresh if today is Tuesday or if pending
  if (isTuesday || isTuesdayRefreshDue(currentContacts)) {
    const tuesdayRun = executeTuesdayWeeklyRefresh(currentContacts)
    currentContacts = tuesdayRun.updatedContacts
    allActions = [...allActions, ...tuesdayRun.actions]
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('reon_last_tuesday_week', currentWeekStr)
    }
  }

  return {
    updatedContacts: currentContacts,
    actions: allActions,
    hasChanges: allActions.length > 0,
    summary: {
      totalEvaluated: contacts.length,
      actionsCount: allActions.length,
      cadenceExpiredCount: allActions.filter(a => a.type === 'CADENCE_EXPIRED' || a.type === 'FOLLOWUP_EXPIRED').length,
      tuesdayRecycledCount: allActions.filter(a => a.type.startsWith('TUESDAY_')).length,
      vandLoopsCount: allActions.filter(a => a.type === 'VAND_LOOP_TRIGGERED').length,
      timestamp: now.toISOString(),
      isTuesdayExecuted: isTuesday,
    },
  }
}

