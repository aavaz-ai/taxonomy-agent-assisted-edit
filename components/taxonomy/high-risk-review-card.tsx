"use client"

import { useState } from "react"
import { AlertTriangle, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronRight, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { HighRiskReviewState } from "@/lib/taxonomy-context"
import type { AgentCheck } from "@/lib/agent-utils"
import { SlackThreadMock } from "./slack-thread-mock"

interface HighRiskReviewCardProps {
  review: HighRiskReviewState
  onDismiss?: () => void
  onContactEnterpret?: () => void
  onAcceptWorkaround?: () => void
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

export function HighRiskReviewCard({ review, onDismiss, onContactEnterpret, onAcceptWorkaround }: HighRiskReviewCardProps) {
  const [showResearch, setShowResearch] = useState(false)
  const [showSlackThread, setShowSlackThread] = useState(false)
  const [showFullAnalysis, setShowFullAnalysis] = useState(false)
  const { analysis, operationDescription } = review
  const isAnalyzing = analysis.status === "analyzing"
  const isError = analysis.status === "error"

  return (
    <div className="flex flex-col h-full">
      {/* Header — tone adapts to verdict */}
      <div className={cn(
        "px-4 py-3 border-b-2",
        analysis.verdict === "APPROVE" ? "bg-green-50 border-green-400" :
        analysis.verdict === "REJECT" ? "bg-red-50 border-red-400" :
        "bg-amber-50 border-amber-400"
      )}>
        <div className="flex items-center gap-2 mb-2">
          {analysis.verdict === "APPROVE" ? (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          ) : analysis.verdict === "REJECT" ? (
            <XCircle className="w-4 h-4 text-red-600" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-amber-600" />
          )}
          <span className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            analysis.verdict === "APPROVE" ? "text-green-800" :
            analysis.verdict === "REJECT" ? "text-red-800" :
            "text-amber-800"
          )}>
            {analysis.verdict === "APPROVE" ? "Agent review" :
             analysis.verdict === "REJECT" ? "Change blocked" :
             "Review required"}
          </span>
        </div>
        <div className="text-sm font-medium text-foreground">
          {operationDescription}
        </div>
        <p className={cn(
          "text-xs mt-1",
          analysis.verdict === "APPROVE" ? "text-green-700" :
          analysis.verdict === "REJECT" ? "text-red-700" :
          "text-amber-700"
        )}>
          {analysis.verdict === "APPROVE"
            ? "Looks good — no conflicts detected."
            : analysis.verdict === "REJECT"
            ? "This operation cannot proceed as described."
            : "This operation requires review before it can be added to your draft changes."}
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

      {/* Analysis content — Vaibhav's format */}
      {!isAnalyzing && !isError && (
        <div className="flex-1 overflow-y-auto">
          {/* 1. Understanding */}
          {analysis.understanding && (
            <div className="px-4 py-3 border-b border-border">
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
            <div className="px-4 py-3 border-b border-border">
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
            <div className="border-b border-border">
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
          <div className="px-4 py-3 border-b border-border">
            <div className="text-[10px] text-muted-foreground font-medium mb-1.5">
              Assessment
            </div>
            <div className="flex items-center gap-2 mb-1.5">
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
            </div>
            {analysis.summary && (
              <p className="text-xs text-foreground leading-relaxed">{analysis.summary}</p>
            )}
          </div>

          {/* 4. Recommendation */}
          {(analysis.recommendation || analysis.workaround) && (
            <div className={cn(
              "px-4 py-3 border-b border-border",
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

          {/* 5. Agent Thinking — collapsible raw response */}
          {analysis.fullResponse && (
            <div className="border-b border-border">
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
      )}

      {/* Action buttons — Dismiss + Contact Enterpret for all verdicts */}
      <div className={cn(
        "px-4 py-3 border-t shrink-0",
        analysis.verdict === "APPROVE" ? "border-green-200 bg-green-50/30" :
        analysis.verdict === "REJECT" ? "border-red-200 bg-red-50/30" :
        "border-amber-200 bg-amber-50/30"
      )}>
        <div className="space-y-2">
          {showSlackThread ? (
            <SlackThreadMock
              operationDescription={operationDescription}
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
    </div>
  )
}
