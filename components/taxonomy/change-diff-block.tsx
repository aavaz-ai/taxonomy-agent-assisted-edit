"use client"

import { Undo2, MessageCircle } from "lucide-react"
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
import type { DraftChange, CardDisplayMode } from "@/lib/taxonomy-context"

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

// --- StatusChip (resolution + decision-pending states) ---

type StatusChipType = "ADDRESSED" | "DISMISSED" | "WORKAROUND" | "DECISION PENDING"

const statusChipStyles: Record<StatusChipType, { border: string; text: string }> = {
  ADDRESSED:        { border: "border-gray-300",  text: "text-gray-400" },
  DISMISSED:        { border: "border-gray-300",  text: "text-gray-400" },
  WORKAROUND:       { border: "border-blue-400",  text: "text-blue-500" },
  "DECISION PENDING": { border: "border-amber-400", text: "text-amber-500" },
}

function StatusChip({ status }: { status: StatusChipType }) {
  const style = statusChipStyles[status]
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${style.border} ${style.text}`}
    >
      {status}
    </span>
  )
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
  onContactEnterpret,
  isSelected,
  onClick,
  displayMode = "chips",
}: {
  group: ChangeGroup
  onUndo: (changeId: string) => void
  onContactEnterpret?: (changeId: string) => void
  isSelected?: boolean
  onClick?: () => void
  displayMode?: CardDisplayMode
}) {
  const action = getGroupActionType(group.changes.map((c) => c.field))
  const firstChange = group.changes[0]
  const analysisStatus = firstChange?.agentAnalysis?.status
  const isAccepted = firstChange?.userAccepted
  const isWarn = (analysisStatus === "warn" || analysisStatus === "fail") && !isAccepted
  const isPass = analysisStatus === "pass" || isAccepted
  const resolution = firstChange?.resolution
  const isDimmed = resolution === 'dismissed'
  const isAnalyzing = analysisStatus === "analyzing"
  const isResolved = resolution === 'dismissed' || resolution === 'contacted' || resolution === 'workaround-accepted'

  // Left edge bar color
  const leftBarColor = isAnalyzing
    ? "border-l-[#2D7A7A]"
    : isPass
    ? "border-l-green-500"
    : isResolved
    ? "border-l-gray-300"
    : isWarn && !resolution
    ? "border-l-amber-400"
    : "border-l-transparent"

  return (
    <div
      className={cn(
        "rounded-lg border border-l-[3px] transition-all cursor-pointer",
        leftBarColor,
        isAnalyzing && "animate-pulse",
        isSelected && "ring-2 ring-[#2D7A7A]/40 border-[#2D7A7A] border-l-[3px]",
        !isSelected && "hover:border-muted-foreground/30",
        isDimmed && "opacity-50",
      )}
      onClick={onClick}
    >
      {/* Row 1: Name + ActionChip (only when green) + Undo */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-foreground truncate">{group.nodeName}</span>
          {displayMode === "chips" ? (
            // Chips mode: show state chip for all states
            resolution === 'contacted' ? <StatusChip status="ADDRESSED" />
            : resolution === 'dismissed' ? <StatusChip status="DISMISSED" />
            : resolution === 'workaround-accepted' ? <StatusChip status="WORKAROUND" />
            : isPass ? <ActionChip action={action} />
            : isWarn && !resolution ? <StatusChip status="DECISION PENDING" />
            : null
          ) : (
            // Bars mode: only ActionChip on green cards (original behavior)
            isPass && <ActionChip action={action} />
          )}
        </div>
        {isDimmed ? (
          <div className="flex items-center gap-1 shrink-0">
            {onContactEnterpret && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  const firstId = group.changes[0]?.id
                  if (firstId) onContactEnterpret(firstId)
                }}
                className="text-muted-foreground text-xs h-7 px-2"
              >
                <MessageCircle className="w-3 h-3 mr-1" />
                Contact Enterpret
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                group.changes.forEach((c) => onUndo(c.id))
              }}
              className="text-muted-foreground/60 text-[11px] h-6 px-1.5 shrink-0"
            >
              <Undo2 className="w-2.5 h-2.5 mr-0.5" />
              Undo
            </Button>
          </div>
        ) : (
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
        )}
      </div>

      {/* Row 2: Level type */}
      <div className="px-3 pb-1.5">
        <span className="text-xs text-muted-foreground">
          {formatNodeLevel(group.nodeLevel)}
        </span>
      </div>

      {/* Row 3-4: Diff preview - only shown when NOT selected */}
      {!isSelected && (
        <div className="px-3 pb-2">
          {resolution === 'workaround-accepted' && firstChange?.workaroundSteps && firstChange.workaroundSteps.length > 1 ? (
            /* Workaround: show numbered steps instead of standard diff */
            <div className="bg-muted rounded-md px-3 py-2 text-xs space-y-1">
              {firstChange.workaroundSteps.map((step, i) => (
                <div key={i} className="text-muted-foreground leading-snug">
                  <span className="text-muted-foreground/70 font-mono mr-1.5">{i + 1}.</span>
                  {step}
                </div>
              ))}
            </div>
          ) : (
            <>
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

              {action === "MERGE" && group.changes[0] && (
                <div className="bg-muted rounded-md px-3 py-1.5 text-xs">
                  <span className="text-muted-foreground">{group.changes[0].oldValue}</span>
                  <span className="text-muted-foreground mx-1">&rarr;</span>
                  <span className="text-blue-700">{group.changes[0].newValue}</span>
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
            </>
          )}
        </div>
      )}
    </div>
  )
}
