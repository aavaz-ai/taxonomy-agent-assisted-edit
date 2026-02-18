"use client"

import { useRef, useEffect, useState } from "react"
import {
  ChevronUp, ChevronDown, ChevronRight, Check, Loader2,
  AlertTriangle, CheckCircle2, XCircle, ShieldAlert, Bot, ArrowLeft, ArrowRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useTaxonomy } from "@/lib/taxonomy-context"
import type { ScanState, HighRiskReviewState, AgentDiffItem } from "@/lib/taxonomy-context"
import type { AgentCheck } from "@/lib/agent-utils"
import { buildWorkaroundDraftChanges, type WorkaroundDraftChange } from "@/lib/agent-utils"
import { SlackThreadMock } from "./slack-thread-mock"

/* ── Operation detection from diff data ──────────────────── */
function getContentType(diffs: AgentDiffItem[]): "merge" | "split" | "rename" | "delete" | "create" {
  if (diffs.some(d => d.field === "merge-theme")) return "merge"
  const hasDeleted = diffs.some(d => d.type === "deleted")
  const hasAdded = diffs.some(d => d.type === "added")
  if (hasDeleted && hasAdded) return "split"
  if (diffs.every(d => d.type === "deleted")) return "delete"
  if (diffs.every(d => d.type === "added")) return "create"
  if (diffs[0]?.field === "name" || diffs[0]?.field === "category") return "rename"
  return "rename" // fallback for modified
}

/* ── ContentBlock — operation-aware neutral content display ── */
function ContentBlock({ diffs }: { diffs: AgentDiffItem[] }) {
  const contentType = getContentType(diffs)

  const neutralBox = (content: string) => (
    <div className="bg-muted rounded px-2 py-1.5 text-sm text-muted-foreground flex-1 min-w-0">
      <span className="truncate block">{content}</span>
    </div>
  )

  const stackedBox = (items: string[]) => (
    <div className="bg-muted rounded px-2 py-1.5 text-sm text-muted-foreground flex-1 min-w-0 flex flex-col gap-1">
      {items.map((item, i) => (
        <span key={i} className="truncate">{item}</span>
      ))}
    </div>
  )

  switch (contentType) {
    case "merge": {
      const sources = diffs.filter(d => d.type === "deleted" || d.type === "modified")
      const dest = diffs.find(d => d.type === "added" || d.type === "modified")
      return (
        <div className="flex items-center gap-2">
          {stackedBox(sources.map(d => d.oldValue || d.nodeName))}
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {neutralBox(dest?.newValue || dest?.nodeName || "")}
        </div>
      )
    }
    case "split": {
      const original = diffs.find(d => d.type === "deleted")
      const splits = diffs.filter(d => d.type === "added")
      return (
        <div className="flex items-center gap-2">
          {neutralBox(original?.oldValue || original?.nodeName || "")}
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          {stackedBox(splits.map(d => d.newValue || d.nodeName))}
        </div>
      )
    }
    case "delete":
      return neutralBox(diffs[0]?.oldValue || diffs[0]?.nodeName || "")
    case "create":
      return neutralBox(diffs[0]?.newValue || diffs[0]?.nodeName || "")
    case "rename":
    default: {
      const diff = diffs[0]
      return neutralBox(diff?.newValue || diff?.oldValue || diff?.nodeName || "")
    }
  }
}

