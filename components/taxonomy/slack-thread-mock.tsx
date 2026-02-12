"use client"

import { useState } from "react"
import { CheckCircle2, Hash, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SlackThreadMockProps {
  operationDescription: string
  rejectionReason: string
  onClose: () => void
  onThreadCreated?: () => void
}

export function SlackThreadMock({ operationDescription, rejectionReason, onClose, onThreadCreated }: SlackThreadMockProps) {
  const [isCreated, setIsCreated] = useState(false)

  const handleCreate = () => {
    setIsCreated(true)
    onThreadCreated?.()
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-background shadow-sm">
      {/* Slack-style header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#4A154B] text-white">
        <div className="flex items-center gap-1.5">
          <Hash className="w-3.5 h-3.5 opacity-80" />
          <span className="text-xs font-semibold">customer-taxonomy-requests</span>
        </div>
        <button onClick={onClose} className="p-0.5 hover:bg-white/10 rounded transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {isCreated ? (
        /* Confirmation state */
        <div className="px-4 py-5 flex flex-col items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-green-600" />
          <span className="text-sm font-medium text-foreground">Thread created</span>
          <p className="text-xs text-muted-foreground text-center">
            The Enterpret team has been notified and will review this request.
          </p>
        </div>
      ) : (
        /* Pre-filled message */
        <div className="p-3 space-y-3">
          {/* Message preview */}
          <div className="bg-muted/50 rounded px-3 py-2.5 space-y-2">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 rounded bg-[#2D7A7A] flex items-center justify-center text-white text-[10px] font-bold">
                T
              </div>
              <span className="text-xs font-semibold text-foreground">Taxonomy Agent</span>
              <span className="text-[10px] text-muted-foreground">just now</span>
            </div>
            <p className="text-xs text-foreground leading-relaxed">
              <span className="font-medium">Taxonomy edit request:</span> {operationDescription}
            </p>
            <p className="text-xs text-foreground leading-relaxed">
              <span className="font-medium">Agent assessment:</span> {rejectionReason}
            </p>
            <p className="text-xs text-muted-foreground">
              Requesting manual review.
            </p>
          </div>

          {/* Action */}
          <Button
            size="sm"
            className="w-full bg-[#4A154B] hover:bg-[#3b1040] text-white text-xs"
            onClick={handleCreate}
          >
            Send to Enterpret
          </Button>
        </div>
      )}
    </div>
  )
}
