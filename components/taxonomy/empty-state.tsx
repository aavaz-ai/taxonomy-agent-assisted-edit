"use client"

import { Lightbulb, HelpCircle } from "lucide-react"

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-5">
        <Lightbulb className="w-7 h-7 text-muted-foreground" />
      </div>
      <h3 className="text-base font-medium text-foreground mb-2">{"We've got something up our sleeves"}</h3>
      <p className="text-sm text-muted-foreground max-w-[260px] mb-5 leading-relaxed">
        A magician doesn&apos;t reveal their secrets, but I can show you a magic trick if you select a Keyword
      </p>
      <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <HelpCircle className="w-4 h-4" />
        <span>Learn more about Taxonomy</span>
      </button>
    </div>
  )
}
