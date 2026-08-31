/**
 * RE-ON NVIDIA Nemotron Ultra-Fast API Client
 * 
 * Performance optimizations:
 * 1. LRU Cache (500 entries, 10min TTL) — identical requests return instantly
 * 2. Request deduplication — concurrent identical requests share one API call
 * 3. Connection keep-alive via persistent fetch headers
 * 4. Aggressive timeout (8s) with instant fallback
 * 5. Minimal token budgets per request type
 * 6. Pre-built system prompts (no runtime string building)
 * 7. JSON response mode for structured outputs
 */

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'
const PRIMARY_MODEL = 'nvidia/nemotron-3-nano-30b-a3b'
const FALLBACK_MODEL = 'meta/llama-3.2-11b-vision-instruct'

// ─── LRU CACHE ────────────────────────────────────────────────
const CACHE_MAX = 500
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

class LRUCache {
  constructor(max, ttl) {
    this.max = max
    this.ttl = ttl
    this.cache = new Map()
  }

  get(key) {
    const entry = this.cache.get(key)
    if (!entry) return undefined
    if (Date.now() - entry.ts > this.ttl) {
      this.cache.delete(key)
      return undefined
    }
    // Move to end (most recent)
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.value
  }

  set(key, value) {
    if (this.cache.has(key)) this.cache.delete(key)
    if (this.cache.size >= this.max) {
      // Evict oldest
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, { value, ts: Date.now() })
  }

  clear() {
    this.cache.clear()
  }
}

const responseCache = new LRUCache(CACHE_MAX, CACHE_TTL_MS)

// ─── REQUEST DEDUPLICATION ────────────────────────────────────
const inflightRequests = new Map()

// ─── SYSTEM PROMPTS (concise for ultra-fast generation) ──────
const SYSTEM_PROMPT_BASE = `You are RE-ON AI, an expert Indian real estate sales intelligence engine for RE-ON Real Estate (Navi Mumbai). Reference Navi Mumbai infrastructure (NMIA Airport, MTHL Atal Setu, Metro Line 1, Coastal Road) and currency in ₹ Lakhs/Crores.`

