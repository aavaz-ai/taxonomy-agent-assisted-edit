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

  const handleProceed = () => {
    // Expand the bottom bar to show changes
    setIsBottomBarExpanded(true)
  }

  const handleSaveChanges = () => {
    // Open confirmation modal
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

  return (
    <div
      className={`absolute bottom-0 left-[200px] right-0 px-4 pb-4 transition-all duration-300 ease-in-out ${
        isEditMode ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="bg-background rounded-xl border-2 border-dashed border-[#2D7A7A]/40 shadow-lg overflow-hidden">
        {/* Header row - always visible */}
        <div
          className="px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-muted/30"
          onClick={() => setIsBottomBarExpanded(!isBottomBarExpanded)}
        >
          <div className="flex items-center gap-3">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Draft changes</span>
            {draftChanges.length > 0 && (
              <span className="bg-[#2D7A7A]/10 text-[#2D7A7A] text-xs font-medium px-2 py-0.5 rounded border border-dashed border-[#2D7A7A]/30">
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

            {!isBottomBarExpanded ? (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleProceed()
                }}
                className="bg-[#2D7A7A] hover:bg-[#236363] text-white"
              >
                Proceed
              </Button>
            ) : (
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
            )}

            {/* Expand/Collapse indicator */}
            {isBottomBarExpanded ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Expanded content - shows what changed */}
        {isBottomBarExpanded && (
          <div className="border-t border-dashed border-[#2D7A7A]/20 px-6 py-4 max-h-[200px] overflow-y-auto">
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
                        <span className="bg-[#2D7A7A]/10 text-[#2D7A7A] text-xs font-medium px-2 py-0.5 rounded">
                          {group.nodeLevel} {group.nodeName}
                        </span>
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
        )}
      </div>
    </div>
  )
}
