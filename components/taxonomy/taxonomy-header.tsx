"use client"

import { useState, useRef, useMemo } from "react"
import { useTaxonomy } from "@/lib/taxonomy-context"
import type { CardDisplayMode } from "@/lib/taxonomy-context"
import { searchAllThemes, type SearchResult } from "@/lib/taxonomy-data"
import { Button } from "@/components/ui/button"
import { HelpCircle, ChevronLeft, Loader2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

export function TaxonomyHeader() {
  const {
    isEditMode, setIsEditMode, searchQuery, setSearchQuery, isProcessing, processingEstimate,
    taxonomyData, setSelectedL1Id, setSelectedL2Id, setSelectedL3Id,
    cardDisplayMode, setCardDisplayMode,
  } = useTaxonomy()

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return []
    return searchAllThemes(taxonomyData, searchQuery)
  }, [taxonomyData, searchQuery])

  const handleResultClick = (result: SearchResult) => {
    setSelectedL1Id(result.l1Id)
    // Use setTimeout to let the L1 state settle before setting L2/L3
    setTimeout(() => {
      setSelectedL2Id(result.l2Id)
      setTimeout(() => {
        setSelectedL3Id(result.l3Id)
      }, 0)
    }, 0)
    setSearchQuery("")
    setIsDropdownOpen(false)
  }

  const handleInputFocus = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current)
    setIsDropdownOpen(true)
  }

  const handleInputBlur = () => {
    blurTimeoutRef.current = setTimeout(() => {
      setIsDropdownOpen(false)
    }, 200)
  }

  return (
    <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-border">
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

      <div className="flex-1 max-w-2xl mx-auto relative">
        <input
          type="text"
          placeholder="Find in Taxonomy..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value)
            setIsDropdownOpen(true)
          }}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="w-full px-3 py-2 text-sm bg-muted/30 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D7A7A]/20"
        />
        {isDropdownOpen && searchQuery.length >= 2 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-50 max-h-[300px] overflow-y-auto">
            {searchResults.length === 0 ? (
              <div className="px-3 py-3 text-sm text-muted-foreground">No results found</div>
            ) : (
              searchResults.map((result, index) => (
                <button
                  key={`${result.l3Id}-${result.name}-${index}`}
                  className={`w-full text-left px-3 py-2 hover:bg-muted/50 cursor-pointer ${index < searchResults.length - 1 ? "border-b border-border" : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleResultClick(result)}
                >
                  <div className="text-xs text-muted-foreground">{result.path}</div>
                  <div className="text-sm font-medium text-foreground">{result.name}</div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground h-8 w-8">
              <HelpCircle className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0">
            <Tabs defaultValue="legend" className="w-full">
              <TabsList className="w-full rounded-b-none">
                <TabsTrigger value="legend" className="flex-1">Legend</TabsTrigger>
                <TabsTrigger value="display" className="flex-1">Display</TabsTrigger>
              </TabsList>
              <TabsContent value="legend" className="mt-0 px-3 py-3">
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-1 h-4 rounded-full bg-green-500 shrink-0" />
                    <span className="text-xs text-foreground">Approved</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-1 h-4 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-xs text-foreground">Decision Pending</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-1 h-4 rounded-full bg-gray-300 shrink-0" />
                    <span className="text-xs text-foreground">Resolved (Dismissed / Addressed / Workaround)</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-1 h-4 rounded-full bg-[#2D7A7A] shrink-0 animate-pulse" />
                    <span className="text-xs text-foreground">Analyzing</span>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="display" className="mt-0 px-3 py-3">
                <div className="space-y-2">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="displayMode"
                      checked={cardDisplayMode === "chips"}
                      onChange={() => setCardDisplayMode("chips")}
                      className="mt-0.5 accent-[#2D7A7A]"
                    />
                    <div>
                      <div className="text-xs font-medium text-foreground">Chips</div>
                      <div className="text-[11px] text-muted-foreground">Show status labels on all cards</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="displayMode"
                      checked={cardDisplayMode === "bars"}
                      onChange={() => setCardDisplayMode("bars")}
                      className="mt-0.5 accent-[#2D7A7A]"
                    />
                    <div>
                      <div className="text-xs font-medium text-foreground">Bars only</div>
                      <div className="text-[11px] text-muted-foreground">Minimal — colored bars without text labels</div>
                    </div>
                  </label>
                </div>
              </TabsContent>
            </Tabs>
          </PopoverContent>
        </Popover>

        {!isEditMode && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="ghost"
                    onClick={() => !isProcessing && setIsEditMode(true)}
                    disabled={isProcessing}
                    className={`text-foreground h-9 hover:bg-muted ${isProcessing ? "opacity-60 cursor-not-allowed" : ""}`}
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