const SYSTEM_PROMPTS = {
  script: `${SYSTEM_PROMPT_BASE}\nWrite a concise 3-step call script for this lead: Step 1. Greeting & Hook, Step 2. Need Discovery (VAND framework), Step 3. Closing CTA with specific time slots. Keep each step 1-2 sentences.`,

  objections: `${SYSTEM_PROMPT_BASE}\nGenerate 4 distinct real estate objections and expert rebuttals for this buyer. Return as JSON array: [{"title":"Objection Title with Emoji","rebuttal":"Factual rebuttal with Navi Mumbai infrastructure (NMIA, Atal Setu, Metro) and ROI data"}]. Output valid JSON array only.`,

  whatsapp: `${SYSTEM_PROMPT_BASE}\nGenerate 3 personalized WhatsApp message templates for this buyer (Brochure, Site Visit, Payment Plan). Return as JSON array: [{"id":"tpl_1","title":"Title with Emoji","body":"Message text with property name, configuration, and clear CTA"}]. Output valid JSON array only.`,

  qualification: `${SYSTEM_PROMPT_BASE}\nPerform lead qualification. Output ONLY a valid JSON object: {"executiveSummary":"2-sentence summary","readinessTier":"Tier 1 / Tier 2","recommendedAction":"specific next action","keyInsights":["insight 1","insight 2","insight 3"]}. Output ONLY valid JSON.`,

  whatsapp_agent: `${SYSTEM_PROMPT_BASE}\nGenerate personalized WhatsApp outreach. Output ONLY a valid JSON object: {"draftMessage":"warm message with property and CTA","recommendedFollowupCadence":"follow-up advice"}. Output ONLY valid JSON.`,

  calling_coach: `${SYSTEM_PROMPT_BASE}\nGenerate calling coach playbook. Output ONLY a valid JSON object: {"callObjective":"concise goal","openingHook":"exact opening line in quotes","objectionPlaybooks":[{"objection":"quoted objection","response":"quoted rebuttal"},{"objection":"quoted objection","response":"quoted rebuttal"}]}. Output ONLY valid JSON.`,

  fintech: `${SYSTEM_PROMPT_BASE}\nGenerate mortgage advisory analysis for Indian banks. Output ONLY a valid JSON object: {"eligibleLoanAmount":"formatted amount","indicativeEMI":"formatted EMI","recommendedBankPartners":[{"bank":"HDFC Home Loans","interestRate":"8.45%","maxTenure":"30 Years","processingFee":"₹3,500"},{"bank":"SBI","interestRate":"8.40%","maxTenure":"30 Years","processingFee":"Zero"}],"requiredKYCDocuments":["PAN Card","Aadhaar Card","Salary Slips / ITR","6-Month Bank Statement"]}. Output ONLY valid JSON.`,

  document_intel: `${SYSTEM_PROMPT_BASE}\nGenerate document verification checklist. Output ONLY a valid JSON object: {"status":"Ready for Submission","verificationChecklist":[{"document":"PAN / Identity","status":"Pending Upload","validity":"Required for Token"},{"document":"Aadhaar / Address","status":"Pending Upload","validity":"Required for Agreement"},{"document":"Income / ITR","status":"Pending Upload","validity":"Required for Loan"}],"ocrEngineStatus":"Vision OCR Connected"}. Output ONLY valid JSON.`,

  sales_coach: `${SYSTEM_PROMPT_BASE}\nGenerate deal closure recommendations. Output ONLY a valid JSON object: {"winProbabilityScore":"85%","strategicRecommendations":["rec 1","rec 2","rec 3"]}. Output ONLY valid JSON.`,

  ask_crm: `${SYSTEM_PROMPT_BASE}\nYou are an AI CRM analyst. Answer the query about leads in 2-3 concise, actionable sentences. Plain text only.`,

  coaching_tips: `${SYSTEM_PROMPT_BASE}\nOutput ONLY a valid JSON array of 3 concise deal closing tips: ["tip 1","tip 2","tip 3"]. Output ONLY valid JSON array.`,

  property_compare: `${SYSTEM_PROMPT_BASE}\nCompare the given properties for a buyer. Return a JSON object: {"verdict":"2-3 sentence overall comparison summary","winner":{"name":"Best property name","reason":"Why it wins in 1 sentence"},"properties":[{"name":"Property Name","score":85,"pros":["pro1","pro2"],"cons":["con1"]}]}. Output valid JSON only.`,
}

// ─── TOKEN BUDGETS (minimal for speed) ────────────────────────
const TOKEN_LIMITS = {
  script: 600,
  objections: 650,
  whatsapp: 950,
  qualification: 600,
  whatsapp_agent: 500,
  calling_coach: 600,
  fintech: 600,
  document_intel: 500,
  sales_coach: 500,
  ask_crm: 400,
  coaching_tips: 400,
  property_compare: 800,
}

// ─── BUILD LEAD CONTEXT (compact, minimal tokens) ─────────────
function buildLeadContext(contact, digitalTwin) {
  const parts = []
  const c = contact || {}
  const dt = digitalTwin || {}

  if (c.name) parts.push(`Name: ${c.name}`)
  if (c.propertyName) parts.push(`Property: ${c.propertyName}`)
  if (c.propertyLocation || c.location) parts.push(`Location: ${c.propertyLocation || c.location}`)
  if (c.budget) parts.push(`Budget: ${c.budget}`)
  if (dt.propertyPreferences?.configuration) parts.push(`Config: ${dt.propertyPreferences.configuration}`)
  if (c.message) parts.push(`Inquiry: "${c.message.slice(0, 80)}"`)

  return parts.join(', ')
}

