"use client"

import { useState, useEffect } from "react"
import { useTaxonomy } from "@/lib/taxonomy-context"
import { Button } from "@/components/ui/button"
import { X, ChevronUp, ChevronDown, Layers } from "lucide-react"
import { ChangeDiffBlock } from "./change-diff-block"

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

  const [shouldRender, setShouldRender] = useState(false)
  const isClosing = shouldRender && !isEditMode

  useEffect(() => {
    if (isEditMode) {
      setShouldRender(true)
    }
  }, [isEditMode])

  useEffect(() => {
    if (isClosing) {
      const timer = setTimeout(() => setShouldRender(false), 250)
      return () => clearTimeout(timer)
    }
  }, [isClosing])

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

  if (!shouldRender) return null

  return (
    <div
      className="grid transition-[grid-template-rows] duration-[250ms] ease-spring"
      style={{ gridTemplateRows: isEditMode ? '1fr' : '0fr' }}
    >
      <div className="overflow-hidden">
        <div className={`bg-background border-t border-border ${
          isClosing
            ? 'animate-[slideDown_250ms_var(--ease-spring)_forwards]'
            : 'animate-[slideUp_250ms_var(--ease-spring)]'
        }`}>
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
                {draftChanges.length} {draftChanges.length === 1 ? "change" : "changes"}
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

        {/* Expanded content - animated with CSS grid */}
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-spring"
          style={{ gridTemplateRows: isBottomBarExpanded ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            <div className="border-t border-border px-6 py-4 overflow-y-auto max-h-[33vh]">
              {Object.entries(groupedChanges).length === 0 ? (
                <p className="text-sm text-muted-foreground">No changes yet</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedChanges).map(([nodeId, group]) => (
                    <ChangeDiffBlock key={nodeId} group={group} onUndo={handleUndo} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
