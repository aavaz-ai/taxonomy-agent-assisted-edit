"use client"

import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from "react"
import { sampleTaxonomyData, type TaxonomyData, type TaxonomyNode } from "./taxonomy-data"
import { type TaxonomyOperationType, type WisdomPromptContext } from "./wisdom-prompts"
import { queryWisdom } from "./wisdom-client"
import {
  type AgentAnalysis,
  type LinterStatus,
  parseWisdomToAnalysis,
  buildDiffFromContext,
  buildOperationDescription,
  buildWorkaroundDraftChanges,
} from "./agent-utils"

export type { AgentAnalysis, LinterStatus }

export interface DraftChange {
  id: string
  nodeId: string
  nodeName: string
  nodeLevel: "L1" | "L2" | "L3" | "Theme"
  field: string
  oldValue: string
  newValue: string
  timestamp: Date
  agentAnalysis?: AgentAnalysis
  operationDescription?: string
  userAccepted?: boolean
  resolution?: 'dismissed' | 'contacted' | 'workaround-accepted'
  workaroundSteps?: string[]
  nodePath?: string
  nodeNavIds?: { l1?: string; l2?: string; l3?: string }
}

export interface AgentDiffItem {
  type: "added" | "modified" | "deleted" | "moved"
  nodeType: "L1" | "L2" | "L3" | "Theme"
  nodeName: string
  field?: string
  oldValue?: string
  newValue?: string
  path?: string
  movedTo?: string
}

export interface AgentContext {
  selectedNode: TaxonomyNode | null
  nodeLevel: "L1" | "L2" | "L3" | "Theme" | null
  operationType: TaxonomyOperationType
  wisdomContext: WisdomPromptContext
}

export interface HighRiskReviewState {
  id: string
  node: TaxonomyNode
  level: "L1" | "L2" | "L3" | "Theme"
  operationType: TaxonomyOperationType
  wisdomContext: WisdomPromptContext
  pendingDiff: AgentDiffItem[]
  analysis: AgentAnalysis
  operationDescription: string
  timestamp: Date
}

export type SortType = "name-asc" | "name-desc" | "count-asc" | "count-desc"
export type CardDisplayMode = "bars" | "chips" | "sidebar" | "topbar"
export type ScanAnimMode = "aurora" | "depthScan" | "dithering"

export interface ScanMessage {
  id: string
  text: string
  timestamp: Date
  status: 'active' | 'done'
}

export interface ScanState {
  status: 'idle' | 'scanning' | 'complete'
  progress: number
  messages: ScanMessage[]
  activeReviewId: string | null
}

interface TaxonomyContextType {
  // Data
  taxonomyData: TaxonomyData

  // Selection state
  selectedL1Id: string | null
  selectedL2Id: string | null
  selectedL3Id: string | null
  setSelectedL1Id: (id: string | null) => void
  setSelectedL2Id: (id: string | null) => void
  setSelectedL3Id: (id: string | null) => void

  // Edit mode
  isEditMode: boolean
  setIsEditMode: (mode: boolean) => void

  // Review blocking — true when a review is pending or scan is running
  hasPendingReview: boolean

  // Draft changes
  draftChanges: DraftChange[]
  addDraftChange: (change: Omit<DraftChange, "id" | "timestamp">) => string
  removeDraftChange: (id: string) => void
  discardAllChanges: () => void
  applyChanges: () => void

  acceptDraftChange: (changeId: string) => void
  setDraftResolution: (changeId: string, resolution: 'dismissed' | 'contacted' | 'workaround-accepted') => void

  // New: Linter-style draft change management
  addDraftChangeWithAnalysis: (
    node: TaxonomyNode,
    level: "L1" | "L2" | "L3" | "Theme",
    operationType: TaxonomyOperationType,
    wisdomContext?: Partial<WisdomPromptContext>
  ) => void
  updateDraftAnalysis: (changeId: string, analysis: AgentAnalysis) => void

  // New: High-risk review (supports multiple concurrent reviews)
  highRiskReviews: HighRiskReviewState[]
  initiateHighRiskReview: (
    node: TaxonomyNode,
    level: "L1" | "L2" | "L3" | "Theme",
    operationType: TaxonomyOperationType,
    wisdomContext?: Partial<WisdomPromptContext>
  ) => void
  acceptHighRiskReview: (reviewId: string) => void
  rejectHighRiskReview: (reviewId: string) => void
  acceptWorkaround: (reviewId: string, destinationName?: string) => void