/* ── WorkaroundStepsBlock — numbered workaround steps ────── */
function WorkaroundStepsBlock({ steps }: { steps: WorkaroundDraftChange[] }) {
  const mapFieldToContentType = (field: string): "merge" | "create" | "delete" | "rename" => {
    if (field === "merge-theme") return "merge"
    if (field === "add-keyword") return "create"
    if (field === "move-keyword") return "rename"
    if (field === "delete-keyword") return "delete"
    if (field === "category") return "rename"
    return "rename"
  }

  const getOperationLabel = (step: WorkaroundDraftChange): string => {
    const field = step.field
    if (field === "merge-theme") return "Merge"
    if (field === "add-keyword") return "Create keyword"
    if (field === "move-keyword") return "Move"
    if (field === "delete-keyword") return "Delete"
    if (field === "category") return "Change category"
    return "Update"
  }

  const buildStepDiffs = (step: WorkaroundDraftChange): AgentDiffItem[] => {
    const contentType = mapFieldToContentType(step.field)
    switch (contentType) {
      case "merge":
        return [{
          type: "modified",
          nodeType: step.nodeLevel,
          nodeName: step.oldValue,
          field: "merge-theme",
          oldValue: step.oldValue,
          newValue: step.newValue,
        }]
      case "create":
        return [{
          type: "added",
          nodeType: step.nodeLevel,
          nodeName: step.newValue || step.nodeName,
        }]
      case "delete":
        return [{
          type: "deleted",
          nodeType: step.nodeLevel,
          nodeName: step.oldValue || step.nodeName,
        }]
      default:
        return [{
          type: "modified",
          nodeType: step.nodeLevel,
          nodeName: step.nodeName,
          field: step.field,
          oldValue: step.oldValue,
          newValue: step.newValue,
        }]
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <span className="text-xs text-muted-foreground font-mono">Workaround suggestion:</span>
      {steps.map((step, i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <span className="text-sm text-foreground font-medium">
            {i + 1}. {getOperationLabel(step)}
          </span>
          <div className="ml-4">
            <ContentBlock diffs={buildStepDiffs(step)} />
          </div>
        </div>
      ))}
    </div>
  )
}

/* ── CheckItem (ported from high-risk-review-card) ────────── */
function CheckItem({ label, status, detail }: { label: string; status: "pass" | "warn" | "fail"; detail?: string }) {
  const icon = status === "pass"
    ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
    : status === "warn"
    ? <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
    : <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />

  return (
    <div className="flex items-start gap-2 py-1">
      <div className="mt-0.5">{icon}</div>
      <div className="text-xs">
        <span className="text-foreground">{label}</span>
        {detail && <span className="text-muted-foreground ml-1">— {detail}</span>}
      </div>
    </div>
  )
}

/* ── Draft change summary for the footer ──────────────────── */
function DraftSummary({ count, onAccept, onDiscard }: { count: number; onAccept: () => void; onDiscard: () => void }) {
  return (
    <div className="px-4 py-3 border-t border-border bg-muted/20 shrink-0">
      <p className="text-[10px] text-muted-foreground font-medium mb-2">
        {count} {count === 1 ? "change" : "changes"} in draft
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          className="flex-1 text-xs bg-[#2D7A7A] hover:bg-[#236363] text-white"
          onClick={onAccept}
        >
          Accept Changes
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs text-muted-foreground"
          onClick={onDiscard}
        >
          Discard
        </Button>
      </div>
    </div>
  )
}

/* ── AgentScanCard — main export ──────────────────────────── */
export function AgentScanCard() {
  const {
    scanState, highRiskReviews, rejectHighRiskReview,
    acceptHighRiskReview, acceptWorkaround,
    draftChanges, isEditMode, resetScan,
    applyChanges, discardAllChanges, setIsEditMode,
  } = useTaxonomy()

  const [isExpanded, setIsExpanded] = useState(false)
  const [showResearch, setShowResearch] = useState(false)
  const [showSlackThread, setShowSlackThread] = useState(false)
  const [showFullAnalysis, setShowFullAnalysis] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Track the last completed review so the card persists after scan ends
  const [lastReview, setLastReview] = useState<HighRiskReviewState | null>(null)
  const [lastVerdict, setLastVerdict] = useState<"approved" | "dismissed" | null>(null)

  // The currently active review (during scan)
  const activeReview = scanState.activeReviewId
    ? highRiskReviews.find(r => r.id === scanState.activeReviewId)
    : null

  // When a review completes analysis, snapshot it
  useEffect(() => {
    if (activeReview && activeReview.analysis.status !== 'analyzing') {
      setLastReview(activeReview)
      setLastVerdict(null)
      setShowResearch(false)
      setShowSlackThread(false)
      setShowFullAnalysis(false)
    }
  }, [activeReview?.analysis.status])

  // When scan starts, clear the last verdict label
  useEffect(() => {
    if (scanState.status === 'scanning') {
      setLastVerdict(null)
    }
  }, [scanState.status])

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [scanState.messages.length])

  // Clear persisted state when exiting edit mode
  useEffect(() => {
    if (!isEditMode) {
      setLastReview(null)
      setLastVerdict(null)
    }
  }, [isEditMode])

  // Don't render at all outside edit mode
  if (!isEditMode) return null

  // Determine which review to show (active during scan, or last completed)
  const displayReview = activeReview || lastReview
  const analysis = displayReview?.analysis
  const operationDescription = displayReview?.operationDescription || "Analyzing change"

  // -- Handlers --
  // Deep-copy a review so the snapshot survives context mutations from resetScan()
  const snapshotReview = (review: HighRiskReviewState): HighRiskReviewState => ({
    ...review,
    analysis: { ...review.analysis },
    pendingDiff: review.pendingDiff ? [...review.pendingDiff] : undefined,
  } as HighRiskReviewState)

  const handleAcceptReview = () => {
    if (!displayReview) return
    const snapshot = snapshotReview(displayReview)
    acceptHighRiskReview(displayReview.id)
    setLastVerdict("approved")
    setLastReview(snapshot)
    resetScan()
  }

  const handleDismiss = () => {
    if (!displayReview) return
    const snapshot = snapshotReview(displayReview)
    rejectHighRiskReview(displayReview.id)
    setLastVerdict("dismissed")
    setLastReview(snapshot)
    resetScan()
  }

  const handleAcceptWorkaround = () => {
    if (!displayReview) return
    const snapshot = snapshotReview(displayReview)
    acceptWorkaround(displayReview.id)
    setLastVerdict("approved")
    setLastReview(snapshot)
    resetScan()
  }

  const handleAcceptAllChanges = () => {
    applyChanges()
  }

  const handleDiscardAll = () => {
    discardAllChanges()
    setIsEditMode(false)
  }

  const isScanning = scanState.status === 'scanning'
  const hasResult = !isScanning && displayReview && analysis && analysis.status !== 'analyzing'
  const hasDrafts = draftChanges.length > 0

  // ── SCANNING STATE ──
  if (isScanning) {
    const activeMessage = scanState.messages.find(m => m.status === 'active')
      || scanState.messages[scanState.messages.length - 1]

    return (
      <div className="bg-white rounded-xl shadow-sm border border-border border-l-[3px] border-l-amber-400 overflow-hidden shrink-0 animate-[fadeIn_300ms_ease-out]">
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="w-8 h-8 rounded-full bg-[#2D7A7A] flex items-center justify-center shrink-0">
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">Agent thinking</p>
            {activeMessage && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">{activeMessage.text}</p>
            )}
          </div>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
        </div>

        {/* Undo link */}
        <div className="px-4 pb-3 -mt-1">
          <button
            onClick={handleDismiss}
            className="text-xs text-[#2D7A7A] hover:underline"
          >
            Undo change
          </button>
        </div>

        {/* Expanded: full message timeline */}
        <div
          className="grid transition-[grid-template-rows] duration-300 ease-spring"
          style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
        >
          <div className="overflow-hidden">
            <div
              ref={scrollRef}
              className="border-t border-border/60 px-4 py-3 max-h-[200px] overflow-y-auto"
            >
              <div className="space-y-2">
                {scanState.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex items-start gap-2 animate-[fadeIn_300ms_ease-out]"
                  >
                    {msg.status === 'active' ? (
                      <Loader2 className="w-3 h-3 text-[#2D7A7A] animate-spin mt-0.5 shrink-0" />
                    ) : (
                      <Check className="w-3 h-3 text-[#2D7A7A]/50 mt-0.5 shrink-0" />
                    )}
                    <span className={cn(
                      "text-xs",
                      msg.status === 'active' ? "text-foreground" : "text-muted-foreground"
                    )}>
                      {msg.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── RESULT STATE (persists until next scan) ──
  if (hasResult && analysis) {
    const isError = analysis.status === "error"
    const wasActedOn = lastVerdict !== null
    const verdictColor = analysis.verdict === "APPROVE" ? "green" :
      analysis.verdict === "REJECT" ? "red" : "amber"

    // Compute scan duration from message timestamps
    const scanDuration = (() => {
      const msgs = scanState.messages
      if (msgs.length < 2) return null
      const first = msgs[0].timestamp.getTime()
      const last = msgs[msgs.length - 1].timestamp.getTime()
      return Math.round((last - first) / 1000)
    })()

    return (
      <div className={cn(
        "bg-white rounded-lg shadow-[1px_1px_4px_0px_#e6e2df] border border-dashed overflow-hidden shrink-0 flex flex-col max-h-[70vh] animate-[fadeIn_300ms_ease-out]",
        lastVerdict === "approved" ? "border-[#69bc99]" :
        lastVerdict === "dismissed" ? "border-muted-foreground/30" :
        verdictColor === "green" ? "border-[#277681]" :
        verdictColor === "red" ? "border-[#277681]" :
        "border-[#277681]"
      )}>
        {/* Error state */}
        {isError && (
          <div className="flex flex-col items-center justify-center gap-3 p-6">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <span className="text-sm text-red-600">Analysis failed</span>
          </div>
        )}

        {/* Analysis content */}
        {!isError && (
          <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-6 p-5">
            {/* Header */}
            <div className="shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-normal font-mono text-muted-foreground">
                  Wisdom analysis
                </span>
                <div className="flex items-center gap-1">
                  {/* Reserved action slots — opacity-0 for now, available for future actions */}
                  <div className="flex items-center gap-1 opacity-0">
                    <button className="p-0.5 rounded"><ArrowLeft className="w-3 h-3" /></button>
                    <button className="p-0.5 rounded"><ArrowLeft className="w-3 h-3" /></button>
                    <button className="p-0.5 rounded"><ArrowLeft className="w-3 h-3" /></button>
                  </div>
                  {/* Verdict chip */}
                  <span className={cn(
                    "text-[10px] font-mono px-1.5 py-0.5 rounded border ml-1",
                    verdictColor === "red" ? "border-[#faaf9d] text-[#faaf9d]" :
                    verdictColor === "green" ? "border-[#69bc99] text-[#69bc99]" :
                    "border-amber-300 text-amber-600"
                  )}>
                    {analysis.verdict === "APPROVE" ? "Accepted" :
                     analysis.verdict === "REJECT" ? "Rejected" :
                     "Review"}
                  </span>
                </div>
              </div>
            </div>

            {/* Agent thinking — collapsible, primary position */}
            <div>
              <button
                className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowFullAnalysis(!showFullAnalysis)}
              >
                Worked on this for {scanDuration ? `${scanDuration}s` : "a few seconds"}
                {showFullAnalysis ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showFullAnalysis && (
                <div className="flex gap-1 mt-2">
                  {/* Left rail: dot + line */}
                  <div className="flex flex-col items-center shrink-0 w-[18px]">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 mt-1.5" />
                    <div className="w-px flex-1 bg-border" />
                  </div>
                  {/* Content — scrollable */}
                  <div className="flex-1 max-h-[180px] overflow-y-auto">
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {analysis.fullResponse || analysis.understanding || ""}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Recommendation — taxonomy change + summary */}
            <div className="flex flex-col gap-3">
              {/* Taxonomy level + operation description */}
              {operationDescription && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-1 py-0.5 rounded">
                    {displayReview?.level || "L3"}
                  </span>
                  <span className="text-sm text-foreground">
                    {operationDescription}
                  </span>
                </div>
              )}

              {/* Workaround steps — numbered per-step content blocks */}
              {analysis.verdict === "WORKAROUND" && analysis.workaroundType && displayReview && (() => {
                const mergedCtx = { ...displayReview.wisdomContext, ...analysis.workaroundContext }
                const steps = buildWorkaroundDraftChanges(
                  analysis.workaroundType,
                  mergedCtx,
                  displayReview.node,
                  displayReview.level,
                  operationDescription
                )
                return steps.length > 0 ? <WorkaroundStepsBlock steps={steps} /> : null
              })()}

              {/* Content block — operation-aware neutral display (non-workaround) */}
              {!(analysis.verdict === "WORKAROUND" && analysis.workaroundType) &&
                displayReview?.pendingDiff && displayReview.pendingDiff.length > 0 && (
                <ContentBlock diffs={displayReview.pendingDiff} />
              )}

              {/* Merged summary — assessment + recommendation in one paragraph */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {[analysis.summary, analysis.recommendation || analysis.workaround]
                  .filter(Boolean).join(" ")}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        {!wasActedOn && !isError && (
          <div className="px-5 pb-5 pt-1 shrink-0">
            {showSlackThread ? (
              <SlackThreadMock
                operationDescription={operationDescription}
                rejectionReason={analysis.summary || "This operation cannot proceed as described."}
                onClose={() => setShowSlackThread(false)}
                onThreadCreated={handleDismiss}
              />
            ) : (
              <div className="flex items-center gap-2">
                {analysis.verdict === "APPROVE" && (
                  <Button size="sm" className="h-6 text-xs bg-[#0f6773] hover:bg-[#0d5a65] text-white" onClick={handleAcceptReview}>
                    Accept
                  </Button>
                )}
                {analysis.verdict === "WORKAROUND" && analysis.workaroundType && (
                  <Button size="sm" className="h-6 text-xs bg-[#0f6773] hover:bg-[#0d5a65] text-white" onClick={handleAcceptWorkaround}>
                    Accept workaround
                  </Button>
                )}
                {analysis.verdict === "REJECT" && (
                  <Button size="sm" className="h-6 text-xs bg-[#0f6773] hover:bg-[#0d5a65] text-white" onClick={() => setShowSlackThread(true)}>
                    Contact Enterpret
                  </Button>
                )}
                {analysis.verdict !== "REJECT" && (
                  <Button size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground" onClick={() => setShowSlackThread(true)}>
                    Contact Enterpret
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="h-6 text-xs text-muted-foreground" onClick={handleDismiss}>
                  Discard
                </Button>
              </div>
            )}
          </div>
        )}

      </div>
    )
  }

  // ── ACCEPTED/DISMISSED STATE (post-verdict, review snapshot persists) ──
  if (lastVerdict && lastReview) {
    const reviewAnalysis = lastReview.analysis
    const reviewOp = lastReview.operationDescription || "Change applied"
    const summaryText = reviewAnalysis
      ? [reviewAnalysis.summary, reviewAnalysis.recommendation || reviewAnalysis.workaround].filter(Boolean).join(" ")
      : null

    return (
      <div className={cn(
        "bg-white rounded-lg shadow-[1px_1px_4px_0px_#e6e2df] border border-dashed overflow-hidden shrink-0 flex flex-col animate-[fadeIn_300ms_ease-out]",
        lastVerdict === "approved" ? "border-[#69bc99]" : "border-muted-foreground/30"
      )}>
        <div className="flex flex-col gap-6 p-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-normal font-mono text-muted-foreground">
              Wisdom analysis
            </span>
            <span className={cn(
              "text-[10px] font-mono px-1.5 py-0.5 rounded border",
              lastVerdict === "approved"
                ? "border-[#69bc99] text-[#69bc99]"
                : "border-[#faaf9d] text-[#faaf9d]"
            )}>
              {lastVerdict === "approved" ? "Accepted" : "Discarded"}
            </span>
          </div>

          {/* Level + operation */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-muted-foreground bg-muted px-1 py-0.5 rounded">
              {lastReview.level || "L3"}
            </span>
            <span className="text-sm text-foreground">
              {reviewOp}
            </span>
          </div>

          {/* Content block — operation-aware neutral display */}
          {lastReview.pendingDiff && lastReview.pendingDiff.length > 0 && (
            <ContentBlock diffs={lastReview.pendingDiff} />
          )}

          {/* One-liner summary */}
          {summaryText && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {summaryText}
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── EMPTY STATE (no scan running, no prior result, no verdict) ──
  return (
    <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden shrink-0 animate-[fadeIn_300ms_ease-out]">
      <div className="px-4 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          Waiting for your next edit
        </p>
      </div>
      {hasDrafts && (
        <DraftSummary
          count={draftChanges.length}
          onAccept={handleAcceptAllChanges}
          onDiscard={handleDiscardAll}
        />
      )}
    </div>
  )
}

/** Full-width version for bottom bar (kept for non-scan change list) */
interface AgentMessageFeedProps {
  scanState: ScanState
  isExpanded: boolean
  onToggleExpand: () => void
}

export function AgentMessageFeed({ scanState, isExpanded, onToggleExpand }: AgentMessageFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [scanState.messages.length])

  const isComplete = scanState.status === 'complete'

  return (
    <div>
      <div
        className="px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isComplete ? "bg-green-500" : "bg-[#2D7A7A] animate-pulse"
          )} />
          <span className="text-sm font-medium text-foreground">
            {isComplete ? "Analysis complete" : "Agent analyzing..."}
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-spring"
        style={{ gridTemplateRows: isExpanded ? '1fr' : '0fr' }}
      >
        <div className="overflow-hidden">
          <div
            ref={scrollRef}
            className="border-t border-border px-6 py-3 max-h-[33vh] overflow-y-auto"
          >
            <div className="space-y-2">
              {scanState.messages.map((msg) => (
                <div
                  key={msg.id}
                  className="flex items-start gap-2.5 animate-[fadeIn_300ms_ease-out]"
                >
                  {msg.status === 'active' ? (
                    <Loader2 className="w-3.5 h-3.5 text-[#2D7A7A] animate-spin mt-0.5 shrink-0" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-[#2D7A7A]/60 mt-0.5 shrink-0" />
                  )}
                  <span className={cn(
                    "text-sm",
                    msg.status === 'active' ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {msg.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
