"use client"

import { useState } from "react"
import { useTaxonomy } from "@/lib/taxonomy-context"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Sparkles, Clock, ArrowRight } from "lucide-react"

export function ConfirmationModal() {
  const { isConfirmModalOpen, setIsConfirmModalOpen, applyChanges, draftChanges } = useTaxonomy()
  const [backfillPeriod, setBackfillPeriod] = useState("3-months")

  if (!isConfirmModalOpen) return null

  const handleConfirm = () => {
    applyChanges()
  }

  const handleCancel = () => {
    setIsConfirmModalOpen(false)
  }

  // Get estimated time based on backfill period
  const getEstimatedTime = () => {
    switch (backfillPeriod) {
      case "1-month":
        return "~30 minutes"
      case "3-months":
        return "~2 hours"
      case "6-months":
        return "~4 hours"
      case "12-months":
        return "~8 hours"
      case "all-time":
        return "~12 hours"
      default:
        return "~2 hours"
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleCancel} />

      {/* Modal */}
      <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden border border-border">
        {/* Header with gradient accent */}
        <div className="relative bg-gradient-to-r from-[#2D7A7A] to-[#3D9A9A] px-6 py-5">
          <button
            onClick={handleCancel}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Apply Taxonomy Changes</h2>
              <p className="text-sm text-white/80">
                {draftChanges.length} update{draftChanges.length !== 1 ? "s" : ""} ready to process
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* What happens next */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-foreground mb-3">What happens next</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#2D7A7A]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-[#2D7A7A]">1</span>
                </div>
                <p className="text-sm text-muted-foreground">Your taxonomy changes will be saved and applied</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#2D7A7A]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-[#2D7A7A]">2</span>
                </div>
                <p className="text-sm text-muted-foreground">We'll recategorize your feedback with the new structure</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-[#2D7A7A]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-[#2D7A7A]">3</span>
                </div>
                <p className="text-sm text-muted-foreground">New themes will be generated based on your updates</p>
              </div>
            </div>
          </div>

          {/* Time range selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">Reanalyze feedback from</label>
            <Select value={backfillPeriod} onValueChange={setBackfillPeriod}>
              <SelectTrigger className="w-full bg-muted/30 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-month">Last month</SelectItem>
                <SelectItem value="3-months">Last 3 months</SelectItem>
                <SelectItem value="6-months">Last 6 months</SelectItem>
                <SelectItem value="12-months">Last 12 months</SelectItem>
                <SelectItem value="all-time">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Time estimate card */}
          <div className="bg-muted/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Estimated processing time</p>
              <p className="text-sm text-muted-foreground">{getEstimatedTime()} — you can keep using Enterpret</p>
            </div>
          </div>

          {/* Note */}
          <p className="text-xs text-muted-foreground mb-6">
            Taxonomy editing will be temporarily locked while we process your changes. You'll receive a notification
            when it's complete.
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCancel} className="flex-1 bg-transparent">
              Go back
            </Button>
            <Button onClick={handleConfirm} className="flex-1 bg-[#2D7A7A] hover:bg-[#236363] text-white gap-2">
              Confirm & Apply
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