// ─── CORE API CALL (with cache + dedup + timeout) ─────────────
async function callNemotron(promptType, userMessage, opts = {}) {
  const apiKey = process.env.NVIDIA_NEMOTRON_API_KEY
  if (!apiKey) {
    console.warn('[Nemotron] No API key configured, returning null')
    return null
  }

  const systemPrompt = SYSTEM_PROMPTS[promptType]
  if (!systemPrompt) {
    console.warn(`[Nemotron] Unknown prompt type: ${promptType}`)
    return null
  }

  // Cache key = promptType + first 200 chars of user message (fast hash)
  const cacheKey = `${promptType}::${userMessage.slice(0, 200)}`

  // 1. Check cache first (instant return)
  const cached = responseCache.get(cacheKey)
  if (cached) {
    return cached
  }

  // 2. Deduplicate inflight requests
  if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey)
  }

  // 3. Make the API call with timeout
  const maxTokens = TOKEN_LIMITS[promptType] || 400
  const temperature = opts.temperature ?? 0.6

  const requestPromise = (async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 12000) // 12s hard timeout

    try {
      let res = await fetch(NVIDIA_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Connection': 'keep-alive',
        },
        body: JSON.stringify({
          model: PRIMARY_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          max_tokens: maxTokens,
          temperature,
          top_p: 0.9,
          stream: false,
        }),
        signal: controller.signal,
      })

      if (!res.ok && FALLBACK_MODEL) {
        // Try fallback model
        res = await fetch(NVIDIA_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'Connection': 'keep-alive',
          },
          body: JSON.stringify({
            model: FALLBACK_MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userMessage },
            ],
            max_tokens: maxTokens,
            temperature,
            top_p: 0.9,
            stream: false,
          }),
          signal: controller.signal,
        })
      }

      clearTimeout(timeout)

      if (!res.ok) {
        const errText = await res.text().catch(() => 'Unknown error')
        console.error(`[Nemotron] API error ${res.status}: ${errText.slice(0, 200)}`)
        return null
      }

      const data = await res.json()
      const content = data.choices?.[0]?.message?.content?.trim()

      if (content) {
        // Cache the successful response
        responseCache.set(cacheKey, content)
      }

      return content || null
    } catch (err) {
      clearTimeout(timeout)
      if (err.name === 'AbortError') {
        console.warn('[Nemotron] Request timed out (8s)')
      } else {
        console.error('[Nemotron] Request failed:', err.message)
      }
      return null
    } finally {
      inflightRequests.delete(cacheKey)
    }
  })()

  inflightRequests.set(cacheKey, requestPromise)
  return requestPromise
}

// ─── SAFE JSON PARSE ──────────────────────────────────────────
function safeParseJSON(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {}

  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()

  // 1. Extract markdown code blocks
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim())
    } catch {}
  }

  // 2. Find outermost array [ ... ]
  const arrStart = cleaned.indexOf('[')
  if (arrStart !== -1) {
    const arrEnd = cleaned.lastIndexOf(']')
    if (arrEnd > arrStart) {
      try {
        return JSON.parse(cleaned.slice(arrStart, arrEnd + 1))
      } catch {}
    }
  }

  // 3. Find outermost object { ... }
  const objStart = cleaned.indexOf('{')
  if (objStart !== -1) {
    const objEnd = cleaned.lastIndexOf('}')
    if (objEnd > objStart) {
      try {
        return JSON.parse(cleaned.slice(objStart, objEnd + 1))
      } catch {}
    }
  }

  // 4. If all direct parses failed, try loose JSON repair
  try {
    const sanitized = cleaned.replace(/[\u0000-\u001F]+/g, ' ')
    const sStart = sanitized.indexOf('[')
    const sEnd = sanitized.lastIndexOf(']')
    if (sStart !== -1 && sEnd > sStart) {
      return JSON.parse(sanitized.slice(sStart, sEnd + 1))
    }
    const oStart = sanitized.indexOf('{')
    const oEnd = sanitized.lastIndexOf('}')
    if (oStart !== -1 && oEnd > oStart) {
      return JSON.parse(sanitized.slice(oStart, oEnd + 1))
    }
  } catch {}

  return null
}

// ─── PUBLIC API METHODS ───────────────────────────────────────

/**
 * Generate a dynamic call script for a lead
 */
export async function generateCallScript(contact, digitalTwin) {
  const context = buildLeadContext(contact, digitalTwin)
  const stage = contact.status || 'New Lead'
  const userMsg = `Lead context: ${context}\nCurrent Stage: ${stage}\nGenerate a personalized 3-step call script for this specific lead.`

  let result = await callNemotron('script', userMsg)
  if (!result) return null

  // Clean any reasoning preamble before Step 1 / 1. / Greeting
  const cleanThink = result.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
  const stepOneMatch = cleanThink.search(/(?:^|\n)(?:1[\.\)]|Step 1|Greeting)/i)
  if (stepOneMatch > 0) {
    result = cleanThink.slice(stepOneMatch).trim()
  } else {
    result = cleanThink
  }

  return result
}

