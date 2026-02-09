"use client"

import { useState } from "react"
import { CheckCircle2, XCircle, AlertTriangle, AlertCircle, ChevronDown, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AgentAnalysis } from "@/lib/agent-utils"
import type { DraftChange } from "@/lib/taxonomy-context"
import {
  computeInlineDiff,
  truncateDiffWithContext,
  getGroupActionType,
  formatNodeLevel,
} from "@/lib/inline-diff"

interface AgentAnalysisPanelProps {
  change: DraftChange
  onAcceptSuggestion?: () => void
  onAccept?: () => void
  onDismiss?: () => void
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

function getVerdictBadge(verdict?: string, confidence?: string) {
  if (!verdict) return null

  const verdictConfig: Record<string, { bg: string; text: string; label: string }> = {
    "APPROVE": { bg: "bg-green-50 border-green-200", text: "text-green-700", label: "Approved" },
    "REJECT": { bg: "bg-red-50 border-red-200", text: "text-red-700", label: "Rejected" },
    "WORKAROUND": { bg: "bg-amber-50 border-amber-200", text: "text-amber-700", label: "Workaround" },
    "APPROVE WITH CONDITIONS": { bg: "bg-blue-50 border-blue-200", text: "text-blue-700", label: "Conditional" },
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

export function AgentAnalysisPanel({ change, onAcceptSuggestion, onAccept, onDismiss }: AgentAnalysisPanelProps) {
  const [showReasoning, setShowReasoning] = useState(false)
  const [showRawAnalysis, setShowRawAnalysis] = useState(false)
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

  const showDiff = change.field === "name" || change.field === "category" || change.field === "description"

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="text-xs text-muted-foreground mb-1">
          {formatNodeLevel(change.nodeLevel)} / {change.nodeName}
        </div>
        <div className="text-sm font-medium text-foreground mb-2">
          {change.operationDescription || `${change.field}: ${change.oldValue} → ${change.newValue}`}
        </div>
        {getVerdictBadge(analysis.verdict, analysis.confidence)}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Diff block */}
        {showDiff && (
          <div className="px-4 py-3 border-b border-border">
            <DiffBlock oldValue={change.oldValue} newValue={change.newValue} />
          </div>
        )}

        {/* Checks */}
        {analysis.checks && analysis.checks.length > 0 && (
          <div className="px-4 py-3 border-b border-border">
            <div className="text-[10px] text-muted-foreground font-medium mb-2">
              What was checked
            </div>
            <div className="space-y-0.5">
              {analysis.checks.map((check, i) => (
                <CheckItem key={i} label={check.label} status={check.status} detail={check.detail} />
              ))}
            </div>
          </div>
        )}

        {/* Summary / Suggestion */}
        {analysis.summary && (
          <div className="px-4 py-3 border-b border-border">
            <div className="text-[10px] text-muted-foreground font-medium mb-1">
              Recommendation
            </div>
            <p className="text-xs text-foreground leading-relaxed">{analysis.summary}</p>
          </div>
        )}

        {/* Workaround */}
        {analysis.workaround && (
          <div className="px-4 py-3 border-b border-border bg-amber-50/50">
            <div className="text-[10px] text-amber-700 font-medium mb-1">
              Suggested workaround
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">{analysis.workaround}</p>
          </div>
        )}

        {/* Affected Paths */}
        {analysis.affectedPaths && analysis.affectedPaths.length > 0 && (
          <div className="px-4 py-3 border-b border-border">
            <div className="text-[10px] text-muted-foreground font-medium mb-2">
              Paths affected
            </div>
            <div className="space-y-1">
              {analysis.affectedPaths.map((path, i) => (
                <div key={i} className="text-xs text-muted-foreground font-mono bg-muted rounded px-2 py-1">
                  {path}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Risks */}
        {analysis.risks && analysis.risks.length > 0 && (
          <div className="px-4 py-3 border-b border-border">
            <div className="text-[10px] text-muted-foreground font-medium mb-2">
              Potential risks
            </div>
            <ul className="space-y-1">
              {analysis.risks.map((risk, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>{risk}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Expandable: Full Reasoning */}
        {analysis.fullReasoning && (
          <div className="border-b border-border">
            <button
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
              onClick={() => setShowReasoning(!showReasoning)}
            >
              {showReasoning ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              Show full reasoning
            </button>
            {showReasoning && (
              <div className="px-4 pb-3 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {analysis.fullReasoning}
              </div>
            )}
          </div>
        )}

        {/* Expandable: Raw Analysis */}
        {analysis.fullResponse && (
          <div className="border-b border-border">
            <button
              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-muted-foreground hover:bg-muted/30 transition-colors"
              onClick={() => setShowRawAnalysis(!showRawAnalysis)}
            >
              {showRawAnalysis ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              Show raw analysis
            </button>
            {showRawAnalysis && (
              <div className="px-4 pb-3 text-xs text-muted-foreground leading-relaxed font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto bg-muted/20 mx-4 mb-3 rounded p-3">
                {analysis.fullResponse}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 py-3 border-t border-border bg-background shrink-0">
        {(analysis.status === "warn" || analysis.status === "fail") ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              {onAccept && (
                <Button
                  size="sm"
                  className="flex-1 bg-[#2D7A7A] hover:bg-[#236363] text-white text-xs"
                  onClick={onAccept}
                >
                  Accept anyway
                </Button>
              )}
              {analysis.workaround && onAcceptSuggestion && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={onAcceptSuggestion}
                >
                  Accept suggestion
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={onDismiss}
                >
                  Dismiss
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => window.open('mailto:support@enterpret.com?subject=Taxonomy Change Request', '_blank')}
              >
                Contact Enterpret
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            {onDismiss && (
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={onDismiss}
              >
                Dismiss
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
