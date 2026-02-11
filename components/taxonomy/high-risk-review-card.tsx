"use client"

import { useState } from "react"
import { AlertTriangle, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronRight, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { HighRiskReviewState } from "@/lib/taxonomy-context"
import type { AgentCheck } from "@/lib/agent-utils"

interface HighRiskReviewCardProps {
  review: HighRiskReviewState
  onAccept: () => void
  onReject: () => void
  onDismiss?: () => void
  onContactEnterpret?: () => void
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

export function HighRiskReviewCard({ review, onAccept, onReject, onDismiss, onContactEnterpret }: HighRiskReviewCardProps) {
  const [showReasoning, setShowReasoning] = useState(false)
  const [showRawAnalysis, setShowRawAnalysis] = useState(false)
  const { analysis, operationDescription } = review
  const isAnalyzing = analysis.status === "analyzing"
  const isError = analysis.status === "error"

  return (
    <div className="flex flex-col h-full">
      {/* Header with warning banner */}
      <div className="px-4 py-3 bg-amber-50 border-b-2 border-amber-400">
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className="w-4 h-4 text-amber-600" />
          <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
            Review required
          </span>
        </div>
        <div className="text-sm font-medium text-foreground">
          {operationDescription}
        </div>
        <p className="text-xs text-amber-700 mt-1">
          This operation requires review before it can be added to your draft changes.
        </p>
      </div>

      {/* Loading state */}
      {isAnalyzing && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#2D7A7A]" />
          <span className="text-sm text-muted-foreground">Analyzing impact...</span>
          <p className="text-xs text-muted-foreground text-center max-w-[240px]">
            The agent is evaluating the risks and impact of this change across your taxonomy.
          </p>
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <span className="text-sm text-red-600">Analysis failed</span>
          <p className="text-xs text-muted-foreground text-center">
            Unable to analyze this operation. You can still accept or reject it.
          </p>
        </div>
      )}

      {/* Analysis content */}
      {!isAnalyzing && !isError && (
        <div className="flex-1 overflow-y-auto">
          {/* Verdict */}
          {analysis.verdict && (
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                {analysis.verdict === "APPROVE" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : analysis.verdict === "REJECT" ? (
                  <XCircle className="w-4 h-4 text-red-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                )}
                <span className={cn(
                  "text-xs font-semibold",
                  analysis.verdict === "APPROVE" ? "text-green-700" :
                  analysis.verdict === "REJECT" ? "text-red-700" : "text-amber-700"
                )}>
                  {analysis.verdict === "APPROVE" ? "Approved" :
                   analysis.verdict === "REJECT" ? "Rejected" :
                   analysis.verdict === "WORKAROUND" ? "Workaround Suggested" :
                   "Conditional Approval"}
                </span>
                {analysis.confidence && (
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full border",
                    analysis.confidence === "High" ? "bg-green-50 text-green-700 border-green-200" :
                    analysis.confidence === "Med" ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-red-50 text-red-700 border-red-200"
                  )}>
                    {analysis.confidence} Confidence
                  </span>
                )}
              </div>
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

          {/* Summary */}
          {analysis.summary && (
            <div className="px-4 py-3 border-b border-border">
              <div className="text-[10px] text-muted-foreground font-medium mb-1">
                Assessment
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
      )}

      {/* Action buttons - always visible */}
      <div className="px-4 py-3 border-t border-amber-200 bg-amber-50/30 shrink-0">
        {analysis.verdict === "REJECT" ? (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
              onClick={() => {
                window.open('mailto:support@enterpret.com?subject=Taxonomy Change Request', '_blank')
                onContactEnterpret?.()
              }}
            >
              Contact Enterpret
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs border-red-300 text-red-600 hover:bg-red-50"
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-[#2D7A7A] hover:bg-[#236363] text-white text-xs"
              onClick={onAccept}
              disabled={isAnalyzing}
            >
              Accept & Add to Drafts
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs border-red-300 text-red-600 hover:bg-red-50"
              onClick={onReject}
            >
              Reject
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