/**
 * Generate lead-specific objection rebuttals
 */
export async function generateObjections(contact, digitalTwin) {
  const context = buildLeadContext(contact, digitalTwin)
  const userMsg = `Lead context: ${context}\nGenerate 4 objection-rebuttal pairs specific to this lead's budget, location, and concerns.`

  const result = await callNemotron('objections', userMsg)
  const parsed = safeParseJSON(result)
  return Array.isArray(parsed) ? parsed : null
}

/**
 * Generate personalized WhatsApp templates for a lead
 */
export async function generateWhatsAppTemplates(contact, digitalTwin) {
  const context = buildLeadContext(contact, digitalTwin)
  const userMsg = `Lead: ${context}. Generate 3 personalized WhatsApp message templates with emojis and project details.`

  const result = await callNemotron('whatsapp', userMsg)
  const parsed = safeParseJSON(result)
  return Array.isArray(parsed) ? parsed : null
}

/**
 * Execute an autonomous AI agent with Nemotron
 */
export async function executeNemotronAgent(agentName, contact, digitalTwin) {
  const promptMap = {
    'AI_QUALIFICATION_AGENT': 'qualification',
    'AI_WHATSAPP_AGENT': 'whatsapp_agent',
    'AI_CALLING_COACH': 'calling_coach',
    'AI_FINTECH_ADVISOR': 'fintech',
    'AI_DOCUMENT_INTELLIGENCE': 'document_intel',
    'AI_SALES_COACH': 'sales_coach',
  }

  const promptType = promptMap[agentName]
  if (!promptType) return null

  const context = buildLeadContext(contact, digitalTwin)
  const userMsg = `Lead: ${context}. Execute autonomous ${agentName} analysis.`

  const result = await callNemotron(promptType, userMsg)
  const parsed = safeParseJSON(result)
  return parsed
}

/**
 * AI-enhanced Ask CRM response
 */
export async function enhanceAskCRMResponse(query, basicAnswer, matchedCount, contactsSummary) {
  const userMsg = `User query: "${query}"\nBasic filter result: ${basicAnswer}\nMatched leads: ${matchedCount}\nDatabase summary: ${contactsSummary}\n\nProvide a more insightful, actionable analysis.`

  const result = await callNemotron('ask_crm', userMsg, { temperature: 0.5 })
  return result
}

/**
 * Generate AI coaching tips for a lead
 */
export async function generateCoachingTips(contact, digitalTwin) {
  const context = buildLeadContext(contact, digitalTwin)
  const userMsg = `Lead context: ${context}\nGenerate 3 coaching tips.`

  const result = await callNemotron('coaching_tips', userMsg)
  const parsed = safeParseJSON(result)
  return Array.isArray(parsed) ? parsed : null
}

/**
 * AI-powered property comparison analysis
 */
export async function compareProperties(propertiesList) {
  if (!Array.isArray(propertiesList) || propertiesList.length < 2) return null

  const summaries = propertiesList.map((p, i) => {
    const parts = [`#${i + 1} ${p.name || p.title || 'Property'}`]
    if (p.location || p.address) parts.push(`Location: ${(p.location || p.address).slice(0, 60)}`)
    if (p.price) parts.push(`Price: ${p.price}`)
    if (p.type || p.configurations) parts.push(`Config: ${p.type || p.configurations}`)
    if (p.area || p.sqft) parts.push(`Area: ${p.area || p.sqft} sqft`)
    if (p.status) parts.push(`Status: ${p.status}`)
    if (p.possession || p.possessionDate) parts.push(`Possession: ${p.possession || p.possessionDate}`)
    if (p.developer || p.developedBy) parts.push(`Developer: ${p.developer || p.developedBy}`)
    return parts.join(', ')
  }).join('\n')

  const userMsg = `Compare these ${propertiesList.length} properties for a home buyer in Navi Mumbai:\n${summaries}`
  const result = await callNemotron('property_compare', userMsg)
  const parsed = safeParseJSON(result)
  return parsed && typeof parsed === 'object' ? parsed : null
}

/**
 * Clear the response cache (admin utility)
 */
export function clearNemotronCache() {
  responseCache.clear()
  return { cleared: true, timestamp: new Date().toISOString() }
}
