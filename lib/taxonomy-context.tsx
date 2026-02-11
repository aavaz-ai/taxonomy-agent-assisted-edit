"use client"

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react"
import { sampleTaxonomyData, type TaxonomyData, type TaxonomyNode } from "./taxonomy-data"
import { type TaxonomyOperationType, type WisdomPromptContext } from "./wisdom-prompts"
import { queryWisdom } from "./wisdom-client"
import {
  type AgentAnalysis,
  type LinterStatus,
  parseWisdomToAnalysis,
  buildDiffFromContext,
  buildOperationDescription,
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
  nodeLevel: "L1" | "L2" | "L3" | null
  operationType: TaxonomyOperationType
  wisdomContext: WisdomPromptContext
}

export interface HighRiskReviewState {
  node: TaxonomyNode
  level: "L1" | "L2" | "L3"
  operationType: TaxonomyOperationType
  wisdomContext: WisdomPromptContext
  pendingDiff: AgentDiffItem[]
  analysis: AgentAnalysis
  operationDescription: string
}

export type SortType = "name-asc" | "name-desc" | "count-asc" | "count-desc"

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

  // Draft changes
  draftChanges: DraftChange[]
  addDraftChange: (change: Omit<DraftChange, "id" | "timestamp">) => string
  removeDraftChange: (id: string) => void
  discardAllChanges: () => void
  applyChanges: () => void

  acceptDraftChange: (changeId: string) => void
  setDraftResolution: (changeId: string, resolution: 'dismissed' | 'contacted' | 'workaround-accepted') => void
  acceptWorkaround: (changeId: string) => void

  // New: Linter-style draft change management
  addDraftChangeWithAnalysis: (
    node: TaxonomyNode,
    level: "L1" | "L2" | "L3",
    operationType: TaxonomyOperationType,
    wisdomContext?: Partial<WisdomPromptContext>
  ) => void
  updateDraftAnalysis: (changeId: string, analysis: AgentAnalysis) => void

  // New: High-risk review
  highRiskReview: HighRiskReviewState | null
  initiateHighRiskReview: (
    node: TaxonomyNode,
    level: "L1" | "L2" | "L3",
    operationType: TaxonomyOperationType,
    wisdomContext?: Partial<WisdomPromptContext>
  ) => void
  acceptHighRiskReview: () => void
  rejectHighRiskReview: () => void

  // New: Change selection for split panel
  selectedChangeId: string | null
  setSelectedChangeId: (id: string | null) => void

  // New: Analysis stats
  analysisStats: { pass: number; warn: number; fail: number; pending: number }

  isBottomBarExpanded: boolean
  setIsBottomBarExpanded: (expanded: boolean) => void

  isConfirmModalOpen: boolean
  setIsConfirmModalOpen: (open: boolean) => void

  isProcessing: boolean
  processingEstimate: string

  // Currently selected node details
  getSelectedNode: () => TaxonomyNode | undefined
  getL2Nodes: () => TaxonomyNode[]
  getL3Nodes: () => TaxonomyNode[]

  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void

  sortL1: SortType
  sortL2: SortType
  sortL3: SortType
  setSortL1: (sort: SortType) => void
  setSortL2: (sort: SortType) => void
  setSortL3: (sort: SortType) => void
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

  // Edit mode
  const [isEditMode, setIsEditMode] = useState(false)

  // Draft changes
  const [draftChanges, setDraftChanges] = useState<DraftChange[]>([])

  const [isBottomBarExpanded, setIsBottomBarExpanded] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)

  const [isProcessing, setIsProcessing] = useState(false)
  const [processingEstimate, setProcessingEstimate] = useState("2-3 hours")

  // Search
  const [searchQuery, setSearchQuery] = useState("")

  const [sortL1, setSortL1] = useState<SortType>("count-desc")
  const [sortL2, setSortL2] = useState<SortType>("count-desc")
  const [sortL3, setSortL3] = useState<SortType>("count-desc")

  // High-risk review state
  const [highRiskReview, setHighRiskReview] = useState<HighRiskReviewState | null>(null)

  // Selected change for split panel
  const [selectedChangeId, setSelectedChangeId] = useState<string | null>(null)

  // When L1 changes, reset L2 and L3
  const setSelectedL1Id = useCallback((id: string | null) => {
    setSelectedL1IdInternal(id)
    setSelectedL2IdInternal(null)
    setSelectedL3IdInternal(null)
  }, [])

  // When L2 changes, reset L3
  const setSelectedL2Id = useCallback((id: string | null) => {
    setSelectedL2IdInternal(id)
    setSelectedL3IdInternal(null)
  }, [])

  const setSelectedL3Id = useCallback((id: string | null) => {
    setSelectedL3IdInternal(id)
  }, [])

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

  // Draft change management
  const addDraftChange = useCallback((change: Omit<DraftChange, "id" | "timestamp">): string => {
    const id = `change-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
    setDraftChanges((prev) => [
      ...prev,
      {
        ...change,
        id,
        timestamp: new Date(),
      },
    ])
    return id
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

  const acceptWorkaround = useCallback((changeId: string) => {
    setDraftChanges((prev) => {
      const target = prev.find((c) => c.id === changeId)
      if (!target || !target.agentAnalysis?.workaround) return prev
      const workaroundText = target.agentAnalysis.workaround
      // Mark original change(s) with workaround-accepted resolution
      const updated = prev.map((c) =>
        (c.id === changeId || (target.operationDescription && c.operationDescription === target.operationDescription))
          ? { ...c, resolution: 'workaround-accepted' as const }
          : c
      )
      // Create a new draft change representing the workaround
      const newId = `change-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
      const workaroundChange: DraftChange = {
        id: newId,
        nodeId: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        nodeName: target.nodeName,
        nodeLevel: target.nodeLevel,
        field: target.field,
        oldValue: target.oldValue,
        newValue: workaroundText,
        timestamp: new Date(),
        agentAnalysis: { ...target.agentAnalysis, status: 'pass' as const },
        operationDescription: `Workaround: ${workaroundText.substring(0, 80)}`,
      }
      return [...updated, workaroundChange]
    })
  }, [])

  const discardAllChanges = useCallback(() => {
    setDraftChanges([])
    setIsBottomBarExpanded(false)
    setSelectedChangeId(null)
    setHighRiskReview(null)
  }, [])

  const applyChanges = useCallback(() => {
    console.log("Applying changes:", draftChanges)
    setDraftChanges([])
    setIsEditMode(false)
    setIsBottomBarExpanded(false)
    setIsConfirmModalOpen(false)
    setSelectedChangeId(null)
    setHighRiskReview(null)
    setIsProcessing(true)
    setProcessingEstimate("2-3 hours")
  }, [draftChanges])

  // Build wisdom context from node + partial context
  const buildWisdomContext = useCallback(
    (node: TaxonomyNode, level: "L1" | "L2" | "L3", wisdomContext?: Partial<WisdomPromptContext>): WisdomPromptContext => {
      return {
        currentName: node.name,
        l3Name: level === "L3" ? node.name : undefined,
        themeName: level === "L3" ? undefined : node.name,
        ...wisdomContext,
      }
    },
    []
  )

  // Low/Medium risk: add draft change immediately, run analysis in background
  const addDraftChangeWithAnalysis = useCallback(
    (
      node: TaxonomyNode,
      level: "L1" | "L2" | "L3",
      operationType: TaxonomyOperationType,
      wisdomContext?: Partial<WisdomPromptContext>
    ) => {
      const fullWisdomContext = buildWisdomContext(node, level, wisdomContext)
      const agentCtx: AgentContext = {
        selectedNode: node,
        nodeLevel: level,
        operationType,
        wisdomContext: fullWisdomContext,
      }

      // Build diff items and convert to draft changes
      const diffItems = buildDiffFromContext(agentCtx)
      const description = buildOperationDescription(agentCtx)

      // Add each diff item as a draft change with analyzing status
      const changeIds: string[] = []
      diffItems.forEach((item) => {
        let change: Omit<DraftChange, "id" | "timestamp">

        if (item.type === "deleted") {
          change = {
            nodeId: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            nodeName: item.nodeName,
            nodeLevel: item.nodeType,
            field: "delete-keyword",
            oldValue: item.nodeName,
            newValue: "[DELETED]",
            agentAnalysis: { status: "analyzing", operationType },
            operationDescription: description,
          }
        } else if (item.type === "modified" && item.field) {
          change = {
            nodeId: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            nodeName: item.nodeName,
            nodeLevel: item.nodeType,
            field: item.field,
            oldValue: item.oldValue || "",
            newValue: item.newValue || "",
            agentAnalysis: { status: "analyzing", operationType },
            operationDescription: description,
          }
        } else if (item.type === "added") {
          change = {
            nodeId: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            nodeName: item.nodeName,
            nodeLevel: item.nodeType,
            field: "add-keyword",
            oldValue: "",
            newValue: item.nodeName,
            agentAnalysis: { status: "analyzing", operationType },
            operationDescription: description,
          }
        } else if (item.type === "moved") {
          change = {
            nodeId: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            nodeName: item.nodeName,
            nodeLevel: item.nodeType,
            field: "move-keyword",
            oldValue: item.path || "",
            newValue: item.movedTo || "",
            agentAnalysis: { status: "analyzing", operationType },
            operationDescription: description,
          }
        } else {
          return
        }

        const id = addDraftChange(change)
        changeIds.push(id)
      })

      // Fire Wisdom analysis in background
      queryWisdom(operationType, fullWisdomContext).then((wisdomResponse) => {
        const analysis = parseWisdomToAnalysis(wisdomResponse, operationType)
        // Update all related draft changes with the analysis result
        changeIds.forEach((id) => {
          updateDraftAnalysis(id, analysis)
        })
      }).catch((err) => {
        console.error("Wisdom analysis failed:", err)
        const errorAnalysis: AgentAnalysis = { status: "error", operationType }
        changeIds.forEach((id) => {
          updateDraftAnalysis(id, errorAnalysis)
        })
      })
    },
    [addDraftChange, updateDraftAnalysis, buildWisdomContext]
  )

  // High-risk: block until user accepts or rejects
  const initiateHighRiskReview = useCallback(
    (
      node: TaxonomyNode,
      level: "L1" | "L2" | "L3",
      operationType: TaxonomyOperationType,
      wisdomContext?: Partial<WisdomPromptContext>
    ) => {
      const fullWisdomContext = buildWisdomContext(node, level, wisdomContext)
      const agentCtx: AgentContext = {
        selectedNode: node,
        nodeLevel: level,
        operationType,
        wisdomContext: fullWisdomContext,
      }

      const pendingDiff = buildDiffFromContext(agentCtx)
      const description = buildOperationDescription(agentCtx)

      setHighRiskReview({
        node,
        level,
        operationType,
        wisdomContext: fullWisdomContext,
        pendingDiff,
        analysis: { status: "analyzing", operationType },
        operationDescription: description,
      })

      // Auto-expand bottom bar
      setIsBottomBarExpanded(true)

      // Fire Wisdom analysis
      queryWisdom(operationType, fullWisdomContext).then((wisdomResponse) => {
        const analysis = parseWisdomToAnalysis(wisdomResponse, operationType)
        setHighRiskReview((prev) =>
          prev ? { ...prev, analysis } : null
        )
      }).catch((err) => {
        console.error("High-risk Wisdom analysis failed:", err)
        setHighRiskReview((prev) =>
          prev ? { ...prev, analysis: { status: "error", operationType } } : null
        )
      })
    },
    [buildWisdomContext]
  )

  const acceptHighRiskReview = useCallback(() => {
    if (!highRiskReview) return

    // Convert pending diff to draft changes with the analysis attached
    highRiskReview.pendingDiff.forEach((item) => {
      if (item.type === "deleted") {
        addDraftChange({
          nodeId: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          nodeName: item.nodeName,
          nodeLevel: item.nodeType,
          field: "delete-keyword",
          oldValue: item.nodeName,
          newValue: "[DELETED]",
          agentAnalysis: highRiskReview.analysis,
          operationDescription: highRiskReview.operationDescription,
        })
      } else if (item.type === "modified" && item.field) {
        addDraftChange({
          nodeId: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          nodeName: item.nodeName,
          nodeLevel: item.nodeType,
          field: item.field,
          oldValue: item.oldValue || "",
          newValue: item.newValue || "",
          agentAnalysis: highRiskReview.analysis,
          operationDescription: highRiskReview.operationDescription,
        })
      } else if (item.type === "added") {
        addDraftChange({
          nodeId: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          nodeName: item.nodeName,
          nodeLevel: item.nodeType,
          field: "add-keyword",
          oldValue: "",
          newValue: item.nodeName,
          agentAnalysis: highRiskReview.analysis,
          operationDescription: highRiskReview.operationDescription,
        })
      } else if (item.type === "moved") {
        addDraftChange({
          nodeId: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          nodeName: item.nodeName,
          nodeLevel: item.nodeType,
          field: "move-keyword",
          oldValue: item.path || "",
          newValue: item.movedTo || "",
          agentAnalysis: highRiskReview.analysis,
          operationDescription: highRiskReview.operationDescription,
        })
      }
    })

    setHighRiskReview(null)
  }, [highRiskReview, addDraftChange])

  const rejectHighRiskReview = useCallback(() => {
    setHighRiskReview(null)
  }, [])

  // Compute analysis stats
  const analysisStats = useMemo(() => {
    const stats = { pass: 0, warn: 0, fail: 0, pending: 0 }
    // Count unique analyses (group by operation since multi-diff operations share the same analysis)
    const counted = new Set<string>()

    for (const change of draftChanges) {
      const key = change.operationDescription || change.id
      if (counted.has(key)) continue
      counted.add(key)

      const status = change.agentAnalysis?.status
      if (status === "pass") stats.pass++
      else if (status === "warn") stats.warn++
      else if (status === "fail") stats.fail++
      else stats.pending++
    }
    return stats
  }, [draftChanges])

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
        draftChanges,
        addDraftChange,
        removeDraftChange,
        acceptDraftChange,
        setDraftResolution,
        acceptWorkaround,
        discardAllChanges,
        applyChanges,
        addDraftChangeWithAnalysis,
        updateDraftAnalysis,
        highRiskReview,
        initiateHighRiskReview,
        acceptHighRiskReview,
        rejectHighRiskReview,
        selectedChangeId,
        setSelectedChangeId,
        analysisStats,
        isBottomBarExpanded,
        setIsBottomBarExpanded,
        isConfirmModalOpen,
        setIsConfirmModalOpen,
        isProcessing,
        processingEstimate,
        getSelectedNode,
        getL2Nodes,
        getL3Nodes,
        searchQuery,
        setSearchQuery,
        sortL1,
        sortL2,
        sortL3,
        setSortL1,
        setSortL2,
        setSortL3,
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
