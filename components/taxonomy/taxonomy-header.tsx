"use client"

import { useState, useRef, useMemo } from "react"
import { useTaxonomy } from "@/lib/taxonomy-context"
import { searchAllThemes, type SearchResult } from "@/lib/taxonomy-data"
import { Button } from "@/components/ui/button"
import { HelpCircle, ChevronLeft, Loader2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function TaxonomyHeader() {
  const {
    isEditMode, setIsEditMode, searchQuery, setSearchQuery, isProcessing, processingEstimate,
    taxonomyData, setSelectedL1Id, setSelectedL2Id, setSelectedL3Id,
  } = useTaxonomy()

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const searchResults = useMemo(() => {
    if (searchQuery.length < 2) return []
    return searchAllThemes(taxonomyData, searchQuery)
  }, [taxonomyData, searchQuery])

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'l1') {
      setSelectedL1Id(result.l1Id)
    } else if (result.type === 'l2') {
      setSelectedL1Id(result.l1Id)
      setTimeout(() => setSelectedL2Id(result.l2Id), 0)
    } else {
      // l3, theme, subtheme — navigate to full L1 > L2 > L3 path
      setSelectedL1Id(result.l1Id)
      setTimeout(() => {
        setSelectedL2Id(result.l2Id)
        setTimeout(() => {
          setSelectedL3Id(result.l3Id)
        }, 0)
      }, 0)
    }
    setSearchQuery("")
    setIsDropdownOpen(false)
  }

  const typeLabels: Record<SearchResult['type'], string> = {
    l1: 'L1',
    l2: 'L2',
    l3: 'L3',
    theme: 'Theme',
    subtheme: 'Sub-theme',
  }

  // Highlight matched substring in text
  function highlightMatch(text: string, query: string) {
    if (!query || query.length < 2) return text
    const idx = text.toLowerCase().indexOf(query.toLowerCase())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <span className="bg-yellow-200/70 font-semibold">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    )
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
                  key={`${result.type}-${result.l1Id}-${result.l2Id}-${result.l3Id}-${result.name}-${index}`}
                  className={`w-full text-left px-3 py-2 hover:bg-muted/50 cursor-pointer ${index < searchResults.length - 1 ? "border-b border-border" : ""}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleResultClick(result)}
                >
                  <div className="flex items-center gap-2">
                    <div className="text-xs text-muted-foreground flex-1">{result.path}</div>
                    <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider shrink-0">
                      {typeLabels[result.type]}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-foreground">{highlightMatch(result.name, searchQuery)}</div>
                </button>
              ))
            )}
          </div>
        )}
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
