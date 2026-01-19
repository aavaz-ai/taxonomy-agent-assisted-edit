"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import { sampleTaxonomyData, type TaxonomyData, type TaxonomyNode } from "./taxonomy-data"

export interface DraftChange {
  id: string
  nodeId: string
  nodeName: string
  nodeLevel: "L1" | "L2" | "L3" | "Theme"
  field: string
  oldValue: string
  newValue: string
  timestamp: Date
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
  addDraftChange: (change: Omit<DraftChange, "id" | "timestamp">) => void
  removeDraftChange: (id: string) => void
  discardAllChanges: () => void
  applyChanges: () => void

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
  // Use sample data - replace with API call for real data
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

    // If it's a catch-all node (Miscellaneous or Generic), only return its own children
    if (isCatchAllNode(l1Node)) {
      return l1Node.children || []
    }

    // For regular nodes, return children + Miscellaneous + Generic at the end
    const regularChildren = l1Node.children || []
    const catchAllNodes = getCatchAllL2Nodes(taxonomyData)

    return [...regularChildren, ...catchAllNodes]
  }, [selectedL1Id, taxonomyData])

  const getL3Nodes = useCallback((): TaxonomyNode[] => {
    if (!selectedL1Id || !selectedL2Id) return []
    const l1Node = taxonomyData.level1.find((n) => n.id === selectedL1Id)
    if (!l1Node) return []

    // If L1 is a catch-all node, find L2 within its children
    if (isCatchAllNode(l1Node)) {
      const l2Node = l1Node.children?.find((n) => n.id === selectedL2Id)
      return l2Node?.children || []
    }

    // Check if selected L2 is a catch-all node
    const selectedL2Node = [...(l1Node.children || []), ...getCatchAllL2Nodes(taxonomyData)].find(
      (n) => n.id === selectedL2Id,
    )

    if (selectedL2Node && isCatchAllNode(selectedL2Node)) {
      // If L2 is Miscellaneous or Generic, only return its own children
      return selectedL2Node.children || []
    }

    // For regular L2 nodes, return children + Miscellaneous + Generic at the end
    const l2Node = l1Node.children?.find((n) => n.id === selectedL2Id)
    const regularChildren = l2Node?.children || []
    const catchAllNodes = getCatchAllL3Nodes(taxonomyData)

    return [...regularChildren, ...catchAllNodes]
  }, [selectedL1Id, selectedL2Id, taxonomyData])

  // Get the currently selected node (deepest selection)
  const getSelectedNode = useCallback((): TaxonomyNode | undefined => {
    if (!selectedL1Id) return undefined

    const l1Node = taxonomyData.level1.find((n) => n.id === selectedL1Id)
    if (!selectedL2Id) return l1Node

    const l2Node = l1Node?.children?.find((n) => n.id === selectedL2Id)
    if (!selectedL3Id) return l2Node

    return l2Node?.children?.find((n) => n.id === selectedL3Id)
  }, [selectedL1Id, selectedL2Id, selectedL3Id, taxonomyData])

  // Draft change management
  const addDraftChange = useCallback((change: Omit<DraftChange, "id" | "timestamp">) => {
    setDraftChanges((prev) => [
      ...prev,
      {
        ...change,
        id: `change-${Date.now()}`,
        timestamp: new Date(),
      },
    ])
  }, [])

  const removeDraftChange = useCallback((id: string) => {
    setDraftChanges((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const discardAllChanges = useCallback(() => {
    setDraftChanges([])
    setIsBottomBarExpanded(false)
  }, [])

  const applyChanges = useCallback(() => {
    console.log("Applying changes:", draftChanges)
    setDraftChanges([])
    setIsEditMode(false)
    setIsBottomBarExpanded(false)
    setIsConfirmModalOpen(false)
    // Start processing state
    setIsProcessing(true)
    setProcessingEstimate("2-3 hours")
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
        discardAllChanges,
        applyChanges,
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
