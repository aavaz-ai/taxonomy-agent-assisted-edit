"use client"

import { useState, useEffect, useRef } from "react"
import { useTaxonomy } from "@/lib/taxonomy-context"
import { ChevronRight, ChevronDown, AlertTriangle, Loader2, MessageCircle, X, Undo2, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  type ActionType,
  type DiffSegment,
  getGroupActionType,
  computeInlineDiff,
  truncateDiffWithContext,
} from "@/lib/inline-diff"
import type { DraftChange, HighRiskReviewState } from "@/lib/taxonomy-context"
import type { AgentAnalysis } from "@/lib/agent-utils"

// --- Wisdom icon (from assets/Wisdom.svg) ---

function WisdomIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 500 500" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="88.5" y="375" width="270.8" height="41.7" transform="rotate(-90 88.5 375)" fill="currentColor"/>
      <rect x="101.7" y="346" width="158.9" height="41.7" transform="rotate(-20 101.7 346)" fill="currentColor"/>
      <rect width="158.9" height="41.7" transform="matrix(-0.94 -0.34 -0.34 0.94 399.3 346)" fill="currentColor"/>
      <rect x="369.8" y="375" width="270.8" height="41.7" transform="rotate(-90 369.8 375)" fill="currentColor"/>
      <rect x="229.2" y="333.3" width="83.3" height="41.7" transform="rotate(-90 229.2 333.3)" fill="currentColor"/>
      <rect x="389.2" y="416.7" width="72.9" height="72.9" transform="rotate(-135 389.2 416.7)" fill="currentColor"/>
      <rect x="109.4" y="416.7" width="72.9" height="72.9" transform="rotate(-135 109.4 416.7)" fill="currentColor"/>
      <rect x="250" y="271.2" width="72.9" height="72.9" transform="rotate(-135 250 271.2)" fill="currentColor"/>
    </svg>
  )
}

// --- Level badge ---

function LevelBadge({ level, path, onNavigate }: { level: string; path?: string; onNavigate?: () => void }) {
  const label = level === "Theme" ? "T" : level
  return (
    <span className="group/badge relative shrink-0">
      <span className="text-[10px] font-mono font-semibold text-muted-foreground bg-muted rounded px-1.5 py-0.5">
        {label}
      </span>
      {path && (
        <span
          className="absolute left-0 top-full mt-1 z-50 opacity-0 group-hover/badge:opacity-100 transition-opacity pointer-events-none group-hover/badge:pointer-events-auto"
        >
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate?.() }}
            className="whitespace-nowrap text-[10px] text-[#2D7A7A] hover:underline bg-background border border-border rounded px-2 py-1 shadow-sm"
          >
            {path}
          </button>
        </span>
      )}
    </span>
  )
}

// --- Operation tag pill (encodes verdict via color) ---

const operationLabels: Record<ActionType, string> = {
  UPDATE: "Update",
  CREATE: "Create",
  DELETE: "Delete",
  MOVE: "Move",
  MERGE: "Merge",
  SPLIT: "Split",
}

function getOperationPillStyle(
  verdict?: string,
  isAnalyzing?: boolean,
  resolution?: DraftChange['resolution'],
): string {
  // Resolution states take priority
  if (resolution === 'contacted') {
    return "border-slate-300 text-slate-500 bg-slate-50"
  }
  if (resolution === 'dismissed') {
    return "border-gray-200 text-gray-400 bg-gray-50"
  }
  if (resolution === 'workaround-accepted') {
    return "border-blue-400 text-blue-700 bg-blue-50"
  }
  // Analyzing state
  if (isAnalyzing) {
    return "border-[#2D7A7A] text-[#2D7A7A] bg-teal-50 animate-pulse"
  }
  // Verdict states
  if (verdict === "APPROVE") return "border-green-500 text-green-700 bg-green-50"
  if (verdict === "WORKAROUND") return "border-amber-400 text-amber-700 bg-amber-50"
  if (verdict === "REJECT") return "border-red-400 text-red-700 bg-red-50"
  // No analysis / default
  return "border-neutral-300 text-neutral-600 bg-neutral-100"
}

