import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUser, useClerk, SignIn, UserButton } from '@clerk/react'
import {
  Building2, Phone, Mail, MessageSquare, Download, Calendar, MapPin,
  Search, Filter, Trash2, CheckCircle2, Clock, ExternalLink, DownloadCloud,
  Tag, Eye, User, UserPlus, Sparkles, RefreshCw, ChevronDown, FileSpreadsheet, Send, MessageCircle, X, ShoppingBag,
  LayoutDashboard, BookOpen, Newspaper, Users, LogOut, Plus, Pencil, Layers, Image, Video, Check, ShieldCheck, Repeat,
  Table, LayoutGrid, Award, Flame, Zap, RotateCcw, Database, HardDrive, CheckSquare, Square
} from 'lucide-react'
import { useAdmin, ALLOWED_ADMIN_EMAIL } from '../contexts/AdminContext.jsx'
import { extractArea, getUniqueAreas } from '../utils/locationUtils.js'
import { searchProperties } from '../utils/searchEngine.js'
import { sanitizeMapUrl } from '../utils/mapUtils.js'
import { normalizeMediaUrls, formatDirectImageUrl, parseGoogleDriveUrl } from '../utils/mediaUrlUtils.js'
import GlassSelect from '../components/GlassSelect.jsx'
import RevenueCommandCenter from '../components/RevenueOS/RevenueCommandCenter.jsx'
import CustomerDigitalTwinModal from '../components/RevenueOS/CustomerDigitalTwinModal.jsx'
import NeoDoveCRMView from '../components/RevenueOS/NeoDoveCRMView.jsx'
import RevenueAnalyticsView from '../components/RevenueOS/RevenueAnalyticsView.jsx'
import {
  CRM_PHASES,
  CRM_STAGES,
  mapLegacyStatusToStage,
  getStageMeta,
} from '../components/RevenueOS/crmPipelineConstants.js'
import {
  runAutonomousCRMEngine,
  executeTuesdayWeeklyRefresh,
  autoProcessAllRefreshes,
} from '../utils/crmAutomationEngine.js'
import '../components/RevenueOS/RevenueOS.css'
import './Admin.css'

const COMMON_AMENITIES = [
  '🏊 Swimming Pool',
  '🏋️ Fully Equipped Gymnasium',
  '🌳 Landscaped Garden & Jogging Track',
  '🛡️ 24/7 Security & CCTV Surveillance',
  '⚡ 100% Power Backup',
  '🚗 Reserved Covered Car Parking',
  '🎾 Luxury Clubhouse & Indoor Games',
  '👶 Kids Play Area',
  '🧘 Yoga & Meditation Deck',
  '🛗 High-Speed Elevators',
  '💧 24/7 Water Supply & Rainwater Harvesting',
  '🔥 Fire Fighting System'
]

const NAVI_MUMBAI_AREAS = [
  'Kharghar', 'Panvel', 'Taloja', 'Vashi', 'Nerul', 'Seawoods', 'Belapur', 'Ulwe',
  'Sanpada', 'Airoli', 'Ghansoli', 'Koperkhairane', 'Dronagiri', 'Kamothe', 'Khandeshwar'
]

const PRICE_PRESETS = [
  '₹45L – ₹65L', '₹70L – ₹95L', '₹1.1Cr – ₹1.6Cr', '₹1.8Cr – ₹2.8Cr', '₹3.2Cr – ₹5Cr', 'Price on Request'
]

const POSSESSION_PRESETS = [
  'Immediate / Ready', 'Ready to Move', 'Dec 2025', 'Mid 2026', 'Dec 2026', 'Mid 2027', 'Dec 2027', '2028+'
]

const initialPropertyForm = {
  name: '',
  location: '',
  mapLink: '',
  price: '',
  type: '',
  status: 'Ready to Move',
  possessionDate: '',
  area: '',
  reraNumber: '',
  developer: '',
  description: '',
  highlights: '',
  connectivity: '',
  images: '',
  videos: '',
}

const initialBlogForm = {
  title: '',
  category: '',
  excerpt: '',
  content: '',
  images: '',
  videos: '',
}

const initialNewsForm = {
  title: '',
  category: 'Market Trends',
  source: 'RE-ON Intelligence',
  date: new Date().toISOString().split('T')[0],
  excerpt: '',
  content: '',
  images: '',
  videos: '',
}

