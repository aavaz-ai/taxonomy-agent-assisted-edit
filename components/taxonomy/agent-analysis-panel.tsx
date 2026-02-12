"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronRight, Loader2, ArrowRight, Merge } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AgentAnalysis } from "@/lib/agent-utils"
import type { DraftChange } from "@/lib/taxonomy-context"
import {
  computeInlineDiff,
  truncateDiffWithContext,
  formatNodeLevel,
} from "@/lib/inline-diff"
import { SlackThreadMock } from "./slack-thread-mock"

interface AgentAnalysisPanelProps {
  change: DraftChange
  onDismiss?: () => void
  onContactEnterpret?: () => void
  onAcceptWorkaround?: () => void
  onPathClick?: () => void
}

function DiffBlock({ oldValue, newValue }: { oldValue: string; newValue: string }) {
  if (!oldValue && newValue) {
    return (
      <div className="bg-muted rounded-md px-3 py-2 text-xs">
        <span className="text-emerald-700">+ {newValue}</span>
      </div>
    )
  }
  if (oldValue && !newValue) {
    return (
      <div className="bg-muted rounded-md px-3 py-2 text-xs">
        <span className="text-red-700 line-through">- {oldValue}</span>
      </div>
    )
  }

  const rawSegments = computeInlineDiff(oldValue, newValue)
  const segments = truncateDiffWithContext(rawSegments)

  return (
    <div className="bg-muted rounded-md px-3 py-2 text-xs leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.type === "common") {
          return <span key={i} className="text-muted-foreground">{seg.text}</span>
        }
        if (seg.type === "removed") {
          return <span key={i} className="bg-red-100 text-red-700 line-through">{seg.text}</span>
        }
        return <span key={i} className="bg-emerald-100 text-emerald-700">{seg.text}</span>
      })}
    </div>
  )
}

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