function OperationPill({ action, verdict, isAnalyzing, resolution }: {
  action: ActionType
  verdict?: string
  isAnalyzing?: boolean
  resolution?: DraftChange['resolution']
}) {
  const style = getOperationPillStyle(verdict, isAnalyzing, resolution)
  const label = resolution === 'contacted' ? "Contacted"
    : resolution === 'dismissed' ? "Dismissed"
    : operationLabels[action]
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${style}`}>
      {label}
    </span>
  )
}

// --- Agent thinking popover ---

function AgentThinkingPopover({ analysis, onClose }: { analysis: AgentAnalysis; onClose: () => void }) {
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [onClose])

  return (
    <div
      ref={popoverRef}
      className="w-[320px] max-h-[400px] overflow-y-auto bg-background border border-border rounded-lg shadow-lg p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-foreground">Analysis</span>
        <button onClick={onClose} className="p-0.5 hover:bg-muted rounded transition-colors">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {/* Verdict + Confidence */}
      {analysis.verdict && (
        <div className="flex items-center gap-2 mb-3">
          <span className={cn(
            "text-[10px] font-medium px-1.5 py-0.5 rounded border",
            analysis.verdict === "APPROVE" ? "bg-green-50 border-green-200 text-green-700" :
            analysis.verdict === "REJECT" ? "bg-red-50 border-red-200 text-red-700" :
            "bg-amber-50 border-amber-200 text-amber-700"
          )}>
            {analysis.verdict}
          </span>
          {analysis.confidence && (
            <span className="text-[10px] text-muted-foreground">Confidence: {analysis.confidence}</span>
          )}
        </div>
      )}

      {/* Understanding */}
      {analysis.understanding && (
        <div className="mb-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Understanding</span>
          <p className="text-xs text-foreground leading-relaxed mt-1">{analysis.understanding}</p>
        </div>
      )}

      {/* Checks */}
      {analysis.checks && analysis.checks.length > 0 && (
        <div className="mb-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Checks</span>
          <div className="mt-1">
            {analysis.checks.map((check, i) => (
              <div key={i} className="flex items-start gap-2 py-1">
                <div className="mt-0.5">
                  {check.status === "pass" ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                  ) : check.status === "warn" ? (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  )}
                </div>
                <div className="text-xs">
                  <span className="text-foreground">{check.label}</span>
                  {check.detail && <span className="text-muted-foreground ml-1">— {check.detail}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risks */}
      {analysis.risks && analysis.risks.length > 0 && (
        <div className="mb-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Risks</span>
          <ul className="mt-1 space-y-0.5">
            {analysis.risks.map((risk, i) => (
              <li key={i} className="text-xs text-foreground leading-relaxed flex gap-1.5">
                <span className="text-muted-foreground shrink-0">•</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendation */}
      {analysis.recommendation && (
        <div className="mb-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Recommendation</span>
          <p className="text-xs text-foreground leading-relaxed mt-1">{analysis.recommendation}</p>
        </div>
      )}

      {/* Full Reasoning */}
      {analysis.fullReasoning && (
        <details className="mb-1">
          <summary className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground cursor-pointer">Full Reasoning</summary>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1">{analysis.fullReasoning}</p>
        </details>
      )}
    </div>
  )
}

// --- Inline diff for expanded row ---

function ChangeRowDiff({ group }: { group: ChangeGroup }) {
  const action = group.action
  const change = group.changes[0]
  if (!change) return null

  if (action === "CREATE") {
    return (
      <div className="bg-muted rounded-md px-3 py-1.5 text-xs mt-1">
        <span className="text-emerald-700">+ {change.newValue}</span>
      </div>
    )
  }

  if (action === "DELETE") {
    return (
      <div className="bg-muted rounded-md px-3 py-1.5 text-xs mt-1">
        <span className="text-red-700 line-through">- {change.oldValue}</span>
      </div>
    )
  }

  if (action === "MOVE") {
    return (
      <div className="bg-muted rounded-md px-3 py-1.5 text-xs space-y-0.5 mt-1">
        <div><span className="text-red-700 line-through">{change.oldValue}</span></div>
        <div><span className="text-emerald-700">{change.newValue}</span></div>
      </div>
    )
  }

  if (action === "MERGE") {
    const hasDestination = change.newValue && change.newValue !== change.oldValue
    return (
      <div className="bg-muted rounded-md px-3 py-2 text-xs mt-1 flex items-center gap-3">
        <div className="space-y-0.5 min-w-0">
          <div className={cn("truncate", hasDestination ? "text-foreground" : "text-red-700 line-through")}>{change.oldValue}</div>
          {hasDestination && <div className="text-foreground truncate">{change.newValue}</div>}
        </div>
        <span className="text-muted-foreground shrink-0">→</span>
        {hasDestination ? (
          <div className="text-foreground font-medium truncate">{change.newValue}</div>
        ) : (
          <div className="text-muted-foreground italic truncate">No destination selected</div>
        )}
      </div>
    )
  }

  // UPDATE — show inline word diff
  return (
    <div className="mt-1 space-y-1.5">
      {group.changes.slice(0, 2).map((c) => {
        const segments = truncateDiffWithContext(computeInlineDiff(c.oldValue, c.newValue))
        return (
          <div key={c.id}>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{c.field}</span>
            <div className="bg-muted rounded-md px-3 py-1.5 text-xs leading-relaxed mt-0.5">
              {segments.map((seg, i) => {
                if (seg.type === "common") return <span key={i}>{seg.text}</span>
                if (seg.type === "removed") return <span key={i} className="bg-red-100 text-red-700 line-through">{seg.text}</span>
                return <span key={i} className="bg-emerald-100 text-emerald-700">{seg.text}</span>
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// --- Change row (for committed draft changes) ---

interface ChangeGroup {
  nodeId: string
  nodeName: string
  nodeLevel: string
  changes: DraftChange[]
  action: ActionType
  nodePath?: string
  nodeNavIds?: { l1?: string; l2?: string; l3?: string }
}

function ChangeRow({
  group,
  onNavigate,
  onUndo,
  onDismiss,
  onContactEnterpret,
}: {
  group: ChangeGroup
  onNavigate: () => void
  onUndo: () => void
  onDismiss: (changeId: string) => void
  onContactEnterpret: (changeId: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isThinkingOpen, setIsThinkingOpen] = useState(false)
  const firstChange = group.changes[0]
  const analysis = firstChange?.agentAnalysis
  const isAnalyzing = analysis?.status === "analyzing"
  const resolution = firstChange?.resolution
  const isDimmed = resolution === "dismissed" || resolution === "contacted"

  return (
    <div className={cn("relative", isDimmed && "opacity-70")}>
      {/* Header row */}
      <div
        className="group flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded
          ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        }
        <LevelBadge level={group.nodeLevel} path={group.nodePath} onNavigate={onNavigate} />
        <span className="text-sm text-foreground truncate flex-1">{group.nodeName}</span>
        {/* Hover-only action icons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onUndo() }}
            className="p-0.5 rounded hover:bg-muted transition-colors"
            title="Undo change"
          >
            <Undo2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
          </button>
          {analysis && !isAnalyzing && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsThinkingOpen(!isThinkingOpen) }}
              className="p-0.5 rounded hover:bg-muted transition-colors"
              title="View analysis"
            >
              <WisdomIcon className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <OperationPill action={group.action} verdict={analysis?.verdict} isAnalyzing={isAnalyzing} resolution={resolution} />
      </div>

      {/* Agent thinking popover */}
      {isThinkingOpen && analysis && (
        <div className="absolute right-3 top-10 z-50">
          <AgentThinkingPopover analysis={analysis} onClose={() => setIsThinkingOpen(false)} />
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-l border-border ml-[18px] pl-4 pr-3 pb-3">
          {/* Inline diff */}
          <ChangeRowDiff group={group} />

          {/* Agent recommendation / workaround steps */}
          {isAnalyzing ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2D7A7A]" />
              <span className="text-xs text-muted-foreground">Analyzing...</span>
            </div>
          ) : resolution === 'workaround-accepted' && firstChange?.workaroundSteps && firstChange.workaroundSteps.length > 0 ? (
            <div className="border border-border/60 rounded-md px-3 py-2 mt-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Workaround applied</span>
              <div className="mt-1 space-y-0.5">
                {firstChange.workaroundSteps.map((step, i) => (
                  <div key={i} className="text-xs text-foreground leading-snug">
                    <span className="text-muted-foreground font-mono mr-1.5">{i + 1}.</span>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          ) : resolution === 'workaround-accepted' && firstChange?.operationDescription ? (
            <div className="border border-border/60 rounded-md px-3 py-2 mt-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Workaround applied</span>
              <p className="text-xs text-foreground leading-relaxed mt-1">
                {firstChange.operationDescription}
              </p>
            </div>
          ) : isDimmed ? (
            <div className="mt-1.5">
              <p className="text-xs text-muted-foreground">
                {resolution === 'contacted' ? "Enterpret has been contacted" : "Dismissed"}
              </p>
            </div>
          ) : analysis?.recommendation || analysis?.summary || analysis?.workaround ? (
            <div className="border border-border/60 rounded-md px-3 py-2 mt-1">
              <p className="text-xs text-muted-foreground leading-relaxed">
                {analysis.workaround || analysis.recommendation || analysis.summary}
              </p>
            </div>
          ) : null}

          {/* Actions */}
          {!isDimmed && analysis && analysis.status !== "analyzing" && !(analysis.verdict === "APPROVE" && analysis.confidence === "High" && resolution !== "workaround-accepted") ? (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (firstChange) onContactEnterpret(firstChange.id)
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <MessageCircle className="w-3 h-3" />
                Contact Enterpret
              </button>
              <span className="text-muted-foreground/30">|</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (firstChange) onDismiss(firstChange.id)
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                Dismiss
              </button>
            </div>
          ) : null}

        </div>
      )}
    </div>
  )
}

// --- Pending review row (for high-risk reviews awaiting decision) ---

function PendingReviewRow({
  review,
  onAcceptWorkaround,
  onDismiss,
  onContactEnterpret,
}: {
  review: HighRiskReviewState
  onAcceptWorkaround: (destinationName?: string) => void
  onDismiss: () => void
  onContactEnterpret: () => void
}) {
  const [isExpanded, setIsExpanded] = useState(true) // Default expanded for pending items
  const [keywordSearch, setKeywordSearch] = useState("")
  const [isThinkingOpen, setIsThinkingOpen] = useState(false)
  const { analysis, operationDescription } = review
  const { taxonomyData, selectedL1Id, selectedL2Id } = useTaxonomy()

  // For merge-keyword workarounds, compute sibling L3 keywords
  const siblingKeywords = (() => {
    if (analysis.workaroundType !== "merge-keyword") return []
    if (!selectedL1Id || !selectedL2Id) return []
    const l1Node = taxonomyData.level1.find((n) => n.id === selectedL1Id)
    if (!l1Node) return []
    const l2Node = l1Node.children?.find((n) => n.id === selectedL2Id)
    if (!l2Node?.children) return []
    return l2Node.children.filter((n) => n.id !== review.node.id)
  })()
  const isAnalyzing = analysis.status === "analyzing"

  return (
    <div className="bg-amber-50/40">
      {/* Collapsed row */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-amber-50/60 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded
          ? <ChevronDown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          : <ChevronRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        }
        <LevelBadge level={review.level} />
        <span className="text-sm text-foreground truncate flex-1">{review.node.name}</span>
        <span className="text-[10px] font-medium text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
          Review
        </span>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-l border-border ml-[18px] pl-4 pr-3 pb-3">
          <p className="text-xs text-muted-foreground mb-1">{operationDescription}</p>

          {isAnalyzing ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2D7A7A]" />
              <span className="text-xs text-muted-foreground">Analyzing impact...</span>
            </div>
          ) : (
            <>
              {/* Agent recommendation shown upfront */}
              {(analysis.workaround || analysis.recommendation || analysis.summary) && (
                <div className="border border-border/60 rounded-md px-3 py-2 mt-1">
                  <p className="text-xs text-foreground leading-relaxed">
                    {analysis.workaround || analysis.recommendation || analysis.summary}
                  </p>
                </div>
              )}

              {/* Verdict badge */}
              {analysis.verdict && (
                <div className="flex items-center gap-2 mt-1.5 mb-2">
                  <span className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded border",
                    analysis.verdict === "APPROVE" ? "bg-green-50 border-green-200 text-green-700" :
                    analysis.verdict === "REJECT" ? "bg-red-50 border-red-200 text-red-700" :
                    "bg-amber-50 border-amber-200 text-amber-700"
                  )}>
                    {analysis.verdict === "APPROVE" ? "Approved" :
                     analysis.verdict === "REJECT" ? "Rejected" :
                     analysis.verdict === "WORKAROUND" ? "Workaround" :
                     "Conditional"}
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col gap-2 mt-2">
                {analysis.verdict === "WORKAROUND" && analysis.workaroundType && (
                  analysis.workaroundType === "merge-keyword" && siblingKeywords.length > 0 ? (
                    <DropdownMenu onOpenChange={(open) => { if (!open) setKeywordSearch("") }}>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          className="text-[11px] h-7 bg-[#2D7A7A] hover:bg-[#236363] text-white w-fit"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Accept workaround
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-72" sideOffset={5}>
                        <div className="px-2 py-1.5 text-xs text-muted-foreground border-b border-border">
                          Merge into:
                        </div>
                        <div className="p-2 border-b border-border">
                          <input
                            type="text"
                            value={keywordSearch}
                            onChange={(e) => setKeywordSearch(e.target.value)}
                            placeholder="Search keywords..."
                            className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-[#2D7A7A]/20"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {siblingKeywords
                            .filter((kw) => kw.name.toLowerCase().includes(keywordSearch.toLowerCase()))
                            .map((kw) => (
                              <DropdownMenuItem
                                key={kw.id}
                                onSelect={() => onAcceptWorkaround(kw.name)}
                                className="flex items-center justify-between py-2"
                              >
                                <span className="truncate">{kw.name}</span>
                                {kw.count > 0 && (
                                  <span className="text-xs text-muted-foreground ml-2 shrink-0">{kw.count}</span>
                                )}
                              </DropdownMenuItem>
                            ))}
                          {siblingKeywords.filter((kw) => kw.name.toLowerCase().includes(keywordSearch.toLowerCase())).length === 0 && (
                            <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                              No matching keywords
                            </div>
                          )}
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Button
                      size="sm"
                      className="text-[11px] h-7 bg-[#2D7A7A] hover:bg-[#236363] text-white w-fit"
                      onClick={(e) => { e.stopPropagation(); onAcceptWorkaround() }}
                    >
                      Accept workaround
                    </Button>
                  )
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onContactEnterpret() }}
                    className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  >
                    <MessageCircle className="w-3 h-3" />
                    Contact Enterpret
                  </button>
                  <span className="text-muted-foreground/30">|</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDismiss() }}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Dismiss
                  </button>
                  {analysis && !isAnalyzing && (
                    <div className="relative ml-auto">
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsThinkingOpen(!isThinkingOpen) }}
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <WisdomIcon className="w-3.5 h-3.5" />
                        Analysis
                      </button>
                      {isThinkingOpen && (
                        <div className="absolute right-0 top-full z-50 mt-1">
                          <AgentThinkingPopover analysis={analysis} onClose={() => setIsThinkingOpen(false)} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// --- Main ReviewSidebar ---

export function ReviewSidebar() {
  const {
    draftChanges,
    highRiskReviews,
    setIsReviewPaneOpen,
    setDraftResolution,
    removeDraftChange,
    acceptWorkaround,
    rejectHighRiskReview,
    addDraftChange,
    buildNodePath,
    currentNavIds,
    setSelectedL1Id,
    setSelectedL2Id,
    setSelectedL3Id,
  } = useTaxonomy()

  // Group draft changes by operation description (or nodeId as fallback)
  const groupedChanges: ChangeGroup[] = []
  const seen = new Map<string, number>()

  for (const change of draftChanges) {
    const key = change.operationDescription || change.nodeId
    const existingIdx = seen.get(key)
    if (existingIdx !== undefined) {
      groupedChanges[existingIdx].changes.push(change)
    } else {
      seen.set(key, groupedChanges.length)
      groupedChanges.push({
        nodeId: change.nodeId,
        nodeName: change.nodeName,
        nodeLevel: change.nodeLevel,
        changes: [change],
        action: getGroupActionType([change.field]),
        nodePath: change.nodePath,
        nodeNavIds: change.nodeNavIds,
      })
    }
  }

  // Recalculate action for multi-field groups
  for (const group of groupedChanges) {
    group.action = getGroupActionType(group.changes.map(c => c.field))
  }

  const handleDismissReview = (review: HighRiskReviewState) => {
    const path = buildNodePath()
    const navIds = currentNavIds()
    review.pendingDiff.forEach((item) => {
      const base = {
        nodeId: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        nodeName: item.nodeName,
        nodeLevel: item.nodeType,
        agentAnalysis: review.analysis,
        operationDescription: review.operationDescription,
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
    rejectHighRiskReview(review.id)
  }

  const handleContactEnterpretReview = (review: HighRiskReviewState) => {
    const path = buildNodePath()
    const navIds = currentNavIds()
    review.pendingDiff.forEach((item) => {
      const base = {
        nodeId: `agent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        nodeName: item.nodeName,
        nodeLevel: item.nodeType,
        agentAnalysis: review.analysis,
        operationDescription: review.operationDescription,
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
    rejectHighRiskReview(review.id)
  }

  const navigateToNode = (navIds?: { l1?: string; l2?: string; l3?: string }) => {
    if (!navIds) return
    if (navIds.l1) setSelectedL1Id(navIds.l1)
    if (navIds.l2) setSelectedL2Id(navIds.l2)
    if (navIds.l3) setSelectedL3Id(navIds.l3)
    setIsReviewPaneOpen(false)
  }

  // Build unified timeline from both reviews and changes
  type TimelineItem =
    | { type: 'review'; data: HighRiskReviewState; timestamp: Date }
    | { type: 'change'; data: ChangeGroup; timestamp: Date }

  const timeline: TimelineItem[] = [
    ...highRiskReviews.map(r => ({
      type: 'review' as const,
      data: r,
      timestamp: r.timestamp,
    })),
    ...groupedChanges.map(g => ({
      type: 'change' as const,
      data: g,
      timestamp: g.changes[0]?.timestamp ?? new Date(0),
    })),
  ]
  timeline.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

  const totalItems = timeline.length

  return (
    <div className="w-[340px] h-full bg-background border-l border-border flex flex-col overflow-hidden transition-all duration-300 ease-spring">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold text-foreground">
          Review changes
          {totalItems > 0 && (
            <span className="text-muted-foreground font-normal ml-1.5">({totalItems})</span>
          )}
        </h2>
        <button
          onClick={() => setIsReviewPaneOpen(false)}
          className="p-1 hover:bg-muted rounded transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Change list */}
      <div className="flex-1 overflow-y-auto">
        {totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground px-6">
            <p className="text-sm text-center">No changes to review.</p>
            <p className="text-xs text-center mt-1">Make edits in the taxonomy to see them here.</p>
          </div>
        ) : (
          <>
            {timeline.map((item) =>
              item.type === 'review' ? (
                <PendingReviewRow
                  key={item.data.id}
                  review={item.data}
                  onAcceptWorkaround={(destinationName) => acceptWorkaround(item.data.id, destinationName)}
                  onDismiss={() => handleDismissReview(item.data)}
                  onContactEnterpret={() => handleContactEnterpretReview(item.data)}
                />
              ) : (
                <ChangeRow
                  key={item.data.nodeId + item.data.action}
                  group={item.data}
                  onNavigate={() => navigateToNode(item.data.nodeNavIds)}
                  onUndo={() => item.data.changes.forEach(c => removeDraftChange(c.id))}
                  onDismiss={(changeId) => setDraftResolution(changeId, 'dismissed')}
                  onContactEnterpret={(changeId) => setDraftResolution(changeId, 'contacted')}
                />
              )
            )}
          </>
        )}
      </div>
    </div>
  )
}
