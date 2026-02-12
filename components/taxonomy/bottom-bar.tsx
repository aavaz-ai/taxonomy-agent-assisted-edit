"use client"

import { useState, useEffect, useRef } from "react"
import { useTaxonomy } from "@/lib/taxonomy-context"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown, Layers, CheckCircle2, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { ChangeDiffBlock } from "./change-diff-block"
import { AgentAnalysisPanel } from "./agent-analysis-panel"
import { HighRiskReviewCard } from "./high-risk-review-card"

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
    selectedChangeId,
    setSelectedChangeId,
    analysisStats,
    highRiskReview,
    acceptHighRiskReview,
    rejectHighRiskReview,
    acceptWorkaround,
    setDraftResolution,
    addDraftChange,
    buildNodePath,
    currentNavIds,
    setSelectedL1Id,
    setSelectedL2Id,
    setSelectedL3Id,
    cardDisplayMode,
  } = useTaxonomy()

  const [shouldRender, setShouldRender] = useState(false)
  const barRef = useRef<HTMLDivElement>(null)
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

  // Collapse when all changes are removed
  useEffect(() => {
    if (draftChanges.length === 0 && isBottomBarExpanded) {
      setIsBottomBarExpanded(false)
    }
  }, [draftChanges.length, isBottomBarExpanded, setIsBottomBarExpanded])

  // Auto-expand when high-risk review starts
  useEffect(() => {
    if (highRiskReview) {
      setIsBottomBarExpanded(true)
    }
  }, [highRiskReview, setIsBottomBarExpanded])

  // Auto-accept APPROVE verdicts — add to drafts without user action
  useEffect(() => {
    if (highRiskReview?.analysis.verdict === "APPROVE") {
      acceptHighRiskReview()
    }
  }, [highRiskReview?.analysis.verdict, acceptHighRiskReview])

  const handleDiscard = () => {
    discardAllChanges()
    setIsEditMode(false)
  }

  const handleSaveChanges = () => {
    setIsConfirmModalOpen(true)
  }

  const handleUndo = (changeId: string) => {
    removeDraftChange(changeId)
    if (selectedChangeId === changeId) {
      setSelectedChangeId(null)
    }
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

  // Find selected change for right panel
  const selectedChange = selectedChangeId
    ? draftChanges.find((c) => c.id === selectedChangeId)
    : null

  // Status summary for B1 header
  const totalApproved = analysisStats.pass
  const totalNeedsReview = analysisStats.warn + analysisStats.fail
  const totalPending = analysisStats.pending
  const hasStatusInfo = draftChanges.length > 0 && draftChanges.some((c) => c.agentAnalysis)

  if (!shouldRender) return null

  return (
    <div
      className="grid transition-[grid-template-rows] duration-[250ms] ease-spring"
      style={{ gridTemplateRows: isEditMode ? '1fr' : '0fr' }}
    >
      <div className="overflow-hidden">
        <div
          ref={barRef}
          className={cn(
            "bg-background border-t border-border",
            isClosing
              ? 'animate-[slideDown_250ms_var(--ease-spring)_forwards]'
              : 'animate-[slideUp_250ms_var(--ease-spring)]',
          )}
        >
        {/* B1 Header row */}
        <div
          className={cn(
            "px-6 py-3 flex items-center justify-between transition-colors",
            draftChanges.length > 0 ? "cursor-pointer hover:bg-muted/30" : "cursor-default"
          )}
          onClick={() => {
            if (draftChanges.length > 0) {
              setIsBottomBarExpanded(!isBottomBarExpanded)
            } else {
              barRef.current?.animate(
                [
                  { transform: 'translateY(0)' },
                  { transform: 'translateY(-6px)' },
                  { transform: 'translateY(0)' },
                ],
                { duration: 400, easing: 'ease-out' }
              )
            }
          }}
        >
          <div className="flex items-center gap-3">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className={cn("text-sm font-medium", draftChanges.length > 0 ? "text-foreground" : "text-muted-foreground")}>
                {draftChanges.length === 0
                  ? "No changes yet"
                  : `${draftChanges.length} ${draftChanges.length === 1 ? "change" : "changes"}`}
              </span>
              {/* B1 status summary line */}
              {hasStatusInfo && (
                <div className="flex items-center gap-3 mt-0.5">
                  {totalApproved > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-green-600">
                      <CheckCircle2 className="w-3 h-3" />
                      {totalApproved} approved
                    </span>
                  )}
                  {totalNeedsReview > 0 && (
                    <span className="flex items-center gap-1 text-[11px] text-amber-600">
                      <AlertTriangle className="w-3 h-3" />
                      {totalNeedsReview} needs review
                    </span>
                  )}
                  {totalPending > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      {totalPending} analyzing...
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* High risk indicator */}
            {highRiskReview && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-md">
                <AlertTriangle className="w-3.5 h-3.5" />
                Review required
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
              Discard all
            </Button>

            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleSaveChanges()
              }}
              className="bg-[#2D7A7A] hover:bg-[#236363] text-white"
              disabled={highRiskReview !== null}
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

        {/* Expanded content - split panel */}
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-spring"
          style={{ gridTemplateRows: isBottomBarExpanded ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            <div className="border-t border-border flex h-[50vh]">
              {/* Left panel (B2): Change list */}
              <div className={cn(
                "overflow-y-auto px-4 py-3 transition-all duration-300 shrink-0",
                "w-1/3 border-r border-border"
              )}>
                {Object.entries(groupedChanges).length === 0 && !highRiskReview ? (
                  <p className="text-sm text-muted-foreground py-2">No changes yet</p>
                ) : (
                  <div className="space-y-2">
                    {/* High-risk pending review at top */}
                    {highRiskReview && (
                      <div
                        className={cn(
                          "rounded-lg border-2 border-amber-400 bg-amber-50/60 px-3 py-2 cursor-pointer",
                          !selectedChangeId && "ring-2 ring-amber-400/40"
                        )}
                        onClick={() => setSelectedChangeId(null)}
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span className="text-xs text-amber-800 font-medium">Pending review</span>
                        </div>
                        <p className="text-xs text-amber-700 mt-1 truncate">
                          {highRiskReview.operationDescription}
                        </p>
                      </div>
                    )}

                    {Object.entries(groupedChanges).map(([nodeId, group]) => {
                      const firstChangeId = group.changes[0]?.id
                      return (
                        <ChangeDiffBlock
                          key={nodeId}
                          group={group}
                          onUndo={handleUndo}
                          isSelected={selectedChangeId === firstChangeId}
                          onClick={() => setSelectedChangeId(
                            selectedChangeId === firstChangeId ? null : firstChangeId || null
                          )}
                          displayMode={cardDisplayMode}
                        />
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Right panel (B3): Agent analysis or high-risk review */}
              <div className={cn(
                "bg-muted/5 transition-all duration-300 overflow-hidden",
                "w-2/3"
              )}>
                {highRiskReview && !selectedChangeId ? (
                  <HighRiskReviewCard
                    review={highRiskReview}
                    onAcceptWorkaround={acceptWorkaround}
                    onDismiss={() => {
                      const path = buildNodePath()
                      const navIds = currentNavIds()
                      // Add pending diff to drafts with 'dismissed' resolution
                      highRiskReview.pendingDiff.forEach((item) => {
                        const base = {
                          nodeId: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                          nodeName: item.nodeName,
                          nodeLevel: item.nodeType,
                          agentAnalysis: highRiskReview.analysis,
                          operationDescription: highRiskReview.operationDescription,
                          resolution: 'dismissed' as const,
                          nodePath: path,
                          nodeNavIds: navIds,
                        }
                        if (item.type === "deleted") {
                          addDraftChange({ ...base, field: "delete-keyword", oldValue: item.nodeName, newValue: "[DELETED]" })
                        } else if (item.type === "modified" && item.field) {
                          addDraftChange({ ...base, field: item.field, oldValue: item.oldValue || "", newValue: item.newValue || "" })
                        } else if (item.type === "added") {
                          addDraftChange({ ...base, field: "add-keyword", oldValue: "", newValue: item.nodeName })
                        } else if (item.type === "moved") {
                          addDraftChange({ ...base, field: "move-keyword", oldValue: item.path || "", newValue: item.movedTo || "" })
                        }
                      })
                      rejectHighRiskReview()
                    }}
                    onContactEnterpret={() => {
                      const path = buildNodePath()
                      const navIds = currentNavIds()
                      // Add pending diff to drafts with 'contacted' resolution
                      highRiskReview.pendingDiff.forEach((item) => {
                        const base = {
                          nodeId: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                          nodeName: item.nodeName,
                          nodeLevel: item.nodeType,
                          agentAnalysis: highRiskReview.analysis,
                          operationDescription: highRiskReview.operationDescription,
                          resolution: 'contacted' as const,
                          nodePath: path,
                          nodeNavIds: navIds,
                        }
                        if (item.type === "deleted") {
                          addDraftChange({ ...base, field: "delete-keyword", oldValue: item.nodeName, newValue: "[DELETED]" })
                        } else if (item.type === "modified" && item.field) {
                          addDraftChange({ ...base, field: item.field, oldValue: item.oldValue || "", newValue: item.newValue || "" })
                        } else if (item.type === "added") {
                          addDraftChange({ ...base, field: "add-keyword", oldValue: "", newValue: item.nodeName })
                        } else if (item.type === "moved") {
                          addDraftChange({ ...base, field: "move-keyword", oldValue: item.path || "", newValue: item.movedTo || "" })
                        }
                      })
                      rejectHighRiskReview()
                    }}
                  />
                ) : selectedChange ? (
                  <AgentAnalysisPanel
                    change={selectedChange}
                    onDismiss={() => {
                      setDraftResolution(selectedChange.id, 'dismissed')
                      setSelectedChangeId(null)
                    }}
                    onContactEnterpret={() => {
                      setDraftResolution(selectedChange.id, 'contacted')
                      setSelectedChangeId(null)
                    }}
                    onPathClick={() => {
                      const navIds = selectedChange.nodeNavIds
                      if (navIds?.l1) setSelectedL1Id(navIds.l1)
                      if (navIds?.l2) setSelectedL2Id(navIds.l2)
                      if (navIds?.l3) setSelectedL3Id(navIds.l3)
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <p className="text-sm">Select a change to see details</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