  isProcessing: boolean
  processingEstimate: string

  // Currently selected node details
  getSelectedNode: () => TaxonomyNode | undefined
  getL2Nodes: () => TaxonomyNode[]
  getL3Nodes: () => TaxonomyNode[]
  buildNodePath: () => string
  currentNavIds: () => { l1?: string; l2?: string; l3?: string }

  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void

  sortL1: SortType
  sortL2: SortType
  sortL3: SortType
  setSortL1: (sort: SortType) => void
  setSortL2: (sort: SortType) => void
  setSortL3: (sort: SortType) => void

  cardDisplayMode: CardDisplayMode
  setCardDisplayMode: (mode: CardDisplayMode) => void

  scanAnimMode: ScanAnimMode
  setScanAnimMode: (mode: ScanAnimMode) => void

  isReviewPaneOpen: boolean
  setIsReviewPaneOpen: (open: boolean) => void

  // Scan animation state
  scanState: ScanState
  resetScan: () => void

  // Node creation flow
  creatingNode: { level: "L1" | "L2" | "L3" } | null
  startCreatingNode: (level: "L1" | "L2" | "L3") => void
  cancelCreatingNode: () => void
  commitCreatingNode: (name: string, description: string) => void
}

const TaxonomyContext = createContext<TaxonomyContextType | undefined>(undefined)

function isCatchAllNode(node: TaxonomyNode): boolean {
  const name = node.name.toLowerCase()
  return name === "miscellaneous" || name === "generic"
}

function getCatchAllL2Nodes(taxonomyData: TaxonomyData): TaxonomyNode[] {
  const miscNode = taxonomyData.level1.find((n) => n.name.toLowerCase() === "miscellaneous")
  const genericNode = taxonomyData.level1.find((n) => n.name.toLowerCase() === "generic")

  const catchAllNodes: TaxonomyNode[] = []

  if (genericNode?.children?.[0]) {
    catchAllNodes.push(genericNode.children[0])
  }
  if (miscNode?.children?.[0]) {
    catchAllNodes.push(miscNode.children[0])
  }

  return catchAllNodes
}

function getCatchAllL3Nodes(taxonomyData: TaxonomyData): TaxonomyNode[] {
  const miscNode = taxonomyData.level1.find((n) => n.name.toLowerCase() === "miscellaneous")
  const genericNode = taxonomyData.level1.find((n) => n.name.toLowerCase() === "generic")

  const catchAllNodes: TaxonomyNode[] = []

  if (genericNode?.children?.[0]?.children?.[0]) {
    catchAllNodes.push(genericNode.children[0].children[0])
  }
  if (miscNode?.children?.[0]?.children?.[0]) {
    catchAllNodes.push(miscNode.children[0].children[0])
  }

  return catchAllNodes
}

