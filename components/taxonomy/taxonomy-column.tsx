"use client"

import type { TaxonomyNode } from "@/lib/taxonomy-data"
import { cn } from "@/lib/utils"
import { FileText, Minus, Filter, ArrowUpDown, Check } from "lucide-react"
import { useTaxonomy, type SortType } from "@/lib/taxonomy-context"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { type TaxonomyOperationType, type WisdomPromptContext } from "@/lib/wisdom-prompts"

interface TaxonomyColumnProps {
  title: string
  count: number
  nodes: TaxonomyNode[]
  selectedId: string | null
  onSelect: (id: string) => void
  level: 1 | 2 | 3
  isEditMode?: boolean
  changedNodeIds?: string[]
}

function sortNodes(nodes: TaxonomyNode[], sortType: SortType): TaxonomyNode[] {
  const sorted = [...nodes]

  switch (sortType) {
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case "name-desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name))
    case "count-asc":
      return sorted.sort((a, b) => a.count - b.count)
    case "count-desc":
      return sorted.sort((a, b) => b.count - a.count)
    default:
      return sorted
  }
}

export function TaxonomyColumn({
  title,
  count,
  nodes,
  selectedId,
  onSelect,
  level,
  isEditMode = false,
  changedNodeIds = [],
}: TaxonomyColumnProps) {
  const { sortL1, sortL2, sortL3, setSortL1, setSortL2, setSortL3, setIsAgentOverlayOpen, openAgentOverlay } = useTaxonomy()

  const currentSort = level === 1 ? sortL1 : level === 2 ? sortL2 : sortL3
  const setSort = level === 1 ? setSortL1 : level === 2 ? setSortL2 : setSortL3

  const sortedNodes = sortNodes(nodes, currentSort)

  const getLevelIcon = () => {
    switch (level) {
      case 1:
        return <Minus className="w-3 h-3" />
      case 2:
        return <Filter className="w-3 h-3" />
      case 3:
        return <Filter className="w-3 h-3 rotate-180" />
    }
  }

  const getSortLabel = (sortType: SortType) => {
    switch (sortType) {
      case "name-asc":
        return "Name (A-Z)"
      case "name-desc":
        return "Name (Z-A)"
      case "count-desc":
        return "Count (High to Low)"
      case "count-asc":
        return "Count (Low to High)"
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground border-b border-border">
        {getLevelIcon()}
        <span className="font-medium">{title}</span>
        <span className="text-muted-foreground">{count}</span>

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1 hover:text-foreground transition-colors">
              <ArrowUpDown className="w-3.5 h-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setSort("name-asc")} className="flex items-center justify-between">
                <span>Name (A-Z)</span>
                {currentSort === "name-asc" && <Check className="w-4 h-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort("name-desc")} className="flex items-center justify-between">
                <span>Name (Z-A)</span>
                {currentSort === "name-desc" && <Check className="w-4 h-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort("count-desc")} className="flex items-center justify-between">
                <span>Count (High to Low)</span>
                {currentSort === "count-desc" && <Check className="w-4 h-4" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSort("count-asc")} className="flex items-center justify-between">
                <span>Count (Low to High)</span>
                {currentSort === "count-asc" && <Check className="w-4 h-4" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto">
        {sortedNodes.map((node) => {
          const hasChanges = changedNodeIds.includes(node.id)

          return (
            <div
              key={node.id}
              onClick={() => onSelect(node.id)}
              className={cn(
                "flex items-center justify-between px-4 py-2.5 cursor-pointer border-l-2 transition-colors",
                selectedId === node.id ? "border-l-[#2D7A7A] bg-[#2D7A7A]/5" : "border-l-transparent hover:bg-muted/50",
                hasChanges && "border border-dashed border-[#2D7A7A]/40 rounded mx-2 border-l-2",
              )}
            >
              <span className={cn("text-sm truncate pr-2", selectedId === node.id && "font-medium text-[#2D7A7A]")}>
                {node.name}
              </span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                <FileText className="w-3 h-3" />
                <span>{node.count.toLocaleString()}</span>
              </div>
            </div>
          )
        })}

        {/* Add keyword button in edit mode */}
        {isEditMode && (
          <div
            className="flex items-center justify-center px-4 py-3 text-sm text-muted-foreground border border-dashed border-border rounded-lg mx-4 mt-2 cursor-pointer hover:bg-muted/50"
            onClick={() => {
              // Create a placeholder node for adding new keywords
              const placeholderNode: TaxonomyNode = {
                id: `new-${level}`,
                name: `New L${level} Keyword`,
                count: 0,
                description: "",
              }
              const nodeLevel = `L${level}` as "L1" | "L2" | "L3"
              const operationType: TaxonomyOperationType = level === 3 ? "create-subtheme" : "create-theme"
              const wisdomContext: Partial<WisdomPromptContext> = {
                proposedName: `New L${level} Keyword`,
              }
              openAgentOverlay(placeholderNode, nodeLevel, operationType, wisdomContext)
            }}
          >
            <span>+ Add L{level} Keyword</span>
          </div>
        )}
      </div>
    </div>
  )
}
