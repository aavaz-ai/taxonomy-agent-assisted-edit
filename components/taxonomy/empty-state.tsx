"use client"

import { HelpCircle } from "lucide-react"

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      {/* Mini card illustration */}
      <div className="w-44 rounded-lg border border-border bg-muted/30 p-3 mb-5 text-left">
        <div className="h-2.5 w-20 bg-muted-foreground/20 rounded mb-2.5" />
        <div className="h-2 w-full bg-muted/60 rounded mb-1.5" />
        <div className="h-2 w-3/4 bg-muted/60 rounded mb-3" />
        <div className="flex gap-1.5">
          <div className="h-4 w-12 bg-[#2D7A7A]/15 rounded text-[8px] text-[#2D7A7A]/60 flex items-center justify-center">theme</div>
          <div className="h-4 w-10 bg-[#2D7A7A]/15 rounded text-[8px] text-[#2D7A7A]/60 flex items-center justify-center">tag</div>
        </div>
      </div>

      <h3 className="text-sm font-medium text-foreground mb-1.5">Keyword details</h3>
      <p className="text-sm text-muted-foreground max-w-[240px] mb-5 leading-relaxed">
        Select a keyword from the tree to view its details, themes, and related data.
      </p>
      <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <HelpCircle className="w-4 h-4" />
        <span>Learn more about Taxonomy</span>
      </button>
    </div>
  )
}