export function TaxonomyProvider({ children }: { children: ReactNode }) {
  const [taxonomyData] = useState<TaxonomyData>(sampleTaxonomyData)

  // Selection state
  const [selectedL1Id, setSelectedL1IdInternal] = useState<string | null>(null)
  const [selectedL2Id, setSelectedL2IdInternal] = useState<string | null>(null)
  const [selectedL3Id, setSelectedL3IdInternal] = useState<string | null>(null)

  // Node creation flow
  const [creatingNode, setCreatingNode] = useState<{ level: "L1" | "L2" | "L3" } | null>(null)

  const startCreatingNode = useCallback((level: "L1" | "L2" | "L3") => {
    setCreatingNode({ level })
  }, [])

  const cancelCreatingNode = useCallback(() => {
    setCreatingNode(null)
  }, [])

  // Edit mode
  const [isEditMode, setIsEditModeInternal] = useState(false)
  const setIsEditMode = useCallback((mode: boolean) => {
    setIsEditModeInternal(mode)
    if (!mode) setCreatingNode(null)
  }, [])

  // Draft changes
  const [draftChanges, setDraftChanges] = useState<DraftChange[]>([])

  const [isProcessing, setIsProcessing] = useState(false)
  const [processingEstimate, setProcessingEstimate] = useState("2-3 hours")

  // Search
  const [searchQuery, setSearchQuery] = useState("")

  const [sortL1, setSortL1] = useState<SortType>("count-desc")
  const [sortL2, setSortL2] = useState<SortType>("count-desc")
  const [sortL3, setSortL3] = useState<SortType>("count-desc")

  // Card display mode — persisted to localStorage
  const [cardDisplayMode, setCardDisplayModeInternal] = useState<CardDisplayMode>("chips")
  const [isReviewPaneOpen, setIsReviewPaneOpen] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("taxonomy-card-display-mode")
    if (stored === "bars" || stored === "chips" || stored === "sidebar" || stored === "topbar") {
      setCardDisplayModeInternal(stored)
    }
  }, [])

  const setCardDisplayMode = useCallback((mode: CardDisplayMode) => {
    setCardDisplayModeInternal(mode)
    localStorage.setItem("taxonomy-card-display-mode", mode)
    if (mode === "sidebar" || mode === "topbar") {
      setIsReviewPaneOpen(false)
    }
  }, [])

  // Scan animation mode — persisted to localStorage
  const [scanAnimMode, setScanAnimModeInternal] = useState<ScanAnimMode>("aurora")

  useEffect(() => {
    const stored = localStorage.getItem("taxonomy-scan-anim-mode")
    if (stored === "aurora" || stored === "depthScan" || stored === "dithering") {
      setScanAnimModeInternal(stored)
    }
  }, [])

  const setScanAnimMode = useCallback((mode: ScanAnimMode) => {
    setScanAnimModeInternal(mode)
    localStorage.setItem("taxonomy-scan-anim-mode", mode)
  }, [])

  // High-risk review state — supports multiple concurrent reviews
  const [highRiskReviews, setHighRiskReviews] = useState<HighRiskReviewState[]>([])

  // Scan animation state
  const [scanState, setScanState] = useState<ScanState>({
    status: 'idle',
    progress: 0,
    messages: [],
    activeReviewId: null,
  })

  // Message sequences per operation type category
  const scanMessageSequences: Record<string, string[]> = useMemo(() => ({
    default: [
      "Analyzing taxonomy structure...",
      "Checking for conflicts with existing keywords...",
      "Scanning record volumes...",
      "Evaluating impact on downstream themes...",
      "Generating recommendation...",
    ],
    rename: [
      "Checking keyword usage across records...",
      "Scanning for naming conflicts...",
      "Evaluating semantic similarity with siblings...",
      "Analyzing impact on theme mappings...",
      "Generating recommendation...",
    ],
    delete: [
      "Scanning records mapped to this keyword...",
      "Checking for orphaned child nodes...",
      "Evaluating redistribution options...",
      "Analyzing impact on taxonomy coverage...",
      "Generating recommendation...",
    ],
    merge: [
      "Comparing keyword record distributions...",
      "Checking theme overlap between sources...",
      "Evaluating merge destination compatibility...",
      "Scanning for duplicate themes post-merge...",
      "Generating recommendation...",
    ],
    create: [
      "Checking for existing similar keywords...",
      "Analyzing proposed placement in hierarchy...",
      "Evaluating naming conventions...",
      "Scanning for potential record coverage...",
      "Generating recommendation...",
    ],
  }), [])

  const getMessagesForOperation = useCallback((opType: string): string[] => {
    if (opType.includes('rename')) return scanMessageSequences.rename
    if (opType.includes('delete')) return scanMessageSequences.delete
    if (opType.includes('merge')) return scanMessageSequences.merge
    if (opType.includes('create')) return scanMessageSequences.create
    return scanMessageSequences.default
  }, [scanMessageSequences])

  // Progress timer: increment from 0 to 90 while scanning
  useEffect(() => {
    if (scanState.status !== 'scanning') return
    const interval = setInterval(() => {
      setScanState(prev => {
        if (prev.status !== 'scanning') return prev
        const next = Math.min(prev.progress + 2, 90)
        return { ...prev, progress: next }
      })
    }, 100)
    return () => clearInterval(interval)
  }, [scanState.status])

  // Message cycling: advance messages every ~800ms while scanning
  useEffect(() => {
    if (scanState.status !== 'scanning' || !scanState.activeReviewId) return

    const review = highRiskReviews.find(r => r.id === scanState.activeReviewId)
    const messages = review ? getMessagesForOperation(review.operationType) : scanMessageSequences.default
    let msgIndex = 0

    // Add first message immediately
    setScanState(prev => ({
      ...prev,
      messages: [{ id: `msg-0`, text: messages[0], timestamp: new Date(), status: 'active' }],
    }))

    const interval = setInterval(() => {
      msgIndex++
      if (msgIndex >= messages.length) {
        clearInterval(interval)
        return
      }
      setScanState(prev => {
        if (prev.status !== 'scanning') return prev
        const updated = prev.messages.map(m => ({ ...m, status: 'done' as const }))
        return {
          ...prev,
          messages: [
            ...updated,
            { id: `msg-${msgIndex}`, text: messages[msgIndex], timestamp: new Date(), status: 'active' },
          ],
        }
      })
    }, 800)

    return () => clearInterval(interval)
  }, [scanState.status, scanState.activeReviewId, highRiskReviews, getMessagesForOperation, scanMessageSequences.default])

  // Start scan when a new review is added
  const startScan = useCallback((reviewId: string) => {
    setScanState({
      status: 'scanning',
      progress: 0,
      messages: [],
      activeReviewId: reviewId,
    })
  }, [])

  // Complete scan — card persists in result state until user acts
  const completeScan = useCallback(() => {
    setScanState(prev => ({
      ...prev,
      status: 'complete',
      progress: 100,
      messages: prev.messages.map(m => ({ ...m, status: 'done' as const })),
    }))
  }, [])

  // Reset scan to idle (called after user accepts/rejects/dismisses)
  const resetScan = useCallback(() => {
    setScanState({ status: 'idle', progress: 0, messages: [], activeReviewId: null })
  }, [])

  // Watch for analysis completion on the active review
  useEffect(() => {
    if (scanState.status !== 'scanning' || !scanState.activeReviewId) return
    const review = highRiskReviews.find(r => r.id === scanState.activeReviewId)
    if (!review) {
      // Review was removed (accepted/rejected) — end scan
      completeScan()
      return
    }
    if (review.analysis.status !== 'analyzing') {
      completeScan()
    }
  }, [scanState.status, scanState.activeReviewId, highRiskReviews, completeScan])

  // When L1 changes, reset L2 and L3
  const setSelectedL1Id = useCallback((id: string | null) => {
    setSelectedL1IdInternal(id)
    setSelectedL2IdInternal(null)
    setSelectedL3IdInternal(null)
    if (cardDisplayMode === "sidebar" || cardDisplayMode === "topbar") setIsReviewPaneOpen(false)
  }, [cardDisplayMode])

  // When L2 changes, reset L3
  const setSelectedL2Id = useCallback((id: string | null) => {
    setSelectedL2IdInternal(id)
    setSelectedL3IdInternal(null)
    if (cardDisplayMode === "sidebar" || cardDisplayMode === "topbar") setIsReviewPaneOpen(false)
  }, [cardDisplayMode])

  const setSelectedL3Id = useCallback((id: string | null) => {
    setSelectedL3IdInternal(id)
    if (cardDisplayMode === "sidebar" || cardDisplayMode === "topbar") setIsReviewPaneOpen(false)
  }, [cardDisplayMode])

  const getL2Nodes = useCallback((): TaxonomyNode[] => {
    if (!selectedL1Id) return []
    const l1Node = taxonomyData.level1.find((n) => n.id === selectedL1Id)
    if (!l1Node) return []

    if (isCatchAllNode(l1Node)) {
      return l1Node.children || []
    }

    const regularChildren = l1Node.children || []
    const catchAllNodes = getCatchAllL2Nodes(taxonomyData)

    return [...regularChildren, ...catchAllNodes]
  }, [selectedL1Id, taxonomyData])

  const getL3Nodes = useCallback((): TaxonomyNode[] => {
    if (!selectedL1Id || !selectedL2Id) return []
    const l1Node = taxonomyData.level1.find((n) => n.id === selectedL1Id)
    if (!l1Node) return []

    if (isCatchAllNode(l1Node)) {
      const l2Node = l1Node.children?.find((n) => n.id === selectedL2Id)
      return l2Node?.children || []
    }

    const selectedL2Node = [...(l1Node.children || []), ...getCatchAllL2Nodes(taxonomyData)].find(
      (n) => n.id === selectedL2Id,
    )

    if (selectedL2Node && isCatchAllNode(selectedL2Node)) {
      return selectedL2Node.children || []
    }

    const l2Node = l1Node.children?.find((n) => n.id === selectedL2Id)
    const regularChildren = l2Node?.children || []
    const catchAllNodes = getCatchAllL3Nodes(taxonomyData)

    return [...regularChildren, ...catchAllNodes]
  }, [selectedL1Id, selectedL2Id, taxonomyData])

  const getSelectedNode = useCallback((): TaxonomyNode | undefined => {
    if (!selectedL1Id) return undefined

    const l1Node = taxonomyData.level1.find((n) => n.id === selectedL1Id)
    if (!selectedL2Id) return l1Node

    const l2Node = l1Node?.children?.find((n) => n.id === selectedL2Id)
    if (!selectedL3Id) return l2Node

    return l2Node?.children?.find((n) => n.id === selectedL3Id)
  }, [selectedL1Id, selectedL2Id, selectedL3Id, taxonomyData])

  const buildNodePath = useCallback((): string => {
    const parts: string[] = []
    if (selectedL1Id) {
      const l1 = taxonomyData.level1.find(n => n.id === selectedL1Id)
      if (l1) parts.push(l1.name)
    }
    if (selectedL2Id) {
      const l1 = taxonomyData.level1.find(n => n.id === selectedL1Id)
      const l2 = l1?.children?.find(n => n.id === selectedL2Id)
      if (l2) parts.push(l2.name)
    }
    if (selectedL3Id) {
      const l1 = taxonomyData.level1.find(n => n.id === selectedL1Id)
      const l2 = l1?.children?.find(n => n.id === selectedL2Id)
      const l3 = l2?.children?.find(n => n.id === selectedL3Id)
      if (l3) parts.push(l3.name)
    }
    return parts.join(" > ")
  }, [selectedL1Id, selectedL2Id, selectedL3Id, taxonomyData])

  const currentNavIds = useCallback(() => ({
    l1: selectedL1Id || undefined,
    l2: selectedL2Id || undefined,
    l3: selectedL3Id || undefined,
  }), [selectedL1Id, selectedL2Id, selectedL3Id])

  // Draft change management
  const addDraftChange = useCallback((change: Omit<DraftChange, "id" | "timestamp">): string => {
    const id = `change-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    let returnId = id
    setDraftChanges((prev) => {
      const existingIdx = prev.findIndex(
        (c) => c.nodeId === change.nodeId && c.field === change.field
      )
      if (existingIdx >= 0) {
        // Merge: keep original oldValue, update newValue and metadata
        const updated = [...prev]
        returnId = updated[existingIdx].id
        updated[existingIdx] = {
          ...updated[existingIdx],
          newValue: change.newValue,
          agentAnalysis: change.agentAnalysis,
          operationDescription: change.operationDescription,
          timestamp: new Date(),
        }
        return updated
      }
      return [...prev, { ...change, id, timestamp: new Date() }]
    })
    return returnId
  }, [])

  const removeDraftChange = useCallback((id: string) => {
    setDraftChanges((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const updateDraftAnalysis = useCallback((changeId: string, analysis: AgentAnalysis) => {
    setDraftChanges((prev) =>
      prev.map((c) => (c.id === changeId ? { ...c, agentAnalysis: analysis } : c))
    )
  }, [])

  const acceptDraftChange = useCallback((changeId: string) => {
    setDraftChanges((prev) => {
      const target = prev.find((c) => c.id === changeId)
      if (!target) return prev
      // Accept all changes sharing the same operationDescription / nodeId group
      return prev.map((c) =>
        (c.id === changeId || (target.operationDescription && c.operationDescription === target.operationDescription))
          ? { ...c, userAccepted: true }
          : c
      )
    })
  }, [])

  const setDraftResolution = useCallback((changeId: string, resolution: 'dismissed' | 'contacted' | 'workaround-accepted') => {
    setDraftChanges((prev) => {
      const target = prev.find((c) => c.id === changeId)
      if (!target) return prev
      return prev.map((c) =>
        (c.id === changeId || (target.operationDescription && c.operationDescription === target.operationDescription))
          ? { ...c, resolution }
          : c
      )
    })
  }, [])

  const discardAllChanges = useCallback(() => {
    setDraftChanges([])
    setHighRiskReviews([])
    setCreatingNode(null)
  }, [])

  const applyChanges = useCallback(() => {
    console.log("Applying changes:", draftChanges)
    setDraftChanges([])
    setIsEditMode(false)
    setHighRiskReviews([])
    setCreatingNode(null)
    setIsProcessing(true)
    setProcessingEstimate("2-3 hours")
  }, [draftChanges])

  // Build wisdom context from node + partial context
  // Auto-populates structural context (siblings, cross-theme names, path names)
  // from the taxonomy tree. Callsite-specific fields (newName, destinationName, etc.)
  // come from the wisdomContext override.
  const buildWisdomContext = useCallback(
    (node: TaxonomyNode, level: "L1" | "L2" | "L3" | "Theme", wisdomContext?: Partial<WisdomPromptContext>): WisdomPromptContext => {
      // Look up navigation names from selection state
      const l1Node = selectedL1Id ? taxonomyData.level1.find(n => n.id === selectedL1Id) : undefined
      const l2Node = l1Node && selectedL2Id ? l1Node.children?.find(n => n.id === selectedL2Id) : undefined
      const l3Node = l2Node && selectedL3Id ? l2Node.children?.find(n => n.id === selectedL3Id) : undefined

      const structural: Partial<WisdomPromptContext> = {
        currentName: node.name,
        l1Name: l1Node?.name,
        l2Name: l2Node?.name,
        l3Name: l3Node?.name,
      }

      if (level === "Theme" && l3Node) {
        // Theme-level: populate sibling themes and sub-theme names for the target theme
        const allThemes = l3Node.themes || []
        structural.siblingThemes = allThemes.map(t => t.name)
        structural.themeName = wisdomContext?.themeName || node.name

        // Find the specific theme to get its children (sub-themes)
        const themeName = wisdomContext?.themeName || wisdomContext?.currentName || node.name
        const targetTheme = allThemes.find(t => t.name === themeName)
        if (targetTheme?.children) {
          structural.subThemeNames = targetTheme.children.map(c => c.name)
          structural.siblingNames = targetTheme.children.map(c => c.name)
          structural.themeVolume = targetTheme.count

          // Cross-theme sub-theme names: all sub-themes under OTHER themes in the same L3
          const crossThemeSubThemeNames: string[] = []
          const crossThemeSubThemeParents: Record<string, string> = {}
          for (const theme of allThemes) {
            if (theme.name !== targetTheme.name && theme.children) {
              for (const child of theme.children) {
                crossThemeSubThemeNames.push(child.name)
                crossThemeSubThemeParents[child.name] = theme.name
              }
            }
          }
          structural.crossThemeSubThemeNames = crossThemeSubThemeNames
          structural.crossThemeSubThemeParents = crossThemeSubThemeParents
        }
      } else if (level === "L1") {
        // L1 siblings = all other L1 node names
        structural.siblingThemes = taxonomyData.level1
          .filter(n => n.id !== node.id)
          .map(n => n.name)
        structural.themeVolume = node.count
        structural.subThemeNames = (node.children || []).map(n => n.name)
      } else if (level === "L2" && l1Node) {
        // L2 siblings = other L2 nodes under the same L1
        structural.siblingThemes = (l1Node.children || [])
          .filter(n => n.id !== node.id)
          .map(n => n.name)
        structural.themeVolume = node.count
        structural.subThemeNames = (node.children || []).map(n => n.name)
      } else if (level === "L3") {
        structural.l3Name = node.name
      }

      // Callsite overrides take precedence over auto-populated structural context
      return {
        ...structural,
        ...wisdomContext,
      }
    },
    [taxonomyData, selectedL1Id, selectedL2Id, selectedL3Id]
  )

  // Derived: block edits while a review is pending or scan is running
  const hasPendingReview = highRiskReviews.length > 0 || scanState.status === 'scanning'

  // ALL edits go through agent review panel — no silent background path
  // addDraftChangeWithAnalysis now routes through the same review flow as high-risk
  const addDraftChangeWithAnalysis = useCallback(
    (
      node: TaxonomyNode,
      level: "L1" | "L2" | "L3" | "Theme",
      operationType: TaxonomyOperationType,
      wisdomContext?: Partial<WisdomPromptContext>
    ) => {
      // Guard: block concurrent reviews
      if (highRiskReviews.length > 0) return

      // Route everything through the review panel
      const fullWisdomContext = buildWisdomContext(node, level, wisdomContext)
      const agentCtx: AgentContext = {
        selectedNode: node,
        nodeLevel: level,
        operationType,
        wisdomContext: fullWisdomContext,
      }

      const pendingDiff = buildDiffFromContext(agentCtx)
      const description = buildOperationDescription(agentCtx)
      const reviewId = `review-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`

      const newReview: HighRiskReviewState = {
        id: reviewId,
        node,
        level,
        operationType,
        wisdomContext: fullWisdomContext,
        pendingDiff,
        analysis: { status: "analyzing", operationType },
        operationDescription: description,
        timestamp: new Date(),
      }

      setHighRiskReviews((prev) => [...prev, newReview])
      startScan(reviewId)


      // Fire Wisdom analysis
      queryWisdom(operationType, fullWisdomContext).then((wisdomResponse) => {
        const analysis = parseWisdomToAnalysis(wisdomResponse, operationType)
        setHighRiskReviews((prev) =>
          prev.map((r) => r.id === reviewId ? { ...r, analysis } : r)
        )
      }).catch((err) => {
        console.error("Wisdom analysis failed:", err)
        setHighRiskReviews((prev) =>
          prev.map((r) => r.id === reviewId ? { ...r, analysis: { status: "error", operationType } } : r)
        )
      })
    },
    [buildWisdomContext, startScan, highRiskReviews]
  )

  // High-risk: block until user accepts or rejects (same flow, kept for API compatibility)
  const initiateHighRiskReview = useCallback(
    (
      node: TaxonomyNode,
      level: "L1" | "L2" | "L3" | "Theme",
      operationType: TaxonomyOperationType,
      wisdomContext?: Partial<WisdomPromptContext>
    ) => {
      // Guard: block concurrent reviews
      if (highRiskReviews.length > 0) return

      const fullWisdomContext = buildWisdomContext(node, level, wisdomContext)
      const agentCtx: AgentContext = {
        selectedNode: node,
        nodeLevel: level,
        operationType,
        wisdomContext: fullWisdomContext,
      }

      const pendingDiff = buildDiffFromContext(agentCtx)
      const description = buildOperationDescription(agentCtx)
      const reviewId = `review-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`

      const newReview: HighRiskReviewState = {
        id: reviewId,
        node,
        level,
        operationType,
        wisdomContext: fullWisdomContext,
        pendingDiff,
        analysis: { status: "analyzing", operationType },
        operationDescription: description,
        timestamp: new Date(),
      }

      setHighRiskReviews((prev) => [...prev, newReview])
      startScan(reviewId)


      // Fire Wisdom analysis
      queryWisdom(operationType, fullWisdomContext).then((wisdomResponse) => {
        const analysis = parseWisdomToAnalysis(wisdomResponse, operationType)
        setHighRiskReviews((prev) =>
          prev.map((r) => r.id === reviewId ? { ...r, analysis } : r)
        )
      }).catch((err) => {
        console.error("High-risk Wisdom analysis failed:", err)
        setHighRiskReviews((prev) =>
          prev.map((r) => r.id === reviewId ? { ...r, analysis: { status: "error", operationType } } : r)
        )
      })
    },
    [buildWisdomContext, startScan, highRiskReviews]
  )

  const commitCreatingNode = useCallback(
    (name: string, description: string) => {
      if (!creatingNode) return

      const placeholderNode: TaxonomyNode = {
        id: `new-${creatingNode.level}`,
        name,
        count: 0,
        description,
      }

      const operationType: TaxonomyOperationType = creatingNode.level === "L3" ? "create-subtheme" : "create-theme"
      const wisdomContext: Partial<WisdomPromptContext> = {
        proposedName: name,
      }

      setCreatingNode(null)
      initiateHighRiskReview(placeholderNode, creatingNode.level, operationType, wisdomContext)
    },
    [creatingNode, initiateHighRiskReview]
  )

  const acceptHighRiskReview = useCallback((reviewId: string) => {
    const review = highRiskReviews.find((r) => r.id === reviewId)
    if (!review) return

    const path = buildNodePath()
    const navIds = currentNavIds()

    // Convert pending diff to draft changes with the analysis attached
    // Use the actual taxonomy node ID for deterministic grouping/merging
    const nodeId = review.node.id

    review.pendingDiff.forEach((item) => {
      if (item.type === "deleted") {
        addDraftChange({
          nodeId,
          nodeName: item.nodeName,
          nodeLevel: item.nodeType,
          field: "delete-keyword",
          oldValue: item.nodeName,
          newValue: "[DELETED]",
          agentAnalysis: review.analysis,
          operationDescription: review.operationDescription,
          nodePath: path,
          nodeNavIds: navIds,
        })
      } else if (item.type === "modified" && item.field) {
        addDraftChange({
          nodeId,
          nodeName: item.nodeName,
          nodeLevel: item.nodeType,
          field: item.field,
          oldValue: item.oldValue || "",
          newValue: item.newValue || "",
          agentAnalysis: review.analysis,
          operationDescription: review.operationDescription,
          nodePath: path,
          nodeNavIds: navIds,
        })
      } else if (item.type === "added") {
        addDraftChange({
          nodeId,
          nodeName: item.nodeName,
          nodeLevel: item.nodeType,
          field: "add-keyword",
          oldValue: "",
          newValue: item.nodeName,
          agentAnalysis: review.analysis,
          operationDescription: review.operationDescription,
          nodePath: path,
          nodeNavIds: navIds,
        })
      } else if (item.type === "moved") {
        addDraftChange({
          nodeId,
          nodeName: item.nodeName,
          nodeLevel: item.nodeType,
          field: "move-keyword",
          oldValue: item.path || "",
          newValue: item.movedTo || "",
          agentAnalysis: review.analysis,
          operationDescription: review.operationDescription,
          nodePath: path,
          nodeNavIds: navIds,
        })
      }
    })

    setHighRiskReviews((prev) => prev.filter((r) => r.id !== reviewId))
  }, [highRiskReviews, addDraftChange, buildNodePath, currentNavIds])

  const rejectHighRiskReview = useCallback((reviewId: string) => {
    setHighRiskReviews((prev) => prev.filter((r) => r.id !== reviewId))
  }, [])

  const acceptWorkaround = useCallback((reviewId: string, destinationName?: string) => {
    const review = highRiskReviews.find((r) => r.id === reviewId)
    if (!review) return
    const { analysis, node, level, wisdomContext, operationDescription } = review

    if (!analysis.workaroundType) return

    const path = buildNodePath()
    const navIds = currentNavIds()

    // Merge server-enriched workaround context into the client-side wisdomContext
    // If a destinationName was provided (e.g. from the keyword merge picker), overlay it
    const mergedContext = { ...wisdomContext, ...analysis.workaroundContext, ...(destinationName ? { destinationName } : {}) }

    const workaroundChanges = buildWorkaroundDraftChanges(
      analysis.workaroundType,
      mergedContext,
      node,
      level,
      operationDescription
    )

    // Collapse all workaround steps into a single draft change node
    // Title = last step (the user-facing outcome), summary = full multi-step explanation
    const lastChange = workaroundChanges[workaroundChanges.length - 1]
    const firstChange = workaroundChanges[0]
    const fullSteps = workaroundChanges.map(c => c.operationDescription).join(", then ")
    if (firstChange && lastChange) {
      const allSteps = workaroundChanges.map(c => c.operationDescription)
      addDraftChange({
        nodeId: `workaround-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        nodeName: firstChange.nodeName,
        nodeLevel: firstChange.nodeLevel,
        field: lastChange.field,
        oldValue: lastChange.oldValue,
        newValue: lastChange.newValue,
        agentAnalysis: {
          ...analysis,
          status: "pass",
          summary: workaroundChanges.length > 1 ? fullSteps : undefined,
        },
        operationDescription: lastChange.operationDescription,
        workaroundSteps: allSteps.length > 1 ? allSteps : undefined,
        resolution: 'workaround-accepted',
        nodePath: path,
        nodeNavIds: navIds,
      })
    }

    setHighRiskReviews((prev) => prev.filter((r) => r.id !== reviewId))
  }, [highRiskReviews, addDraftChange, buildNodePath, currentNavIds])

  return (
    <TaxonomyContext.Provider
      value={{
        taxonomyData,
        selectedL1Id,
        selectedL2Id,
        selectedL3Id,
        setSelectedL1Id,
        setSelectedL2Id,
        setSelectedL3Id,
        isEditMode,
        setIsEditMode,
        hasPendingReview,
        draftChanges,
        addDraftChange,
        removeDraftChange,
        acceptDraftChange,
        setDraftResolution,
        discardAllChanges,
        applyChanges,
        addDraftChangeWithAnalysis,
        updateDraftAnalysis,
        highRiskReviews,
        initiateHighRiskReview,
        acceptHighRiskReview,
        rejectHighRiskReview,
        acceptWorkaround,
        isProcessing,
        processingEstimate,
        getSelectedNode,
        getL2Nodes,
        getL3Nodes,
        buildNodePath,
        currentNavIds,
        searchQuery,
        setSearchQuery,
        sortL1,
        sortL2,
        sortL3,
        setSortL1,
        setSortL2,
        setSortL3,
        cardDisplayMode,
        setCardDisplayMode,
        scanAnimMode,
        setScanAnimMode,
        isReviewPaneOpen,
        setIsReviewPaneOpen,
        scanState,
        resetScan,
        creatingNode,
        startCreatingNode,
        cancelCreatingNode,
        commitCreatingNode,
      }}
    >
      {children}
    </TaxonomyContext.Provider>
  )
}

export function useTaxonomy() {
  const context = useContext(TaxonomyContext)
  if (!context) {
    throw new Error("useTaxonomy must be used within a TaxonomyProvider")
  }
  return context
}
