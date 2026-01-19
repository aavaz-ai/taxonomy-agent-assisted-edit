"use client"

import { useTaxonomy } from "@/lib/taxonomy-context"
import { Button } from "@/components/ui/button"
import { HelpCircle, ChevronLeft, Loader2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function TaxonomyHeader() {
  const { isEditMode, setIsEditMode, searchQuery, setSearchQuery, isProcessing, processingEstimate } = useTaxonomy()

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border bg-background">
      {isEditMode ? (
        <button
          onClick={() => setIsEditMode(false)}
          className="flex items-center gap-1 text-foreground hover:text-muted-foreground transition-colors shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
          <h1 className="text-base font-medium">Edit Taxonomy</h1>
        </button>
      ) : (
        <h1 className="text-base font-medium text-foreground shrink-0">Taxonomy</h1>
      )}

      <div className="flex-1 max-w-md mx-auto">
        <input
          type="text"
          placeholder="Find in Taxonomy..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D7A7A]/20"
        />
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8">
          <HelpCircle className="w-4 h-4" />
        </Button>

        {!isEditMode && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    onClick={() => !isProcessing && setIsEditMode(true)}
                    disabled={isProcessing}
                    className={`text-foreground h-9 ${isProcessing ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating taxonomy...
                      </>
                    ) : (
                      "Edit Taxonomy"
                    )}
                  </Button>
                </span>
              </TooltipTrigger>
              {isProcessing && (
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">
                    Your taxonomy is being updated with your recent changes. This should be ready in approximately{" "}
                    {processingEstimate}.
                  </p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  )
}