export default function Admin() {
  const { isLoaded, isSignedIn, user } = useUser()
  const clerk = useClerk()

  const {
    admins = [],
    currentUserRole,
    addSubadmin,
    removeSubadmin,
    recordLogout,
    properties,
    blogs,
    news = [],
    contacts,
    clientCarts = [],
    dbStatus,
    fetchAuditLogs,
    addProperty,
    updateProperty,
    removeProperty,
    deleteManyProperties,
    downloadPropertiesBackup,
    addBlog,
    updateBlog,
    removeBlog,
    addNews,
    updateNews,
    removeNews,
    submitContactInquiry,
    updateContactInquiry,
    deleteContactInquiry,
    analyzeLead,
    runAutonomousAgent,
    askCRM,
    addLeadTimelineEvent,
    callers,
    fetchCallers,
    addCaller,
    updateCaller,
    deleteCaller,
    autoDistributeLeads,
    roundRobinAssignLead,
    logLeadCall,
    refreshFromMongoDB,
  } = useAdmin()

  const [cartSearch, setCartSearch] = useState('')

  // 2046 AI Revenue OS States
  const [crmViewMode, setCrmViewMode] = useState('inquiries') // 'inquiries' | 'neodove' | 'callers' | 'analytics'
  const [inquiryLayout, setInquiryLayout] = useState('cards') // 'cards' | 'table'
  const [selectedTwinLead, setSelectedTwinLead] = useState(null)
  const [leadTwinData, setLeadTwinData] = useState(null)
  const [leadMatchedProps, setLeadMatchedProps] = useState([])
  const [isLoadingTwin, setIsLoadingTwin] = useState(false)
  const [askCrmAiText, setAskCrmAiText] = useState('')
  const [isAskingCrm, setIsAskingCrm] = useState(false)
  const [automationResult, setAutomationResult] = useState(null)
  const [isAutomating, setIsAutomating] = useState(false)

  // Autonomous CRM Heartbeat Daemon (Continuously executes automated Cadence & Tuesday refreshes)
  useEffect(() => {
    if (!contacts || contacts.length === 0) return

    const runAutomatedDaemon = async () => {
      try {
        const { actions, hasChanges, summary } = autoProcessAllRefreshes(contacts, callers)
        if (hasChanges) {
          for (const act of actions) {
            if (act.type === 'AUTO_ROUND_ROBIN_ASSIGNED' && act.assignedCaller) {
              await updateContactInquiry(act.leadId, {
                assignedTo: {
                  callerId: String(act.assignedCaller._id || act.assignedCaller.id),
                  name: act.assignedCaller.name,
                  phone: act.assignedCaller.phone || '',
                  email: act.assignedCaller.email || '',
                  assignedAt: new Date().toISOString(),
                },
                assignedCallerName: act.callerName,
              })
            } else if (act.toStage) {
              await updateContactInquiry(act.leadId, {
                status: act.toStage,
                notes: `${contacts.find((c) => (c._id || c.id) === act.leadId)?.notes || ''}\n[Autonomous Engine]: ${act.reason || act.message || 'Auto-Transition'}`,
              })
            }
          }
          if (refreshFromMongoDB) refreshFromMongoDB()
        }
      } catch (e) {
        console.warn('Autonomous CRM Daemon non-blocking notice:', e)
      }
    }

    // Run automatically on mount after brief settle
    const initialTimer = setTimeout(runAutomatedDaemon, 2500)

    // Run continuously in background every 30 seconds
    const interval = setInterval(runAutomatedDaemon, 30000)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [contacts?.length, callers?.length])

  const allEmails = useMemo(() => {
    return (user?.emailAddresses || []).map((e) => e.emailAddress.toLowerCase().trim())
  }, [user])

  const primaryEmail = user?.primaryEmailAddress?.emailAddress?.toLowerCase().trim() || allEmails[0] || ''

  const isSuperadmin = useMemo(() => {
    return (
      allEmails.includes(ALLOWED_ADMIN_EMAIL.toLowerCase()) ||
      currentUserRole === 'superadmin' ||
      admins.some((a) => (allEmails.includes((a.username || '').toLowerCase()) || allEmails.includes((a.email || '').toLowerCase())) && a.role === 'superadmin')
    )
  }, [allEmails, currentUserRole, admins])

  const isSubadmin = useMemo(() => {
    if (isSuperadmin) return false
    return (
      currentUserRole === 'subadmin' ||
      admins.some(
        (a) =>
          (allEmails.includes((a.username || '').toLowerCase()) ||
           allEmails.includes((a.email || '').toLowerCase())) &&
          (a.role === 'subadmin' || a.role === 'admin')
      )
    )
  }, [isSuperadmin, currentUserRole, admins, allEmails])

  // Caller role detection - checks if logged-in user's email matches any caller's email or caller admin entry
  const isCaller = useMemo(() => {
    if (isSuperadmin) return false
    return (
      currentUserRole === 'caller' ||
      callers.some(
        (c) => c.email && allEmails.includes(c.email.toLowerCase().trim()) && c.active !== false
      ) ||
      admins.some(
        (a) =>
          (allEmails.includes((a.username || '').toLowerCase()) ||
           allEmails.includes((a.email || '').toLowerCase())) &&
          a.role === 'caller'
      )
    )
  }, [isSuperadmin, currentUserRole, callers, admins, allEmails])

  // The matched caller object for filtering assigned leads
  const matchedCaller = useMemo(() => {
    if (!isCaller) return null
    return (
      callers.find(
        (c) => c.email && allEmails.includes(c.email.toLowerCase().trim()) && c.active !== false
      ) ||
      callers.find(
        (c) => allEmails.includes((c.name || '').toLowerCase().trim())
      ) ||
      null
    )
  }, [isCaller, callers, allEmails])

  // Leads assigned to the logged-in caller
  const callerAssignedLeads = useMemo(() => {
    if (!matchedCaller) return []
    const callerName = (matchedCaller.name || '').toLowerCase().trim()
    const callerEmail = (matchedCaller.email || '').toLowerCase().trim()
    return contacts.filter((c) => {
      const assignedName = (c.assignedCallerName || c.assignedTo?.name || '').toLowerCase().trim()
      const assignedEmail = (c.assignedTo?.email || '').toLowerCase().trim()
      return assignedName === callerName || assignedEmail === callerEmail ||
        (c.assignedTo && String(c.assignedTo._id || c.assignedTo.id) === String(matchedCaller._id || matchedCaller.id))
    })
  }, [matchedCaller, contacts])

  const isAuthorizedAdmin = isSuperadmin || isSubadmin || isCaller

  const subadminsList = useMemo(() => {
    return admins.filter(
      (a) =>
        a.role === 'subadmin' ||
        (a.role === 'admin' && (a.username || a.email) !== 'superadmin' && (a.username || a.email) !== ALLOWED_ADMIN_EMAIL)
    )
  }, [admins])

  const [activeTab, setActiveTab] = useState('dashboard')
  const [propertyForm, setPropertyForm] = useState(initialPropertyForm)
  const [blogForm, setBlogForm] = useState(initialBlogForm)
  const [newsForm, setNewsForm] = useState(initialNewsForm)
  const [editPropertyId, setEditPropertyId] = useState(null)
  const [editBlogId, setEditBlogId] = useState(null)
  const [editNewsId, setEditNewsId] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [statusMessageType, setStatusMessageType] = useState('info')
  const [isSavingProperty, setIsSavingProperty] = useState(false)
  const [filterStatus, setFilterStatus] = useState('All')
  const [filterLocation, setFilterLocation] = useState('All')
  const [filterType, setFilterType] = useState('All')
  const [filterSort, setFilterSort] = useState('relevance')
  const [propertySearch, setPropertySearch] = useState('')
  const [selectedPropertyIds, setSelectedPropertyIds] = useState([])
  const [isDeletingMany, setIsDeletingMany] = useState(false)
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false)
  const [isSyncingDb, setIsSyncingDb] = useState(false)
  const [syncFeedback, setSyncFeedback] = useState('')
  const [propertyViewMode, setPropertyViewMode] = useState('list') // 'list' | 'form'

  // Subadmin Management State
  const [subadminEmailInput, setSubadminEmailInput] = useState('')
  const [isAddingSubadmin, setIsAddingSubadmin] = useState(false)
  const [subadminMsg, setSubadminMsg] = useState('')
  const [subadminMsgType, setSubadminMsgType] = useState('info')

  // Inquiries / Leads CRM Filter & Note State
  const [inquirySearch, setInquirySearch] = useState('')
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState('all')
  const [inquiryTypeFilter, setInquiryTypeFilter] = useState('all')
  const [inquiryPropertyFilter, setInquiryPropertyFilter] = useState('all')
  const [editingNotes, setEditingNotes] = useState({})
  const [savingNoteId, setSavingNoteId] = useState(null)
  const [deletingInquiryId, setDeletingInquiryId] = useState(null)
  const [noteStatusMsg, setNoteStatusMsg] = useState({})

  // Caller & Auto-Assignment State
  const [callerFilter, setCallerFilter] = useState('all')
  const [isDistributingLeads, setIsDistributingLeads] = useState(false)
  const [callModalLead, setCallModalLead] = useState(null)
  const [callOutcome, setCallOutcome] = useState('Connected - Interested')
  const [callNote, setCallNote] = useState('')
  const [callStatusChoice, setCallStatusChoice] = useState('Contacted')
  const [isLoggingCall, setIsLoggingCall] = useState(false)
  const [callerForm, setCallerForm] = useState({ name: '', phone: '', email: '', active: true })
  const [isSavingCaller, setIsSavingCaller] = useState(false)
  const [callerMsg, setCallerMsg] = useState('')
  const [callerMsgType, setCallerMsgType] = useState('info')

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState([])
  const [loadingAudit, setLoadingAudit] = useState(false)

  // Tab auto-routing depending on user role(s)
  useEffect(() => {
    if (isSuperadmin) return
    if (isSubadmin && isCaller) {
      if (activeTab !== 'properties' && activeTab !== 'caller-workstation') {
        setActiveTab('properties')
      }
    } else if (isSubadmin) {
      if (activeTab !== 'properties') setActiveTab('properties')
    } else if (isCaller) {
      if (activeTab !== 'caller-workstation') setActiveTab('caller-workstation')
    }
  }, [isSuperadmin, isSubadmin, isCaller, activeTab])

  const handleSignOut = async () => {
    try {
      await recordLogout(primaryEmail, isSuperadmin ? 'superadmin' : isSubadmin && isCaller ? 'subadmin_caller' : isSubadmin ? 'subadmin' : isCaller ? 'caller' : 'unknown')
    } catch (e) {
      console.warn('Sign out record failed:', e)
    }
    clerk.signOut({ redirectUrl: '/admin' })
  }

  const tabs = useMemo(() => {
    if (isSuperadmin) {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'properties', label: 'Properties', count: properties.length, icon: Building2 },
        { id: 'blogs', label: 'Blog Posts', count: blogs.length, icon: BookOpen },
        { id: 'news', label: 'News', count: news?.length || 0, icon: Newspaper },
        { id: 'inquiries', label: 'CRM & Leads', count: contacts?.length || 0, icon: MessageSquare },
        { id: 'carts', label: 'User Carts', count: clientCarts?.length || 0, icon: ShoppingBag },
        { id: 'subadmins', label: 'Subadmins', count: subadminsList.length, icon: Users },
        { id: 'audit', label: 'Audit Logs', icon: ShieldCheck },
      ]
    }

    const roleTabs = []
    if (isSubadmin) {
      roleTabs.push({ id: 'properties', label: 'Properties', count: properties.length, icon: Building2 })
    }
    if (isCaller) {
      roleTabs.push({ id: 'caller-workstation', label: 'My Leads & Dialer', count: callerAssignedLeads.length, icon: Phone })
    }
    return roleTabs
  }, [isSuperadmin, isSubadmin, isCaller, properties, callerAssignedLeads, blogs, contacts, news, clientCarts, subadminsList])


  const normalizeMultipleUrls = (value) => normalizeMediaUrls(value)

  const mediaToArray = (value, fallback) => {
    if (Array.isArray(value) && value.length > 0) return value.filter(Boolean)
    if (value && !Array.isArray(value)) return [String(value)].filter(Boolean)
    if (fallback) return [String(fallback)].filter(Boolean)
    return []
  }

  const serializeMediaValue = (value, fallback) => {
    const items = mediaToArray(value, fallback)
    return items.join('\n')
  }

  const showStatus = (message, type = 'info') => {
    setStatusMessage(message)
    setStatusMessageType(type)
    requestAnimationFrame(() => {
      document.getElementById('property-status-message')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  const handleFileUpload = (e, formKey, setter, formState) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    showStatus(`⏳ Processing ${files.length} image(s)...`, 'info')

    Promise.all(
      files.map((file) => {
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = (ev) => resolve(ev.target?.result)
          reader.readAsDataURL(file)
        })
      })
    ).then((newUrls) => {
      const existing = (formState[formKey] || '').trim()
      const combined = existing ? `${existing}\n${newUrls.join('\n')}` : newUrls.join('\n')
      setter({ ...formState, [formKey]: combined })
      showStatus(`✅ Added ${newUrls.length} image(s) to gallery. Total images: ${normalizeMediaUrls(combined).length}`, 'success')
    }).catch(() => {
      showStatus('❌ Error reading uploaded files.', 'error')
    })
  }

  const handleRemoveImageAtIndex = (index, formKey, setter, formState) => {
    const urls = normalizeMediaUrls(formState[formKey] || '')
    urls.splice(index, 1)
    setter({ ...formState, [formKey]: urls.join('\n') })
  }

  const buildPropertyPayload = () => ({
    name: propertyForm.name,
    location: propertyForm.location,
    mapLink: sanitizeMapUrl(propertyForm.mapLink || ''),
    price: propertyForm.price,
    type: propertyForm.type,
    status: propertyForm.status,
    possessionDate: propertyForm.possessionDate || '',
    possession: propertyForm.possessionDate || '',
    area: propertyForm.area,
    reraNumber: propertyForm.reraNumber,
    developer: propertyForm.developer,
    developedBy: propertyForm.developer,
    description: propertyForm.description,
    images: normalizeMultipleUrls(propertyForm.images),
    videos: normalizeMultipleUrls(propertyForm.videos),
    highlights: propertyForm.highlights
      ? propertyForm.highlights.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
      : [],
    connectivity: propertyForm.connectivity
      ? propertyForm.connectivity.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
      : [],
  })

  const handleSaveProperty = async () => {
    if (isSavingProperty) return

    showStatus('⏳ Saving changes to MongoDB...', 'info')

    if (!propertyForm.name?.trim() || !propertyForm.location?.trim() || !propertyForm.price?.trim()) {
      showStatus('❌ Property name, location, and price are required. Scroll up to fill them in.', 'error')
      return
    }

    const payload = buildPropertyPayload()

    if (editPropertyId) {
      setIsSavingProperty(true)
      const propertyId = String(editPropertyId)
      console.log('[handleSaveProperty] Updating property ID:', propertyId, 'images:', payload.images.length)
      try {
        const result = await updateProperty(propertyId, payload)
        console.log('[handleSaveProperty] Update result:', result)
        if (result?.success) {
          refreshFromMongoDB().catch(() => {})
          const savedCount = result.data?.images?.length ?? payload.images.length
          showStatus(`✅ Property updated successfully! Saved ${savedCount} image(s) to MongoDB.`, 'success')
          setEditPropertyId(null)
          setPropertyForm(initialPropertyForm)
        } else {
          const errMsg = result?.error || 'Unknown error'
          showStatus(`❌ Failed to save property: ${errMsg}`, 'error')
          alert(`Update failed: ${errMsg}`)
        }
      } catch (err) {
        console.error('[handleSaveProperty] Exception:', err)
        showStatus(`❌ Exception: ${err.message}`, 'error')
        alert(`Update exception: ${err.message}`)
      } finally {
        setIsSavingProperty(false)
      }
    } else {
      setIsSavingProperty(true)
      showStatus('Adding property to MongoDB...', 'info')
      try {
        const result = await addProperty(payload)
        if (result?.success) {
          showStatus('✅ Property added & saved to MongoDB successfully.', 'success')
          setPropertyForm(initialPropertyForm)
        } else {
          showStatus(`❌ Failed to add property: ${result?.error || 'Unknown error'}`, 'error')
        }
      } finally {
        setIsSavingProperty(false)
      }
    }
  }

  const handleAddProperty = async (event) => {
    event.preventDefault()
    await handleSaveProperty()
  }

  const handleAddBlog = async (event) => {
    event.preventDefault()
    if (!blogForm.title || !blogForm.excerpt || !blogForm.content) {
      setStatusMessage('Title, excerpt and content are required.')
      return
    }

    const payload = {
      ...blogForm,
      images: normalizeMultipleUrls(blogForm.images),
      videos: normalizeMultipleUrls(blogForm.videos),
    }

    if (editBlogId) {
      setStatusMessage('Saving blog changes to MongoDB...')
      const result = await updateBlog(editBlogId, payload)
      if (result?.success) {
        setStatusMessage('✅ Blog post updated & saved to MongoDB.')
        setEditBlogId(null)
      } else {
        setStatusMessage(`❌ Failed to save blog: ${result?.error || 'Unknown error'}`)
      }
    } else {
      await addBlog(payload)
      setStatusMessage('✅ Blog post added successfully.')
    }
    setBlogForm(initialBlogForm)
  }

  const handleAddNews = async (event) => {
    event.preventDefault()
    if (!newsForm.title || !newsForm.excerpt) {
      setStatusMessage('News title and excerpt are required.')
      return
    }

    const payload = {
      ...newsForm,
      images: normalizeMultipleUrls(newsForm.images),
      videos: normalizeMultipleUrls(newsForm.videos),
    }

    if (editNewsId) {
      setStatusMessage('Saving news changes to MongoDB...')
      const result = await updateNews(editNewsId, payload)
      if (result?.success) {
        setStatusMessage('✅ News article updated & saved to MongoDB.')
        setEditNewsId(null)
      } else {
        setStatusMessage(`❌ Failed to save news: ${result?.error || 'Unknown error'}`)
      }
    } else {
      await addNews(payload)
      setStatusMessage('✅ News article added successfully.')
    }
    setNewsForm(initialNewsForm)
  }

  const [filterOwner, setFilterOwner] = useState('All')

  const isOwnProperty = (property) => {
    if (isSuperadmin) return true
    const creator = (property?.createdBy || '').toLowerCase().trim()
    if (!creator) return false
    return creator === primaryEmail || allEmails.includes(creator)
  }

  const filteredProperties = useMemo(() => {
    return searchProperties(properties, {
      query: propertySearch,
      location: filterLocation,
      type: filterType,
      status: filterStatus,
      owner: filterOwner,
      currentUserEmail: primaryEmail,
      allUserEmails: allEmails,
      isSuperadmin,
      sortBy: filterSort,
    })
  }, [properties, propertySearch, filterLocation, filterType, filterStatus, filterOwner, primaryEmail, allEmails, isSuperadmin, filterSort])

  const locationOptions = useMemo(() => [
    { value: 'All', label: 'All Locations' },
    ...getUniqueAreas(properties).map((loc) => ({ value: loc, label: loc })),
  ], [properties])

  const statusOptions = useMemo(() => [
    { value: 'All', label: 'All Statuses' },
    { value: 'Ready to Move', label: 'Ready to Move' },
    { value: 'Under Construction', label: 'Under Construction' },
    { value: 'New Launch', label: 'New Launch' },
    { value: 'Resell', label: 'Resell' },
    { value: 'Commercial', label: 'Commercial' },
  ], [])

  const typeOptions = useMemo(() => [
    { value: 'All', label: 'All Types / BHK' },
    { value: '1 BHK', label: '1 BHK' },
    { value: '2 BHK', label: '2 BHK' },
    { value: '3 BHK', label: '3 BHK' },
    { value: '4 BHK', label: '4 BHK+' },
    { value: 'Commercial', label: 'Commercial' },
  ], [])

  const sortOptions = useMemo(() => [
    { value: 'relevance', label: 'Sort: Most Relevant' },
    { value: 'newest', label: 'Sort: Newest First' },
    { value: 'price-asc', label: 'Sort: Price Low → High' },
    { value: 'price-desc', label: 'Sort: Price High → Low' },
    { value: 'area-desc', label: 'Sort: Area Largest First' },
  ], [])

  const ownerOptions = useMemo(() => [
    { value: 'All', label: 'All Listings' },
    { value: 'Mine', label: 'My Listings Only' },
    { value: 'Others', label: 'Other Listings' },
  ], [])

  const handleSyncMongoDB = async () => {
    setIsSyncingDb(true)
    setSyncFeedback('Syncing with MongoDB...')
    try {
      await refreshFromMongoDB()
      setSyncFeedback(`✅ Live sync complete (${properties.length} properties loaded)`)
      setTimeout(() => setSyncFeedback(''), 4000)
    } catch (err) {
      setSyncFeedback(`❌ Sync failed: ${err.message}`)
      setTimeout(() => setSyncFeedback(''), 4000)
    } finally {
      setIsSyncingDb(false)
    }
  }

  const loadPropertyForEdit = (property) => {
    if (isSubadmin && !isOwnProperty(property)) {
      showStatus('❌ Access restricted: Subadmins can only edit properties they have added.', 'error')
      alert('You can only edit properties that you have personally added.')
      return
    }

    setActiveTab('properties')
    setPropertyViewMode('form')
    // Always prefer _id for MongoDB operations (handles id=0 case correctly)
    const editId = String(property._id || property.id)
    setEditPropertyId(editId)
    console.log('[loadPropertyForEdit] Loading property for edit, _id:', property._id, 'id:', property.id, 'editId:', editId)
    showStatus(`Editing property: ${property.name}`, 'info')


    const highlightsVal = Array.isArray(property.highlights) && property.highlights.length > 0
      ? property.highlights.join('\n')
      : (typeof property.highlights === 'string' ? property.highlights : '')

    const connectivityVal = Array.isArray(property.connectivity) && property.connectivity.length > 0
      ? property.connectivity.map((c) => {
          if (typeof c === 'object' && c !== null) {
            return `${c.label || c.title || ''}: ${c.detail || c.value || ''}`
          }
          return String(c)
        }).join('\n')
      : (typeof property.connectivity === 'string' ? property.connectivity : '')

    // Serialize images/videos arrays to newline-separated strings for textarea
    const imagesArr = Array.isArray(property.images) ? property.images : []
    const videosArr = Array.isArray(property.videos) ? property.videos : []

    setPropertyForm({
      name: property.name || '',
      location: typeof property.location === 'string' ? property.location : String(property.location || ''),
      mapLink: property.mapLink || property.googleMapsUrl || property.mapUrl || '',
      price: property.price || '',
      type: property.type || '',
      status: property.status || 'Ready to Move',
      possessionDate: property.possessionDate || property.possession || '',
      area: property.area || '',
      reraNumber: property.reraNumber || '',
      developer: property.developer || property.developedBy || '',
      description: property.description || '',
      highlights: highlightsVal,
      connectivity: connectivityVal,
      images: imagesArr.filter(Boolean).join('\n'),
      videos: videosArr.filter(Boolean).join('\n'),
    })

  }

  const loadBlogForEdit = (blog) => {
    setActiveTab('blogs')
    setEditBlogId(String(blog._id || blog.id))
    setStatusMessage(`Editing blog post: ${blog.title}`)
    setBlogForm({
      title: blog.title,
      category: blog.category,
      excerpt: blog.excerpt,
      content: blog.content,
      images: serializeMediaValue(blog.images, blog.img),
      videos: serializeMediaValue(blog.videos, blog.video),
    })
  }

  const loadNewsForEdit = (item) => {
    setActiveTab('news')
    setEditNewsId(String(item.id || item._id))
    setStatusMessage(`Editing news article: ${item.title}`)
    setNewsForm({
      title: item.title,
      category: item.category || 'Market Trends',
      source: item.source || 'RE-ON Intelligence',
      date: item.date || new Date().toISOString().split('T')[0],
      excerpt: item.excerpt || '',
      content: item.content || '',
      images: serializeMediaValue(item.images, item.img),
      videos: serializeMediaValue(item.videos, item.video),
    })
  }

  const loadAuditLogs = async () => {
    setLoadingAudit(true)
    const logs = await fetchAuditLogs()
    setAuditLogs(logs)
    setLoadingAudit(false)
  }

  useEffect(() => {
    if (activeTab === 'audit' && isAuthorizedAdmin) {
      loadAuditLogs()
    }
  }, [activeTab, isAuthorizedAdmin])

  const clearPropertyForm = () => {
    setEditPropertyId(null)
    setPropertyForm(initialPropertyForm)
    setPropertyViewMode('list')
    showStatus('Property edit cancelled.', 'info')
  }

  const clearBlogForm = () => {
    setEditBlogId(null)
    setBlogForm(initialBlogForm)
    setStatusMessage('Blog edit cancelled.')
  }

  const clearNewsForm = () => {
    setEditNewsId(null)
    setNewsForm(initialNewsForm)
    setStatusMessage('News edit cancelled.')
  }

  const handleToggleSelectProperty = (id) => {
    setSelectedPropertyIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSelectAllProperties = () => {
    if (selectedPropertyIds.length === filteredProperties.length && filteredProperties.length > 0) {
      setSelectedPropertyIds([])
    } else {
      setSelectedPropertyIds(filteredProperties.map((p) => String(p._id || p.id)))
    }
  }

  const handleDeleteManyProperties = async () => {
    if (selectedPropertyIds.length === 0) return

    const confirmMsg = `Are you sure you want to delete ${selectedPropertyIds.length} properties?\n\n🛡️ AUTOMATION GUARANTEE: An automated database backup will be created and downloaded directly to your device before deleting.`
    if (!window.confirm(confirmMsg)) return

    setIsDeletingMany(true)
    showStatus(`Creating automated DB backup and deleting ${selectedPropertyIds.length} properties...`, 'info')

    try {
      const res = await deleteManyProperties(selectedPropertyIds)
      if (res.success) {
        setSelectedPropertyIds([])
        showStatus(`🛡️ Automated DB Backup downloaded to your device! Successfully deleted ${res.deletedCount} properties.`, 'success')
      } else {
        showStatus(`⚠️ ${res.error || 'Bulk delete failed'}. (Safety backup was downloaded to your device)`, 'error')
      }
    } catch (err) {
      showStatus(`Error during bulk delete: ${err.message}`, 'error')
    } finally {
      setIsDeletingMany(false)
    }
  }

  const handleDownloadPropertiesBackup = async () => {
    setIsDownloadingBackup(true)
    showStatus('Preparing properties database backup for your device...', 'info')
    try {
      const res = await downloadPropertiesBackup()
      if (res.success) {
        showStatus(`📦 Properties database backup downloaded to your device (${res.filename})`, 'success')
      } else {
        showStatus('Failed to download database backup', 'error')
      }
    } catch (err) {
      showStatus(`Error downloading backup: ${err.message}`, 'error')
    } finally {
      setIsDownloadingBackup(false)
    }
  }

  const handleDeleteProperty = async (property) => {
    // Prefer _id for MongoDB operations
    const targetId = property._id || property.id
    if (!confirm(`Are you sure you want to delete "${property.name}"?`)) return
    await removeProperty(targetId)
    setStatusMessage(`Property "${property.name}" deleted successfully.`)
  }

  const handleDeleteBlog = async (blog) => {
    const targetId = blog._id || blog.id
    if (!confirm(`Are you sure you want to delete "${blog.title}"?`)) return
    await removeBlog(targetId)
    setStatusMessage(`Blog post "${blog.title}" deleted successfully.`)
  }

  const handleDeleteNews = async (item) => {
    const targetId = item._id || item.id
    if (!confirm(`Are you sure you want to delete "${item.title}"?`)) return
    await removeNews(targetId)
    setStatusMessage(`News article "${item.title}" deleted successfully.`)
  }

  const handleAddSubadmin = async (e) => {
    e.preventDefault()
    const email = subadminEmailInput.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      setSubadminMsg('Please enter a valid Gmail / email address.')
      setSubadminMsgType('error')
      return
    }

    setIsAddingSubadmin(true)
    setSubadminMsg('Adding subadmin to MongoDB...')
    setSubadminMsgType('info')

    const result = await addSubadmin(email)
    setIsAddingSubadmin(false)

    if (result?.success) {
      setSubadminMsg(`✅ Subadmin ${email} added successfully! They can now log in via Clerk to add properties.`)
      setSubadminMsgType('success')
      setSubadminEmailInput('')
      refreshFromMongoDB().catch(() => {})
    } else {
      setSubadminMsg(`❌ ${result?.error || 'Failed to add subadmin'}`)
      setSubadminMsgType('error')
    }
  }

  const handleRemoveSubadmin = async (subadmin) => {
    const target = subadmin.username || subadmin.email
    if (!confirm(`Are you sure you want to remove subadmin access for "${target}"?`)) return

    setSubadminMsg(`Removing subadmin ${target}...`)
    setSubadminMsgType('info')

    const result = await removeSubadmin(target)
    if (result?.success) {
      setSubadminMsg(`✅ Subadmin ${target} removed successfully.`)
      setSubadminMsgType('success')
      refreshFromMongoDB().catch(() => {})
    } else {
      setSubadminMsg(`❌ ${result?.error || 'Failed to remove subadmin'}`)
      setSubadminMsgType('error')
    }
  }

  const handleAddCallerSubmit = async (e) => {
    e.preventDefault()
    if (!callerForm.name.trim()) return
    setIsSavingCaller(true)
    setCallerMsg('Adding telecaller...')
    setCallerMsgType('info')

    const res = await addCaller(callerForm)
    setIsSavingCaller(false)
    if (res?.success) {
      setCallerMsg(`✅ Telecaller "${callerForm.name}" added successfully!`)
      setCallerMsgType('success')
      setCallerForm({ name: '', phone: '', email: '', active: true })
      if (fetchCallers) fetchCallers()
    } else {
      setCallerMsg(`❌ ${res?.error || 'Failed to add caller'}`)
      setCallerMsgType('error')
    }
  }

  const handleToggleCallerStatus = async (caller) => {
    const callerId = caller._id || caller.id
    const updatedStatus = caller.active === false ? true : false
    const res = await updateCaller(callerId, { active: updatedStatus })
    if (res?.success) {
      if (fetchCallers) fetchCallers()
    }
  }

  const handleDeleteCaller = async (caller) => {
    const callerId = caller._id || caller.id
    if (!confirm(`Are you sure you want to remove telecaller "${caller.name}"?`)) return
    const res = await deleteCaller(callerId)
    if (res?.success) {
      if (fetchCallers) fetchCallers()
    }
  }

  const handleAutoDistributeLeads = async (mode = 'unassigned_only') => {
    setIsDistributingLeads(true)
    const res = await autoDistributeLeads(mode)
    setIsDistributingLeads(false)
    if (res?.success) {
      alert(res.message || 'Leads distributed successfully!')
      if (fetchCallers) fetchCallers()
      refreshFromMongoDB()
    } else {
      alert(`Error: ${res?.error || 'Failed to distribute leads'}`)
    }
  }

  const handleOpenCallModal = (lead) => {
    setCallModalLead(lead)
    setCallOutcome('Connected - Interested')
    setCallNote('')
    setCallStatusChoice('Contacted')
    // Open phone dialer immediately
    if (lead.phone) {
      const cleanP = lead.phone.replace(/[^\d+]/g, '')
      window.open(`tel:${cleanP}`, '_self')
    }
  }

  const handleSaveCallLog = async () => {
    if (!callModalLead) return
    setIsLoggingCall(true)
    const inqId = callModalLead._id || callModalLead.id
    const res = await logLeadCall(inqId, {
      outcome: callOutcome,
      note: callNote,
      status: callStatusChoice,
    })
    setIsLoggingCall(false)
    if (res?.success) {
      setCallModalLead(null)
      refreshFromMongoDB()
    } else {
      alert('Failed to log call')
    }
  }

  const handleSingleLeadRoundRobin = async (inquiryId) => {
    setIsDistributingLeads(true)
    const res = await roundRobinAssignLead(inquiryId)
    setIsDistributingLeads(false)
    if (res?.success) {
      const assignedCaller = res.assigned?.[0]?.callerName
      setStatusMessage(`✅ Assigned to ${assignedCaller || 'caller'} via Round Robin!`)
      if (fetchCallers) fetchCallers()
      refreshFromMongoDB()
      setTimeout(() => setStatusMessage(''), 4000)
    } else {
      alert(`Error: ${res?.error || 'Failed to round-robin assign lead'}`)
    }
  }

  const handleReassignLead = async (inquiryId, newCallerName) => {
    if (newCallerName === '__ROUND_ROBIN__') {
      return handleSingleLeadRoundRobin(inquiryId)
    }
    const matchedCaller = callers.find((c) => c.name === newCallerName)
    const assignedPayload = matchedCaller
      ? {
          callerId: String(matchedCaller._id || matchedCaller.id),
          name: matchedCaller.name,
          phone: matchedCaller.phone || '',
          email: matchedCaller.email || '',
          assignedAt: new Date().toISOString(),
        }
      : null

    await updateContactInquiry(inquiryId, {
      assignedTo: assignedPayload,
      assignedCallerName: newCallerName,
    })
    refreshFromMongoDB()
    if (fetchCallers) fetchCallers()
  }

  // 1. Loading State
  if (!isLoaded) {
    return (
      <div className="admin-page">
        <section className="page-hero">
          <div className="container" style={{ textAlign: 'center', padding: '5rem 1rem' }}>
            <p style={{ color: 'var(--gray)' }}>Loading Authentication Status...</p>
          </div>
        </section>
      </div>
    )
  }

  // 2. Unauthenticated State - Render Clerk Sign In
  if (!isSignedIn) {
    return (
      <div className="admin-page">
        <section className="page-hero">
          <div className="container">
            <p className="section-label">Clerk Authentication</p>
            <h1 className="headline-xl" style={{ fontSize: 'clamp(2.5rem,7vw,5.5rem)', marginTop: '0.75rem' }}>
              Admin <span className="text-red">Portal</span>
            </h1>
            <p style={{ color: 'var(--gray)', marginTop: '1rem', maxWidth: 520 }}>
              Sign in with Google using <strong>{ALLOWED_ADMIN_EMAIL}</strong> to access the RE-ON Admin Panel.
            </p>
          </div>
        </section>

        <section className="section admin__login-section">
          <div className="container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <SignIn appearance={{ elements: { rootBox: { margin: '0 auto' } } }} />
          </div>
        </section>
      </div>
    )
  }

  // 3. Authenticated but Unauthorized Email State
  if (!isAuthorizedAdmin) {
    return (
      <div className="admin-page">
        <section className="page-hero">
          <div className="container">
            <p className="section-label" style={{ color: '#f87171' }}>Access Restricted</p>
            <h1 className="headline-xl" style={{ fontSize: 'clamp(2.5rem,7vw,5.5rem)', marginTop: '0.75rem' }}>
              Unauthorized <span className="text-red">Account</span>
            </h1>
          </div>
        </section>

        <section className="section admin__login-section">
          <div className="container admin__login-card" style={{ maxWidth: '520px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛑</div>
            <h2 style={{ color: '#f87171' }}>Access Denied</h2>
            <p style={{ color: 'var(--cream-muted)', margin: '1rem 0' }}>
              You are currently logged in as: <br />
              <strong style={{ color: '#fff', fontSize: '1.1rem' }}>{primaryEmail}</strong>
            </p>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1rem', borderRadius: '12px', fontSize: '0.85rem', color: '#fca5a5', marginBottom: '1.5rem' }}>
              This Google account is not recognized as an authorized Superadmin (<strong>{ALLOWED_ADMIN_EMAIL}</strong>), Subadmin, or Telecaller. Please contact the administrator for access.
            </div>
            <button className="btn-accent" type="button" onClick={handleSignOut}>
              Sign Out & Switch Account
            </button>
          </div>
        </section>
      </div>
    )
  }

  // 4. Authenticated & Authorized State - Render Admin Dashboard
  const propertyButtonLabel = editPropertyId ? 'Update Property' : 'Add Property'
  const blogButtonLabel = editBlogId ? 'Update Blog Post' : 'Add Blog Post'

  return (
    <div className="admin-page">
      <section className="page-hero">
        <div className="container">
          <p className="section-label">
            {isSuperadmin ? 'Superadmin Portal' : isSubadmin && isCaller ? 'Subadmin & Telecaller Portal' : isSubadmin ? 'Subadmin Portal' : 'Telecaller Portal'}
          </p>
          <h1 className="headline-xl" style={{ fontSize: 'clamp(2.5rem,7vw,5.5rem)', marginTop: '0.75rem' }}>
            {isSuperadmin ? 'Superadmin ' : isSubadmin && isCaller ? 'Subadmin & Telecaller ' : isSubadmin ? 'Subadmin ' : 'Telecaller '}
            <span className="text-red">Panel</span>
          </h1>
          <p style={{ color: 'var(--gray)', marginTop: '1rem', maxWidth: 520 }}>
            {isSuperadmin
              ? 'Manage properties, blog posts, inquiries, subadmins, and security logs from your dashboard.'
              : isSubadmin && isCaller
              ? `Welcome, ${matchedCaller?.name || 'Agent'}! Manage property listings and handle your telecalling leads.`
              : isCaller
              ? `Welcome, ${matchedCaller?.name || 'Agent'}! Call your assigned leads, log dispositions, and track your pipeline.`
              : 'Add new property listings to the RE-ON platform.'}
          </p>
        </div>
      </section>

      <section className="section admin__dashboard">
        <div className="container admin__dashboard-grid">
          <aside className="admin__nav-card" data-lenis-prevent>
            <div className="admin__user-card">
              <div style={{ textAlign: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <Link to="/" style={{ textDecoration: 'none', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                  <img src="/images/reon-logo.png" alt="RE-ON" style={{ height: '40px', width: 'auto', objectFit: 'contain' }} />
                </Link>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <p
                  className="badge"
                  style={{
                    margin: 0,
                    background: isSuperadmin ? 'var(--red)' : isSubadmin && isCaller ? 'rgba(168,85,247,0.2)' : isCaller ? 'rgba(74,222,128,0.2)' : 'rgba(56,189,248,0.2)',
                    color: isSuperadmin ? '#fff' : isSubadmin && isCaller ? '#c084fc' : isCaller ? '#4ade80' : '#38bdf8',
                    border: isSuperadmin ? 'none' : `1px solid ${isSubadmin && isCaller ? 'rgba(168,85,247,0.4)' : isCaller ? 'rgba(74,222,128,0.4)' : 'rgba(56,189,248,0.4)'}`,
                  }}
                >
                  {isSuperadmin ? 'Superadmin' : isSubadmin && isCaller ? '👤 Subadmin & 📞 Caller' : isCaller ? '📞 Telecaller' : 'Subadmin'}
                </p>
                <UserButton afterSignOutUrl="/admin" />
              </div>
              <h3 style={{ wordBreak: 'break-all' }}>{isCaller ? (matchedCaller?.name || user.fullName || 'Telecaller') : (user.fullName || user.firstName || (isSuperadmin ? 'Superadmin' : 'Subadmin'))}</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>{primaryEmail}</p>
              <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <span style={{ color: dbStatus?.connected ? '#4ade80' : '#f87171' }}>
                  {dbStatus?.connected ? '🟢 MongoDB Connected' : '🔴 MongoDB Disconnected'}
                </span>
                <button type="button" onClick={refreshFromMongoDB} style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'underline' }}>
                  Sync
                </button>
              </div>
            </div>
            <nav className="admin__tabs">
              {tabs.map((tab) => {
                const TabIcon = tab.icon
                return (
                  <button
                    key={tab.id}
                    className={`admin__tab${activeTab === tab.id ? ' admin__tab--active' : ''}`}
                    onClick={() => {
                      setActiveTab(tab.id)
                      if (tab.id === 'properties') {
                        setPropertyViewMode('list')
                      }
                    }}
                    type="button"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {TabIcon && <TabIcon size={17} className="admin__tab-icon" />}
                      <span>{tab.label}</span>
                    </div>
                    {typeof tab.count === 'number' && (
                      <span className="admin__tab-count">
                        {tab.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
            <button className="btn-outline admin__logout" type="button" onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              <LogOut size={16} /> Sign Out
            </button>
          </aside>


          <div className="admin__content">
            {activeTab === 'dashboard' && (() => {
              const activeCallersList = callers.filter(c => c.active !== false)
              const unassignedCount = contacts.filter(c => !c.assignedTo?.name && !c.assignedCallerName).length
              const avgLeadsPerCaller = activeCallersList.length > 0 ? Math.round(contacts.length / activeCallersList.length) : 0

              return (
                <div>
                  <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px', fontSize: '0.85rem' }}>
                    <strong>🔒 Clerk Authentication Active:</strong> Authorized Account <code>{ALLOWED_ADMIN_EMAIL}</code>. Protected by Clerk Single Sign-On + MongoDB Atlas.
                  </div>

                  <div className="admin__metrics-grid">
                    <div className="admin__metric-card">
                      <span className="admin__metric-label">Total Properties</span>
                      <span className="admin__metric-value">{properties.length}</span>
                    </div>
                    <div className="admin__metric-card">
                      <span className="admin__metric-label">Blog Posts</span>
                      <span className="admin__metric-value">{blogs.length}</span>
                    </div>
                    <div className="admin__metric-card">
                      <span className="admin__metric-label">News Articles</span>
                      <span className="admin__metric-value">{news.length}</span>
                    </div>
                    <div className="admin__metric-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('inquiries')}>
                      <span className="admin__metric-label">Inquiries Received</span>
                      <span className="admin__metric-value" style={{ color: '#4ade80' }}>{contacts.length}</span>
                    </div>
                    <div className="admin__metric-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('inquiries')}>
                      <span className="admin__metric-label">Active Telecallers</span>
                      <span className="admin__metric-value" style={{ color: '#38bdf8' }}>{activeCallersList.length}</span>
                    </div>
                    <div className="admin__metric-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('carts')}>
                      <span className="admin__metric-label">Active User Carts</span>
                      <span className="admin__metric-value" style={{ color: '#86efac' }}>{clientCarts.length}</span>
                    </div>
                  </div>

                  <div className="admin__section" style={{ marginTop: '2rem' }}>
                    <h2>Quick Actions</h2>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <button type="button" className="btn-accent" onClick={() => setActiveTab('properties')}>
                        + Add New Property
                      </button>
                      <button type="button" className="btn-outline" onClick={() => setActiveTab('inquiries')}>
                        View Inquiries ({contacts.length})
                      </button>
                      <button type="button" className="btn-outline" onClick={() => setActiveTab('carts')} style={{ borderColor: 'rgba(134,239,172,0.4)', color: '#86efac' }}>
                        <ShoppingBag size={15} /> View User Carts ({clientCarts.length})
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}

            {activeTab === 'properties' && (
              <div>
                {isSubadmin && (
                  <div style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.25)', borderRadius: '14px', fontSize: '0.9rem', color: '#e0f2fe' }}>
                    <strong>👤 Subadmin Workspace:</strong> You are logged in with property addition permissions. Fill out the form below to publish new property listings directly to RE-ON.
                  </div>
                )}

                {/* Properties View Switcher */}
                <div className="admin__view-toggle-bar" style={{ display: 'flex', gap: '10px', marginBottom: '1.5rem', background: 'rgba(11,61,46,0.3)', padding: '6px', borderRadius: '14px', border: '1px solid rgba(245,245,220,0.1)', width: 'fit-content' }}>
                  <button
                    type="button"
                    className={`btn-outline ${propertyViewMode === 'list' && !editPropertyId ? 'btn-accent' : ''}`}
                    onClick={() => {
                      if (editPropertyId) clearPropertyForm()
                      setPropertyViewMode('list')
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', fontSize: '0.88rem', borderRadius: '10px' }}
                  >
                    <Building2 size={16} /> All Properties ({properties.length})
                  </button>
                  <button
                    type="button"
                    className={`btn-outline ${propertyViewMode === 'form' || editPropertyId ? 'btn-accent' : ''}`}
                    onClick={() => setPropertyViewMode('form')}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 18px', fontSize: '0.88rem', borderRadius: '10px' }}
                  >
                    {editPropertyId ? <Pencil size={16} /> : <Plus size={16} />}
                    {editPropertyId ? `Edit: ${propertyForm.name || 'Property'}` : '+ Add New Property'}
                  </button>
                </div>

                {/* FORM VIEW */}
                {(propertyViewMode === 'form' || editPropertyId) && (
                  <div className="admin__section" style={{ background: 'linear-gradient(145deg, rgba(13,31,22,0.95), rgba(8,24,17,0.98))', border: '1px solid rgba(134,239,172,0.2)', borderRadius: '20px', padding: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {editPropertyId ? <Pencil size={22} color="#86efac" /> : <Plus size={22} color="#86efac" />}
                          {editPropertyId ? `Edit Property: ${propertyForm.name || 'Listing'}` : 'Add New Property Listing'}
                        </h2>
                        <p style={{ color: 'var(--gray)', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
                          {editPropertyId ? 'Update details below and click Save Changes.' : 'Fill in the structured property details below to publish live to RE-ON.'}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={clearPropertyForm}
                        style={{ fontSize: '0.82rem', padding: '7px 14px' }}
                      >
                        ✖ Cancel &amp; Back to List
                      </button>
                    </div>

                    <form className="admin__form" onSubmit={handleAddProperty} noValidate>
                      {/* CARD 1: Basic Information & Location */}
                      <div className="admin__form-card">
                        <h3>
                          <MapPin size={16} /> 1. Basic Information & Location
                        </h3>
                        <div className="admin__form-grid">
                          <label>
                            Property Name *
                            <input
                              value={propertyForm.name}
                              onChange={(e) => setPropertyForm({ ...propertyForm, name: e.target.value })}
                              placeholder="e.g. The Enclave Residences"
                            />
                          </label>

                          <label>
                            Location / Sector *
                            <input
                              value={propertyForm.location}
                              onChange={(e) => setPropertyForm({ ...propertyForm, location: e.target.value })}
                              placeholder="e.g. Kharghar, Navi Mumbai"
                            />
                            {/* Quick Area Chips */}
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>Quick select:</span>
                              {NAVI_MUMBAI_AREAS.slice(0, 8).map((area) => (
                                <button
                                  key={area}
                                  type="button"
                                  onClick={() => setPropertyForm({ ...propertyForm, location: `${area}, Navi Mumbai` })}
                                  style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(245,245,220,0.12)',
                                    borderRadius: '100px',
                                    color: 'var(--cream-muted)',
                                    fontSize: '0.7rem',
                                    padding: '2px 8px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {area}
                                </button>
                              ))}
                            </div>
                          </label>

                          <label>
                            Developer / Builder Name
                            <input
                              value={propertyForm.developer}
                              onChange={(e) => setPropertyForm({ ...propertyForm, developer: e.target.value })}
                              placeholder="e.g. Arihant Superstructures"
                            />
                          </label>

                          <label>
                            Status
                            <select
                              value={propertyForm.status}
                              onChange={(e) => {
                                const newStatus = e.target.value
                                const updates = { ...propertyForm, status: newStatus }
                                // If status is changed to Ready to Move and possessionDate is empty, suggest Ready / Immediate
                                if ((newStatus === 'Ready to Move' || newStatus === 'Resell') && !propertyForm.possessionDate) {
                                  updates.possessionDate = 'Immediate / Ready'
                                }
                                setPropertyForm(updates)
                              }}
                            >
                              <option value="Ready to Move">Ready to Move</option>
                              <option value="Under Construction">Under Construction</option>
                              <option value="New Launch">New Launch</option>
                              <option value="Resell">Resell</option>
                              <option value="Commercial">Commercial</option>
                            </select>
                          </label>

                          <label>
                            Possession Date / Timeline
                            <input
                              value={propertyForm.possessionDate}
                              onChange={(e) => setPropertyForm({ ...propertyForm, possessionDate: e.target.value })}
                              placeholder="e.g. Dec 2026 or Immediate / Ready"
                            />
                            {/* Possession Presets */}
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                              {POSSESSION_PRESETS.map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => setPropertyForm({ ...propertyForm, possessionDate: preset })}
                                  style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(245,245,220,0.12)',
                                    borderRadius: '100px',
                                    color: 'var(--cream-muted)',
                                    fontSize: '0.7rem',
                                    padding: '2px 8px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                          </label>

                          <label>
                            Property Type / Configurations
                            <input
                              value={propertyForm.type}
                              onChange={(e) => setPropertyForm({ ...propertyForm, type: e.target.value })}
                              placeholder="e.g. 1, 2 &amp; 3 BHK Luxury Apartments"
                            />
                          </label>

                          <label>
                            Google Maps Embed Code or Share Link
                            <input
                              type="text"
                              value={propertyForm.mapLink || ''}
                              onChange={(e) => setPropertyForm({ ...propertyForm, mapLink: e.target.value })}
                              placeholder="https://maps.google.com/?q=... or <iframe src=...>"
                            />
                          </label>
                        </div>
                      </div>

                      {/* CARD 2: Pricing, Specifications & MahaRERA */}
                      <div className="admin__form-card">
                        <h3>
                          <Tag size={16} /> 2. Pricing, Carpet Area &amp; MahaRERA Compliance
                        </h3>
                        <div className="admin__form-grid">
                          <label>
                            Price Range *
                            <input
                              value={propertyForm.price}
                              onChange={(e) => setPropertyForm({ ...propertyForm, price: e.target.value })}
                              placeholder="e.g. ₹1.39 Cr – 2.83 Cr"
                            />
                            {/* Price Presets */}
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                              {PRICE_PRESETS.map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => setPropertyForm({ ...propertyForm, price: preset })}
                                  style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(245,245,220,0.12)',
                                    borderRadius: '100px',
                                    color: 'var(--cream-muted)',
                                    fontSize: '0.7rem',
                                    padding: '2px 8px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {preset}
                                </button>
                              ))}
                            </div>
                          </label>

                          <label>
                            Carpet Area Range
                            <input
                              value={propertyForm.area}
                              onChange={(e) => setPropertyForm({ ...propertyForm, area: e.target.value })}
                              placeholder="e.g. 750 – 1450 sqft"
                            />
                          </label>

                          <label style={{ gridColumn: 'span 2' }}>
                            MahaRERA Registration Number
                            <input
                              value={propertyForm.reraNumber}
                              onChange={(e) => setPropertyForm({ ...propertyForm, reraNumber: e.target.value })}
                              placeholder="e.g. P52000051860"
                            />
                            <span style={{ fontSize: '0.75rem', color: 'var(--gray)', marginTop: '4px' }}>
                              Auto-generates official MahaRERA QR code and verification links on property cards and details page.
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* CARD 3: Media & Gallery with Google Drive & Unlimited Upload Support */}
                      <div className="admin__form-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '8px' }}>
                          <h3 style={{ margin: 0 }}>
                            <Image size={16} /> 3. Media &amp; Gallery Photos
                          </h3>
                          <span style={{ fontSize: '0.75rem', background: 'rgba(134,239,172,0.15)', color: '#86efac', padding: '3px 10px', borderRadius: '12px', fontWeight: 600, border: '1px solid rgba(134,239,172,0.3)' }}>
                            ✨ Unlimited Images &amp; Google Drive Supported
                          </span>
                        </div>

                        {/* Google Drive Tip Banner */}
                        <div style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '10px', padding: '10px 14px', marginBottom: '1rem', fontSize: '0.82rem', color: '#bfdbfe', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>💡</span>
                          <div>
                            <strong>Google Drive Links:</strong> Paste standard Google Drive share links (e.g. <code>drive.google.com/file/d/...</code>). They are automatically converted into direct high-resolution images.
                            <br />
                            <em style={{ opacity: 0.85, fontSize: '0.78rem' }}>Tip: Ensure file sharing on Google Drive is set to <strong>"Anyone with the link can view"</strong>.</em>
                          </div>
                        </div>

                        {/* File Upload Trigger */}
                        <div style={{ marginBottom: '1rem', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                          <label className="btn-outline" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.06)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }}>
                            <DownloadCloud size={16} /> Select / Upload Image Files (Unlimited)
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => handleFileUpload(e, 'images', setPropertyForm, propertyForm)}
                            />
                          </label>
                          {propertyForm.images && (
                            <button
                              type="button"
                              className="btn-outline"
                              style={{ padding: '8px 12px', fontSize: '0.82rem' }}
                              onClick={() => {
                                const normalized = normalizeMediaUrls(propertyForm.images)
                                setPropertyForm({ ...propertyForm, images: normalized.join('\n') })
                                showStatus(`✨ Formatted and normalized ${normalized.length} image URLs (including Google Drive links).`, 'success')
                              }}
                              title="Normalize and convert all links to direct image URLs"
                            >
                              ⚡ Format &amp; Clean All Links
                            </button>
                          )}
                        </div>

                        <label style={{ display: 'block', marginBottom: '1rem' }}>
                          <span style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>Image URLs (Google Drive links, web URLs, or data URLs — one per line)</span>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>No limit on number of images</span>
                          </span>
                          <textarea
                            rows={4}
                            value={propertyForm.images}
                            onChange={(e) => setPropertyForm({ ...propertyForm, images: e.target.value })}
                            placeholder="https://drive.google.com/file/d/1A2B3C4D5E6F.../view?usp=sharing&#10;https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&#10;https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"
                          />
                        </label>

                        {/* Live Interactive Image Preview Gallery Strip */}
                        {(() => {
                          const previewUrls = normalizeMediaUrls(propertyForm.images || '')
                          if (previewUrls.length === 0) return null

                          return (
                            <div style={{ marginTop: '0.5rem', padding: '0.85rem', background: 'rgba(0,0,0,0.5)', borderRadius: '12px', border: '1px solid rgba(134,239,172,0.2)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.82rem', color: '#86efac', fontWeight: 600 }}>
                                  📸 Live Gallery ({previewUrls.length} image{previewUrls.length > 1 ? 's' : ''} loaded):
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setPropertyForm({ ...propertyForm, images: '' })}
                                  style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '0.75rem', cursor: 'pointer', padding: '2px 6px' }}
                                >
                                  Clear All
                                </button>
                              </div>

                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px', maxHeight: '240px', overflowY: 'auto', padding: '4px' }}>
                                {previewUrls.map((url, i) => {
                                  const isGdrive = url.includes('googleusercontent.com') || url.includes('drive.google.com')
                                  return (
                                    <div
                                      key={i}
                                      style={{ position: 'relative', height: '68px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)', background: '#082114' }}
                                    >
                                      <img
                                        src={url}
                                        alt={`Image ${i + 1}`}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => {
                                          e.currentTarget.style.opacity = '0.3'
                                        }}
                                      />
                                      <span style={{ position: 'absolute', bottom: '2px', left: '3px', background: 'rgba(0,0,0,0.75)', fontSize: '0.62rem', color: '#fff', padding: '1px 4px', borderRadius: '4px', fontWeight: 600 }}>
                                        #{i + 1}
                                      </span>
                                      {isGdrive && (
                                        <span style={{ position: 'absolute', top: '2px', left: '3px', background: 'rgba(37,99,235,0.85)', fontSize: '0.55rem', color: '#fff', padding: '1px 3px', borderRadius: '3px', fontWeight: 700 }}>
                                          Drive
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveImageAtIndex(i, 'images', setPropertyForm, propertyForm)}
                                        title="Remove this image"
                                        style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(239,68,68,0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })()}

                        <label style={{ marginTop: '1rem', display: 'block' }}>
                          Video URLs (MP4 or Tour Links, one per line)
                          <textarea
                            rows={2}
                            value={propertyForm.videos}
                            onChange={(e) => setPropertyForm({ ...propertyForm, videos: e.target.value })}
                            placeholder="https://example.com/property-tour.mp4"
                          />
                        </label>
                      </div>

                      {/* CARD 4: Overview, Amenities & Connectivity */}
                      <div className="admin__form-card">
                        <h3>
                          <Sparkles size={16} /> 4. Description, Amenities &amp; Connectivity
                        </h3>

                        <label style={{ display: 'block', marginBottom: '1rem' }}>
                          Property Overview (Description Paragraph)
                          <textarea
                            rows={3}
                            value={propertyForm.description}
                            onChange={(e) => setPropertyForm({ ...propertyForm, description: e.target.value })}
                            placeholder="e.g. An ultra-luxury residential enclave situated in the heart of Navi Mumbai offering bespoke architectural design..."
                          />
                        </label>

                        <label style={{ display: 'block', marginBottom: '1rem' }}>
                          Key Highlights &amp; Amenities (one per line)
                          <textarea
                            rows={4}
                            value={propertyForm.highlights}
                            onChange={(e) => setPropertyForm({ ...propertyForm, highlights: e.target.value })}
                            placeholder="🏊 Swimming Pool&#10;🏋️ Fully Equipped Gym&#10;🌳 Landscaped Garden&#10;🛡️ 24/7 Security"
                          />
                          {/* 1-Click Amenity Chips */}
                          <div style={{ marginTop: '8px' }}>
                            <span style={{ fontSize: '0.75rem', color: '#86efac', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                              ⚡ 1-Click Quick Add Amenities:
                            </span>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {COMMON_AMENITIES.map((amenity) => {
                                const isAdded = (propertyForm.highlights || '').includes(amenity)
                                return (
                                  <button
                                    key={amenity}
                                    type="button"
                                    onClick={() => {
                                      const current = (propertyForm.highlights || '').trim()
                                      if (isAdded) {
                                        const filtered = current.split(/\r?\n/).filter(line => line.trim() !== amenity).join('\n')
                                        setPropertyForm({ ...propertyForm, highlights: filtered })
                                      } else {
                                        const next = current ? `${current}\n${amenity}` : amenity
                                        setPropertyForm({ ...propertyForm, highlights: next })
                                      }
                                    }}
                                    style={{
                                      background: isAdded ? 'rgba(20,90,66,0.9)' : 'rgba(255,255,255,0.06)',
                                      border: isAdded ? '1px solid rgba(134,239,172,0.4)' : '1px solid rgba(245,245,220,0.12)',
                                      color: isAdded ? '#86efac' : 'var(--cream-muted)',
                                      borderRadius: '100px',
                                      fontSize: '0.72rem',
                                      padding: '3px 10px',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      transition: 'all 0.2s ease',
                                    }}
                                  >
                                    {isAdded && <Check size={12} />} {amenity}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </label>

                        <label style={{ display: 'block' }}>
                          Location Connectivity (one per line, format: "Destination: Distance/Detail")
                          <textarea
                            rows={3}
                            value={propertyForm.connectivity}
                            onChange={(e) => setPropertyForm({ ...propertyForm, connectivity: e.target.value })}
                            placeholder="Metro Station: 5 mins walk&#10;Mumbai-Pune Expressway: 10 mins drive&#10;International Airport: 25 mins"
                          />
                        </label>
                      </div>

                      {/* Status Message */}
                      <div
                        id="property-status-message"
                        className={`admin__status-message admin__status-message--${statusMessageType}`}
                        style={{ marginBottom: '1.25rem', display: statusMessage ? 'block' : 'none' }}
                      >
                        {statusMessage || 'Ready to save changes.'}
                      </div>

                      {/* Action Buttons */}
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          type="button"
                          className="btn-accent"
                          disabled={isSavingProperty}
                          onClick={handleSaveProperty}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 28px', fontSize: '0.95rem' }}
                        >
                          <CheckCircle2 size={18} />
                          {isSavingProperty ? 'Saving to MongoDB...' : editPropertyId ? 'Save Property Changes' : 'Publish Property to RE-ON'}
                        </button>
                        <button
                          type="button"
                          className="btn-outline"
                          onClick={clearPropertyForm}
                          style={{ padding: '12px 20px', fontSize: '0.9rem' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* LIST VIEW */}
                {propertyViewMode === 'list' && !editPropertyId && (
                  <div className="admin__section">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.35rem' }}>
                          <Building2 size={24} color="#86efac" /> All Properties
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, padding: '3px 10px', borderRadius: '100px', background: 'rgba(245,245,220,0.08)', color: 'var(--cream-muted)' }}>
                            {filteredProperties.length}{filteredProperties.length !== properties.length ? ` of ${properties.length}` : ''}
                          </span>
                        </h2>
                        <p style={{ color: 'var(--gray)', fontSize: '0.86rem', margin: '4px 0 0 0' }}>
                          Real-time search, filter, edit, or remove live listings synced with MongoDB.
                        </p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        {/* Download DB Backup directly to Device */}
                        {isSuperadmin && (
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={handleDownloadPropertiesBackup}
                            disabled={isDownloadingBackup}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 14px',
                              fontSize: '0.84rem',
                              borderColor: 'rgba(134,239,172,0.3)',
                              color: '#86efac',
                              background: 'rgba(134,239,172,0.06)',
                            }}
                            title="Download full properties database backup directly to your device"
                          >
                            <Database size={14} className={isDownloadingBackup ? 'spin' : ''} />
                            {isDownloadingBackup ? 'Backing Up...' : 'DB Backup'}
                          </button>
                        )}

                        {/* Live Sync with MongoDB Button */}
                        <button
                          type="button"
                          className="btn-outline"
                          onClick={handleSyncMongoDB}
                          disabled={isSyncingDb}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            fontSize: '0.84rem',
                            borderColor: isSyncingDb ? 'rgba(56,189,248,0.5)' : 'rgba(245,245,220,0.18)',
                            color: isSyncingDb ? '#38bdf8' : 'var(--cream)',
                            background: 'rgba(245,245,220,0.04)',
                          }}
                          title="Refresh and sync data live from MongoDB"
                        >
                          <RefreshCw size={14} className={isSyncingDb ? 'spin' : ''} />
                          {isSyncingDb ? 'Syncing...' : 'Sync MongoDB'}
                        </button>

                        <button
                          type="button"
                          className="btn-accent"
                          onClick={() => {
                            setPropertyForm(initialPropertyForm)
                            setEditPropertyId(null)
                            setPropertyViewMode('form')
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', fontSize: '0.88rem' }}
                        >
                          <Plus size={16} /> Add New Property
                        </button>
                      </div>
                    </div>

                    {syncFeedback && (
                      <div style={{ padding: '0.6rem 1rem', borderRadius: '10px', background: syncFeedback.includes('✅') ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)', border: `1px solid ${syncFeedback.includes('✅') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, color: syncFeedback.includes('✅') ? '#86efac' : '#fca5a5', fontSize: '0.82rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {syncFeedback}
                      </div>
                    )}

                    {/* Property Search & Filter Controls */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                      {/* Search Bar Input */}
                      <div className="admin__search-bar" style={{ width: '100%' }}>
                        <Search size={16} className="admin__search-bar-icon" />
                        <input
                          type="text"
                          placeholder="Search properties by name, locality, developer, RERA, BHK..."
                          value={propertySearch}
                          onChange={(e) => setPropertySearch(e.target.value)}
                        />
                        {propertySearch && (
                          <button
                            type="button"
                            className="admin__search-clear-btn"
                            onClick={() => setPropertySearch('')}
                            title="Clear search"
                          >
                            <X size={15} />
                          </button>
                        )}
                      </div>

                      {/* Glass Select Filter Dropdowns */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem', alignItems: 'center' }}>
                        {isSubadmin && (
                          <GlassSelect
                            value={filterOwner}
                            onChange={setFilterOwner}
                            options={ownerOptions}
                            icon={User}
                            ariaLabel="Filter by owner"
                          />
                        )}
                        <GlassSelect
                          value={filterLocation}
                          onChange={setFilterLocation}
                          options={locationOptions}
                          icon={MapPin}
                          ariaLabel="Filter by location"
                        />
                        <GlassSelect
                          value={filterType}
                          onChange={setFilterType}
                          options={typeOptions}
                          icon={Building2}
                          ariaLabel="Filter by property type"
                        />
                        <GlassSelect
                          value={filterStatus}
                          onChange={setFilterStatus}
                          options={statusOptions}
                          icon={CheckCircle2}
                          ariaLabel="Filter by status"
                        />
                        <GlassSelect
                          value={filterSort}
                          onChange={setFilterSort}
                          options={sortOptions}
                          ariaLabel="Sort properties"
                        />
                        {(propertySearch || filterStatus !== 'All' || filterLocation !== 'All' || filterType !== 'All' || filterOwner !== 'All' || filterSort !== 'relevance') && (
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={() => {
                              setPropertySearch('')
                              setFilterStatus('All')
                              setFilterLocation('All')
                              setFilterType('All')
                              setFilterOwner('All')
                              setFilterSort('relevance')
                            }}
                            style={{ fontSize: '0.78rem', padding: '6px 12px', height: '35px', whiteSpace: 'nowrap', borderRadius: '9px', borderColor: 'rgba(248,113,113,0.4)', color: '#fca5a5' }}
                          >
                            Reset Filters
                          </button>
                        )}
                      </div>
                    </div>

                    {filteredProperties.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem', background: 'rgba(11,61,46,0.25)', borderRadius: '18px', border: '1px dashed rgba(245,245,220,0.15)' }}>
                        <Search size={40} style={{ color: 'var(--gray)', opacity: 0.5, marginBottom: '0.75rem' }} />
                        <h3 style={{ fontSize: '1.1rem', color: 'var(--cream)', margin: '0.25rem 0' }}>No Properties Match Your Query</h3>
                        <p style={{ color: 'var(--gray)', fontSize: '0.88rem', margin: '0 0 1.25rem 0' }}>Try adjusting your search keywords or clearing active filters.</p>
                        <button
                          type="button"
                          className="btn-accent"
                          style={{ fontSize: '0.85rem', padding: '0.6rem 1.2rem' }}
                          onClick={() => {
                            setPropertySearch('')
                            setFilterStatus('All')
                            setFilterLocation('All')
                            setFilterType('All')
                            setFilterOwner('All')
                            setFilterSort('relevance')
                          }}
                        >
                          Reset All Filters
                        </button>
                      </div>
                    ) : (
                      <div>
                        {/* Bulk Selection & Automated Backup Action Bar */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '0.75rem',
                            padding: '0.8rem 1.1rem',
                            borderRadius: '14px',
                            background: selectedPropertyIds.length > 0
                              ? 'linear-gradient(135deg, rgba(20,90,66,0.6), rgba(10,40,30,0.8))'
                              : 'rgba(245,245,220,0.03)',
                            border: selectedPropertyIds.length > 0
                              ? '1px solid rgba(134,239,172,0.4)'
                              : '1px solid rgba(245,245,220,0.08)',
                            marginBottom: '1rem',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <button
                              type="button"
                              onClick={handleSelectAllProperties}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: selectedPropertyIds.length > 0 ? '#86efac' : 'var(--gray)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.85rem',
                                fontWeight: 600,
                                padding: 0,
                              }}
                            >
                              {selectedPropertyIds.length === filteredProperties.length && filteredProperties.length > 0 ? (
                                <CheckSquare size={17} style={{ color: '#86efac' }} />
                              ) : (
                                <Square size={17} />
                              )}
                              {selectedPropertyIds.length === filteredProperties.length && filteredProperties.length > 0
                                ? 'Deselect All'
                                : 'Select All'}
                            </button>
                            <span style={{ fontSize: '0.82rem', color: 'var(--cream-muted)' }}>
                              ({selectedPropertyIds.length} of {filteredProperties.length} selected)
                            </span>
                          </div>

                          {selectedPropertyIds.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  color: '#86efac',
                                  background: 'rgba(134,239,172,0.12)',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid rgba(134,239,172,0.25)',
                                  fontWeight: 600,
                                }}
                              >
                                🛡️ Auto DB Backup Active
                              </span>
                              <button
                                type="button"
                                className="btn-outline"
                                onClick={handleDownloadPropertiesBackup}
                                disabled={isDownloadingBackup}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '5px',
                                  padding: '6px 12px',
                                  fontSize: '0.8rem',
                                  color: '#86efac',
                                  borderColor: 'rgba(134,239,172,0.4)',
                                }}
                              >
                                <HardDrive size={13} /> Backup Selected ({selectedPropertyIds.length})
                              </button>

                              {isSuperadmin && (
                                <button
                                  type="button"
                                  onClick={handleDeleteManyProperties}
                                  disabled={isDeletingMany}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '6px 14px',
                                    fontSize: '0.82rem',
                                    background: 'rgba(239,68,68,0.2)',
                                    border: '1px solid rgba(239,68,68,0.5)',
                                    color: '#fca5a5',
                                    borderRadius: '8px',
                                    cursor: isDeletingMany ? 'not-allowed' : 'pointer',
                                    fontWeight: 600,
                                  }}
                                  title="Delete selected properties with automated backup to device"
                                >
                                  <Trash2 size={14} className={isDeletingMany ? 'spin' : ''} />
                                  {isDeletingMany
                                    ? 'Backing Up & Deleting...'
                                    : `Delete Selected (${selectedPropertyIds.length}) [deleteMany]`}
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'grid', gap: '1rem' }}>
                          {filteredProperties.map((p, idx) => {
                            const canEdit = isOwnProperty(p)
                            const creatorEmail = (p.createdBy || '').trim()
                            const isMyListing = isSubadmin && canEdit
                            const thumbImg = (p.images && p.images[0]) || p.img || '/images/placeholder.jpg'
                            const propIdStr = String(p._id || p.id)
                            const isSelected = selectedPropertyIds.includes(propIdStr)

                            return (
                              <div
                                key={`${String(p._id || p.id || 'prop')}-${idx}`}
                                className="admin__list-item"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '1.25rem',
                                  padding: '1.1rem 1.25rem',
                                  borderRadius: '16px',
                                  background: isSelected
                                    ? 'linear-gradient(145deg, rgba(20,60,45,0.95), rgba(12,40,28,0.98))'
                                    : 'linear-gradient(145deg, rgba(13,31,22,0.9), rgba(8,24,17,0.95))',
                                  border: isSelected
                                    ? '1px solid rgba(134,239,172,0.45)'
                                    : '1px solid rgba(245,245,220,0.09)',
                                  borderLeft: isSelected
                                    ? '4px solid #86efac'
                                    : isMyListing
                                    ? '4px solid #38bdf8'
                                    : '1px solid rgba(245,245,220,0.09)',
                                  transition: 'all 0.2s ease',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0, flex: 1 }}>
                                  {/* Selection Checkbox */}
                                  {isSuperadmin && (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSelectProperty(propIdStr)}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: isSelected ? '#86efac' : 'rgba(255,255,255,0.35)',
                                        flexShrink: 0,
                                      }}
                                      title={isSelected ? 'Deselect property' : 'Select property for bulk action / backup'}
                                    >
                                      {isSelected ? (
                                        <CheckSquare size={19} style={{ color: '#86efac' }} />
                                      ) : (
                                        <Square size={19} />
                                      )}
                                    </button>
                                  )}

                                  <img
                                    src={thumbImg}
                                    alt={p.name}
                                    style={{
                                      width: '72px',
                                      height: '64px',
                                      borderRadius: '10px',
                                      objectFit: 'cover',
                                      flexShrink: 0,
                                      background: '#081812',
                                    }}
                                    onError={(e) => {
                                      e.currentTarget.onerror = null
                                      e.currentTarget.src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=300&q=80'
                                    }}
                                  />
                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                                      <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', fontWeight: 700 }}>
                                        {p.name}
                                      </h4>
                                      <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '100px', background: 'rgba(20,90,66,0.8)', color: '#86efac', border: '1px solid rgba(134,239,172,0.3)', fontWeight: 600 }}>
                                        {p.status || 'Active'}
                                      </span>
                                      {isMyListing && (
                                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '100px', background: 'rgba(56,189,248,0.2)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.4)', fontWeight: 600 }}>
                                          My Property
                                        </span>
                                      )}
                                      {isSuperadmin && creatorEmail && creatorEmail !== ALLOWED_ADMIN_EMAIL && (
                                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '100px', background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                                          👤 {creatorEmail}
                                        </span>
                                      )}
                                      {propertySearch.trim() && p._matchReason && (
                                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '100px', background: 'rgba(234,179,8,0.15)', color: '#fde047', border: '1px solid rgba(234,179,8,0.3)', fontWeight: 600 }}>
                                          🎯 {p._matchReason}
                                        </span>
                                      )}
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.82rem', color: 'var(--cream-muted)' }}>
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                        <MapPin size={12} /> {p.location || 'Navi Mumbai'}
                                      </span>
                                      <strong style={{ color: '#86efac' }}>{p.price || 'Price on Request'}</strong>
                                      {p.type && <span>• {p.type}</span>}
                                      {p.area && <span>• {p.area}</span>}
                                      {(p.possessionDate || p.possession) && (
                                        <span style={{ color: '#93c5fd', fontSize: '0.75rem', background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', padding: '1px 7px', borderRadius: '4px' }}>
                                          📅 Possession: {p.possessionDate || p.possession}
                                        </span>
                                      )}
                                      {p.reraNumber && (
                                        <span style={{ color: '#86efac', fontSize: '0.75rem', background: 'rgba(134,239,172,0.1)', padding: '1px 6px', borderRadius: '4px' }}>
                                          RERA: {p.reraNumber}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="admin__item-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                  <Link
                                    to={`/properties/${p._id || p.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-outline"
                                    style={{ padding: '7px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                                    title="View on public site"
                                  >
                                    <ExternalLink size={13} /> View Live
                                  </Link>
                                  {canEdit ? (
                                    <button
                                      className="btn-outline"
                                      type="button"
                                      onClick={() => loadPropertyForEdit(p)}
                                      style={{ padding: '7px 14px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px', borderColor: 'rgba(134,239,172,0.4)', color: '#86efac' }}
                                    >
                                      <Pencil size={13} /> Edit
                                    </button>
                                  ) : (
                                    <span style={{ fontSize: '0.75rem', color: 'var(--gray)', fontStyle: 'italic', padding: '0.4rem 0.6rem' }}>
                                      Read-Only
                                    </span>
                                  )}
                                  {isSuperadmin && (
                                    <button
                                      className="btn-outline"
                                      type="button"
                                      onClick={() => handleDeleteProperty(p)}
                                      style={{ padding: '7px 12px', fontSize: '0.8rem', color: '#f87171', borderColor: 'rgba(248,113,113,0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                      title="Delete property"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'blogs' && (
              <div>
                <div className="admin__section">
                  <h2>{editBlogId ? 'Edit Blog Post' : 'Add New Blog Post'}</h2>
                  <form className="admin__form" onSubmit={handleAddBlog}>
                    <div className="admin__form-grid">
                      <label>
                        Blog Title *
                        <input
                          value={blogForm.title}
                          onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
                          placeholder="e.g. Why Navi Mumbai is the Best Place to Invest"
                        />
                      </label>
                      <label>
                        Category
                        <input
                          value={blogForm.category}
                          onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })}
                          placeholder="e.g. Investment"
                        />
                      </label>
                    </div>

                    <label style={{ marginTop: '1rem', display: 'block' }}>
                      Excerpt / Summary *
                      <textarea
                        rows={2}
                        value={blogForm.excerpt}
                        onChange={(e) => setBlogForm({ ...blogForm, excerpt: e.target.value })}
                        placeholder="Brief summary of the blog post..."
                      />
                    </label>

                    <label style={{ marginTop: '1rem', display: 'block' }}>
                      Blog Content *
                      <textarea
                        rows={6}
                        value={blogForm.content}
                        onChange={(e) => setBlogForm({ ...blogForm, content: e.target.value })}
                        placeholder="Full body content of the blog post..."
                      />
                    </label>

                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                        <label style={{ margin: 0, fontWeight: 600 }}>Image URLs (Google Drive links, web URLs, or data URLs)</label>
                        <label className="btn-outline" style={{ cursor: 'pointer', padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <DownloadCloud size={14} /> Upload Files
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleFileUpload(e, 'images', setBlogForm, blogForm)}
                          />
                        </label>
                      </div>
                      <textarea
                        rows={3}
                        value={blogForm.images}
                        onChange={(e) => setBlogForm({ ...blogForm, images: e.target.value })}
                        placeholder="https://drive.google.com/file/d/...&#10;https://images.unsplash.com/photo-..."
                      />
                    </div>

                    <div className="admin__form-actions" style={{ marginTop: '1rem' }}>
                      <button type="submit" className="btn-accent">
                        {blogButtonLabel}
                      </button>
                      {editBlogId && (
                        <button type="button" className="btn-outline" onClick={clearBlogForm}>
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </form>
                  {statusMessage && <div className="admin__status-message">{statusMessage}</div>}
                </div>

                <div className="admin__section" style={{ marginTop: '2rem' }}>
                  <h2>All Blog Posts ({blogs.length})</h2>
                  <div className="admin__list">
                    {blogs.map((b) => (
                      <div key={b.id} className="admin__list-item">
                        <div>
                          <strong>{b.title}</strong> ({b.category || 'General'})
                          <p style={{ fontSize: '0.8rem', color: 'var(--gray)', margin: '0.2rem 0 0 0' }}>
                            {b.excerpt ? b.excerpt.substring(0, 100) + '...' : ''}
                          </p>
                        </div>
                        <div className="admin__item-actions">
                          <button className="btn-outline" type="button" onClick={() => loadBlogForEdit(b)}>
                            Edit
                          </button>
                          <button className="btn-outline" type="button" onClick={() => handleDeleteBlog(b)} style={{ color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'news' && (
              <div>
                <div className="admin__section">
                  <h2>{editNewsId ? 'Edit News Article' : 'Add New News Article'}</h2>
                  <form className="admin__form" onSubmit={handleAddNews}>
                    <div className="admin__form-grid">
                      <label>
                        News Title *
                        <input
                          value={newsForm.title}
                          onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                          placeholder="e.g. Navi Mumbai Airport Boosts Property Prices"
                        />
                      </label>
                      <label>
                        Category
                        <select
                          value={newsForm.category}
                          onChange={(e) => setNewsForm({ ...newsForm, category: e.target.value })}
                        >
                          <option value="Market Trends">Market Trends</option>
                          <option value="Infrastructure">Infrastructure</option>
                          <option value="Policy & Rates">Policy & Rates</option>
                          <option value="Investment">Investment</option>
                          <option value="Local News">Local News</option>
                        </select>
                      </label>
                    </div>

                    <div className="admin__form-grid" style={{ marginTop: '1rem' }}>
                      <label>
                        News Source
                        <input
                          value={newsForm.source}
                          onChange={(e) => setNewsForm({ ...newsForm, source: e.target.value })}
                          placeholder="e.g. Times Property / RE-ON Intelligence"
                        />
                      </label>
                      <label>
                        Publication Date
                        <input
                          type="date"
                          value={newsForm.date}
                          onChange={(e) => setNewsForm({ ...newsForm, date: e.target.value })}
                        />
                      </label>
                    </div>

                    <label style={{ marginTop: '1rem', display: 'block' }}>
                      Excerpt / Headline Summary *
                      <textarea
                        rows={2}
                        value={newsForm.excerpt}
                        onChange={(e) => setNewsForm({ ...newsForm, excerpt: e.target.value })}
                        placeholder="Brief headline summary..."
                      />
                    </label>

                    <label style={{ marginTop: '1rem', display: 'block' }}>
                      Full News Content
                      <textarea
                        rows={6}
                        value={newsForm.content}
                        onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                        placeholder="Full body article text..."
                      />
                    </label>

                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                        <label style={{ margin: 0, fontWeight: 600 }}>Image URLs (Google Drive links, web URLs, or data URLs)</label>
                        <label className="btn-outline" style={{ cursor: 'pointer', padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <DownloadCloud size={14} /> Upload Files
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => handleFileUpload(e, 'images', setNewsForm, newsForm)}
                          />
                        </label>
                      </div>
                      <textarea
                        rows={3}
                        value={newsForm.images}
                        onChange={(e) => setNewsForm({ ...newsForm, images: e.target.value })}
                        placeholder="https://drive.google.com/file/d/...&#10;https://images.unsplash.com/photo-..."
                      />
                    </div>

                    <div className="admin__form-actions" style={{ marginTop: '1rem' }}>
                      <button type="submit" className="btn-accent">
                        {editNewsId ? 'Update News Article' : 'Add News Article'}
                      </button>
                      {editNewsId && (
                        <button type="button" className="btn-outline" onClick={clearNewsForm}>
                          Cancel Edit
                        </button>
                      )}
                    </div>
                  </form>
                  {statusMessage && <div className="admin__status-message">{statusMessage}</div>}
                </div>

                <div className="admin__section" style={{ marginTop: '2rem' }}>
                  <h2>All News Articles ({news.length})</h2>
                  <div className="admin__list">
                    {news.map((item) => (
                      <div key={item.id || item._id} className="admin__list-item">
                        <div>
                          <strong>{item.title}</strong> ({item.category || 'News'}) — <span style={{ color: 'var(--red)' }}>{item.source}</span>
                          <p style={{ fontSize: '0.8rem', color: 'var(--gray)', margin: '0.2rem 0 0 0' }}>
                            {item.date} | {item.excerpt ? item.excerpt.substring(0, 100) + '...' : ''}
                          </p>
                        </div>
                        <div className="admin__item-actions">
                          <button className="btn-outline" type="button" onClick={() => loadNewsForEdit(item)}>
                            Edit
                          </button>
                          <button className="btn-outline" type="button" onClick={() => handleDeleteNews(item)} style={{ color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'inquiries' && (() => {
              const uniqueInquiryProperties = Array.from(
                new Set(contacts.map((c) => c.propertyName?.trim()).filter(Boolean))
              ).sort()

              const filteredInquiries = contacts.filter((c) => {
                if (inquirySearch.trim()) {
                  const q = inquirySearch.toLowerCase()
                  const matchName = (c.name || '').toLowerCase().includes(q)
                  const matchPhone = (c.phone || '').toLowerCase().includes(q)
                  const matchEmail = (c.email || '').toLowerCase().includes(q)
                  const matchProp = (c.propertyName || '').toLowerCase().includes(q)
                  const matchLoc = (c.propertyLocation || c.location || '').toLowerCase().includes(q)
                  const matchMsg = (c.message || '').toLowerCase().includes(q)
                  const matchNote = (c.notes || '').toLowerCase().includes(q)
                  if (!matchName && !matchPhone && !matchEmail && !matchProp && !matchLoc && !matchMsg && !matchNote) {
                    return false
                  }
                }
                if (inquiryStatusFilter !== 'all') {
                  const currentStage = mapLegacyStatusToStage(c.status)
                  if (inquiryStatusFilter.startsWith('phase:')) {
                    const targetPhaseId = inquiryStatusFilter.replace('phase:', '')
                    const phase = CRM_PHASES.find((p) => p.id === targetPhaseId)
                    if (!phase || !phase.stages.includes(currentStage)) return false
                  } else {
                    if (currentStage !== inquiryStatusFilter && (c.status || 'New') !== inquiryStatusFilter) {
                      return false
                    }
                  }
                }
                if (inquiryTypeFilter !== 'all') {
                  if (inquiryTypeFilter === 'Brochure' && !c.type?.toLowerCase().includes('brochure')) return false
                  if (inquiryTypeFilter === 'SiteVisit' && !c.type?.toLowerCase().includes('visit')) return false
                  if (inquiryTypeFilter === 'Dwell' && !c.type?.toLowerCase().includes('30s') && !c.source?.toLowerCase().includes('dwell')) return false
                  if (inquiryTypeFilter === 'Property' && !c.propertyName) return false
                  if (inquiryTypeFilter === 'General' && c.propertyName) return false
                }
                if (inquiryPropertyFilter !== 'all') {
                  if ((c.propertyName || '').trim() !== inquiryPropertyFilter) return false
                }
                if (callerFilter !== 'all') {
                  const assignedName = c.assignedCallerName || c.assignedTo?.name || ''
                  if (callerFilter === 'unassigned') {
                    if (assignedName) return false
                  } else {
                    if (assignedName.toLowerCase() !== callerFilter.toLowerCase()) return false
                  }
                }
                return true
              })

              const handleStatusChange = async (inquiryId, newStatus, extraUpdates = {}) => {
                if (!updateContactInquiry) return
                const res = await updateContactInquiry(inquiryId, {
                  status: newStatus,
                  ...extraUpdates,
                })
                if (!res?.success) {
                  alert(`Failed to update status: ${res?.error || 'Unknown error'}`)
                }
              }

              const handleSaveNote = async (inquiryId) => {
                const noteText = editingNotes[inquiryId]
                if (noteText === undefined) return
                setSavingNoteId(inquiryId)
                const res = await updateContactInquiry(inquiryId, { notes: noteText })
                setSavingNoteId(null)
                if (res?.success) {
                  setNoteStatusMsg({ ...noteStatusMsg, [inquiryId]: 'Saved!' })
                  setTimeout(() => {
                    setNoteStatusMsg((prev) => ({ ...prev, [inquiryId]: '' }))
                  }, 2000)
                } else {
                  alert(`Failed to save note: ${res?.error || 'Unknown error'}`)
                }
              }

              const handleDeleteInquiry = async (inquiryId, customerName) => {
                if (!window.confirm(`Are you sure you want to delete the inquiry from "${customerName || 'this customer'}"?`)) {
                  return
                }
                setDeletingInquiryId(inquiryId)
                const res = await deleteContactInquiry(inquiryId)
                setDeletingInquiryId(null)
                if (!res?.success) {
                  alert(`Failed to delete inquiry: ${res?.error || 'Unknown error'}`)
                }
              }

              const handleExportCSV = () => {
                if (!filteredInquiries.length) {
                  alert('No inquiries to export')
                  return
                }
                const headers = ['Date', 'Type', 'Property Name', 'Property Location', 'Customer Name', 'Phone', 'Email', 'Assigned Caller', 'Call Status', 'Customer Message', 'Status', 'Internal Notes']
                const rows = filteredInquiries.map((c) => [
                  c.submittedAt ? new Date(c.submittedAt).toLocaleString() : '',
                  c.type || (c.propertyName ? 'Property Inquiry' : 'General Contact'),
                  c.propertyName || 'N/A',
                  c.propertyLocation || c.location || '',
                  c.name || '',
                  c.phone || '',
                  c.email || '',
                  c.assignedCallerName || c.assignedTo?.name || 'Unassigned',
                  c.callStatus || 'Pending',
                  (c.message || '').replace(/"/g, '""'),
                  c.status || 'New',
                  (c.notes || '').replace(/"/g, '""'),
                ])

                const csvContent = [
                  headers.join(','),
                  ...rows.map((row) => row.map((field) => `"${String(field || '').replace(/"/g, '""')}"`).join(',')),
                ].join('\n')

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.setAttribute('href', url)
                link.setAttribute('download', `reon_crm_leads_${new Date().toISOString().split('T')[0]}.csv`)
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              }

              const handleOpenTwinModal = async (lead) => {
                setSelectedTwinLead(lead)
                setIsLoadingTwin(true)
                if (analyzeLead) {
                  const data = await analyzeLead(lead._id || lead.id)
                  if (data && data.digitalTwin) {
                    setLeadTwinData(data.digitalTwin)
                    setLeadMatchedProps(data.matchedProperties || [])
                  } else {
                    setLeadTwinData(null)
                    setLeadMatchedProps([])
                  }
                }
                setIsLoadingTwin(false)
              }

              const handleAskCRM = async (query) => {
                if (!query || !query.trim()) return
                setIsAskingCrm(true)
                setAskCrmAiText('')
                if (askCRM) {
                  const res = await askCRM(query)
                  if (res && res.answer) {
                    setAskCrmAiText(res.answer)
                    if (res.filteredContacts && res.matchedCount !== contacts.length) {
                      setInquirySearch(query)
                    }
                  }
                }
                setIsAskingCrm(false)
              }

              const handleRunAutomationEngine = async () => {
                setIsAutomating(true)
                setAutomationResult('⚡ Evaluating 6-day/12-call & 18-day/32-call cadence rules...')
                try {
                  const { updatedContacts, actions, summary } = runAutonomousCRMEngine(contacts, callers)
                  
                  // Save all modified leads to backend/storage
                  for (const act of actions) {
                    await updateContactInquiry(act.leadId, {
                      status: act.toStage,
                      notes: `${contacts.find(c => (c._id || c.id) === act.leadId)?.notes || ''}\n[Auto-Cadence Action]: ${act.reason}`,
                    })
                  }

                  if (actions.length > 0) {
                    setAutomationResult(`✅ Auto-Pilot Executed: ${actions.length} automated pipeline transitions applied! (${summary.cadenceExpiredCount} expired to Review, ${summary.vandLoopsCount} VAND site visit loops triggered).`)
                  } else {
                    setAutomationResult(`✅ Cadence Engine: All ${contacts.length} leads are compliant within their 6-day (12-call) and 18-day (32-call) SLA windows!`)
                  }

                  if (refreshFromMongoDB) refreshFromMongoDB()
                } catch (err) {
                  setAutomationResult(`❌ Engine error: ${err.message}`)
                }
                setIsAutomating(false)
                setTimeout(() => setAutomationResult(null), 8000)
              }

              const handleExecuteTuesdayRefresh = async () => {
                setIsAutomating(true)
                setAutomationResult('🔄 Executing Cohort Refresh...')
                try {
                  const { updatedContacts, actions, summary } = executeTuesdayWeeklyRefresh(contacts)

                  for (const act of actions) {
                    await updateContactInquiry(act.leadId, {
                      status: act.toStage,
                      notes: `${contacts.find(c => (c._id || c.id) === act.leadId)?.notes || ''}\n[Refresh]: ${act.message}`,
                    })
                  }

                  setAutomationResult(`✅ Refresh Complete: ${actions.length} unconverted cohort leads recycled into Arrange Follow Up & Fresh Lead cadences!`)
                  if (refreshFromMongoDB) refreshFromMongoDB()
                } catch (err) {
                  setAutomationResult(`❌ Refresh error: ${err.message}`)
                }
                setIsAutomating(false)
                setTimeout(() => setAutomationResult(null), 8000)
              }

              return (
                <div className="rev-os-container">
                  {/* Top HUD Command Center with Telemetry & Ask CRM Query Engine */}
                  <RevenueCommandCenter
                    contacts={contacts}
                    properties={properties}
                    callers={callers}
                    viewMode={crmViewMode}
                    setViewMode={setCrmViewMode}
                    onAskCRM={handleAskCRM}
                    askCrmResponse={askCrmAiText}
                    isAsking={isAskingCrm}
                    onExportCSV={handleExportCSV}
                    searchQuery={inquirySearch}
                    setSearchQuery={setInquirySearch}
                    statusFilter={inquiryStatusFilter}
                    setStatusFilter={setInquiryStatusFilter}
                    typeFilter={inquiryTypeFilter}
                    setTypeFilter={setInquiryTypeFilter}
                    propertyFilter={inquiryPropertyFilter}
                    setPropertyFilter={setInquiryPropertyFilter}
                    callerFilter={callerFilter}
                    setCallerFilter={setCallerFilter}
                    onAutoDistribute={() => handleAutoDistributeLeads('unassigned_only')}
                    isDistributing={isDistributingLeads}
                    uniqueProperties={uniqueInquiryProperties}
                    onRunAutomationEngine={handleRunAutomationEngine}
                    onExecuteTuesdayRefresh={handleExecuteTuesdayRefresh}
                    automationResult={automationResult}
                    isAutomating={isAutomating}
                  />

                  {/* ──────────────────────────────────────────────
                      VIEW MODE 3: TELECALLER MANAGEMENT & AUTO-ASSIGNMENT PANEL
                      ────────────────────────────────────────────── */}
                  {crmViewMode === 'callers' && (
                    <>
                      {/* ═══ HERO HEADER WITH GRADIENT MESH ═══ */}
                      <div style={{
                        background: 'linear-gradient(145deg, rgba(8, 42, 31, 0.95) 0%, rgba(6, 30, 22, 0.98) 40%, rgba(15, 23, 42, 0.95) 100%)',
                        border: '1px solid rgba(74, 222, 128, 0.25)',
                        borderRadius: '24px',
                        padding: '2rem 2rem 1.75rem',
                        marginBottom: '1.5rem',
                        position: 'relative',
                        overflow: 'hidden',
                      }}>
                        {/* Decorative gradient orbs */}
                        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(74, 222, 128, 0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
                        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(56, 189, 248, 0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

                        {/* Top row: Title + Actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.25rem', position: 'relative', zIndex: 1 }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              <div style={{
                                width: 52, height: 52, borderRadius: 16,
                                background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.2) 0%, rgba(16, 185, 129, 0.1) 100%)',
                                border: '1px solid rgba(74, 222, 128, 0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '1.5rem',
                                boxShadow: '0 4px 16px rgba(74, 222, 128, 0.1)',
                              }}>
                                🎧
                              </div>
                              <div>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
                                  Telecaller Command Center
                                </h2>
                                <p style={{ margin: '5px 0 0 0', fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.4, maxWidth: 480 }}>
                                  Manage your calling team, auto-distribute leads fairly, and track real-time pipeline performance per agent.
                                </p>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn-accent"
                              onClick={() => handleAutoDistributeLeads('unassigned_only')}
                              disabled={isDistributingLeads || callers.filter(c => c.active !== false).length === 0}
                              style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                padding: '0.7rem 1.4rem',
                                fontWeight: 700,
                                fontSize: '0.88rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                                borderRadius: 14,
                              }}
                            >
                              <Zap size={16} />
                              {isDistributingLeads ? 'Distributing...' : `Auto-Distribute (${contacts.filter(c => !c.assignedTo?.name && !c.assignedCallerName).length} Pending)`}
                            </button>

                            <button
                              type="button"
                              className="btn-outline"
                              onClick={() => {
                                if (confirm('Rebalance all leads evenly across all active callers?')) {
                                  handleAutoDistributeLeads('rebalance_all')
                                }
                              }}
                              disabled={isDistributingLeads || callers.filter(c => c.active !== false).length === 0}
                              style={{
                                borderColor: 'rgba(56, 189, 248, 0.35)',
                                color: '#38bdf8',
                                padding: '0.7rem 1.3rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                borderRadius: 14,
                                fontSize: '0.88rem',
                                fontWeight: 600,
                              }}
                            >
                              <RefreshCw size={14} className={isDistributingLeads ? 'spin' : ''} />
                              Rebalance All
                            </button>
                          </div>
                        </div>

                        {/* ═══ PREMIUM METRIC CARDS ROW ═══ */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1.75rem', position: 'relative', zIndex: 1 }}>
                          {[
                            {
                              label: 'Total Agents',
                              value: callers.length,
                              icon: '👥',
                              color: '#e2e8f0',
                              accent: 'rgba(226, 232, 240, 0.12)',
                              borderAccent: 'rgba(226, 232, 240, 0.15)',
                            },
                            {
                              label: 'Active Now',
                              value: callers.filter(c => c.active !== false).length,
                              icon: '🟢',
                              color: '#4ade80',
                              accent: 'rgba(74, 222, 128, 0.1)',
                              borderAccent: 'rgba(74, 222, 128, 0.2)',
                            },
                            {
                              label: 'Total Leads',
                              value: contacts.length,
                              icon: '📊',
                              color: '#38bdf8',
                              accent: 'rgba(56, 189, 248, 0.1)',
                              borderAccent: 'rgba(56, 189, 248, 0.2)',
                            },
                            {
                              label: 'Unassigned',
                              value: contacts.filter(c => !c.assignedTo?.name && !c.assignedCallerName).length,
                              icon: '⏳',
                              color: contacts.filter(c => !c.assignedTo?.name && !c.assignedCallerName).length > 0 ? '#fbbf24' : '#4ade80',
                              accent: contacts.filter(c => !c.assignedTo?.name && !c.assignedCallerName).length > 0 ? 'rgba(251, 191, 36, 0.1)' : 'rgba(74, 222, 128, 0.1)',
                              borderAccent: contacts.filter(c => !c.assignedTo?.name && !c.assignedCallerName).length > 0 ? 'rgba(251, 191, 36, 0.2)' : 'rgba(74, 222, 128, 0.2)',
                            },
                            {
                              label: 'Per Agent',
                              value: `~${callers.filter(c => c.active !== false).length > 0 ? Math.ceil(contacts.length / callers.filter(c => c.active !== false).length) : 0}`,
                              icon: '⚖️',
                              color: '#a78bfa',
                              accent: 'rgba(167, 139, 250, 0.1)',
                              borderAccent: 'rgba(167, 139, 250, 0.2)',
                            },
                          ].map((m, i) => (
                            <div key={i} style={{
                              background: m.accent,
                              backdropFilter: 'blur(12px)',
                              WebkitBackdropFilter: 'blur(12px)',
                              padding: '1.1rem 1.15rem',
                              borderRadius: 16,
                              border: `1px solid ${m.borderAccent}`,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.85rem',
                              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            }}>
                              <div style={{ fontSize: '1.5rem', lineHeight: 1 }}>{m.icon}</div>
                              <div>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{m.label}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: m.color, letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 2 }}>{m.value}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* ═══ ADD NEW TELECALLER — PREMIUM FORM ═══ */}
                      <div style={{
                        background: 'linear-gradient(160deg, rgba(8, 42, 31, 0.85) 0%, rgba(15, 23, 42, 0.75) 100%)',
                        border: '1px solid rgba(74, 222, 128, 0.15)',
                        borderRadius: '22px',
                        padding: '1.75rem 2rem',
                        marginBottom: '1.5rem',
                        position: 'relative',
                        overflow: 'hidden',
                      }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent, #4ade80, #38bdf8, transparent)', opacity: 0.6 }} />

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem' }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.2) 0%, rgba(56, 189, 248, 0.15) 100%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <UserPlus size={18} color="#4ade80" />
                          </div>
                          <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Add New Telecaller</h3>
                            <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>New agents start receiving leads after auto-distribution</p>
                          </div>
                        </div>

                        <form onSubmit={handleAddCallerSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '0.76rem', color: '#94a3b8', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Full Name *</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Priya Sharma"
                              value={callerForm.name}
                              onChange={(e) => setCallerForm({ ...callerForm, name: e.target.value })}
                              style={{
                                width: '100%',
                                background: 'rgba(0,0,0,0.35)',
                                border: '1px solid rgba(74, 222, 128, 0.15)',
                                borderRadius: 12,
                                padding: '0.7rem 1rem',
                                color: '#fff',
                                fontSize: '0.9rem',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.76rem', color: '#94a3b8', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Phone Number</label>
                            <input
                              type="tel"
                              placeholder="e.g. +91 98765 43210"
                              value={callerForm.phone}
                              onChange={(e) => setCallerForm({ ...callerForm, phone: e.target.value })}
                              style={{
                                width: '100%',
                                background: 'rgba(0,0,0,0.35)',
                                border: '1px solid rgba(74, 222, 128, 0.15)',
                                borderRadius: 12,
                                padding: '0.7rem 1rem',
                                color: '#fff',
                                fontSize: '0.9rem',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                              }}
                            />
                          </div>

                          <div>
                            <label style={{ display: 'block', fontSize: '0.76rem', color: '#94a3b8', marginBottom: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email Address</label>
                            <input
                              type="email"
                              placeholder="e.g. priya@reonrealty.in"
                              value={callerForm.email}
                              onChange={(e) => setCallerForm({ ...callerForm, email: e.target.value })}
                              style={{
                                width: '100%',
                                background: 'rgba(0,0,0,0.35)',
                                border: '1px solid rgba(74, 222, 128, 0.15)',
                                borderRadius: 12,
                                padding: '0.7rem 1rem',
                                color: '#fff',
                                fontSize: '0.9rem',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                              }}
                            />
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#cbd5e1', cursor: 'pointer', margin: 0, whiteSpace: 'nowrap' }}>
                              <div style={{
                                width: 20, height: 20, borderRadius: 6,
                                background: callerForm.active ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(0,0,0,0.4)',
                                border: callerForm.active ? '1px solid #4ade80' : '1px solid rgba(255,255,255,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.15s ease',
                              }}>
                                {callerForm.active && <Check size={13} color="#fff" />}
                              </div>
                              <input
                                type="checkbox"
                                checked={callerForm.active}
                                onChange={(e) => setCallerForm({ ...callerForm, active: e.target.checked })}
                                style={{ display: 'none' }}
                              />
                              Active
                            </label>

                            <button
                              type="submit"
                              className="btn-accent"
                              disabled={isSavingCaller || !callerForm.name.trim()}
                              style={{
                                padding: '0.7rem 1.5rem',
                                fontSize: '0.88rem',
                                fontWeight: 700,
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                whiteSpace: 'nowrap',
                                borderRadius: 12,
                                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                              }}
                            >
                              <Plus size={16} />
                              {isSavingCaller ? 'Saving...' : 'Add Agent'}
                            </button>
                          </div>
                        </form>

                        {callerMsg && (
                          <div style={{
                            marginTop: '1rem',
                            fontSize: '0.84rem',
                            padding: '0.65rem 1rem',
                            borderRadius: 10,
                            background: callerMsgType === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(74, 222, 128, 0.1)',
                            border: `1px solid ${callerMsgType === 'error' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(74, 222, 128, 0.25)'}`,
                            color: callerMsgType === 'error' ? '#fca5a5' : '#86efac',
                          }}>
                            {callerMsg}
                          </div>
                        )}
                      </div>

                      {/* ═══ TELECALLER ROSTER & WORKLOAD GRID ═══ */}
                      <div style={{ marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: 8,
                              background: 'rgba(56, 189, 248, 0.15)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Users size={16} color="#38bdf8" />
                            </div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
                              Agent Roster
                              <span style={{ fontSize: '0.82rem', fontWeight: 500, color: '#64748b', marginLeft: 8 }}>
                                {callers.length} {callers.length === 1 ? 'agent' : 'agents'} enrolled
                              </span>
                            </h3>
                          </div>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                            Click "View Leads" to filter CRM by agent
                          </span>
                        </div>

                        {callers.length === 0 ? (
                          <div style={{
                            textAlign: 'center',
                            padding: '4rem 1.5rem',
                            background: 'linear-gradient(160deg, rgba(15, 23, 42, 0.6) 0%, rgba(8, 42, 31, 0.3) 100%)',
                            border: '1px dashed rgba(74, 222, 128, 0.2)',
                            borderRadius: '22px',
                          }}>
                            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(74, 222, 128, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto', fontSize: '2.2rem' }}>
                              🎧
                            </div>
                            <h4 style={{ color: '#fff', marginBottom: '0.5rem', fontSize: '1.15rem', fontWeight: 700 }}>No Telecalling Agents Yet</h4>
                            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 0.5rem 0', maxWidth: 400, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
                              Add your first telecaller above. Leads will be automatically and evenly distributed to all active agents in real-time.
                            </p>
                          </div>
                        ) : (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
                            {callers.map((caller) => {
                              const callerId = caller._id || caller.id || caller.name
                              const isSelected = callerFilter === caller.name
                              const assignedLeads = contacts.filter(
                                (c) => c.assignedCallerName === caller.name || c.assignedTo?.name === caller.name
                              )
                              const newLeads = assignedLeads.filter((c) => !c.status || c.status === 'New').length
                              const contactedLeads = assignedLeads.filter((c) => c.status === 'Contacted' || c.callStatus === 'Called' || c.callStatus === 'Interested').length
                              const siteVisits = assignedLeads.filter((c) => c.status === 'Site Visit Scheduled').length
                              const converted = assignedLeads.filter((c) => c.status === 'Converted').length
                              const pct = contacts.length > 0 ? Math.round((assignedLeads.length / contacts.length) * 100) : 0
                              const isActive = caller.active !== false

                              return (
                                <div
                                  key={callerId}
                                  style={{
                                    background: isSelected
                                      ? 'linear-gradient(155deg, rgba(8, 42, 31, 0.97) 0%, rgba(6, 30, 22, 0.97) 50%, rgba(15, 23, 42, 0.97) 100%)'
                                      : 'linear-gradient(155deg, rgba(15, 23, 42, 0.85) 0%, rgba(8, 42, 31, 0.5) 100%)',
                                    border: isSelected
                                      ? '2px solid rgba(74, 222, 128, 0.6)'
                                      : `1px solid ${isActive ? 'rgba(74, 222, 128, 0.18)' : 'rgba(255, 255, 255, 0.08)'}`,
                                    borderRadius: '20px',
                                    padding: '1.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '1rem',
                                    boxShadow: isSelected
                                      ? '0 0 30px rgba(74, 222, 128, 0.15), 0 8px 30px rgba(0,0,0,0.35)'
                                      : '0 4px 24px rgba(0,0,0,0.3)',
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    opacity: isActive ? 1 : 0.7,
                                  }}
                                >
                                  {/* Top accent line */}
                                  <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                                    background: isActive
                                      ? 'linear-gradient(90deg, transparent 5%, #4ade80 30%, #38bdf8 70%, transparent 95%)'
                                      : 'linear-gradient(90deg, transparent 5%, #64748b 50%, transparent 95%)',
                                    opacity: isSelected ? 0.9 : 0.4,
                                  }} />

                                  {/* Header: Avatar + Name + Status */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                      <div style={{
                                        width: 48, height: 48,
                                        borderRadius: 14,
                                        background: isActive
                                          ? 'linear-gradient(135deg, rgba(74, 222, 128, 0.25) 0%, rgba(16, 185, 129, 0.15) 100%)'
                                          : 'rgba(148, 163, 184, 0.12)',
                                        color: isActive ? '#4ade80' : '#94a3b8',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 800, fontSize: '1.2rem',
                                        border: `1px solid ${isActive ? 'rgba(74, 222, 128, 0.3)' : 'rgba(148, 163, 184, 0.15)'}`,
                                      }}>
                                        {caller.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <h4 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{caller.name}</h4>
                                        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                                          {caller.phone && <><Phone size={11} /> {caller.phone}</>}
                                          {caller.phone && caller.email && <span style={{ opacity: 0.4 }}>•</span>}
                                          {caller.email && <><Mail size={11} /> {caller.email}</>}
                                          {!caller.phone && !caller.email && <span style={{ fontStyle: 'italic' }}>No contact info</span>}
                                        </div>
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() => handleToggleCallerStatus(caller)}
                                      style={{
                                        background: isActive
                                          ? 'linear-gradient(135deg, rgba(74, 222, 128, 0.15) 0%, rgba(16, 185, 129, 0.08) 100%)'
                                          : 'rgba(239, 68, 68, 0.1)',
                                        color: isActive ? '#4ade80' : '#fca5a5',
                                        border: `1px solid ${isActive ? 'rgba(74, 222, 128, 0.3)' : 'rgba(239, 68, 68, 0.25)'}`,
                                        borderRadius: 20,
                                        padding: '0.3rem 0.85rem',
                                        fontSize: '0.76rem',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        transition: 'all 0.2s ease',
                                      }}
                                    >
                                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: isActive ? '#4ade80' : '#f87171' }} />
                                      {isActive ? 'Active' : 'Inactive'}
                                    </button>
                                  </div>

                                  {/* Lead Allocation Progress */}
                                  <div style={{ padding: '0.85rem 1rem', background: 'rgba(0,0,0,0.25)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.04)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 8 }}>
                                      <span style={{ color: '#cbd5e1', fontWeight: 600 }}>
                                        Lead Allocation: <span style={{ color: '#fff' }}>{assignedLeads.length}</span> leads
                                      </span>
                                      <span style={{
                                        color: pct > 30 ? '#4ade80' : pct > 15 ? '#fbbf24' : '#94a3b8',
                                        fontWeight: 700,
                                        fontSize: '0.82rem',
                                      }}>
                                        {pct}%
                                      </span>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, height: 6, overflow: 'hidden' }}>
                                      <div style={{
                                        width: `${Math.min(100, pct)}%`,
                                        height: '100%',
                                        background: `linear-gradient(90deg, #10b981, ${pct > 40 ? '#38bdf8' : '#4ade80'})`,
                                        borderRadius: 10,
                                        transition: 'width 0.6s ease',
                                      }} />
                                    </div>
                                  </div>

                                  {/* Mini Funnel — 4 stages */}
                                  <div style={{
                                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
                                    background: 'rgba(0,0,0,0.2)',
                                    padding: '0.75rem 0.85rem',
                                    borderRadius: 14,
                                    border: '1px solid rgba(255,255,255,0.04)',
                                  }}>
                                    {[
                                      { label: 'New', value: newLeads, color: '#4ade80', bg: 'rgba(74, 222, 128, 0.1)' },
                                      { label: 'Contacted', value: contactedLeads, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.1)' },
                                      { label: 'Site Visit', value: siteVisits, color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.1)' },
                                      { label: 'Converted', value: converted, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)' },
                                    ].map((s, i) => (
                                      <div key={i} style={{
                                        background: s.bg,
                                        borderRadius: 10,
                                        padding: '0.55rem 0.5rem',
                                        textAlign: 'center',
                                        border: `1px solid ${s.color}15`,
                                      }}>
                                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color, marginTop: 2 }}>{s.value}</div>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Action Buttons */}
                                  <div style={{ display: 'flex', gap: '0.6rem', marginTop: 'auto', paddingTop: '0.25rem' }}>
                                    {caller.phone && (
                                      <a
                                        href={`tel:${caller.phone.replace(/[^\d+]/g, '')}`}
                                        style={{
                                          flex: 1,
                                          padding: '0.55rem 0.75rem',
                                          fontSize: '0.82rem',
                                          fontWeight: 600,
                                          background: 'rgba(74, 222, 128, 0.08)',
                                          border: '1px solid rgba(74, 222, 128, 0.25)',
                                          borderRadius: 12,
                                          color: '#86efac',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 6,
                                          textDecoration: 'none',
                                          transition: 'all 0.2s ease',
                                        }}
                                      >
                                        <Phone size={13} /> Call
                                      </a>
                                    )}

                                    <button
                                      type="button"
                                      className="btn-accent"
                                      onClick={() => {
                                        setCallerFilter(isSelected ? 'all' : caller.name)
                                        setCrmViewMode('inquiries')
                                      }}
                                      style={{
                                        flex: 2,
                                        padding: '0.55rem 0.85rem',
                                        fontSize: '0.82rem',
                                        fontWeight: 700,
                                        borderRadius: 12,
                                        background: isSelected
                                          ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                          : 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 6,
                                        boxShadow: isSelected ? '0 4px 14px rgba(16, 185, 129, 0.3)' : '0 4px 14px rgba(14, 165, 233, 0.3)',
                                      }}
                                    >
                                      <Eye size={13} />
                                      {isSelected ? `Viewing ${assignedLeads.length} Leads` : `View ${assignedLeads.length} Leads`}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCaller(caller)}
                                      style={{
                                        background: 'rgba(239, 68, 68, 0.08)',
                                        color: '#fca5a5',
                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                        borderRadius: 12,
                                        padding: '0.55rem 0.7rem',
                                        cursor: 'pointer',
                                      }}
                                      title="Delete caller"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* ──────────────────────────────────────────────
                      VIEW MODE 1: INQUIRIES & REVENUE LEADS (CARDS + SPREADSHEET TABLE)
                      ────────────────────────────────────────────── */}
                  {(crmViewMode === 'inquiries' || crmViewMode === 'cards') && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                      {/* Inquiries Section Top Bar with Layout Toggle */}
                      <div
                        style={{
                          background: 'rgba(8, 42, 31, 0.85)',
                          border: '1px solid var(--green-border)',
                          borderRadius: 14,
                          padding: '0.85rem 1.25rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '1rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--cream)' }}>
                            Inquiries &amp; Leads Directory ({filteredInquiries.length})
                          </span>
                          <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.4)', borderRadius: 10, padding: 3, border: '1px solid var(--green-border)' }}>
                            <button
                              type="button"
                              onClick={() => setInquiryLayout('cards')}
                              style={{
                                background: inquiryLayout === 'cards' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                                color: inquiryLayout === 'cards' ? '#fff' : 'var(--cream-muted)',
                                border: 'none',
                                padding: '0.35rem 0.75rem',
                                borderRadius: 7,
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <LayoutGrid size={12} /> Cards Grid
                            </button>
                            <button
                              type="button"
                              onClick={() => setInquiryLayout('table')}
                              style={{
                                background: inquiryLayout === 'table' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                                color: inquiryLayout === 'table' ? '#fff' : 'var(--cream-muted)',
                                border: 'none',
                                padding: '0.35rem 0.75rem',
                                borderRadius: 7,
                                fontSize: '0.76rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Table size={12} /> Spreadsheet Table
                            </button>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={handleExportCSV}
                            style={{
                              padding: '0.4rem 0.8rem',
                              fontSize: '0.76rem',
                              borderColor: 'var(--green-border)',
                              color: 'var(--cream)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                          >
                            <Download size={12} /> Export CSV
                          </button>
                        </div>
                      </div>

                      {filteredInquiries.length === 0 ? (
                          <div style={{ padding: '3.5rem 1rem', textAlign: 'center', background: 'rgba(8, 42, 31, 0.6)', borderRadius: '18px', border: '1px dashed var(--green-border)' }}>
                            <MessageSquare size={44} color="var(--gray)" style={{ margin: '0 auto 1rem auto' }} />
                            <h4 style={{ color: 'var(--cream)', marginBottom: '0.35rem', fontSize: '1.1rem' }}>No Revenue Leads Found</h4>
                            <p style={{ color: 'var(--gray)', fontSize: '0.88rem', margin: 0 }}>
                              {contacts.length === 0
                                ? 'No customer inquiries or dwell leads have been ingested into the Revenue OS yet.'
                                : 'No inquiries match your current AI filters or search criteria.'}
                            </p>
                          </div>
                        ) : inquiryLayout === 'table' ? (
                          /* SPREADSHEET TABLE VIEW */
                          <div style={{ background: 'rgba(8, 42, 31, 0.85)', border: '1px solid var(--green-border)', borderRadius: 16, overflowX: 'auto', boxShadow: '0 8px 30px rgba(0,0,0,0.35)' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem', color: 'var(--cream)' }}>
                              <thead>
                                <tr style={{ background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid var(--green-border)', color: 'var(--cream-muted)', fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                  <th style={{ padding: '0.85rem 1rem' }}>#</th>
                                  <th style={{ padding: '0.85rem 1rem' }}>Date &amp; Source</th>
                                  <th style={{ padding: '0.85rem 1rem' }}>Customer Details</th>
                                  <th style={{ padding: '0.85rem 1rem' }}>Property &amp; Budget</th>
                                  <th style={{ padding: '0.85rem 1rem' }}>Intent Radar</th>
                                  <th style={{ padding: '0.85rem 1rem' }}>Assigned Caller</th>
                                  <th style={{ padding: '0.85rem 1rem' }}>Pipeline Stage</th>
                                  <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredInquiries.map((c, idx) => {
                                  const inqId = c._id || c.id || String(idx)
                                  const stageName = mapLegacyStatusToStage(c.status)
                                  const stageMeta = getStageMeta(stageName)
                                  const isVisit = c.type?.toLowerCase().includes('visit')
                                  const isDwell = c.type?.toLowerCase().includes('30s') || c.source?.toLowerCase().includes('dwell')
                                  const cleanPhone = (c.phone || '').replace(/[^\d+]/g, '')
                                  const waPhone = cleanPhone.startsWith('+') ? cleanPhone.replace('+', '') : `91${cleanPhone.replace(/^0+/, '')}`
                                  const isLost = stageName === 'LOST' || stageName === 'Under Review' || stageName === 'SVP/VAND Lost Request'

                                  return (
                                    <tr
                                      key={inqId}
                                      style={{
                                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                                        background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.15)',
                                        transition: 'background 0.15s',
                                      }}
                                    >
                                      <td style={{ padding: '0.85rem 1rem', color: 'var(--cream-muted)' }}>{idx + 1}</td>
                                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                                        <div style={{ fontWeight: 600, color: 'var(--cream)' }}>
                                          {c.submittedAt ? new Date(c.submittedAt).toLocaleDateString() : 'Recent'}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--cream-muted)', marginTop: 2 }}>
                                          {c.type || c.source || 'Web Lead'}
                                        </div>
                                      </td>
                                      <td style={{ padding: '0.85rem 1rem' }}>
                                        <div style={{ fontWeight: 700, color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                          <User size={13} color="#4ade80" /> {c.name || 'Anonymous Prospect'}
                                        </div>
                                        <div style={{ fontSize: '0.74rem', color: '#4ade80', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <span>{c.phone || 'No phone'}</span>
                                          {c.phone && (
                                            <a
                                              href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Hi ${c.name || 'there'}, regarding your property inquiry with RE-ON Real Estate:`)}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              style={{ color: '#4ade80', display: 'inline-flex' }}
                                              title="WhatsApp"
                                            >
                                              <MessageSquare size={11} />
                                            </a>
                                          )}
                                        </div>
                                      </td>
                                      <td style={{ padding: '0.85rem 1rem' }}>
                                        {c.propertyName ? (
                                          <div>
                                            <div style={{ fontWeight: 600, color: 'var(--cream)' }}>{c.propertyName}</div>
                                            <div style={{ fontSize: '0.72rem', color: '#fbbf24', marginTop: 2 }}>{c.budget || 'Budget open'}</div>
                                          </div>
                                        ) : (
                                          <span style={{ color: 'var(--cream-muted)' }}>General Inquiry</span>
                                        )}
                                      </td>
                                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                                        {isVisit ? (
                                          <span style={{ background: 'rgba(192, 132, 252, 0.15)', color: '#c084fc', border: '1px solid rgba(192, 132, 252, 0.3)', padding: '0.15rem 0.45rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700 }}>
                                            🔥 Site Visit
                                          </span>
                                        ) : isDwell ? (
                                          <span style={{ background: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)', padding: '0.15rem 0.45rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700 }}>
                                            ⭐ Dwell &gt;30s
                                          </span>
                                        ) : (
                                          <span style={{ background: 'rgba(74, 222, 128, 0.12)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.3)', padding: '0.15rem 0.45rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700 }}>
                                            ⚡ Active Lead
                                          </span>
                                        )}
                                      </td>
                                      <td style={{ padding: '0.85rem 1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                          <select
                                            value={c.assignedCallerName || c.assignedTo?.name || ''}
                                            onChange={(e) => handleReassignLead(inqId, e.target.value)}
                                            style={{
                                              background: 'rgba(0,0,0,0.4)',
                                              border: '1px solid var(--green-border)',
                                              borderRadius: 6,
                                              padding: '0.25rem 0.45rem',
                                              color: '#86efac',
                                              fontSize: '0.74rem',
                                              cursor: 'pointer',
                                            }}
                                          >
                                            <option value="__ROUND_ROBIN__">⚡ Auto-Assign (Round Robin)</option>
                                            <option value="">⚠️ Unassigned</option>
                                            {callers.map((clr) => (
                                              <option key={clr._id || clr.id || clr.name} value={clr.name}>
                                                👤 {clr.name}
                                              </option>
                                            ))}
                                          </select>
                                          <button
                                            type="button"
                                            onClick={() => handleSingleLeadRoundRobin(inqId)}
                                            disabled={isDistributingLeads || callers.filter(cl => cl.active !== false).length === 0}
                                            title="Assign to next caller via Round Robin"
                                            style={{
                                              background: 'rgba(74, 222, 128, 0.15)',
                                              border: '1px solid rgba(74, 222, 128, 0.4)',
                                              borderRadius: 6,
                                              padding: '0.25rem 0.4rem',
                                              color: '#4ade80',
                                              cursor: 'pointer',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                            }}
                                          >
                                            <RotateCcw size={12} />
                                          </button>
                                        </div>
                                      </td>
                                      <td style={{ padding: '0.85rem 1rem' }}>
                                        <select
                                          value={stageName}
                                          onChange={(e) => handleStatusChange(inqId, e.target.value)}
                                          style={{
                                            background: `${stageMeta.color}15`,
                                            border: `1px solid ${stageMeta.color}50`,
                                            borderRadius: 6,
                                            padding: '0.25rem 0.45rem',
                                            color: stageMeta.color,
                                            fontSize: '0.74rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                          }}
                                        >
                                          <optgroup label="--- Fresh Prospecting ---">
                                            <option value="New Lead">🟢 New Lead</option>
                                            <option value="Fresh Lead">🌱 Fresh Lead</option>
                                            <option value="Arrange Follow Up">📞 Arrange Follow Up</option>
                                            <option value="Site Visit Prospecting">🚗 Site Visit</option>
                                            <option value="VAND">🔍 VAND</option>
                                            <option value="Weekly Fresh Prospecting">📅 Weekly Fresh (Tue)</option>
                                          </optgroup>
                                          <optgroup label="--- Exploration & Booking ---">
                                            <option value="Exploration">🧭 Exploration</option>
                                            <option value="Weekly Booking Ready">🎯 Booking Ready (Tue)</option>
                                            <option value="Booking Ready">📑 Booking Ready</option>
                                          </optgroup>
                                          <optgroup label="--- Negotiation & Closing ---">
                                            <option value="Rate Finalization Pending">⚖️ Rate Finalization</option>
                                            <option value="Final Negotiation">🤝 Final Negotiation</option>
                                            <option value="Delay Interest">⏳ Delay Interest</option>
                                            <option value="Weekly Closing">🏁 Weekly Closing (Tue)</option>
                                            <option value="EOI">✍️ EOI (Same Day)</option>
                                          </optgroup>
                                          <optgroup label="--- Closed Won ---">
                                            <option value="WON">🎉 WON</option>
                                          </optgroup>
                                          <optgroup label="--- Lost Review & Recovery ---">
                                            <option value="SVP/VAND Lost Request">⚠️ Lost Request</option>
                                            <option value="Under Review">🔎 Under Review</option>
                                            <option value="Re-Pitch">🔁 Re-Pitch</option>
                                            <option value="LOST">❌ LOST</option>
                                          </optgroup>
                                        </select>
                                      </td>
                                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
                                          {isLost && (
                                            <button
                                              type="button"
                                              className="btn-accent"
                                              onClick={() => handleStatusChange(inqId, 'Fresh Lead')}
                                              style={{ padding: '0.3rem 0.55rem', fontSize: '0.72rem', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                                              title="Re-Pitch Lead"
                                            >
                                              <Repeat size={11} /> Re-Pitch
                                            </button>
                                          )}
                                          <button
                                            type="button"
                                            className="rev-btn-action rev-btn-action--primary"
                                            onClick={() => handleOpenTwinModal(c)}
                                            style={{ padding: '0.3rem 0.55rem', fontSize: '0.72rem' }}
                                            title="Digital Twin"
                                          >
                                            <Sparkles size={11} /> Twin
                                          </button>
                                          <button
                                            type="button"
                                            className="rev-btn-action"
                                            onClick={() => handleDeleteInquiry(inqId, c.name)}
                                            disabled={deletingInquiryId === inqId}
                                            style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.25)', padding: '0.3rem 0.5rem' }}
                                            title="Delete Lead"
                                          >
                                            <Trash2 size={11} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  )
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          /* SMART CARDS GRID VIEW */
                          <div className="rev-cards-grid">
                          {filteredInquiries.map((c, i) => {
                            const inqId = c._id || c.id || String(i)
                            const isBrochure = c.type?.toLowerCase().includes('brochure')
                            const isVisit = c.type?.toLowerCase().includes('visit')
                            const isDwellLead = c.type?.toLowerCase().includes('30s') || c.source?.toLowerCase().includes('dwell')
                            const isNew = !c.status || c.status === 'New'

                            const cleanPhone = (c.phone || '').replace(/[^\d+]/g, '')
                            const waPhone = cleanPhone.startsWith('+') ? cleanPhone.replace('+', '') : `91${cleanPhone.replace(/^0+/, '')}`
                            const waText = encodeURIComponent(
                              `Hi ${c.name || 'there'}, thank you for contacting RE-ON Real Estate regarding ${c.propertyName || 'our properties'} in Navi Mumbai. How can we assist you with site visit scheduling & pricing details?`
                            )

                            // Intent scoring calculation
                            let intentBadgeClass = 'rev-intent-radar-badge--medium'
                            let intentLabel = '⚡ 78% Active Buyer'
                            if (isVisit || isDwellLead) {
                              intentBadgeClass = 'rev-intent-radar-badge--high'
                              intentLabel = isVisit ? '🔥 94% Hot Site Visit' : '⭐ 88% Dwell Searcher'
                            } else if (isBrochure) {
                              intentLabel = '📥 82% Cost Analysis'
                            }

                            return (
                              <div
                                key={inqId}
                                className={`rev-lead-card ${
                                  isVisit || isDwellLead
                                    ? 'rev-lead-card--hot'
                                    : isBrochure
                                    ? 'rev-lead-card--dwell'
                                    : isNew
                                    ? 'rev-lead-card--risk'
                                    : ''
                                }`}
                              >
                                {/* Card Header */}
                                <div className="rev-card-header">
                                  <div>
                                    <h3 className="rev-card-client-name">
                                      <User size={16} color="#4ade80" /> {c.name || 'Anonymous Visitor'}
                                    </h3>
                                    <span style={{ fontSize: '0.74rem', color: 'var(--gray)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
                                      <Clock size={11} /> {c.submittedAt ? new Date(c.submittedAt).toLocaleString() : 'Recently'}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                      <span className={`rev-intent-radar-badge ${intentBadgeClass}`}>
                                        {intentLabel}
                                      </span>
                                      {(() => {
                                        const stageName = mapLegacyStatusToStage(c.status)
                                        const stageMeta = getStageMeta(stageName)
                                        return (
                                          <span
                                            style={{
                                              background: `${stageMeta.color}20`,
                                              color: stageMeta.color,
                                              border: `1px solid ${stageMeta.color}50`,
                                              padding: '0.15rem 0.45rem',
                                              borderRadius: 8,
                                              fontSize: '0.68rem',
                                              fontWeight: 700,
                                              whiteSpace: 'nowrap',
                                            }}
                                          >
                                            {stageMeta.badge} {stageName}
                                          </span>
                                        )
                                      })()}
                                    </div>

                                    <select
                                      className="admin__inquiry-status-select"
                                      value={mapLegacyStatusToStage(c.status)}
                                      onChange={(e) => handleStatusChange(inqId, e.target.value)}
                                      style={{
                                        padding: '0.3rem 0.6rem',
                                        fontSize: '0.74rem',
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
                                </div>

                                {/* Target Property Banner */}
                                {c.propertyName && (
                                  <div style={{ background: 'rgba(8, 42, 31, 0.7)', border: '1px solid var(--green-border)', borderRadius: 10, padding: '0.55rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--cream)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                        <Building2 size={14} color="#4ade80" /> {c.propertyName}
                                      </div>
                                      <div style={{ fontSize: '0.72rem', color: 'var(--cream-muted)', marginTop: '0.1rem' }}>
                                        📍 {c.propertyLocation || c.location || 'Navi Mumbai, Maharashtra'}
                                      </div>
                                    </div>
                                    <Link
                                      to={`/properties/${c.propertyId || ''}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ fontSize: '0.74rem', color: '#4ade80', textDecoration: 'none', background: 'rgba(74, 222, 128, 0.15)', border: '1px solid rgba(74, 222, 128, 0.3)', padding: '0.25rem 0.55rem', borderRadius: 6, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                    >
                                      View <ExternalLink size={10} />
                                    </Link>
                                  </div>
                                )}

                                {/* Telemetry Strip */}
                                <div className="rev-card-meta-strip">
                                  <div>
                                    <div className="rev-meta-item-label">Budget Fit</div>
                                    <div className="rev-meta-item-value" style={{ color: '#4ade80' }}>{c.budget || '₹85.00 L'}</div>
                                  </div>
                                  <div>
                                    <div className="rev-meta-item-label">Phone / Channel</div>
                                    <div className="rev-meta-item-value" style={{ fontSize: '0.78rem' }}>{c.phone || c.email || 'Web Chat'}</div>
                                  </div>
                                  <div>
                                    <div className="rev-meta-item-label">Touchpoints</div>
                                    <div className="rev-meta-item-value" style={{ color: '#fbbf24' }}>{(c.timeline || []).length + 1} logged</div>
                                  </div>
                                </div>

                                {/* Next Best Action */}
                                <div className="rev-nba-box">
                                  <div className="rev-nba-header">
                                    <span className="rev-nba-tag">
                                      <Sparkles size={11} /> Next Best Action
                                    </span>
                                    <span className="rev-nba-sla">SLA: 4h</span>
                                  </div>
                                  <h5 className="rev-nba-title">
                                    {isVisit ? 'Confirm VIP Site Visit & Driver Slot' : isBrochure ? 'Send PDF Brochure & Verified Cost Sheet' : 'Dispatch AI WhatsApp Introductory Pitch'}
                                  </h5>
                                </div>

                                {c.message && (
                                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#cbd5e1', fontStyle: 'italic', background: 'rgba(0,0,0,0.25)', padding: '0.45rem 0.65rem', borderRadius: 8 }}>
                                    "{c.message}"
                                  </p>
                                )}

                                {/* Assigned Caller & Call Status Strip */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.45rem 0.65rem', background: 'rgba(8, 42, 31, 0.6)', border: '1px solid rgba(74, 222, 128, 0.25)', borderRadius: 8, fontSize: '0.75rem' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ color: '#94a3b8' }}>Caller:</span>
                                    <select
                                      value={c.assignedCallerName || c.assignedTo?.name || ''}
                                      onChange={(e) => handleReassignLead(inqId, e.target.value)}
                                      style={{
                                        background: 'rgba(0, 0, 0, 0.5)',
                                        border: '1px solid rgba(74, 222, 128, 0.4)',
                                        borderRadius: 6,
                                        padding: '0.2rem 0.45rem',
                                        color: '#86efac',
                                        fontSize: '0.74rem',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      <option value="__ROUND_ROBIN__">⚡ Auto-Assign (Round Robin)</option>
                                      <option value="">⚠️ Unassigned</option>
                                      {callers.map((clr) => (
                                        <option key={clr._id || clr.id || clr.name} value={clr.name}>
                                          👤 {clr.name}
                                        </option>
                                      ))}
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() => handleSingleLeadRoundRobin(inqId)}
                                      disabled={isDistributingLeads || callers.filter(cl => cl.active !== false).length === 0}
                                      title="Assign to next caller via Round Robin"
                                      style={{
                                        background: 'rgba(74, 222, 128, 0.15)',
                                        border: '1px solid rgba(74, 222, 128, 0.4)',
                                        borderRadius: 6,
                                        padding: '0.2rem 0.45rem',
                                        color: '#4ade80',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 3,
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                      }}
                                    >
                                      <RotateCcw size={11} /> Round Robin
                                    </button>
                                  </div>
                                  {c.callStatus && (
                                    <span style={{ fontSize: '0.72rem', color: c.callStatus === 'Pending' ? '#94a3b8' : '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                      📞 {c.callStatus}
                                    </span>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                <div className="rev-card-actions">
                                  {(() => {
                                    const currentStage = mapLegacyStatusToStage(c.status)
                                    const isLostOrReview = currentStage === 'LOST' || currentStage === 'Under Review' || currentStage === 'SVP/VAND Lost Request'
                                    if (isLostOrReview) {
                                      return (
                                        <button
                                          type="button"
                                          className="btn-accent"
                                          onClick={() => handleStatusChange(inqId, 'Fresh Lead')}
                                          style={{
                                            background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                                            color: '#fff',
                                            fontWeight: 650,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 5,
                                            padding: '0.45rem 0.85rem',
                                            borderRadius: 8,
                                            border: 'none',
                                            cursor: 'pointer',
                                          }}
                                          title="Recycle lost lead back to Fresh Lead pipeline"
                                        >
                                          <Repeat size={13} /> Re-Pitch Lead
                                        </button>
                                      )
                                    }
                                    return null
                                  })()}

                                  {c.phone && (
                                    <button
                                      type="button"
                                      className="rev-btn-action"
                                      onClick={() => handleOpenCallModal(c)}
                                      style={{
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        color: '#fff',
                                        fontWeight: 650,
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 5,
                                        padding: '0.45rem 0.85rem',
                                        borderRadius: 8,
                                        border: 'none',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                                      }}
                                      title={`Call ${c.phone} & Log Outcome`}
                                    >
                                      <Phone size={13} /> Call Lead
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    className="rev-btn-action rev-btn-action--primary"
                                    onClick={() => handleOpenTwinModal(c)}
                                    style={{ flex: 1 }}
                                  >
                                    <Sparkles size={13} /> 360° Digital Twin
                                  </button>

                                  {c.phone && (
                                    <a
                                      href={`https://wa.me/${waPhone}?text=${waText}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="rev-btn-action rev-btn-action--wa"
                                      title="WhatsApp"
                                    >
                                      <MessageSquare size={13} />
                                    </a>
                                  )}

                                  {c.email && (
                                    <a
                                      href={`mailto:${c.email}?subject=RE-ON%20Real%20Estate%20-%20${encodeURIComponent(c.propertyName || 'Property Inquiry')}`}
                                      className="rev-btn-action rev-btn-action--secondary"
                                      title="Email"
                                    >
                                      <Mail size={13} />
                                    </a>
                                  )}

                                  <button
                                    type="button"
                                    className="rev-btn-action"
                                    onClick={() => handleDeleteInquiry(inqId, c.name)}
                                    disabled={deletingInquiryId === inqId}
                                    style={{ background: 'rgba(239, 68, 68, 0.12)', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.25)' }}
                                    title="Delete Lead"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>

                                {/* Quick Internal Note Input */}
                                <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
                                  <input
                                    type="text"
                                    placeholder="Add sales note..."
                                    value={editingNotes[inqId] !== undefined ? editingNotes[inqId] : (c.notes || '')}
                                    onChange={(e) => setEditingNotes({ ...editingNotes, [inqId]: e.target.value })}
                                    style={{
                                      flex: 1,
                                      background: 'rgba(0,0,0,0.3)',
                                      border: '1px solid rgba(255,255,255,0.08)',
                                      borderRadius: 8,
                                      padding: '0.35rem 0.6rem',
                                      color: '#fff',
                                      fontSize: '0.78rem',
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="btn-accent"
                                    onClick={() => handleSaveNote(inqId)}
                                    disabled={savingNoteId === inqId}
                                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.74rem', borderRadius: 8 }}
                                  >
                                    {savingNoteId === inqId ? '...' : 'Save'}
                                  </button>
                                  {noteStatusMsg[inqId] && (
                                    <span style={{ fontSize: '0.72rem', color: '#4ade80', fontWeight: 600 }}>
                                      {noteStatusMsg[inqId]}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* VIEW MODE 2: NEODOVE TELECALLING & SALES SUITE */}
                  {crmViewMode === 'neodove' && (
                    <NeoDoveCRMView
                      contacts={filteredInquiries}
                      properties={properties}
                      callers={callers}
                      onOpenLeadModal={handleOpenTwinModal}
                      onUpdateStatus={handleStatusChange}
                      onSaveNote={handleSaveNote}
                    />
                  )}

                  {/* VIEW MODE 3: REVENUE FORECAST & ANALYTICS */}
                  {crmViewMode === 'analytics' && (
                    <RevenueAnalyticsView
                      contacts={contacts}
                      properties={properties}
                    />
                  )}

                  {/* 360° DIGITAL TWIN & AUTONOMOUS AGENTS MODAL */}
                  {selectedTwinLead && (
                    <CustomerDigitalTwinModal
                      lead={selectedTwinLead}
                      properties={properties}
                      digitalTwin={leadTwinData}
                      matchedProperties={leadMatchedProps}
                      onClose={() => {
                        setSelectedTwinLead(null)
                        setLeadTwinData(null)
                        setLeadMatchedProps([])
                      }}
                      onUpdateLead={handleStatusChange}
                      onRunAgent={runAutonomousAgent}
                      onAddTimelineEvent={addLeadTimelineEvent}
                    />
                  )}
                </div>
              )
            })()}


            {/* ═══════════════════════════════════════════════════════════════
                CALLER WORKSTATION TAB - Full Telecalling Portal for Callers
                ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'caller-workstation' && (() => {
              const myLeads = isCaller ? callerAssignedLeads : []
              const totalLeads = myLeads.length
              const calledLeads = myLeads.filter(c => c.callCount > 0 || c.callStatus === 'Called' || c.callStatus === 'Contacted').length
              const uncalledLeads = totalLeads - calledLeads
              const siteVisitBooked = myLeads.filter(c => {
                const stage = mapLegacyStatusToStage(c.status)
                return stage === 'Site Visit Prospecting' || stage === 'VAND' || c.visitStatus === 'Scheduled'
              }).length
              const wonLeads = myLeads.filter(c => mapLegacyStatusToStage(c.status) === 'WON').length
              const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0.0'

              const callerHandleStatusChange = async (inquiryId, newStatus, extraUpdates = {}) => {
                if (!updateContactInquiry) return
                const res = await updateContactInquiry(inquiryId, {
                  status: newStatus,
                  ...extraUpdates,
                })
                if (!res?.success) {
                  alert(`Failed to update status: ${res?.error || 'Unknown error'}`)
                }
              }

              const callerHandleSaveNote = async (inquiryId, noteText) => {
                if (!updateContactInquiry) return
                const res = await updateContactInquiry(inquiryId, { notes: noteText })
                if (!res?.success) {
                  alert(`Failed to save note: ${res?.error || 'Unknown error'}`)
                }
              }

              const callerHandleOpenTwin = (lead) => {
                setSelectedTwinLead(lead)
                setLeadTwinData(null)
                setLeadMatchedProps([])
              }

              return (
                <div>
                  {/* Caller Welcome Banner */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(8, 42, 31, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%)',
                    border: '1px solid rgba(74, 222, 128, 0.3)',
                    borderRadius: 18,
                    padding: '1.5rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--cream)' }}>
                        📞 Welcome, <span style={{ color: '#4ade80' }}>{matchedCaller?.name || 'Agent'}</span>
                      </h2>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--cream-muted)' }}>
                        Your personal telecalling workstation. All cadence rules, 4-hour cooldowns, and pipeline automation are active.
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: 'rgba(74,222,128,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', animation: 'pulse 1.5s infinite' }} />
                        Auto-Cadence Active
                      </span>
                      <button
                        type="button"
                        className="btn-outline"
                        onClick={refreshFromMongoDB}
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.76rem', display: 'inline-flex', alignItems: 'center', gap: 6, borderColor: 'var(--green-border)', color: 'var(--cream)' }}
                      >
                        <RefreshCw size={13} /> Refresh Leads
                      </button>
                    </div>
                  </div>

                  {/* Caller Performance Metrics */}
                  <div className="admin__metrics-grid" style={{ marginBottom: '1.5rem' }}>
                    <div className="admin__metric-card">
                      <span className="admin__metric-label">My Assigned Leads</span>
                      <span className="admin__metric-value" style={{ color: '#4ade80' }}>{totalLeads}</span>
                    </div>
                    <div className="admin__metric-card">
                      <span className="admin__metric-label">Called / Contacted</span>
                      <span className="admin__metric-value" style={{ color: '#38bdf8' }}>{calledLeads}</span>
                    </div>
                    <div className="admin__metric-card">
                      <span className="admin__metric-label">Pending (Uncalled)</span>
                      <span className="admin__metric-value" style={{ color: '#fbbf24' }}>{uncalledLeads}</span>
                    </div>
                    <div className="admin__metric-card">
                      <span className="admin__metric-label">Site Visits Booked</span>
                      <span className="admin__metric-value" style={{ color: '#c084fc' }}>{siteVisitBooked}</span>
                    </div>
                    <div className="admin__metric-card">
                      <span className="admin__metric-label">Deals Won</span>
                      <span className="admin__metric-value" style={{ color: '#10b981' }}>{wonLeads}</span>
                    </div>
                    <div className="admin__metric-card">
                      <span className="admin__metric-label">Conversion Rate</span>
                      <span className="admin__metric-value" style={{ color: '#f43f5e' }}>{conversionRate}%</span>
                    </div>
                  </div>

                  {/* Full NeoDove Auto-Dialer Workstation */}
                  {totalLeads === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '4rem 2rem',
                      background: 'rgba(11, 61, 46, 0.25)',
                      borderRadius: 18,
                      border: '1px dashed rgba(74, 222, 128, 0.25)',
                    }}>
                      <Phone size={48} color="#4ade80" style={{ opacity: 0.5, marginBottom: '1rem' }} />
                      <h3 style={{ color: 'var(--cream)', marginBottom: '0.5rem' }}>No Leads Assigned Yet</h3>
                      <p style={{ color: 'var(--cream-muted)', fontSize: '0.9rem', maxWidth: 400, margin: '0 auto' }}>
                        Your admin will assign leads to you from the CRM. Once assigned, they will appear here with the auto-dialer ready to use.
                      </p>
                    </div>
                  ) : (
                    <NeoDoveCRMView
                      contacts={myLeads}
                      properties={properties}
                      callers={callers}
                      onOpenLeadModal={callerHandleOpenTwin}
                      onUpdateStatus={callerHandleStatusChange}
                      onSaveNote={callerHandleSaveNote}
                    />
                  )}

                  {/* Caller Digital Twin Modal */}
                  {selectedTwinLead && (
                    <CustomerDigitalTwinModal
                      lead={selectedTwinLead}
                      properties={properties}
                      digitalTwin={leadTwinData}
                      matchedProperties={leadMatchedProps}
                      onClose={() => setSelectedTwinLead(null)}
                      onUpdateLead={(leadId, updates) => {
                        callerHandleStatusChange(leadId, updates.status || selectedTwinLead.status, updates)
                      }}
                      onRunAgent={runAutonomousAgent}
                      onAddTimelineEvent={addLeadTimelineEvent}
                    />
                  )}
                </div>
              )
            })()}

            {activeTab === 'carts' && (() => {
              const totalCarts = clientCarts.length
              const totalItemsInCarts = clientCarts.reduce((acc, c) => acc + (c.cart?.length || c.cartCount || 0), 0)

              const filteredCarts = clientCarts.filter((c) => {
                if (!cartSearch.trim()) return true
                const q = cartSearch.toLowerCase()
                const matchName = (c.name || '').toLowerCase().includes(q)
                const matchPhone = (c.phone || '').toLowerCase().includes(q)
                const matchEmail = (c.email || '').toLowerCase().includes(q)
                const matchProp = (c.cart || []).some(item => (item.title || item.name || '').toLowerCase().includes(q) || (item.location || '').toLowerCase().includes(q))
                return matchName || matchPhone || matchEmail || matchProp
              })

              const exportCartsToCSV = () => {
                if (filteredCarts.length === 0) {
                  alert('No cart data to export')
                  return
                }
                const headers = ['User Name', 'Phone Number', 'Email', 'Items Count', 'Shortlisted Properties', 'Last Active']
                const rows = filteredCarts.map((c) => [
                  c.name || 'Registered Client',
                  c.phone || '',
                  c.email || '',
                  c.cart?.length || c.cartCount || 0,
                  (c.cart || []).map(item => `${item.title || item.name || 'Property'} (${item.price || 'Price N/A'})`).join('; '),
                  c.cartUpdatedAt || c.lastLoginAt ? new Date(c.cartUpdatedAt || c.lastLoginAt).toLocaleString() : '',
                ])
                const csvContent = [
                  headers.join(','),
                  ...rows.map((row) => row.map((field) => `"${String(field || '').replace(/"/g, '""')}"`).join(',')),
                ].join('\n')
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.setAttribute('href', url)
                link.setAttribute('download', `reon_user_carts_${new Date().toISOString().split('T')[0]}.csv`)
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              }

              return (
                <div className="admin__section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <ShoppingBag size={24} color="#86efac" /> Client Shortlists &amp; Carts ({totalCarts})
                      </h2>
                      <p style={{ color: 'var(--gray)', margin: '0.35rem 0 0 0', fontSize: '0.9rem' }}>
                        Real-time visibility into what logged-in users have added to their shortlist/cart, including customer name, phone number, and property details.
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button type="button" className="btn-outline" onClick={exportCartsToCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileSpreadsheet size={15} color="#86efac" /> Export Carts CSV
                      </button>
                      <button type="button" className="btn-outline" onClick={refreshFromMongoDB} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <RefreshCw size={15} /> Refresh Carts
                      </button>
                    </div>
                  </div>

                  {/* Metrics Bar */}
                  <div className="admin__metrics-grid" style={{ marginBottom: '1.5rem' }}>
                    <div className="admin__metric-card">
                      <span className="admin__metric-label">Users With Active Carts</span>
                      <span className="admin__metric-value" style={{ color: '#86efac' }}>{totalCarts}</span>
                    </div>
                    <div className="admin__metric-card">
                      <span className="admin__metric-label">Total Shortlisted Items</span>
                      <span className="admin__metric-value" style={{ color: '#fca5a5' }}>{totalItemsInCarts}</span>
                    </div>
                    <div className="admin__metric-card">
                      <span className="admin__metric-label">Avg Properties Per User</span>
                      <span className="admin__metric-value">{totalCarts > 0 ? (totalItemsInCarts / totalCarts).toFixed(1) : '0'}</span>
                    </div>
                  </div>

                  {/* Search Bar */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <input
                      type="text"
                      placeholder="🔍 Search user name, phone number, email, or property in cart..."
                      value={cartSearch}
                      onChange={(e) => setCartSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(245,245,220,0.15)',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '0.92rem',
                      }}
                    />
                  </div>

                  {/* Carts List */}
                  {filteredCarts.length === 0 ? (
                    <div className="admin__empty-state" style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'rgba(11,61,46,0.25)', borderRadius: '16px', border: '1px dashed rgba(245,245,220,0.15)' }}>
                      <ShoppingBag size={48} color="#86efac" style={{ opacity: 0.5, marginBottom: '0.75rem' }} />
                      <h4 style={{ color: 'var(--cream)', marginBottom: '0.35rem' }}>No User Carts Found</h4>
                      <p style={{ color: 'var(--gray)', fontSize: '0.88rem', margin: 0 }}>
                        {clientCarts.length === 0
                          ? 'No users have added properties to their shortlist/cart yet. Once a logged-in user clicks "Add to Shortlist", their cart will appear here automatically.'
                          : 'No user carts match your current search query.'}
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                      {filteredCarts.map((client, idx) => {
                        const cartItems = client.cart || []
                        const cleanPhone = (client.phone || '').replace(/[^\d+]/g, '')
                        const waPhone = cleanPhone.startsWith('+') ? cleanPhone.replace('+', '') : `91${cleanPhone.replace(/^0+/, '')}`
                        const propNames = cartItems.map(item => item.title || item.name || 'Property').join(', ')
                        const waText = encodeURIComponent(
                          `Hi ${client.name || 'there'}, thank you for exploring RE-ON Real Estate! We noticed you saved ${propNames || 'properties'} in your shortlist. Would you like us to arrange a private site visit or provide pricing breakdowns?`
                        )

                        return (
                          <div
                            key={client._id || client.clientId || idx}
                            className="admin__cart-card"
                            style={{
                              background: 'linear-gradient(145deg, rgba(13, 31, 22, 0.95) 0%, rgba(8, 24, 17, 0.98) 100%)',
                              border: '1px solid rgba(134, 239, 172, 0.2)',
                              borderRadius: '20px',
                              padding: '1.5rem',
                              boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                            }}
                          >
                            {/* Card Header: User details & actions */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(245,245,220,0.08)' }}>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                  <User size={18} color="#86efac" />
                                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#fff', fontWeight: 700 }}>
                                    {client.name || (client.phone ? `Client (${client.phone})` : 'Registered Client')}
                                  </h3>
                                  <span style={{ fontSize: '0.72rem', padding: '3px 10px', background: 'rgba(20,90,66,0.8)', border: '1px solid rgba(134,239,172,0.3)', borderRadius: '100px', color: '#86efac', fontWeight: 600 }}>
                                    🛒 {cartItems.length} {cartItems.length === 1 ? 'Item' : 'Items'} in Cart
                                  </span>
                                </div>

                                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginTop: '6px', fontSize: '0.85rem' }}>
                                  {client.phone && (
                                    <a href={`tel:${client.phone}`} style={{ color: '#86efac', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                      <Phone size={14} /> {client.phone}
                                    </a>
                                  )}
                                  {client.email && (
                                    <a href={`mailto:${client.email}`} style={{ color: 'var(--cream-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                      <Mail size={14} /> {client.email}
                                    </a>
                                  )}
                                  <span style={{ color: 'var(--gray)', display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem' }}>
                                    <Clock size={13} /> Updated: {client.cartUpdatedAt ? new Date(client.cartUpdatedAt).toLocaleString() : client.lastLoginAt ? new Date(client.lastLoginAt).toLocaleString() : 'Recently'}
                                  </span>
                                </div>
                              </div>

                              {/* Lead Follow-Up Actions */}
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {client.phone && (
                                  <a
                                    href={`https://wa.me/${waPhone}?text=${waText}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-accent"
                                    style={{
                                      background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)',
                                      borderColor: '#22c55e',
                                      padding: '7px 14px',
                                      fontSize: '0.8rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      textDecoration: 'none',
                                      borderRadius: '100px',
                                    }}
                                  >
                                    <MessageCircle size={14} /> WhatsApp User
                                  </a>
                                )}
                                {client.phone && (
                                  <a
                                    href={`tel:${client.phone}`}
                                    className="btn-outline"
                                    style={{
                                      padding: '7px 14px',
                                      fontSize: '0.8rem',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      textDecoration: 'none',
                                      borderRadius: '100px',
                                    }}
                                  >
                                    <Phone size={14} /> Call
                                  </a>
                                )}
                              </div>
                            </div>

                            {/* Shortlisted Properties Grid */}
                            <div style={{ marginTop: '1rem' }}>
                              <h4 style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray)', marginBottom: '0.75rem' }}>
                                Shortlisted Properties in User's Cart:
                              </h4>

                              {cartItems.length === 0 ? (
                                <p style={{ color: 'var(--gray)', fontSize: '0.85rem', margin: 0 }}>Cart is currently empty.</p>
                              ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                                  {cartItems.map((item, itemIdx) => (
                                    <div
                                      key={item.id || itemIdx}
                                      style={{
                                        display: 'flex',
                                        gap: '12px',
                                        background: 'rgba(0,0,0,0.3)',
                                        border: '1px solid rgba(245,245,220,0.08)',
                                        borderRadius: '12px',
                                        padding: '10px',
                                        alignItems: 'center',
                                      }}
                                    >
                                      <img
                                        src={item.image || item.images?.[0] || item.img || '/images/placeholder.jpg'}
                                        alt={item.title || item.name}
                                        style={{
                                          width: '64px',
                                          height: '64px',
                                          borderRadius: '8px',
                                          objectFit: 'cover',
                                          flexShrink: 0,
                                          background: '#081812',
                                        }}
                                        onError={(e) => {
                                          e.currentTarget.onerror = null
                                          e.currentTarget.src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=300&q=80'
                                        }}
                                      />
                                      <div style={{ minWidth: 0, flex: 1 }}>
                                        <h5 style={{ margin: '0 0 3px 0', fontSize: '0.92rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          <Link to={`/properties/${item.id || item._id}`} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', textDecoration: 'none' }}>
                                            {item.title || item.name} <ExternalLink size={11} style={{ display: 'inline', verticalAlign: 'middle', color: '#86efac' }} />
                                          </Link>
                                        </h5>
                                        <p style={{ margin: '0 0 3px 0', fontSize: '0.78rem', color: 'var(--cream-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                          <MapPin size={11} style={{ display: 'inline' }} /> {item.location || 'Navi Mumbai'}
                                        </p>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                                          <strong style={{ color: '#86efac' }}>{item.price || 'Price on Request'}</strong>
                                          {item.type && <span style={{ color: 'var(--gray)', fontSize: '0.72rem' }}>{item.type}</span>}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })()}

            {activeTab === 'subadmins' && isSuperadmin && (
              <div>
                <div className="admin__section">
                  <h2>Manage Subadmins</h2>
                  <p style={{ color: 'var(--gray)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
                    Add or remove subadmin Google / Gmail accounts. Subadmins have restricted access exclusively to create property listings on RE-ON.
                  </p>
                  <form className="admin__form" onSubmit={handleAddSubadmin}>
                    <div className="admin__form-grid" style={{ gridTemplateColumns: '1fr auto', alignItems: 'end' }}>
                      <label>
                        Subadmin Gmail Address *
                        <input
                          type="email"
                          required
                          value={subadminEmailInput}
                          onChange={(e) => setSubadminEmailInput(e.target.value)}
                          placeholder="e.g. agent.reon@gmail.com"
                        />
                      </label>
                      <button
                        type="submit"
                        className="btn-accent"
                        disabled={isAddingSubadmin}
                        style={{ height: '48px', minWidth: '160px' }}
                      >
                        {isAddingSubadmin ? 'Adding...' : '+ Add Subadmin'}
                      </button>
                    </div>
                    {subadminMsg && (
                      <div className={`admin__status-message admin__status-message--${subadminMsgType}`} style={{ marginTop: '1rem' }}>
                        {subadminMsg}
                      </div>
                    )}
                  </form>
                </div>

                <div className="admin__section" style={{ marginTop: '2rem' }}>
                  <h2>Authorized Administrative Accounts ({1 + subadminsList.length})</h2>
                  <div className="admin__list">
                    {/* Superadmin Card */}
                    <div className="admin__list-item" style={{ borderLeft: '4px solid #eab308' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <strong>{ALLOWED_ADMIN_EMAIL}</strong>
                          <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(234,179,8,0.2)', color: '#fde047', fontWeight: 600 }}>
                            Superadmin (Owner)
                          </span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--gray)', margin: '0.25rem 0 0 0' }}>
                          Full System Access: Properties, Blogs, News, Inquiries, Subadmins &amp; Security Logs
                        </p>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Protected</span>
                    </div>

                    {/* Subadmins List */}
                    {subadminsList.map((sub) => {
                      const email = sub.email || sub.username
                      return (
                        <div key={sub._id || email} className="admin__list-item">
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                              <strong>{email}</strong>
                              <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(56,189,248,0.15)', color: '#38bdf8', fontWeight: 600 }}>
                                Subadmin (Add Properties Only)
                              </span>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--gray)', margin: '0.25rem 0 0 0' }}>
                              Added: {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : 'Active'} {sub.createdBy ? `• By: ${sub.createdBy}` : ''}
                            </p>
                          </div>
                          <div className="admin__item-actions">
                            <button
                              className="btn-outline"
                              type="button"
                              onClick={() => handleRemoveSubadmin(sub)}
                              style={{ color: '#f87171', borderColor: 'rgba(248,113,113,0.3)' }}
                            >
                              Remove Access
                            </button>
                          </div>
                        </div>
                      )
                    })}

                    {subadminsList.length === 0 && (
                      <p style={{ color: 'var(--gray)', fontSize: '0.9rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                        No subadmins added yet. Add a Gmail address above to grant team members property listing access.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'audit' && isSuperadmin && (
              <div className="admin__section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h2>Security Audit Logs</h2>
                    <p style={{ color: 'var(--gray)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                      Real-time records of all logins, logouts, unauthorized attempts, and administrative actions.
                    </p>
                  </div>
                  <button type="button" className="btn-outline" onClick={loadAuditLogs} disabled={loadingAudit}>
                    {loadingAudit ? 'Refreshing...' : '🔄 Refresh Logs'}
                  </button>
                </div>
                {auditLogs.length === 0 ? (
                  <p style={{ color: 'var(--gray)' }}>No audit events logged yet.</p>
                ) : (
                  <div className="admin__list">
                    {auditLogs.map((log) => {
                      const isLogin = log.eventType?.includes('LOGIN') && !log.eventType?.includes('FAILED') && !log.eventType?.includes('BLOCKED') && !log.eventType?.includes('UNAUTHORIZED')
                      const isLogout = log.eventType?.includes('LOGOUT')
                      const isFail = log.eventType?.includes('FAILED') || log.eventType?.includes('BLOCKED') || log.eventType?.includes('UNAUTHORIZED') || log.eventType?.includes('REMOVED') || log.eventType?.includes('DELETED')
                      const isCreate = log.eventType?.includes('CREATED') || log.eventType?.includes('ADDED')

                      let bg = 'rgba(255,255,255,0.08)'
                      let color = '#e2e8f0'
                      if (isLogin || isCreate) {
                        bg = 'rgba(34,197,94,0.15)'
                        color = '#4ade80'
                      } else if (isLogout) {
                        bg = 'rgba(56,189,248,0.15)'
                        color = '#38bdf8'
                      } else if (isFail) {
                        bg = 'rgba(239,68,68,0.15)'
                        color = '#f87171'
                      }

                      return (
                        <div key={log._id} className="admin__list-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.35rem' }}>
                          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <span style={{
                              padding: '0.25rem 0.6rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              letterSpacing: '0.04em',
                              background: bg,
                              color: color,
                            }}>
                              {log.eventType}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: 'var(--cream)' }}>
                            <strong>Account:</strong> <code style={{ color: '#fde047' }}>{log.username}</code> &nbsp;|&nbsp; <strong>Details:</strong> {log.details}
                          </p>
                          <span style={{ fontSize: '0.72rem', color: 'var(--gray)' }}>
                            IP Address: {log.ip}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────
          QUICK CALL & OUTCOME LOGGER MODAL
          ────────────────────────────────────────────── */}
      {callModalLead && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setCallModalLead(null)
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 520,
              background: 'linear-gradient(145deg, #0b1f17 0%, #0f172a 100%)',
              border: '1px solid rgba(74, 222, 128, 0.4)',
              borderRadius: '20px',
              padding: '1.75rem',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
              color: '#fff',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(74, 222, 128, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80', fontSize: '1.3rem' }}>
                  📞
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>Call Telemetry &amp; Outcome Log</h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                    Calling <strong>{callModalLead.name || 'Lead'}</strong> • <a href={`tel:${callModalLead.phone || ''}`} style={{ color: '#4ade80', textDecoration: 'underline' }}>{callModalLead.phone || 'No phone'}</a>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCallModalLead(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1 }}
              >
                ✕
              </button>
            </div>

            {/* Inquired Property & Assigned Telecaller Info */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem 1rem', borderRadius: 12, marginBottom: '1.25rem', fontSize: '0.82rem', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <div>
                <span style={{ color: '#94a3b8' }}>Property: </span>
                <strong style={{ color: '#86efac' }}>{callModalLead.propertyName || 'General Inquiry'}</strong>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Caller: </span>
                <strong style={{ color: '#38bdf8' }}>{callModalLead.assignedCallerName || callModalLead.assignedTo?.name || 'Unassigned'}</strong>
              </div>
            </div>

            {/* Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 600 }}>
                  Call Outcome / Result
                </label>
                <select
                  value={callOutcome}
                  onChange={(e) => {
                    setCallOutcome(e.target.value)
                    if (e.target.value.includes('Site Visit')) setCallStatusChoice('Site Visit Scheduled')
                    else if (e.target.value.includes('Interested') || e.target.value.includes('Connected')) setCallStatusChoice('Contacted')
                    else if (e.target.value.includes('Closed') || e.target.value.includes('Wrong')) setCallStatusChoice('Closed')
                  }}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(74, 222, 128, 0.4)',
                    borderRadius: 10,
                    padding: '0.65rem 0.85rem',
                    color: '#fff',
                    fontSize: '0.88rem',
                  }}
                >
                  <option value="Connected - Interested">🟢 Connected - Highly Interested</option>
                  <option value="Scheduled Site Visit">🟣 Scheduled Site Visit</option>
                  <option value="Callback Requested">🟡 Callback Requested (Follow-up)</option>
                  <option value="Not Reachable / Busy">🔴 Not Reachable / Busy / Switched Off</option>
                  <option value="Not Interested / Closed">⚪ Not Interested / Budget Mismatch</option>
                  <option value="Wrong Number">⚠️ Wrong Number</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 600 }}>
                  Update Lead CRM Status
                </label>
                <select
                  value={callStatusChoice}
                  onChange={(e) => setCallStatusChoice(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 10,
                    padding: '0.65rem 0.85rem',
                    color: '#cbd5e1',
                    fontSize: '0.88rem',
                  }}
                >
                  <option value="Contacted">🔵 Contacted</option>
                  <option value="Site Visit Scheduled">🟣 Site Visit Scheduled</option>
                  <option value="Converted">🟡 Converted / Deal Closing</option>
                  <option value="New">🟢 Keep as New</option>
                  <option value="Closed">⚪ Closed</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: '#cbd5e1', marginBottom: 6, fontWeight: 600 }}>
                  Call Notes / Conversation Summary
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Spoke with client regarding 2 BHK in Kharghar. Budget ₹95L. Scheduled site visit for Saturday 11am with family."
                  value={callNote}
                  onChange={(e) => setCallNote(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0,0,0,0.5)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 10,
                    padding: '0.65rem 0.85rem',
                    color: '#fff',
                    fontSize: '0.88rem',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <a
                  href={`tel:${(callModalLead.phone || '').replace(/[^\d+]/g, '')}`}
                  className="btn-outline"
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: '0.7rem',
                    borderColor: 'rgba(74, 222, 128, 0.4)',
                    color: '#86efac',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    textDecoration: 'none',
                    borderRadius: 10,
                  }}
                >
                  <Phone size={14} /> Redial
                </a>

                <button
                  type="button"
                  className="btn-accent"
                  onClick={handleSaveCallLog}
                  disabled={isLoggingCall}
                  style={{
                    flex: 2,
                    padding: '0.7rem 1.25rem',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    borderRadius: 10,
                    fontWeight: 700,
                  }}
                >
                  {isLoggingCall ? 'Saving...' : '💾 Save & Log Call Outcome'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
