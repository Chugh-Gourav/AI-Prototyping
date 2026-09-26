/**
 * ==============================================================================
 * PM-AI-AGENT: Frontend Web Application (App.jsx)
 * ==============================================================================
 * PRODUCT ROLE:
 *   The primary user interface for Senior/Staff PMs and Product Leaders.
 *   Provides:
 *   - Hero Billboard: Top-ranked must-read article with one-click bookmarking.
 *   - 2x2 Reading Feeds: Segmented across 5 core PM learning pillars.
 *   - Interactive Starter PRD Modals: In-app preview & 1-click Markdown copy for Pillar 5.
 *   - Feedback Loop: Instant card micro-swaps and thumbs up/down rating controls.
 *   - User Profile Dropdown: Multi-persona switcher (e.g., Growth PM, Platform PM).
 *   - Reading List Drawer: Saved bookmarks persisted in browser localStorage.
 * ==============================================================================
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Compass,
  BrainCircuit,
  Network,
  Sparkles,
  Flame,
  Cpu,
  Layers,
  Briefcase,
  Bookmark,
  BookmarkCheck,
  BookmarkPlus,
  ExternalLink,
  Clock,
  User,
  Users,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  AlertTriangle,
  Plus,
  Check,
  Share2,
  Download,
  Trash2,
  Pin,
  RefreshCw,
  X,
  Lock,
  Unlock,
  MessageSquarePlus,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  SlidersHorizontal,
  FileText,
  Copy,
  Layers3,
  ChevronLeft,
  ChevronRight,
  Send,
  MessageSquare
} from 'lucide-react'
import './index.css'

const API_BASE = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && (window.location.hostname.includes('github.io') || window.location.hostname.includes('chugh-gourav'))
    ? 'https://pm-learning-hub-595396735241.us-central1.run.app'
    : (import.meta.env.DEV ? 'http://localhost:8000' : '')
)

const DEFAULT_PROFILES = [
  { id: 'gourav', name: 'Gourav', avatar: 'G' },
  { id: 'alex', name: 'Alex M.', avatar: 'A' },
  { id: 'sarah', name: 'Sarah T.', avatar: 'S' },
  { id: 'guest', name: 'Guest PM', avatar: 'C' }
]

function App() {
  // Profiles state
  const [profiles, setProfiles] = useState(() => {
    try {
      const saved = localStorage.getItem('pm_hub_profiles')
      return saved ? JSON.parse(saved) : DEFAULT_PROFILES
    } catch {
      return DEFAULT_PROFILES
    }
  })
  
  // Active Profile state
  const [activeProfile, setActiveProfile] = useState(() => {
    try {
      const savedId = localStorage.getItem('pm_hub_active_profile_id') || 'gourav'
      const saved = localStorage.getItem('pm_hub_profiles')
      const currentList = saved ? JSON.parse(saved) : DEFAULT_PROFILES
      return currentList.find(p => p.id === savedId) || currentList[0]
    } catch {
      return DEFAULT_PROFILES[0]
    }
  })

  // Bookmarks state (LAZY INITIALIZER — Prevents race condition wiping bookmarks on refresh)
  const [bookmarks, setBookmarks] = useState(() => {
    try {
      const profileId = localStorage.getItem('pm_hub_active_profile_id') || 'gourav'
      const key = `pm_hub_bookmarks_${profileId}`
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed
      }
      if (profileId === 'gourav') {
        const legacy = localStorage.getItem('gouravs-bookmarks')
        if (legacy) {
          const parsed = JSON.parse(legacy)
          if (Array.isArray(parsed)) {
            localStorage.setItem(key, JSON.stringify(parsed))
            return parsed
          }
        }
      }
    } catch (e) {
      console.error("Failed to load initial bookmarks:", e)
    }
    return []
  })

  const [recommendations, setRecommendations] = useState([])
  const [activePillar, setActivePillar] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [feedbackSignals, setFeedbackSignals] = useState(null)

  // Side Drawer for My Saved Reading List
  const [showSavedDrawer, setShowSavedDrawer] = useState(false)

  // HITL feedback map: { [articleId]: { type, reported, user_prompt } }
  const [feedbackMap, setFeedbackMap] = useState(() => {
    try {
      const saved = localStorage.getItem('pm_hub_feedback')
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  // Prompt note dialog for feedback
  const [activePromptRecId, setActivePromptRecId] = useState(null)
  const [promptInput, setPromptInput] = useState('')


  // HITL Curator Mode State
  const [showCuratorDrawer, setShowCuratorDrawer] = useState(false)
  const [stagedArticles, setStagedArticles] = useState([])
  const [curatorPillarFilter, setCuratorPillarFilter] = useState('all')
  const [curatorActiveIndex, setCuratorActiveIndex] = useState(0)
  const [isFetchingCandidates, setIsFetchingCandidates] = useState(false)
  const [curatorRubric, setCuratorRubric] = useState({
    link_status: 'pass',
    pm_relevance: 5,
    meta_thinking: 4,
    actionability: 4,
    reject_reason: 'generic_url',
    curator_notes: ''
  })
  const [candidateEdits, setCandidateEdits] = useState({
    title: '',
    summary_problem: '',
    summary_insight: '',
    outcome_learning: '',
    summary_why_read: ''
  })
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false)

  // Curator Auth detection (enabled by default; set ?curator=false or ?view=public to hide)
  const isCurator = useMemo(() => {
    if (typeof window === 'undefined') return true
    const params = new URLSearchParams(window.location.search)
    if (params.get('curator') === 'false' || params.get('view') === 'public') {
      localStorage.removeItem('pm_hub_curator_auth')
      return false
    }
    return true
  }, [])

  // Load staged candidates from SQLite backend
  const loadStagedArticles = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/curator/staged`)
      if (!res.ok) return
      const data = await res.json()
      if (data && Array.isArray(data.staged_articles)) {
        setStagedArticles(data.staged_articles)
      }
    } catch (e) {
      console.warn("Could not load staged articles from backend:", e)
    }
  }

  useEffect(() => {
    if (isCurator) {
      loadStagedArticles()
    }
  }, [isCurator])

  // Filter staged articles by selected pillar
  const filteredStaged = useMemo(() => {
    if (curatorPillarFilter === 'all') return stagedArticles
    return stagedArticles.filter(a => a.pillar === curatorPillarFilter)
  }, [stagedArticles, curatorPillarFilter])

  const currentCandidate = filteredStaged[curatorActiveIndex] || null

  // Sync edits when candidate changes
  useEffect(() => {
    if (currentCandidate) {
      setCandidateEdits({
        title: currentCandidate.title || '',
        summary_problem: currentCandidate.summary_problem || '',
        summary_insight: currentCandidate.summary_insight || '',
        outcome_learning: currentCandidate.outcome_learning || '',
        summary_why_read: currentCandidate.summary_why_read || ''
      })
      setCuratorRubric(prev => ({
        ...prev,
        link_status: 'pass',
        curator_notes: ''
      }))
    }
  }, [currentCandidate])

  // Curator actions
  const handleApproveCandidate = async () => {
    if (!currentCandidate) return
    try {
      const res = await fetch(`${API_BASE}/api/curator/${currentCandidate.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: 'approved',
          rubric: curatorRubric,
          notes: curatorRubric.curator_notes
        })
      })
      if (res.ok) {
        showToast(`✅ Approved & Published: "${currentCandidate.title.slice(0, 35)}..."`)
        await loadStagedArticles()
        await loadRecommendations(activePillar, false)
        if (curatorActiveIndex >= filteredStaged.length - 1) {
          setCuratorActiveIndex(Math.max(0, filteredStaged.length - 2))
        }
      }
    } catch (e) {
      showToast("Error approving candidate: " + e.message)
    }
  }

  const handleEditAndApproveCandidate = async () => {
    if (!currentCandidate) return
    try {
      const res = await fetch(`${API_BASE}/api/curator/${currentCandidate.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: 'edited',
          rubric: curatorRubric,
          notes: curatorRubric.curator_notes,
          edited_fields: candidateEdits
        })
      })
      if (res.ok) {
        showToast(`✏️ Refined & Published! Positive exemplar logged.`)
        await loadStagedArticles()
        await loadRecommendations(activePillar, false)
        if (curatorActiveIndex >= filteredStaged.length - 1) {
          setCuratorActiveIndex(Math.max(0, filteredStaged.length - 2))
        }
      }
    } catch (e) {
      showToast("Error saving edit: " + e.message)
    }
  }

  const handleRejectCandidate = async () => {
    if (!currentCandidate) return
    try {
      const res = await fetch(`${API_BASE}/api/curator/${currentCandidate.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: 'rejected',
          rubric: curatorRubric,
          notes: curatorRubric.curator_notes || `Rejected: ${curatorRubric.reject_reason}`
        })
      })
      if (res.ok) {
        showToast(`❌ Rejected with Critique: Logged to critique memory.`)
        await loadStagedArticles()
        if (curatorActiveIndex >= filteredStaged.length - 1) {
          setCuratorActiveIndex(Math.max(0, filteredStaged.length - 2))
        }
      }
    } catch (e) {
      showToast("Error rejecting candidate: " + e.message)
    }
  }

  const handleCheckGrammar = async () => {
    if (!candidateEdits) return
    setIsCheckingGrammar(true)
    showToast("✍️ Analyzing grammar, acronym casing & executive flow...")
    try {
      const res = await fetch(`${API_BASE}/api/curator/check-grammar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: candidateEdits.title || '',
          summary_problem: candidateEdits.summary_problem || '',
          summary_insight: candidateEdits.summary_insight || '',
          outcome_learning: candidateEdits.outcome_learning || '',
          summary_why_read: candidateEdits.summary_why_read || ''
        })
      })
      const data = await res.json()
      if (data && data.status === 'success') {
        setCandidateEdits(prev => ({
          ...prev,
          title: data.title || prev.title,
          summary_problem: data.summary_problem || prev.summary_problem,
          summary_insight: data.summary_insight || prev.summary_insight,
          outcome_learning: data.outcome_learning || prev.outcome_learning,
          summary_why_read: data.summary_why_read || prev.summary_why_read
        }))
        showToast("✨ Grammar, acronyms, and executive tone polished!")
      } else {
        showToast("Could not polish summary grammar.")
      }
    } catch (e) {
      showToast("Grammar check error: " + e.message)
    } finally {
      setIsCheckingGrammar(false)
    }
  }

  const handleTriggerAgentCuration = async () => {
    setIsFetchingCandidates(true)
    showToast("⚡ Agent discovering 2026 practitioner engineering sources...")
    try {
      const res = await fetch(`${API_BASE}/api/agent/fetch-candidates`, {
        method: 'POST'
      })
      const data = await res.json()
      if (data && data.staged_count !== undefined) {
        showToast(`🎯 Evaluation complete: ${data.staged_count} candidate(s) staged!`)
        await loadStagedArticles()
        setCuratorPillarFilter('all')
        setCuratorActiveIndex(0)
        setShowCuratorDrawer(true)
      } else {
        showToast(data.message || "Discovery completed.")
      }
    } catch (e) {
      showToast("Error triggering agent: " + e.message)
    } finally {
      setIsFetchingCandidates(false)
    }
  }

  // Profile Dropdown and Modals
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const profileDropdownRef = useRef(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setShowProfileDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Custom bookmark form
  const [customUrl, setCustomUrl] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [customPillar, setCustomPillar] = useState('AI Deep Dive & Application')
  const [customProblem, setCustomProblem] = useState('')

  // Toast Helper
  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  // Load recommendations catalog from FastAPI SQLite backend with fallback
  const loadRecommendations = async (pillar = 'all', isRefresh = false) => {
    setIsLoading(true)
    try {
      const url = `${API_BASE}/api/recommendations?pillar=${encodeURIComponent(pillar)}&refresh=${isRefresh}`
      const response = await fetch(url)
      if (!response.ok) throw new Error('API request failed')
      const data = await response.json()
      if (data && Array.isArray(data.articles) && data.articles.length > 0) {
        setRecommendations(data.articles)
        if (data.signals) setFeedbackSignals(data.signals)
        if (isRefresh) {
          showToast("✨ Fresh 2026 PM recommendations re-ranked with your feedback!")
        }
      } else {
        throw new Error('Empty response from API')
      }
    } catch (err) {
      console.warn("Backend API unavailable, using local catalog:", err)
      fetch('./recommendations.json')
        .then(res => res.json())
        .then(data => {
          if (pillar === 'all') {
            setRecommendations(data)
          } else {
            setRecommendations(data.filter(r => r.pillar === pillar))
          }
          if (isRefresh) showToast("Curated PM recommendations catalog refreshed.")
        })
        .catch(() => {
          showToast("Using current catalog.")
        })
    } finally {
      setIsLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    loadRecommendations('all', false)
  }, [])

  // When active pillar changes, reload recommendations
  const handlePillarChange = (pillar) => {
    setActivePillar(pillar)
    loadRecommendations(pillar, false)
  }

  // Save profiles
  useEffect(() => {
    localStorage.setItem('pm_hub_profiles', JSON.stringify(profiles))
  }, [profiles])

  // Save HITL feedback map
  useEffect(() => {
    localStorage.setItem('pm_hub_feedback', JSON.stringify(feedbackMap))
  }, [feedbackMap])

  // Safe bookmark updater that immediately syncs to localStorage
  const updateAndPersistBookmarks = (updatedList, profileId = activeProfile.id) => {
    setBookmarks(updatedList)
    try {
      localStorage.setItem(`pm_hub_bookmarks_${profileId}`, JSON.stringify(updatedList))
    } catch (e) {
      console.error("Failed to persist bookmarks:", e)
    }
  }

  // Switch profile cleanly
  const handleSwitchProfile = (newProf) => {
    setActiveProfile(newProf)
    localStorage.setItem('pm_hub_active_profile_id', newProf.id)
    const key = `pm_hub_bookmarks_${newProf.id}`
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        setBookmarks(JSON.parse(saved))
      } catch {
        setBookmarks([])
      }
    } else {
      setBookmarks([])
    }
    setShowProfileModal(false)
    setShowProfileDropdown(false)
    showToast(`Switched account to ${newProf.name}`)
  }

  // Toggle bookmark saved state
  const toggleBookmark = (rec) => {
    const isSaved = bookmarks.some(b => b.url === rec.source_and_url)
    if (isSaved) {
      const updated = bookmarks.filter(b => b.url !== rec.source_and_url)
      updateAndPersistBookmarks(updated)
      showToast(`Removed from ${activeProfile.name}'s list`)
    } else {
      const newBookmark = {
        id: rec.id || Date.now().toString(),
        url: rec.source_and_url,
        title: rec.title,
        author: rec.author,
        pillar: rec.pillar,
        difficulty: rec.difficulty,
        access_type: rec.access_type || 'open',
        problem_solved: rec.problem_solved || rec.summary,
        estimated_read_time: rec.estimated_read_time,
        starter_spec: rec.starter_spec || null,
        createdAt: new Date().toISOString(),
        pinned: false
      }
      const updated = [newBookmark, ...bookmarks]
      updateAndPersistBookmarks(updated)
      showToast(`Saved to ${activeProfile.name}'s reading list!`)
    }
  }

  const deleteBookmark = (id) => {
    const updated = bookmarks.filter(b => b.id !== id)
    updateAndPersistBookmarks(updated)
    showToast("Bookmark removed")
  }

  const togglePin = (id) => {
    const updated = bookmarks.map(b => 
      b.id === id ? { ...b, pinned: !b.pinned } : b
    )
    updateAndPersistBookmarks(updated)
  }

  // Immediate Loop Closure: Micro-swap card on feedback
  const handleCardReplace = async (rec, feedbackType, userPrompt = '') => {
    showToast("⚡ Swapping with higher-depth alternative...")
    try {
      const visibleIds = recommendations.map(r => r.id)
      const res = await fetch(`${API_BASE}/api/cards/${rec.id}/replace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pillar: rec.pillar,
          feedback_type: feedbackType,
          user_prompt: userPrompt || promptInput,
          currently_visible_ids: visibleIds
        })
      })
      if (!res.ok) throw new Error("Replacement API returned non-200")
      const data = await res.json()
      if (data && data.card) {
        setRecommendations(prev => prev.map(item => item.id === rec.id ? { 
          ...data.card, 
          id: `${data.card.id}-swapped-${Date.now()}`,
          justReplaced: true, 
          replacement_reason: data.message || "⚡ Swapped with deeper technical source" 
        } : item))
        showToast("✨ Card swapped with deeper technical source!")
        setActivePromptRecId(null)
        setPromptInput('')
      } else {
        throw new Error("No card in replacement payload")
      }
    } catch (err) {
      console.warn("Card replacement API unreachable or exhausted, using client-side rotation fallback:", err)
      const otherArticles = recommendations.filter(r => r.id !== rec.id)
      const samePillar = otherArticles.filter(r => r.pillar === rec.pillar)
      const pool = samePillar.length > 0 ? samePillar : otherArticles
      if (pool.length > 0) {
        const picked = pool[Math.floor(Math.random() * pool.length)]
        const swappedCard = {
          ...picked,
          id: `${picked.id}-swapped-${Date.now()}`,
          justReplaced: true,
          replacement_reason: "⚡ Swapped: Biased toward deeper technical architecture & verified practitioner source"
        }
        setRecommendations(prev => prev.map(item => item.id === rec.id ? swappedCard : item))
        showToast("✨ Card swapped with alternative source!")
        setActivePromptRecId(null)
        setPromptInput('')
      } else {
        showToast("Recorded feedback for ranking engine.")
      }
    }
  }

  // HITL Feedback Handler (Self-contained signal on card)
  const handleHitlFeedback = async (rec, type) => {
    const current = feedbackMap[rec.id] || {}
    const newType = current.type === type ? null : type
    const updated = {
      ...feedbackMap,
      [rec.id]: {
        ...current,
        type: newType,
        article_title: rec.title,
        article_url: rec.source_and_url,
        user: activeProfile.name
      }
    }
    setFeedbackMap(updated)

    if (newType === 'low_depth') {
      // Trigger instant card replacement on "Surface Level / Fluff"
      handleCardReplace(rec, 'low_depth')
    } else if (newType) {
      const labels = {
        high_signal: "👍 High signal feedback recorded!",
        applied: "💡 Flagged as applied in sprint!"
      }
      showToast(labels[newType] || "Feedback updated")

      try {
        await fetch(`${API_BASE}/api/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            article_id: rec.id,
            article_title: rec.title,
            article_url: rec.source_and_url,
            feedback_type: newType,
            user_name: activeProfile.name
          })
        })
      } catch (e) {}
    }
  }

  // Submit custom user prompt alongside feedback
  const handleSavePromptNote = async (rec) => {
    if (!promptInput.trim()) return

    const note = promptInput.trim()
    const current = feedbackMap[rec.id] || {}
    const updated = {
      ...feedbackMap,
      [rec.id]: {
        ...current,
        user_prompt: note
      }
    }
    setFeedbackMap(updated)
    setPromptInput('')
    setActivePromptRecId(null)
    showToast(`📝 Note saved: "${note.length > 25 ? note.slice(0, 25) + '...' : note}"`)

    try {
      await fetch(`${API_BASE}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_id: rec.id,
          article_title: rec.title,
          article_url: rec.source_and_url,
          feedback_type: current.type || 'high_signal',
          user_name: activeProfile.name,
          user_prompt: note,
          notes: note
        })
      })
    } catch (e) {}
  }

  // Add Custom Bookmark
  const handleAddCustomBookmark = (e) => {
    e.preventDefault()
    if (!customUrl.trim()) return

    const newBookmark = {
      id: 'custom-' + Date.now().toString(),
      url: customUrl.trim(),
      title: customTitle.trim() || customUrl.trim(),
      author: 'Manual Entry',
      pillar: customPillar,
      difficulty: '🟢 Beginner',
      access_type: 'open',
      problem_solved: customProblem.trim() || 'Custom saved article by ' + activeProfile.name,
      estimated_read_time: '10 min',
      createdAt: new Date().toISOString(),
      pinned: false
    }

    updateAndPersistBookmarks([newBookmark, ...bookmarks])
    setCustomUrl('')
    setCustomTitle('')
    setCustomProblem('')
    setShowAddModal(false)
    showToast(`Saved to ${activeProfile.name}'s reading list!`)
  }

  // Create New Profile
  const handleCreateProfile = (e) => {
    e.preventDefault()
    if (!newProfileName.trim()) return

    const id = newProfileName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString().slice(-4)
    const newProf = {
      id,
      name: newProfileName.trim(),
      avatar: newProfileName.trim().charAt(0).toUpperCase()
    }

    const updatedProfiles = [...profiles, newProf]
    setProfiles(updatedProfiles)
    handleSwitchProfile(newProf)
    setNewProfileName('')
  }

  // Share Saved Reading List
  const handleShareSavedReadingList = () => {
    const count = bookmarks.length
    const shareText = `📚 Check out ${activeProfile.name}'s Saved Reading List on PM Learning Hub (${count} curated articles on AI Frontier & Strategy): ${window.location.href}`
    navigator.clipboard.writeText(shareText)
    showToast(`📋 Copied ${activeProfile.name}'s saved reading list to clipboard!`)
  }

  // Native Browser Bookmarking: Export Netscape HTML Bookmark format
  const handleExportNetscapeHTML = () => {
    const dateNow = Math.floor(Date.now() / 1000)
    let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3 ADD_DATE="${dateNow}" LAST_MODIFIED="${dateNow}">PM Learning Hub — Saved Reading (${activeProfile.name})</H3>
    <DL><p>
`
    bookmarks.forEach(b => {
      html += `        <DT><A HREF="${b.url}" ADD_DATE="${dateNow}">${b.title} - ${b.author}</A>\n`
    })
    html += `    </DL><p>
</DL><p>`

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pm_hub_bookmarks_${activeProfile.id}.html`
    a.click()
    URL.revokeObjectURL(url)
    showToast("📥 Exported HTML Bookmarks! Import via Chrome: Bookmarks > Import Bookmarks")
  }

  // Export Notion / Markdown bullets
  const handleExportNotionMarkdown = () => {
    let md = `# PM Learning Hub — Saved Reading List (${activeProfile.name})\n\n`
    bookmarks.forEach(b => {
      md += `### [${b.title}](${b.url})\n- **Author:** ${b.author} | **Pillar:** ${b.pillar} | **Read Time:** ${b.estimated_read_time || '15 min'}\n- **Summary:** ${b.problem_solved || b.summary || ''}\n\n`
    })
    navigator.clipboard.writeText(md)
    showToast("📋 Copied Notion-ready Markdown to clipboard!")
  }

  // Group recommendations by pillar for 2x2 rows
  const topPicks = useMemo(() => {
    return recommendations.slice(0, 4)
  }, [recommendations])

  const aiDeepDivePicks = useMemo(() => {
    return recommendations.filter(r => r.pillar === 'AI Deep Dive & Application').slice(0, 4)
  }, [recommendations])

  const businessPicks = useMemo(() => {
    return recommendations.filter(r => r.pillar === 'Business & Economics').slice(0, 4)
  }, [recommendations])

  const corePmPicks = useMemo(() => {
    return recommendations.filter(r => r.pillar === 'Core Product Management').slice(0, 4)
  }, [recommendations])

  const productIdeasPicks = useMemo(() => {
    return recommendations.filter(r => r.pillar === 'Product Ideas to try').slice(0, 4)
  }, [recommendations])


  const spotlightArticle = recommendations[0] || topPicks[0]

  // Helpers
  const getDomain = (rawUrl) => {
    try {
      const match = rawUrl.match(/https?:\/\/(?:www\.)?([^\/]+)/)
      return match ? match[1] : 'External Source'
    } catch {
      return 'Source'
    }
  }

  const getDifficultyClass = (diff = '') => {
    if (diff.includes('Beginner')) return 'easy'
    if (diff.includes('Intermediate')) return 'med'
    return 'adv'
  }

  const getTierClass = (tier = 'Tier 1') => {
    if (tier === 'Tier 1') return 'tier-1'
    if (tier === 'Tier 2') return 'tier-2'
    if (tier === 'Tier 3') return 'tier-3'
    return 'tier-4'
  }

  // Render a Single 2x2 Card with PAIR principles
  const renderCard = (rec, index) => {
    const isSaved = bookmarks.some(b => b.url === rec.source_and_url)
    const feedback = feedbackMap[rec.id] || {}
    const diffClass = getDifficultyClass(rec.difficulty)
    const tierClass = getTierClass(rec.tier)
    const domain = getDomain(rec.source_and_url)
    const isPromptOpen = activePromptRecId === rec.id

    return (
      <div 
        key={rec.id || index} 
        className={`pm-card ${rec.justReplaced ? 'card-just-replaced' : ''}`}
      >
        <div>
          {/* Replacement Notice if just swapped */}
          {rec.justReplaced && (
            <div className="replacement-badge">
              <Sparkles size={12} />
              <span>{rec.replacement_reason || "Replaced with higher-depth source"}</span>
            </div>
          )}

          {/* Card Top Bar */}
          <div className="card-top-bar">
            <div className="card-badges">
              <span className="badge-pillar">{rec.pillar}</span>
              {rec.access_type === 'subscription' && (
                <span className="badge-access subscription">
                  <Lock size={10} />
                  <span>Sub</span>
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {/* Quick URL Copy Helper */}
              <button
                className="btn-quick-url"
                onClick={() => {
                  navigator.clipboard.writeText(rec.source_and_url)
                  showToast("📋 Link copied! Press Cmd+D to bookmark in browser.")
                }}
                title="Copy link (Press Cmd+D to bookmark)"
              >
                <BookmarkPlus size={12} />
              </button>

              <a
                href={rec.source_and_url}
                target="_blank"
                rel="noopener noreferrer"
                className="card-source-link"
                title={`Visit ${domain}`}
              >
                <ExternalLink size={10} />
                <span>{domain}</span>
              </a>

              <button
                className={`btn-bookmark-toggle ${isSaved ? 'saved' : ''}`}
                onClick={() => toggleBookmark(rec)}
                title={isSaved ? "Saved to My List" : "Add to My List"}
                aria-label="Toggle Bookmark"
              >
                {isSaved ? <Check size={13} /> : <Plus size={13} />}
              </button>
            </div>
          </div>

          {/* Card Body */}
          <div className="card-body">
            <a 
              href={rec.source_and_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="card-title"
            >
              {rec.title}
            </a>

            <div className="card-author-row">
              <span>{rec.author || 'Curated'}</span>
              <span>{rec.published_date || '2026'} · {rec.estimated_read_time || '15 min read'}</span>
            </div>

            {/* Outcome-Driven Learning Banner */}
            {rec.outcome_learning && (
              <div className="card-outcome-banner">
                <Compass size={13} />
                <span>{rec.outcome_learning}</span>
              </div>
            )}

            {/* Cross-Pillar Meta-Thinking ("Connect the Dots") */}
            {rec.meta_synthesis && (
              <div className="card-meta-banner">
                <div className="meta-banner-header">
                  <Network size={12} className="meta-icon" />
                  <span className="meta-label">Connect the Dots:</span>
                </div>
                <p className="meta-text">{rec.meta_synthesis}</p>
              </div>
            )}

            {/* Executive Insight Summary — seamless single flowing paragraph */}
            {rec.summary_problem ? (
              <p className="card-summary-flow">
                <span className="summary-problem">{rec.summary_problem.trim()}</span>{' '}
                {rec.summary_insight && (
                  <span className="summary-insight">{rec.summary_insight.trim()}</span>
                )}{' '}
                {(rec.summary_why_read || rec.why_read_this) && (
                  <span className="summary-so-what">
                    {(rec.summary_why_read || rec.why_read_this).replace(/^(Read if|Why Read This):\s*/i, '').trim()}
                  </span>
                )}
              </p>
            ) : (
              <p className="card-summary-flow">
                {rec.summary ? rec.summary.replace(/^(The Problem|The Insight|Why Read This):\s*/gi, '') : ''}
              </p>
            )}

            {/* Key Takeaways */}
            {rec.key_takeaways && rec.key_takeaways.length > 0 && (
              <div className="card-takeaways-list">
                <div className="card-takeaways-title">
                  <CheckCircle2 size={12} style={{ color: 'var(--sky-blue)' }} />
                  <span>Key Takeaways</span>
                </div>
                <ul>
                  {rec.key_takeaways.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              </div>
            )}


          </div>
        </div>

        <div>
          {/* Compact Inline Feedback Row — buttons + note in one line */}
          <div className="card-hitl-section">
            <div className="hitl-bar">
              <div className="hitl-buttons-group">
                <button
                  className={`btn-hitl ${feedback.type === 'high_signal' ? 'active-positive' : ''}`}
                  onClick={() => handleHitlFeedback(rec, 'high_signal')}
                  title="High signal insight for PMs"
                >
                  <ThumbsUp size={11} />
                  <span>Signal</span>
                </button>

                <button
                  className={`btn-hitl ${feedback.type === 'applied' ? 'active-applied' : ''}`}
                  onClick={() => handleHitlFeedback(rec, 'applied')}
                  title="Directly applied to product sprint"
                >
                  <CheckCircle2 size={11} />
                  <span>Applied</span>
                </button>

                <button
                  className={`btn-hitl ${feedback.type === 'low_depth' ? 'active-negative' : ''}`}
                  onClick={() => handleHitlFeedback(rec, 'low_depth')}
                  title="Too basic / Swap with deeper technical article"
                >
                  <SlidersHorizontal size={11} />
                  <span>Swap</span>
                </button>
              </div>

              {/* Inline steer note — same row as buttons */}
              <div className={`hitl-comment-inline ${isPromptOpen ? 'focused' : ''} ${feedback.user_prompt ? 'has-note' : ''}`}>
                <MessageSquare size={11} className="hitl-comment-icon" />
                <input
                  type="text"
                  className="hitl-comment-input"
                  placeholder={feedback.user_prompt ? `"${feedback.user_prompt}"` : "Feedback..."}
                  value={isPromptOpen ? promptInput : (feedback.user_prompt || '')}
                  onFocus={() => {
                    setActivePromptRecId(rec.id)
                    setPromptInput(feedback.user_prompt || '')
                  }}
                  onChange={e => setPromptInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSavePromptNote(rec)
                    }
                  }}
                />
                {isPromptOpen && promptInput.trim() && (
                  <button 
                    className="btn-hitl-comment-send"
                    onClick={() => handleSavePromptNote(rec)}
                    title="Save feedback note"
                  >
                    <Send size={10} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Top Navbar in Skyscanner Midnight Navy */}
      <nav className="top-navbar">
        <div className="nav-container">
          <div className="brand-wrapper">
            <div className="brand-icon-box">
              <Compass size={22} />
            </div>
            <div>
              <div className="brand-title">
                PM Learning Hub
              </div>
              <div className="brand-tagline">
                AI Deep Dive, Product Sense for Product Leaders
              </div>
            </div>
          </div>

          <div className="nav-actions">
            {/* Account / Profile Switcher Pill with User Dropdown */}
            <div className="profile-dropdown-wrapper" ref={profileDropdownRef}>
              <button 
                type="button"
                className={`profile-pill-btn ${showProfileDropdown ? 'active' : ''}`}
                onClick={() => setShowProfileDropdown(prev => !prev)}
                title="Switch user account / profile"
                aria-expanded={showProfileDropdown}
              >
                <span className="avatar-circle" style={{ width: 22, height: 22, fontSize: '0.72rem' }}>
                  {activeProfile.avatar}
                </span>
                <span>{activeProfile.name}</span>
                <ChevronDown size={13} className={`dropdown-chevron ${showProfileDropdown ? 'rotated' : ''}`} />
              </button>

              {showProfileDropdown && (
                <div className="profile-dropdown-menu">
                  <div className="profile-dropdown-header">
                    <span className="profile-dropdown-label">Current Account</span>
                    <strong className="profile-dropdown-current">{activeProfile.name}</strong>
                  </div>

                  <div className="profile-dropdown-divider" />

                  <div className="profile-dropdown-section-title">Switch Account</div>
                  <div className="profile-dropdown-list">
                    {profiles.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className={`profile-dropdown-item ${activeProfile.id === p.id ? 'selected' : ''}`}
                        onClick={() => handleSwitchProfile(p)}
                      >
                        <span className="avatar-circle" style={{ width: 26, height: 26, fontSize: '0.75rem' }}>
                          {p.avatar}
                        </span>
                        <div className="profile-item-info">
                          <span className="profile-item-name">{p.name}</span>
                          {activeProfile.id === p.id && (
                            <span className="profile-item-badge">Active</span>
                          )}
                        </div>
                        {activeProfile.id === p.id && <Check size={14} className="profile-item-check" />}
                      </button>
                    ))}
                  </div>

                  <div className="profile-dropdown-divider" />

                  <form onSubmit={handleCreateProfile} className="profile-dropdown-add-form">
                    <span className="profile-dropdown-section-title">Add New Profile</span>
                    <div className="profile-add-row">
                      <input 
                        type="text" 
                        className="profile-add-input" 
                        placeholder="e.g. Jordan (VP AI)" 
                        value={newProfileName}
                        onChange={e => setNewProfileName(e.target.value)}
                      />
                      <button type="submit" className="btn-profile-add">
                        Add
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>

            {/* My Saved Links — includes share actions inside drawer */}
            <button 
              className="nav-btn nav-btn-highlight"
              onClick={() => setShowSavedDrawer(true)}
              title="Open My Saved Links"
            >
              <BookmarkCheck size={14} />
              <span>My Saved Links</span>
              <span className="badge-counter">{bookmarks.length}</span>
            </button>

            <button 
              className="nav-btn"
              onClick={() => setShowAddModal(true)}
              title="Add custom link"
            >
              <Plus size={14} />
              <span>Add Link</span>
            </button>


            {/* In-App Curator Drawer Button */}
            {isCurator && (
              <button 
                className={`nav-btn btn-curator-badge ${showCuratorDrawer ? 'active' : ''}`}
                onClick={() => {
                  setShowCuratorDrawer(prev => !prev)
                  if (!showCuratorDrawer) loadStagedArticles()
                }}
                title="Open HITL Curator Review Drawer"
              >
                <SlidersHorizontal size={14} />
                <span>Curator Mode</span>
                <span className="curator-count-pill">{stagedArticles.length}</span>
              </button>
            )}
          </div>
        </div>
      </nav>


      {/* Main Container */}
      <main className="app-container">
        {/* Spotlight Billboard Hero */}
        {spotlightArticle && (
          <section className="hero-billboard">
            <div className="hero-content">
              <div className="hero-badges-row">
                <span className="hero-spotlight-tag">
                  <Flame size={13} fill="currentColor" />
                  Spotlight
                </span>
                <span className="badge-pillar" style={{ background: 'rgba(255,255,255,0.12)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}>
                  {spotlightArticle.pillar}
                </span>
                {spotlightArticle.access_type === 'subscription' && (
                  <span className="badge-access subscription" style={{ background: 'rgba(255,255,255,0.12)', color: '#fed7aa', borderColor: 'rgba(255,255,255,0.2)' }}>
                    <Lock size={11} />
                    <span>Subscription</span>
                  </span>
                )}
              </div>

              <h1 className="hero-title">{spotlightArticle.title}</h1>
              
              <div className="hero-meta-row">
                <span className="hero-author-text">By <strong>{spotlightArticle.author}</strong></span>
                <span className="hero-meta-dot">•</span>
                <span>{spotlightArticle.published_date || '2026'}</span>
                <span className="hero-meta-dot">•</span>
                <span>{spotlightArticle.estimated_read_time || '15 min read'}</span>
                <span className="hero-meta-dot">•</span>
                <span className="hero-domain-pill">{getDomain(spotlightArticle.source_and_url)}</span>
              </div>

              {spotlightArticle.outcome_learning && (
                <div className="hero-outcome-banner">
                  <Compass size={14} className="hero-outcome-icon" />
                  <span><strong>PM Lens:</strong> {spotlightArticle.outcome_learning}</span>
                </div>
              )}

              {spotlightArticle.meta_synthesis && (
                <div className="hero-meta-banner">
                  <Network size={14} className="hero-meta-icon" />
                  <span><strong>Connect the Dots:</strong> {spotlightArticle.meta_synthesis}</span>
                </div>
              )}

              {spotlightArticle.summary_problem ? (
                <p className="hero-summary-flowing">
                  <span className="hero-problem">{spotlightArticle.summary_problem.trim()}</span>{' '}
                  {spotlightArticle.summary_insight && (
                    <span className="hero-insight">{spotlightArticle.summary_insight.trim()}</span>
                  )}{' '}
                  {(spotlightArticle.summary_why_read || spotlightArticle.why_read_this) && (
                    <span className="hero-so-what">
                      {(spotlightArticle.summary_why_read || spotlightArticle.why_read_this).replace(/^(Read if|Why Read This):\s*/i, '').trim()}
                    </span>
                  )}
                </p>
              ) : (
                <p className="hero-summary">
                  {spotlightArticle.summary}
                </p>
              )}

              <div className="hero-action-buttons">
                <a
                  href={spotlightArticle.source_and_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-hero-primary"
                >
                  <ExternalLink size={14} />
                  <span>Read Full Article</span>
                </a>

                <button
                  className={`btn-hero-secondary ${bookmarks.some(b => b.url === spotlightArticle.source_and_url) ? 'bookmarked' : ''}`}
                  onClick={() => toggleBookmark(spotlightArticle)}
                >
                  {bookmarks.some(b => b.url === spotlightArticle.source_and_url) ? (
                    <>
                      <BookmarkCheck size={14} />
                      <span>Saved in Reading List</span>
                    </>
                  ) : (
                    <>
                      <BookmarkPlus size={14} />
                      <span>Save to My List</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Pillar Filter Bar */}
        <div className="pillar-filter-bar">
          {[
            { id: 'all', label: 'All Curated Deep Dives' },
            { id: 'AI Deep Dive & Application', label: '🧠 AI Deep Dive & Application' },
            { id: 'Business & Economics', label: '📊 Business & Economics' },
            { id: 'Core Product Management', label: '🎯 Core Product Management' },
            { id: 'Product Ideas to try', label: '💡 Product Ideas to try' }
          ].map(tab => (
            <button
              key={tab.id}
              className={`pillar-tab-btn ${activePillar === tab.id ? 'active' : ''}`}
              onClick={() => handlePillarChange(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Recommendation Feeds */}
        {activePillar === 'all' ? (
          <>
            {/* Top Picks Row */}
            <section className="pillar-section">
              <div className="pillar-header">
                <div className="pillar-title-group">
                  <Flame size={18} style={{ color: '#d97706' }} />
                  <h2 className="pillar-heading">Top Picks</h2>
                </div>
                <span className="pillar-subtitle">Curated essentials this cycle</span>
              </div>
              <div className="cards-grid-2x2">
                {topPicks.map((rec, idx) => renderCard(rec, idx))}
              </div>
            </section>

            {/* Pillar 1: AI Deep Dive & Application Row */}
            {aiDeepDivePicks.length > 0 && (
              <section className="pillar-section">
                <div className="pillar-header">
                  <div className="pillar-title-group">
                    <Cpu size={18} style={{ color: 'var(--sky-blue)' }} />
                    <h2 className="pillar-heading">AI Deep Dive & Application</h2>
                  </div>
                  <span className="pillar-subtitle">Architecture & case studies</span>
                </div>
                <div className="cards-grid-2x2">
                  {aiDeepDivePicks.map((rec, idx) => renderCard(rec, idx))}
                </div>
              </section>
            )}

            {/* Pillar 2: Business & Economics Row */}
            {businessPicks.length > 0 && (
              <section className="pillar-section">
                <div className="pillar-header">
                  <div className="pillar-title-group">
                    <Briefcase size={18} style={{ color: '#10b981' }} />
                    <h2 className="pillar-heading">Business & Economics</h2>
                  </div>
                  <span className="pillar-subtitle">Market & unit economics</span>
                </div>
                <div className="cards-grid-2x2">
                  {businessPicks.map((rec, idx) => renderCard(rec, idx))}
                </div>
              </section>
            )}

            {/* Pillar 3: Core Product Management Row */}
            {corePmPicks.length > 0 && (
              <section className="pillar-section">
                <div className="pillar-header">
                  <div className="pillar-title-group">
                    <Compass size={18} style={{ color: '#8b5cf6' }} />
                    <h2 className="pillar-heading">Core Product Management</h2>
                  </div>
                  <span className="pillar-subtitle">Product sense & strategy</span>
                </div>
                <div className="cards-grid-2x2">
                  {corePmPicks.map((rec, idx) => renderCard(rec, idx))}
                </div>
              </section>
            )}

            {/* Pillar 4: Product Ideas to try Row */}
            {productIdeasPicks.length > 0 && (
              <section className="pillar-section">
                <div className="pillar-header">
                  <div className="pillar-title-group">
                    <Sparkles size={18} style={{ color: '#f59e0b' }} />
                    <h2 className="pillar-heading">Product Ideas to try</h2>
                  </div>
                  <span className="pillar-subtitle">Actionable UX patterns & concepts</span>
                </div>
                <div className="cards-grid-2x2">
                  {productIdeasPicks.map((rec, idx) => renderCard(rec, idx))}
                </div>
              </section>
            )}
          </>
        ) : (
          /* Filtered Pillar View */
          <section className="pillar-section">
            <div className="pillar-header">
              <div className="pillar-title-group">
                <Compass size={18} style={{ color: 'var(--sky-blue)' }} />
                <h2 className="pillar-heading">{activePillar}</h2>
              </div>
              <span className="pillar-count-badge">Curated Articles</span>
            </div>
            <div className="cards-grid-2x2">
              {recommendations.map((rec, idx) => renderCard(rec, idx))}
            </div>
          </section>
        )}
      </main>

      {/* AI Accuracy & Provenance Disclaimer — Bottom */}
      <div className="pair-disclaimer-banner bottom">
        <Sparkles size={14} className="sparkle-icon" />
        <span>
          <strong>AI-Curated Practitioner Hub:</strong> Articles vetted from verified 2026 engineering & strategy sources. AI can make mistakes — verify source deep links for critical decisions.
        </span>
      </div>

      {/* Side Drawer: My Saved Reading List */}
      {showSavedDrawer && (
        <div className="side-drawer-overlay" onClick={() => setShowSavedDrawer(false)}>
          <div className="side-drawer-panel" onClick={e => e.stopPropagation()}>
            <div className="side-drawer-header">
              <div className="side-drawer-title">
                <BookmarkCheck size={18} style={{ color: 'var(--sky-blue)' }} />
                <span>{activeProfile.name}'s Saved Links</span>
                <span className="badge-counter">{bookmarks.length}</span>
              </div>
              <button 
                className="btn-drawer-close"
                onClick={() => setShowSavedDrawer(false)}
                title="Close drawer"
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Three stacked actions: Share, Export, Copy */}
            <div className="drawer-actions-stack">
              <button 
                className="btn-drawer-action-row"
                onClick={handleShareSavedReadingList}
                title="Share saved reading list with colleagues"
              >
                <Share2 size={13} />
                <span>Share List with Colleagues</span>
              </button>
              <button 
                className="btn-drawer-action-row"
                onClick={handleExportNetscapeHTML}
                title="Download HTML Bookmarks for Chrome/Safari/Firefox import"
              >
                <BookmarkPlus size={13} />
                <span>Export to Browser Bookmarks</span>
              </button>
              <button 
                className="btn-drawer-action-row"
                onClick={handleExportNotionMarkdown}
                title="Copy formatted Markdown for Notion or Slack"
              >
                <Copy size={13} />
                <span>Copy for Notion / Slack</span>
              </button>
            </div>

            <div className="side-drawer-body">
              {bookmarks.length === 0 ? (
                <div className="drawer-empty-state" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: '#64748b' }}>
                  <Bookmark size={36} style={{ color: '#cbd5e1', marginBottom: '0.75rem' }} />
                  <p><strong>Your reading list is empty.</strong></p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Click the <strong>+</strong> button on any card to save it here. Your bookmarks persist permanently!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {bookmarks.map((item) => (
                    <div key={item.id} className={`saved-card-compact ${item.pinned ? 'pinned' : ''}`}>
                      <div className="saved-card-compact-header">
                        <span className="badge-pillar" style={{ fontSize: '0.65rem' }}>{item.pillar}</span>
                        <div style={{ display: 'flex', gap: '0.35rem' }}>
                          <button
                            className="btn-drawer-action"
                            onClick={() => togglePin(item.id)}
                            title={item.pinned ? "Unpin" : "Pin to top"}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                          >
                            <Pin size={13} style={{ color: item.pinned ? 'var(--sky-blue)' : '#94a3b8' }} />
                          </button>
                          <button
                            className="btn-drawer-action"
                            onClick={() => deleteBookmark(item.id)}
                            title="Remove from saved list"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                          >
                            <Trash2 size={13} style={{ color: '#ef4444' }} />
                          </button>
                        </div>
                      </div>

                      <a 
                        href={item.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="saved-card-compact-title"
                      >
                        {item.title}
                      </a>

                      <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span>{item.author}</span>
                        <span>•</span>
                        <span>{item.estimated_read_time || '15 min read'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Side Drawer: HITL Curator Review Queue */}
      {showCuratorDrawer && (
        <div className="side-drawer-overlay" onClick={() => setShowCuratorDrawer(false)}>
          <div className="side-drawer-panel" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="side-drawer-header">
              <div className="side-drawer-title">
                <SlidersHorizontal size={18} style={{ color: 'var(--sky-blue)' }} />
                <span>HITL Editorial Queue (Tier 3 Review)</span>
                <span className="badge-counter">{stagedArticles.length}</span>
              </div>
              <button 
                className="btn-drawer-close"
                onClick={() => setShowCuratorDrawer(false)}
                title="Close drawer"
                style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Sub-bar: Pillar filter tabs & Agent discovery trigger */}
            <div className="curator-subbar">
              <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', maxWidth: '380px' }}>
                {['all', 'AI Deep Dive & Application', 'Business & Economics', 'Core Product Management', 'Product Ideas to try'].map(p => (
                  <button
                    key={p}
                    style={{
                      background: curatorPillarFilter === p ? 'var(--navy-dark)' : '#ffffff',
                      color: curatorPillarFilter === p ? '#ffffff' : 'var(--text-secondary)',
                      border: '1px solid ' + (curatorPillarFilter === p ? 'var(--navy-dark)' : 'var(--border-card)'),
                      padding: '0.25rem 0.55rem',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                    onClick={() => {
                      setCuratorPillarFilter(p)
                      setCuratorActiveIndex(0)
                    }}
                  >
                    {p === 'all' ? 'All Staged' : p}
                  </button>
                ))}
              </div>
              <button 
                className="btn-trigger-agent"
                onClick={handleTriggerAgentCuration}
                disabled={isFetchingCandidates}
                title="Trigger agent to discover 3-5 fresh articles with few-shot exemplars and search grounding"
              >
                <Sparkles size={13} className={isFetchingCandidates ? "spinning" : ""} />
                <span>{isFetchingCandidates ? "Fetching & Evaluating..." : "Fetch Content and Review"}</span>
              </button>
            </div>

            <div className="curator-body">
              {filteredStaged.length === 0 ? (
                <div className="drawer-empty-state" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: '#64748b' }}>
                  <CheckCircle2 size={40} style={{ color: '#10b981', marginBottom: '0.75rem' }} />
                  <p><strong>Editorial Queue is Clear!</strong></p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                    All candidate articles have been reviewed and published. Click <strong>"Fetch Content and Review"</strong> above to discover fresh high-signal content.
                  </p>
                </div>
              ) : currentCandidate ? (
                <div className="staged-card-wrapper">
                  {/* Candidate Navigation Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Candidate <strong>{curatorActiveIndex + 1}</strong> of <strong>{filteredStaged.length}</strong>
                    </span>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button 
                        style={{
                          background: '#ffffff',
                          border: '1px solid var(--border-card)',
                          padding: '0.25rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          cursor: curatorActiveIndex === 0 ? 'not-allowed' : 'pointer',
                          opacity: curatorActiveIndex === 0 ? 0.4 : 1
                        }}
                        disabled={curatorActiveIndex === 0}
                        onClick={() => setCuratorActiveIndex(prev => Math.max(0, prev - 1))}
                      >
                        <ChevronLeft size={13} style={{ verticalAlign: 'middle' }} /> Prev
                      </button>
                      <button 
                        style={{
                          background: '#ffffff',
                          border: '1px solid var(--border-card)',
                          padding: '0.25rem 0.6rem',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.75rem',
                          cursor: curatorActiveIndex >= filteredStaged.length - 1 ? 'not-allowed' : 'pointer',
                          opacity: curatorActiveIndex >= filteredStaged.length - 1 ? 0.4 : 1
                        }}
                        disabled={curatorActiveIndex >= filteredStaged.length - 1}
                        onClick={() => setCuratorActiveIndex(prev => Math.min(filteredStaged.length - 1, prev + 1))}
                      >
                        Next <ChevronRight size={13} style={{ verticalAlign: 'middle' }} />
                      </button>
                    </div>
                  </div>

                  {/* Candidate Metadata Banner */}
                  <div className="staged-meta-header">
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="badge-pillar">{currentCandidate.pillar}</span>
                      <span className="badge-tier">{currentCandidate.tier || 'Tier 2'}</span>
                      <span style={{ background: '#05203c', color: '#38bdf8', padding: '2px 8px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 700 }}>
                        {currentCandidate.published_date}
                      </span>
                    </div>
                    <div className="pre-score-badge">
                      Tier 2 Eval: {currentCandidate.eval_score || 92}/100
                    </div>
                  </div>

                  {/* Link Tester Row */}
                  <div className="link-tester-row">
                    <div className="link-tester-url" title={currentCandidate.source_and_url}>
                      {currentCandidate.source_and_url}
                    </div>
                    <a 
                      href={currentCandidate.source_and_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-test-link"
                    >
                      <ExternalLink size={12} />
                      <span>Test Landing Link</span>
                    </a>
                  </div>

                  {/* Inline Editable Fields */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.6rem', marginBottom: '0.4rem' }}>
                    <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--navy-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Editorial Summary Fields
                    </span>
                    <button
                      type="button"
                      className="btn-grammar-check"
                      onClick={handleCheckGrammar}
                      disabled={isCheckingGrammar}
                      title="Run automated grammar check, fix acronyms, and polish executive tone"
                    >
                      <Sparkles size={12} className={isCheckingGrammar ? "spinning" : ""} />
                      <span>{isCheckingGrammar ? "Checking..." : "Check Grammar & Polish"}</span>
                    </button>
                  </div>

                  <div className="curator-field-group">
                    <label className="curator-field-label">Article Title</label>
                    <input 
                      type="text"
                      className="text-input"
                      style={{ fontSize: '0.85rem', fontWeight: 600 }}
                      value={candidateEdits.title}
                      onChange={e => setCandidateEdits(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>

                  <div className="curator-field-group">
                    <label className="curator-field-label">The Problem (Friction)</label>
                    <textarea 
                      className="curator-textarea"
                      rows={2}
                      value={candidateEdits.summary_problem}
                      onChange={e => setCandidateEdits(prev => ({ ...prev, summary_problem: e.target.value }))}
                    />
                  </div>

                  <div className="curator-field-group">
                    <label className="curator-field-label">The Technical Insight (Solution Architecture)</label>
                    <textarea 
                      className="curator-textarea"
                      rows={2}
                      value={candidateEdits.summary_insight}
                      onChange={e => setCandidateEdits(prev => ({ ...prev, summary_insight: e.target.value }))}
                    />
                  </div>

                  <div className="curator-field-group">
                    <label className="curator-field-label">Outcome Learning ("So What" for PMs)</label>
                    <textarea 
                      className="curator-textarea"
                      rows={2}
                      value={candidateEdits.outcome_learning}
                      onChange={e => setCandidateEdits(prev => ({ ...prev, outcome_learning: e.target.value }))}
                    />
                  </div>

                  {/* 5-Point Editorial Rubric */}
                  <div className="rubric-container">
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy-primary)' }}>
                      PM Editorial Rubric (Tier 3 Gate)
                    </div>

                    <div className="rubric-row">
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Landing Link Status:</span>
                      <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem' }}>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                          <input 
                            type="radio" 
                            name="link_status" 
                            checked={curatorRubric.link_status === 'pass'}
                            onChange={() => setCuratorRubric(prev => ({ ...prev, link_status: 'pass' }))}
                          />
                          <span style={{ color: '#059669', fontWeight: 600 }}>Pass (200 OK)</span>
                        </label>
                        <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
                          <input 
                            type="radio" 
                            name="link_status" 
                            checked={curatorRubric.link_status === 'fail'}
                            onChange={() => setCuratorRubric(prev => ({ ...prev, link_status: 'fail' }))}
                          />
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>Fail (Paywall/404)</span>
                        </label>
                      </div>
                    </div>

                    <div className="rubric-row">
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Technical & Reasoning Depth:</span>
                      <div className="rubric-rating-buttons">
                        {[1, 2, 3, 4, 5].map(v => (
                          <button
                            key={v}
                            type="button"
                            className={`btn-score-star ${curatorRubric.meta_thinking === v ? 'active' : ''}`}
                            onClick={() => setCuratorRubric(prev => ({ ...prev, meta_thinking: v }))}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rubric-row">
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Staff/Principal PM Relevance:</span>
                      <div className="rubric-rating-buttons">
                        {[1, 2, 3, 4, 5].map(v => (
                          <button
                            key={v}
                            type="button"
                            className={`btn-score-star ${curatorRubric.pm_relevance === v ? 'active' : ''}`}
                            onClick={() => setCuratorRubric(prev => ({ ...prev, pm_relevance: v }))}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="curator-field-group" style={{ marginTop: '0.35rem' }}>
                      <label className="curator-field-label">Curator Critique & Steering Note (Injected into Agent Memory):</label>
                      <input 
                        type="text"
                        className="text-input"
                        placeholder="e.g. Excellent 2026 deep link and token ROI metrics; or generic root URL"
                        value={curatorRubric.curator_notes}
                        onChange={e => setCuratorRubric(prev => ({ ...prev, curator_notes: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Review Actions Footer */}
                  <div className="curator-actions-bar">
                    <button 
                      className="btn-curator-reject"
                      onClick={handleRejectCandidate}
                      title="Decline candidate and record critique reason in agent memory"
                    >
                      <X size={14} />
                      <span>Reject</span>
                    </button>
                    <button 
                      className="btn-curator-edit-publish"
                      onClick={handleEditAndApproveCandidate}
                      title="Publish with your refined edits above"
                    >
                      <FileText size={14} />
                      <span>Edit & Publish</span>
                    </button>
                    <button 
                      className="btn-curator-approve"
                      onClick={handleApproveCandidate}
                      title="Approve and push directly to live recommendation catalog"
                    >
                      <CheckCircle2 size={14} />
                      <span>Approve Live</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}


      {/* Switch Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Switch Account / Profile</h3>
              <button className="btn-modal-close" onClick={() => setShowProfileModal(false)}>
                <X size={16} />
              </button>
            </div>
            
            <p className="modal-subtitle">
              Switch accounts to access personal reading lists and bookmarks.
            </p>

            <div className="profiles-grid">
              {profiles.map(p => (
                <div 
                  key={p.id}
                  className={`profile-card ${activeProfile.id === p.id ? 'active' : ''}`}
                  onClick={() => handleSwitchProfile(p)}
                >
                  <div className="avatar-circle">
                    {p.avatar}
                  </div>
                  <div className="profile-card-name">
                    {p.name}
                  </div>
                  {activeProfile.id === p.id && (
                    <span className="badge-active-tag">Active</span>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleCreateProfile} className="new-profile-form">
              <div className="input-group">
                <label className="input-label">Add New Profile</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="text-input" 
                    placeholder="e.g. Jordan (VP AI)" 
                    value={newProfileName}
                    onChange={e => setNewProfileName(e.target.value)}
                  />
                  <button type="submit" className="btn-modal-primary" style={{ whiteSpace: 'nowrap' }}>
                    Add
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Custom Link Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Article to {activeProfile.name}'s Reading List</h3>
              <button className="btn-modal-close" onClick={() => setShowAddModal(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddCustomBookmark} className="custom-link-form">
              <div className="input-group">
                <label className="input-label">Article URL *</label>
                <input 
                  type="url" 
                  className="text-input" 
                  placeholder="https://..." 
                  required
                  value={customUrl}
                  onChange={e => setCustomUrl(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Article Title</label>
                <input 
                  type="text" 
                  className="text-input" 
                  placeholder="e.g. Context Windows vs Multi-Agent Systems" 
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Category / Pillar</label>
                <select 
                  className="text-input"
                  value={customPillar}
                  onChange={e => setCustomPillar(e.target.value)}
                >
                  <option value="AI Deep Dive & Application">AI Deep Dive & Application</option>
                  <option value="Business & Economics">Business & Economics</option>
                  <option value="Core Product Management">Core Product Management</option>
                  <option value="Product Ideas to try">Product Ideas to try</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Why are you saving this? (Problem Solved / Notes)</label>
                <textarea 
                  className="text-input" 
                  rows={3} 
                  placeholder="Core technical takeaways or why it matters for your team..."
                  value={customProblem}
                  onChange={e => setCustomProblem(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-modal-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-modal-primary">
                  Save Article
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="toast-notice">
          <CheckCircle2 size={16} style={{ color: '#10b981' }} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  )
}

export default App