function getVerdictBadge(verdict?: string, confidence?: string, resolution?: DraftChange['resolution']) {
  // Resolution takes priority over agent verdict
  if (resolution) {
    const resolutionConfig: Record<string, { bg: string; text: string; label: string }> = {
      "contacted": { bg: "bg-green-50 border-green-200", text: "text-green-700", label: "Addressed" },
      "dismissed": { bg: "bg-gray-50 border-gray-200", text: "text-gray-700", label: "Dismissed" },
      "workaround-accepted": { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", label: "Workaround" },
    }
    const config = resolutionConfig[resolution]
    if (config) {
      return (
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-medium px-2 py-0.5 rounded border", config.bg, config.text)}>
            {config.label}
          </span>
          <span className="text-[10px] text-muted-foreground">User resolution</span>
        </div>
      )
    }
  }

  if (!verdict) return null

  const verdictConfig: Record<string, { bg: string; text: string; label: string }> = {
    "APPROVE": { bg: "bg-green-50 border-green-200", text: "text-green-700", label: "Approved" },
    "REJECT": { bg: "bg-red-50 border-red-200", text: "text-red-700", label: "Rejected" },
    "WORKAROUND": { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "Workaround" },
    "APPROVE WITH CONDITIONS": { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", label: "Conditional" },
    "PARTIAL": { bg: "bg-orange-50 border-orange-200", text: "text-orange-700", label: "Partial" },
  }

  const config = verdictConfig[verdict] || { bg: "bg-gray-50 border-gray-200", text: "text-gray-700", label: verdict }

  const confidenceColor = confidence === "High" ? "text-green-600" : confidence === "Med" ? "text-amber-600" : "text-red-600"

  return (
    <div className="flex items-center gap-2">
      <span className={cn("text-xs font-medium px-2 py-0.5 rounded border", config.bg, config.text)}>
        {config.label}
      </span>
      {confidence && (
        <span className={cn("text-[10px]", confidenceColor)}>
          {confidence} confidence
        </span>
      )}
    </div>
  )
}

export function AgentAnalysisPanel({ change, onDismiss, onContactEnterpret, onAcceptWorkaround, onPathClick }: AgentAnalysisPanelProps) {
  const [showResearch, setShowResearch] = useState(false)
  const [showSlackThread, setShowSlackThread] = useState(false)
  const [showFullAnalysis, setShowFullAnalysis] = useState(false)
  const analysis = change.agentAnalysis

  if (!analysis) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No analysis available for this change.
      </div>
    )
  }

  if (analysis.status === "analyzing") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#2D7A7A]" />
        <span className="text-sm text-muted-foreground">Analyzing change...</span>
      </div>
    )
  }

  if (analysis.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8 text-red-500">
        <AlertTriangle className="w-6 h-6" />
        <span className="text-sm">Analysis failed. Change was still applied to drafts.</span>
      </div>
    )
  }

  const showDiff = change.field === "name" || change.field === "category" || change.field === "description" || change.field === "merge-theme"

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <button
          className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors text-left mb-1 block"
          onClick={() => onPathClick?.()}
        >
          {change.nodePath || `${formatNodeLevel(change.nodeLevel)} / ${change.nodeName}`}
        </button>
        <div className="text-sm font-medium text-foreground mb-2">
          {change.operationDescription || `${change.field}: ${change.oldValue} → ${change.newValue}`}
        </div>
        {getVerdictBadge(analysis.verdict, analysis.confidence, change.resolution)}
      </div>

      {/* Scrollable content — Vaibhav's format */}
      <div className="flex-1 overflow-y-auto">
        {/* Diff block */}
        {showDiff && (
          <div className="px-4 pt-3 pb-1">
            <DiffBlock oldValue={change.oldValue} newValue={change.newValue} />
          </div>
        )}

        {/* 1. Understanding */}
        {analysis.understanding && (
          <div className="px-4 pt-3 pb-1">
            <div className="text-[10px] text-muted-foreground font-medium mb-1">
              Understanding
            </div>
            <p className="text-xs text-foreground leading-relaxed">{analysis.understanding}</p>
          </div>
        )}

        {/* 1.5. Impact — affected paths + record counts */}
        {!!(analysis.recordCount != null && analysis.recordCount > 0 ||
          analysis.pathCount != null && analysis.pathCount > 0 ||
          (analysis.affectedPaths && analysis.affectedPaths.length > 0)) && (
          <div className="px-4 pt-3 pb-1">
            <div className="text-[10px] text-muted-foreground font-medium mb-1.5">
              Impact
            </div>
            {(analysis.recordCount != null && analysis.recordCount > 0 || analysis.pathCount != null && analysis.pathCount > 0) && (
              <p className="text-xs text-foreground mb-2">
                Affects {analysis.recordCount?.toLocaleString() || 0} records across {analysis.pathCount || 0} {(analysis.pathCount || 0) === 1 ? "path" : "paths"}
              </p>
            )}
            {analysis.affectedPaths && analysis.affectedPaths.length > 0 && (
              <div className="space-y-1">
                {analysis.affectedPaths.map((path, i) => (
                  <div key={i} className="text-xs text-muted-foreground font-mono bg-muted rounded px-2 py-1">
                    {path}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. Research — collapsible */}
        {!!(analysis.checks?.length) && (
          <div>
            <button
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
              onClick={() => setShowResearch(!showResearch)}
            >
              {showResearch ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="font-medium">Research</span>
              {!showResearch && analysis.checks && (
                <span className="text-[10px] ml-auto">
                  {analysis.checks.filter(c => c.status === "pass").length} passed, {analysis.checks.filter(c => c.status !== "pass").length} flagged
                </span>
              )}
            </button>
            {showResearch && (
              <div className="px-4 pb-3">
                {analysis.checks && analysis.checks.length > 0 && (
                  <div className="space-y-0.5">
                    {analysis.checks.map((check, i) => (
                      <CheckItem key={i} label={check.label} status={check.status} detail={check.detail} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. Assessment — verdict badge + summary */}
        {analysis.summary && (
          <div className="px-4 pt-3 pb-1">
            <div className="text-[10px] text-muted-foreground font-medium mb-1">
              Assessment
            </div>
            <p className="text-xs text-foreground leading-relaxed">{analysis.summary}</p>
          </div>
        )}

        {/* 4. Partial items — per-item inclusion list */}
        {analysis.verdict === "PARTIAL" && analysis.partialItems && analysis.partialItems.length > 0 && (
          <div className="px-4 pt-3 pb-1">
            <div className="text-[10px] text-orange-700 font-medium mb-2">
              Item Eligibility
            </div>
            <div className="space-y-1.5">
              {analysis.partialItems.map((item, i) => (
                <div key={i} className="flex items-start gap-2 py-1">
                  <div className="mt-0.5">
                    {item.included
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
                      : <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    }
                  </div>
                  <div className="text-xs flex-1">
                    <span className={cn("font-medium", item.included ? "text-foreground" : "text-muted-foreground line-through")}>
                      {item.name}
                    </span>
                    <span className="text-muted-foreground ml-1">— {item.reason}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 5. Typed workaround — operation-specific UI */}
        {analysis.workaroundType && analysis.workaround && (
          <div className={cn(
            "px-4 pt-3 pb-1",
            "bg-amber-50/50"
          )}>
            <div className="text-[10px] text-amber-700 font-medium mb-2">
              Recommended Alternative
            </div>
            {analysis.workaroundType === "merge-parents" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <Merge className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="text-amber-800 font-medium">Merge parent themes instead</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {analysis.workaround}
                </p>
              </div>
            )}
            {analysis.workaroundType === "create-theme" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-3.5 h-3.5 flex items-center justify-center text-amber-700 font-bold shrink-0">+</span>
                  <span className="text-amber-800 font-medium">Create a new theme</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {analysis.workaround}
                </p>
              </div>
            )}
            {analysis.workaroundType === "move-to-parent" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <ArrowRight className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span className="text-amber-800 font-medium">Move to a different parent</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  {analysis.workaround}
                </p>
              </div>
            )}
            {analysis.workaroundType === "transfer-then-merge" && (
              <div className="space-y-2">
                <div className="text-xs text-amber-800 font-medium">2-step operation:</div>
                <div className="space-y-1.5 ml-1">
                  <div className="flex items-center gap-2 text-xs text-amber-800">
                    <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                    Transfer sub-theme to target parent
                  </div>
                  <div className="flex items-center gap-2 text-xs text-amber-800">
                    <span className="w-4 h-4 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                    Merge sub-themes within the same parent
                  </div>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed mt-1">
                  {analysis.workaround}
                </p>
              </div>
            )}
          </div>
        )}

        {/* 6. Recommendation (generic — only when no typed workaround) */}
        {!analysis.workaroundType && (analysis.recommendation || analysis.workaround) && (
          <div className={cn(
            "px-4 pt-3 pb-1",
            analysis.verdict === "WORKAROUND" && "bg-amber-50/50"
          )}>
            <div className={cn(
              "text-[10px] font-medium mb-1",
              analysis.verdict === "WORKAROUND" ? "text-amber-700" : "text-muted-foreground"
            )}>
              Recommendation
            </div>
            <p className={cn(
              "text-xs leading-relaxed",
              analysis.verdict === "WORKAROUND" ? "text-amber-800" : "text-foreground"
            )}>
              {analysis.workaround || analysis.recommendation}
            </p>
          </div>
        )}

        {/* 7. Agent Thinking — collapsible raw response */}
        {analysis.fullResponse && (
          <div>
            <button
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
              onClick={() => setShowFullAnalysis(!showFullAnalysis)}
            >
              {showFullAnalysis ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              <span className="font-medium">Agent thinking</span>
            </button>
            {showFullAnalysis && (
              <div className="px-4 pb-3">
                <pre className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap font-mono bg-muted rounded-md p-3 max-h-[300px] overflow-y-auto">
                  {analysis.fullResponse}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons — hidden for clean APPROVE/High since no user action needed */}
      {!(analysis.verdict === "APPROVE" && analysis.confidence === "High") && (
        <div className="px-4 py-3 border-t border-border bg-background shrink-0">
          <div className="space-y-2">
            {showSlackThread ? (
              <SlackThreadMock
                operationDescription={change.operationDescription || `${change.field}: ${change.oldValue} → ${change.newValue}`}
                rejectionReason={analysis.summary || "This operation cannot proceed as described."}
                onClose={() => setShowSlackThread(false)}
                onThreadCreated={onContactEnterpret}
              />
            ) : (
              <div className="space-y-2">
                {analysis.verdict === "WORKAROUND" && analysis.workaroundType && onAcceptWorkaround && (
                  <Button
                    size="sm"
                    className="w-full text-xs bg-[#2D7A7A] hover:bg-[#236363] text-white"
                    onClick={onAcceptWorkaround}
                  >
                    Accept workaround
                  </Button>
                )}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => setShowSlackThread(true)}
                  >
                    Contact Enterpret
                  </Button>
                  {onDismiss && (
                    <Button
                      size="sm"
                      variant="outline"
                      className={cn(
                        "flex-1 text-xs",
                        analysis.verdict !== "APPROVE" && "border-red-300 text-red-600 hover:bg-red-50"
                      )}
                      onClick={onDismiss}
                    >
                      Dismiss
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
