"use client"

import { useTaxonomy } from "@/lib/taxonomy-context"
import { Button } from "@/components/ui/button"
import { X, ChevronUp, ChevronDown, Undo2, Layers } from "lucide-react"

export function BottomBar() {
  const {
    isEditMode,
    draftChanges,
    discardAllChanges,
    setIsEditMode,
    isBottomBarExpanded,
    setIsBottomBarExpanded,
    setIsConfirmModalOpen,
    removeDraftChange,
  } = useTaxonomy()

  const handleDiscard = () => {
    discardAllChanges()
    setIsEditMode(false)
  }

  const handleSaveChanges = () => {
    setIsConfirmModalOpen(true)
  }

  const handleUndo = (changeId: string) => {
    removeDraftChange(changeId)
  }

  // Group changes by nodeId for display
  const groupedChanges = draftChanges.reduce(
    (acc, change) => {
      if (!acc[change.nodeId]) {
        acc[change.nodeId] = {
          nodeName: change.nodeName,
          nodeLevel: change.nodeLevel,
          changes: [],
        }
      }
      acc[change.nodeId].changes.push(change)
      return acc
    },
    {} as Record<string, { nodeName: string; nodeLevel: string; changes: typeof draftChanges }>,
  )

  if (!isEditMode) return null

  return (
    <div className="bg-background border-t border-border overflow-hidden animate-[slideUp_250ms_var(--ease-spring)]">
        {/* Header row - always visible */}
        <div
          className="px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setIsBottomBarExpanded(!isBottomBarExpanded)}
        >
          <div className="flex items-center gap-3">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Draft changes</span>
            {draftChanges.length > 0 && (
              <span className="bg-[#2D7A7A] text-white text-xs font-medium px-2 py-0.5 rounded">
                {draftChanges.length} updated
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleDiscard()
              }}
              className="text-muted-foreground"
            >
              <X className="w-4 h-4 mr-1" />
              Discard all
            </Button>

            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleSaveChanges()
              }}
              className="bg-[#2D7A7A] hover:bg-[#236363] text-white"
            >
              Save changes
            </Button>

            {/* Expand/Collapse indicator */}
            {isBottomBarExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Expanded content - animated with max-h */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-spring ${
            isBottomBarExpanded ? "max-h-[33vh]" : "max-h-0"
          }`}
        >
          <div className="border-t border-border px-6 py-4 overflow-y-auto max-h-[33vh]">
            {Object.entries(groupedChanges).length === 0 ? (
              <p className="text-sm text-muted-foreground">No changes yet</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedChanges).map(([nodeId, group]) => (
                  <div key={nodeId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Updated</span>
                        <span className="bg-[#2D7A7A] text-white text-xs font-medium px-2 py-0.5 rounded">
                          {group.nodeLevel}
                        </span>
                        <span className="text-sm text-foreground">{group.nodeName}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          group.changes.forEach((c) => handleUndo(c.id))
                        }}
                        className="text-muted-foreground text-xs"
                      >
                        <Undo2 className="w-3 h-3 mr-1" />
                        Undo
                      </Button>
                    </div>

                    {/* Show each field change */}
                    <div className="pl-6 space-y-1">
                      {group.changes.map((change) => (
                        <div key={change.id} className="text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">{change.field}:</span>{" "}
                          <span className="line-through text-red-400">{change.oldValue.slice(0, 50)}...</span>{" "}
                          <span className="text-[#2D7A7A]">{change.newValue.slice(0, 50)}...</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
  )
}
