"use client"

import { useState, useRef, useEffect } from "react"
import { useTaxonomy } from "@/lib/taxonomy-context"
import { Button } from "@/components/ui/button"
import { X, Sparkles, Check, ChevronDown, ChevronUp, Loader2, AlertTriangle, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { queryWisdom, formatWisdomResponse } from "@/lib/wisdom-client"
import { OPERATION_CONFIGS } from "@/lib/wisdom-prompts"

interface WisdomAnalysis {
  verdict: string
  verdictColor: string
  confidence: string
  risks: string[]
  operationRisk: string
  operationType: string
  fullResponse: string
  workaround?: string
}

function WisdomAnalysisCard({ analysis }: { analysis: WisdomAnalysis }) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [showScrollHint, setShowScrollHint] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Check if content is scrollable and handle scroll events
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const checkScrollable = () => {
      const isScrollable = container.scrollHeight > container.clientHeight
      const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 10
      setShowScrollHint(isScrollable && !isAtBottom)
    }

    checkScrollable()
    container.addEventListener('scroll', checkScrollable)
    return () => container.removeEventListener('scroll', checkScrollable)
  }, [isExpanded, analysis])

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case "APPROVE":
        return <CheckCircle2 className="w-4 h-4 text-green-600" />
      case "REJECT":
        return <XCircle className="w-4 h-4 text-red-600" />
      case "WORKAROUND":
        return <AlertTriangle className="w-4 h-4 text-amber-600" />
      case "APPROVE WITH CONDITIONS":
        return <AlertCircle className="w-4 h-4 text-blue-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  const getVerdictLabel = (verdict: string) => {
    switch (verdict) {
      case "APPROVE":
        return "APPROVED"
      case "REJECT":
        return "REJECTED"
      case "WORKAROUND":
        return "WORKAROUND SUGGESTED"
      case "APPROVE WITH CONDITIONS":
        return "APPROVED WITH CONDITIONS"
      default:
        return verdict
    }
  }

  const getVerdictBgColor = (verdict: string) => {
    switch (verdict) {
      case "APPROVE":
        return "bg-green-50 border-green-200"
      case "REJECT":
        return "bg-red-50 border-red-200"
      case "WORKAROUND":
        return "bg-amber-50 border-amber-200"
      case "APPROVE WITH CONDITIONS":
        return "bg-blue-50 border-blue-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  const getConfidenceBadgeColor = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case "high":
        return "bg-green-100 text-green-700 border-green-200"
      case "med":
      case "medium":
        return "bg-amber-100 text-amber-700 border-amber-200"
      case "low":
        return "bg-red-100 text-red-700 border-red-200"
      default:
        return "bg-gray-100 text-gray-700 border-gray-200"
    }
  }

  // Parse the full response into sections for display
  const parseResponseSections = (response: string) => {
    const sections: { title: string; content: string }[] = []
    const lines = response.split("\n")
    let currentTitle = ""
    let currentContent: string[] = []

    for (const line of lines) {
      // Match section headers like **Title**:
      if (line.match(/^\*\*[^*]+\*\*:?\s*$/)) {
        if (currentTitle) {
          sections.push({ title: currentTitle, content: currentContent.join("\n").trim() })
        }
        currentTitle = line.replace(/\*\*/g, "").replace(":", "").trim()
        currentContent = []
      } else if (line.match(/^\*\*[^*]+\*\*:\s*.+/)) {
        // Inline section like **Verdict**: APPROVE
        if (currentTitle) {
          sections.push({ title: currentTitle, content: currentContent.join("\n").trim() })
        }
        const match = line.match(/\*\*([^*]+)\*\*:\s*(.+)/)
        if (match) {
          currentTitle = match[1].trim()
          currentContent = [match[2].trim()]
        }
      } else {
        currentContent.push(line)
      }
    }

    if (currentTitle) {
      sections.push({ title: currentTitle, content: currentContent.join("\n").trim() })
    }

    return sections
  }

  const sections = analysis.fullResponse ? parseResponseSections(analysis.fullResponse) : []

  // Filter out "Operations Confidence" from sections since we show it in the header
  const filteredSections = sections.filter(s => s.title.toLowerCase() !== "operations confidence")

  // Helper to render text with markdown-style formatting (bold, etc.)
  const renderFormattedText = (text: string) => {
    // Split by **bold** patterns and render appropriately
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        // Remove ** and render as bold
        return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
      }
      return <span key={i}>{part}</span>
    })
  }

  // Helper to render a line with formatting
  const renderLine = (line: string, lineIdx: number) => {
    const trimmedLine = line.trim()

    // Empty line
    if (!trimmedLine) {
      return <div key={lineIdx} className="h-1" />
    }

    // Bullet point
    if (trimmedLine.startsWith("-")) {
      return (
        <div key={lineIdx} className="flex gap-1.5 ml-1">
          <span className="text-[#2D7A7A]">•</span>
          <span>{renderFormattedText(trimmedLine.substring(1).trim())}</span>
        </div>
      )
    }

    // Indented content (starts with spaces after bullet processing)
    if (line.startsWith("  ") || line.startsWith("\t")) {
      return (
        <div key={lineIdx} className="ml-4 text-muted-foreground">
          {renderFormattedText(trimmedLine)}
        </div>
      )
    }

    // Regular line
    return <div key={lineIdx}>{renderFormattedText(trimmedLine)}</div>
  }

  return (
    <div className={cn("rounded-lg border overflow-hidden flex flex-col", getVerdictBgColor(analysis.verdict))}>
      {/* Header with verdict and confidence */}
      <div
        className="flex items-center justify-between px-3 py-2.5 cursor-pointer hover:bg-black/5"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {getVerdictIcon(analysis.verdict)}
          <span className={cn("text-xs font-semibold", analysis.verdictColor)}>
            {getVerdictLabel(analysis.verdict)}
          </span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium border", getConfidenceBadgeColor(analysis.confidence))}>
            {analysis.confidence} Confidence
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {/* Expandable Analysis Content */}
      {isExpanded && (
        <>
          {/* Scrollable analysis sections with scroll indicator */}
          <div className="border-t border-current/10 relative">
            <div
              ref={scrollContainerRef}
              className="bg-white/80 max-h-[280px] overflow-y-auto"
            >
              {filteredSections.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {filteredSections.map((section, idx) => (
                    <div key={idx} className="px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wide text-[#2D7A7A] font-semibold mb-1">
                        {section.title.replace(/\*\*/g, '')}
                      </div>
                      <div className="text-xs text-foreground/80 leading-relaxed space-y-0.5">
                        {section.content.split("\n").map((line, lineIdx) => renderLine(line, lineIdx))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Fallback if no sections parsed
                <div className="px-3 py-2 space-y-2">
                  {analysis.risks.length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium block mb-1">Risks:</span>
                      <ul className="space-y-1">
                        {analysis.risks.map((risk, idx) => (
                          <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <span className="text-amber-500 mt-0.5">•</span>
                            <span>{renderFormattedText(risk)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Workaround section if present */}
              {analysis.workaround && (
                <div className="px-3 py-2 bg-amber-50/50 border-t border-amber-200/50">
                  <div className="text-[10px] uppercase tracking-wide text-amber-700 font-semibold mb-1">
                    Recommended Workaround
                  </div>
                  <div className="text-xs text-amber-800">{renderFormattedText(analysis.workaround)}</div>
                </div>
              )}
            </div>

            {/* Scroll indicator - shows when there's more content */}
            {showScrollHint && (
              <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pointer-events-none">
                <div className="w-full h-8 bg-gradient-to-t from-white via-white/80 to-transparent" />
                <div className="absolute bottom-1 flex items-center gap-1 text-[10px] text-[#2D7A7A] font-medium bg-white/90 px-2 py-0.5 rounded-full shadow-sm border border-[#2D7A7A]/20">
                  <ChevronDown className="w-3 h-3 animate-bounce" />
                  <span>Scroll for more</span>
                </div>
              </div>
            )}
          </div>

          {/* Fixed CTA Button - always visible, outside scroll area */}
          <div className="px-3 py-3 border-t border-current/10 bg-white shrink-0">
            {analysis.confidence === "High" ? (
              <Button
                size="sm"
                className="w-full bg-[#2D7A7A] hover:bg-[#236363] text-white"
                onClick={(e) => {
                  e.stopPropagation()
                  const event = new CustomEvent('applyWisdomChanges')
                  window.dispatchEvent(event)
                }}
              >
                <Check className="w-4 h-4 mr-2" />
                Apply Changes
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full border-[#2D7A7A] text-[#2D7A7A] hover:bg-[#2D7A7A]/5"
                onClick={(e) => {
                  e.stopPropagation()
                  window.open('mailto:support@enterpret.com?subject=Taxonomy Change Request', '_blank')
                }}
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Contact Enterpret
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export function AgentOverlay() {
  const { isAgentOverlayOpen, setIsAgentOverlayOpen, agentContext, applyAgentChanges } = useTaxonomy()
  const [isLoading, setIsLoading] = useState(false)
  const [analysis, setAnalysis] = useState<WisdomAnalysis | null>(null)
  const [operationDescription, setOperationDescription] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Query Wisdom when overlay opens with operation context
  useEffect(() => {
    if (isAgentOverlayOpen && agentContext && !analysis && !isLoading) {
      const fetchWisdomAnalysis = async () => {
        if (agentContext.operationType && agentContext.wisdomContext) {
          setIsLoading(true)
          setError(null)

          try {
            const wisdomResponse = await queryWisdom(
              agentContext.operationType,
              agentContext.wisdomContext
            )

            const formattedResponse = formatWisdomResponse(wisdomResponse)
            const operationConfig = OPERATION_CONFIGS[agentContext.operationType]

            // Generate operation description
            let description = ""
            switch (agentContext.operationType) {
              case "rename-subtheme":
              case "rename-theme":
                description = `rename "${agentContext.wisdomContext.currentName}" to "${agentContext.wisdomContext.newName}"`
                break
              case "merge-subtheme":
              case "merge-theme":
                description = `merge "${agentContext.wisdomContext.sourceName}" into "${agentContext.wisdomContext.destinationName}"`
                break
              case "delete-subtheme":
              case "delete-keyword":
                description = `delete "${agentContext.wisdomContext.currentName}"`
                break
              case "split-subtheme":
                description = `split "${agentContext.wisdomContext.currentName}" into new sub-themes`
                break
              case "create-subtheme":
              case "create-theme":
                description = `create new ${agentContext.operationType.includes("theme") ? "theme" : "sub-theme"} "${agentContext.wisdomContext.proposedName}"`
                break
              case "change-theme-category":
                description = `change category of "${agentContext.wisdomContext.themeName}" from ${agentContext.wisdomContext.currentCategory} to ${agentContext.wisdomContext.newCategory}`
                break
              default:
                description = `modify "${agentContext.selectedNode?.name}"`
            }

            setOperationDescription(description)
            setAnalysis({
              verdict: formattedResponse.verdict,
              verdictColor: formattedResponse.verdictColor,
              confidence: formattedResponse.confidence,
              risks: formattedResponse.risks,
              operationRisk: operationConfig?.risk || "Unknown",
              operationType: agentContext.operationType,
              fullResponse: wisdomResponse.response,
              workaround: wisdomResponse.workaround,
            })
          } catch (err) {
            console.error("Error querying Wisdom:", err)
            setError("Failed to get analysis. Please try again.")
          } finally {
            setIsLoading(false)
          }
        }
      }

      fetchWisdomAnalysis()
    }
  }, [isAgentOverlayOpen, agentContext, analysis, isLoading])

  const handleClose = () => {
    setIsAgentOverlayOpen(false)
    setAnalysis(null)
    setOperationDescription("")
    setError(null)
  }

  const handleApplyChanges = () => {
    // Apply the changes based on the operation type
    applyAgentChanges([])
    handleClose()
  }

  // Listen for apply changes event from WisdomAnalysisCard
  useEffect(() => {
    const handleApplyWisdomChanges = () => {
      handleApplyChanges()
    }
    window.addEventListener('applyWisdomChanges', handleApplyWisdomChanges)
    return () => {
      window.removeEventListener('applyWisdomChanges', handleApplyWisdomChanges)
    }
  }, [applyAgentChanges])

  return (
    <>
      {/* Backdrop - subtle, click to close */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 ease-spring",
          isAgentOverlayOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={handleClose}
      />

      {/* Slide-in Drawer */}
      <div
        className={cn(
          "fixed top-0 right-0 z-50 h-full w-[420px] bg-background border-l border-border shadow-2xl flex flex-col transition-transform duration-300 ease-spring",
          isAgentOverlayOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-[#2D7A7A]/5 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2D7A7A]/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#2D7A7A]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Taxonomy Agent</h2>
              <p className="text-[11px] text-muted-foreground">AI-powered change analysis</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} className="text-muted-foreground hover:text-foreground h-8 w-8 p-0">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Context Banner */}
        {agentContext?.selectedNode && (
          <div className="px-4 py-2 bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-muted-foreground">Working on:</span>
              <span className="bg-[#2D7A7A]/10 text-[#2D7A7A] px-1.5 py-0.5 rounded font-medium">
                {agentContext.nodeLevel} · {agentContext.selectedNode.name}
              </span>
            </div>
          </div>
        )}

        {/* Analysis Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-[#2D7A7A]" />
              <span className="text-sm">Analyzing your request...</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-red-500">
              <AlertTriangle className="w-8 h-8" />
              <span className="text-sm">{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setError(null)
                  setAnalysis(null)
                }}
              >
                Try Again
              </Button>
            </div>
          )}

          {analysis && !isLoading && !error && (
            <div className="space-y-3">
              {/* Operation Summary */}
              <div className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">Request: </span>
                {operationDescription}
              </div>

              {/* Wisdom Analysis Card */}
              <WisdomAnalysisCard analysis={analysis} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
