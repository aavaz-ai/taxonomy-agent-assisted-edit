"use client"

import { Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  type ActionType,
  type DiffSegment,
  computeInlineDiff,
  truncateDiffWithContext,
  getGroupActionType,
  formatNodeLevel,
} from "@/lib/inline-diff"
import type { DraftChange } from "@/lib/taxonomy-context"

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
  const match = text.match(/^(\s*)(.*?)(\s*)$/s)
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
    <div className="bg-muted rounded-md px-3 py-2 font-mono text-xs leading-relaxed">
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

// --- ChangeDiffBlock ---

interface ChangeGroup {
  nodeName: string
  nodeLevel: string
  changes: DraftChange[]
}

export function ChangeDiffBlock({
  group,
  onUndo,
}: {
  group: ChangeGroup
  onUndo: (changeId: string) => void
}) {
  const action = getGroupActionType(group.changes.map((c) => c.field))

  return (
    <div className="space-y-2">
      {/* Header: Level / Name  [CHIP]  Undo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {formatNodeLevel(group.nodeLevel)}
          </span>
          <span className="text-xs text-muted-foreground">/</span>
          <span className="text-sm font-medium text-foreground">{group.nodeName}</span>
          <ActionChip action={action} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            group.changes.forEach((c) => onUndo(c.id))
          }}
          className="text-muted-foreground text-xs h-7 px-2"
        >
          <Undo2 className="w-3 h-3 mr-1" />
          Undo
        </Button>
      </div>

      {/* Body: varies by action type */}
      {action === "DELETE" && (
        // Delete: no diff block, just the header chip is enough
        null
      )}

      {action === "CREATE" && (
        <div className="bg-muted rounded-md px-3 py-2 font-mono text-xs">
          <span className="text-emerald-700">
            + {group.changes[0]?.newValue}
          </span>
        </div>
      )}

      {action === "MOVE" && group.changes[0] && (
        <div className="bg-muted rounded-md px-3 py-2 font-mono text-xs space-y-1">
          <div>
            <span className="text-red-700 line-through">{group.changes[0].oldValue}</span>
          </div>
          <div>
            <span className="text-emerald-700">{group.changes[0].newValue}</span>
          </div>
        </div>
      )}

      {action === "UPDATE" &&
        group.changes.map((change) => {
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
    </div>
  )
}
