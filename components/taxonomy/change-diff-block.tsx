"use client"

import { Undo2, CheckCircle2, AlertTriangle, XCircle, Loader2, CircleCheckBig } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  type ActionType,
  type DiffSegment,
  computeInlineDiff,
  truncateDiffWithContext,
  getGroupActionType,
  formatNodeLevel,
} from "@/lib/inline-diff"
import type { DraftChange } from "@/lib/taxonomy-context"
import type { LinterStatus } from "@/lib/agent-utils"

// --- ActionChip ---

const chipStyles: Record<ActionType, { border: string; text: string; label: string }> = {
  UPDATE: { border: "border-neutral-400", text: "text-neutral-500", label: "UPDATED" },
  CREATE: { border: "border-green-500", text: "text-green-600", label: "CREATED" },
  DELETE: { border: "border-red-400", text: "text-red-500", label: "DELETED" },
  MOVE:   { border: "border-blue-400", text: "text-blue-500", label: "MOVED" },
  MERGE:  { border: "border-blue-400", text: "text-blue-500", label: "MERGED" },
  SPLIT:  { border: "border-orange-400", text: "text-orange-500", label: "SPLIT" },
}

function ActionChip({ action }: { action: ActionType }) {
  const style = chipStyles[action]
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${style.border} ${style.text}`}
    >
      {style.label}
    </span>
  )
}

// --- Status indicator ---

function StatusIndicator({ status, userAccepted }: { status?: LinterStatus; userAccepted?: boolean }) {
  if (!status || status === "pending") return null

  if (status === "analyzing") {
    return <Loader2 className="w-3.5 h-3.5 animate-spin text-[#2D7A7A] shrink-0" />
  }
  if (status === "pass") {
    return <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
  }
  if ((status === "warn" || status === "fail") && userAccepted) {
    return <CircleCheckBig className="w-3.5 h-3.5 text-green-600 shrink-0" />
  }
  if (status === "warn") {
    return <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
  }
  if (status === "fail") {
    return <XCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
  }
  // error
  return <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
}

// --- InlineDiffView ---

function HighlightedSegment({
  text,
  className,
  segKey,
}: {
  text: string
  className: string
  segKey: number
}) {
  const match = text.match(/^(\s*)([\s\S]*?)(\s*)$/)
  if (!match) {
    return <span key={segKey} className={className}>{text}</span>
  }
  const [, leading, middle, trailing] = match
  return (
    <>
      {leading && <span key={`${segKey}-l`} className="text-muted-foreground">{leading}</span>}
      {middle && <span key={`${segKey}-m`} className={className}>{middle}</span>}
      {trailing && <span key={`${segKey}-t`} className="text-muted-foreground">{trailing}</span>}
    </>
  )
}

function InlineDiffView({ segments }: { segments: DiffSegment[] }) {
  return (
    <div className="bg-muted rounded-md px-3 py-2 text-xs leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.type === "common") {
          return (
            <span key={i} className="text-muted-foreground">
              {seg.text}
            </span>
          )
        }
        if (seg.type === "removed") {
          return (
            <HighlightedSegment
              key={i}
              segKey={i}
              text={seg.text}
              className="bg-red-100 text-red-700 line-through"
            />
          )
        }
        // added
        return (
          <HighlightedSegment
            key={i}
            segKey={i}
            text={seg.text}
            className="bg-emerald-100 text-emerald-700"
          />
        )
      })}
    </div>
  )
}

// --- ChangeDiffBlock (B2 style change card) ---

interface ChangeGroup {
  nodeName: string
  nodeLevel: string
  changes: DraftChange[]
}

export function ChangeDiffBlock({
  group,
  onUndo,
  isSelected,
  onClick,
}: {
  group: ChangeGroup
  onUndo: (changeId: string) => void
  isSelected?: boolean
  onClick?: () => void
}) {
  const action = getGroupActionType(group.changes.map((c) => c.field))
  const firstChange = group.changes[0]
  const analysisStatus = firstChange?.agentAnalysis?.status
  const isAccepted = firstChange?.userAccepted
  const isWarn = (analysisStatus === "warn" || analysisStatus === "fail") && !isAccepted
  const isPass = analysisStatus === "pass" || isAccepted
  const resolution = firstChange?.resolution
  const isDimmed = resolution === 'dismissed' || resolution === 'workaround-accepted'

  return (
    <div
      className={cn(
        "rounded-lg border transition-all cursor-pointer",
        isWarn && !resolution && "bg-amber-50/60 border-amber-300",
        isPass && "border-green-200",
        !isWarn && !isPass && "border-border",
        isSelected && "ring-2 ring-[#2D7A7A]/40 border-[#2D7A7A]",
        !isSelected && "hover:border-muted-foreground/30",
        isDimmed && "opacity-60",
      )}
      onClick={onClick}
    >
      {/* Row 1: Status + Name + Action + Undo */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIndicator status={analysisStatus} userAccepted={isAccepted} />
          <span className="text-sm font-medium text-foreground truncate">{group.nodeName}</span>
          <ActionChip action={action} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            group.changes.forEach((c) => onUndo(c.id))
          }}
          className="text-muted-foreground text-xs h-7 px-2 shrink-0"
        >
          <Undo2 className="w-3 h-3 mr-1" />
          Undo
        </Button>
      </div>

      {/* Row 2: Level + Resolution + Impact counts */}
      <div className="flex items-center gap-2 flex-wrap px-3 pb-2">
        <span className="text-xs text-muted-foreground">
          {formatNodeLevel(group.nodeLevel)}
        </span>
        {resolution === 'dismissed' && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-gray-100 text-gray-500 border-gray-200">
            Dismissed
          </span>
        )}
        {resolution === 'contacted' && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-green-50 text-green-600 border-green-200">
            Addressed
          </span>
        )}
        {resolution === 'workaround-accepted' && (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-200">
            Workaround accepted
          </span>
        )}
        {analysisStatus && analysisStatus !== "analyzing" && firstChange?.agentAnalysis?.recordCount != null && firstChange.agentAnalysis.recordCount > 0 && (
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {firstChange.agentAnalysis.recordCount.toLocaleString()} records
          </span>
        )}
        {analysisStatus && analysisStatus !== "analyzing" && firstChange?.agentAnalysis?.pathCount != null && firstChange.agentAnalysis.pathCount > 0 && (
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {firstChange.agentAnalysis.pathCount} {firstChange.agentAnalysis.pathCount === 1 ? "path" : "paths"}
          </span>
        )}
      </div>

      {/* Brief preview - only shown when NOT selected (full detail is in right panel) */}
      {!isSelected && (
        <div className="px-3 pb-2">
          {action === "DELETE" && null}

          {action === "CREATE" && (
            <div className="bg-muted rounded-md px-3 py-1.5 text-xs">
              <span className="text-emerald-700">+ {group.changes[0]?.newValue}</span>
            </div>
          )}

          {action === "MOVE" && group.changes[0] && (
            <div className="bg-muted rounded-md px-3 py-1.5 text-xs space-y-0.5">
              <div><span className="text-red-700 line-through">{group.changes[0].oldValue}</span></div>
              <div><span className="text-emerald-700">{group.changes[0].newValue}</span></div>
            </div>
          )}

          {action === "UPDATE" &&
            group.changes.slice(0, 1).map((change) => {
              const rawSegments = computeInlineDiff(change.oldValue, change.newValue)
              const segments = truncateDiffWithContext(rawSegments)
              return (
                <div key={change.id} className="space-y-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {change.field}
                  </span>
                  <InlineDiffView segments={segments} />
                </div>
              )
            })}

          {/* Analysis one-liner when available */}
          {firstChange?.agentAnalysis?.summary && analysisStatus !== "analyzing" && (
            <p className={cn(
              "text-[11px] mt-1.5 leading-snug",
              isWarn ? "text-amber-700" : "text-muted-foreground"
            )}>
              {firstChange.agentAnalysis.summary.substring(0, 100)}
              {(firstChange.agentAnalysis.summary.length || 0) > 100 ? "..." : ""}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
