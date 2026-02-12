"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useTaxonomy } from "@/lib/taxonomy-context"
import { themeCategoryColors, getThemeDistribution, type Theme, type ThemeCategory } from "@/lib/taxonomy-data"
import { EmptyState } from "./empty-state"
import { FileText, ExternalLink, ChevronRight, Trash2, Merge, Scissors, ArrowUpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { type TaxonomyOperationType, type WisdomPromptContext } from "@/lib/wisdom-prompts"

// Category icon component
function CategoryIcon({
  category,
  isClickable,
  onCategoryChange,
}: {
  category: ThemeCategory
  isClickable?: boolean
  onCategoryChange?: (newCategory: ThemeCategory) => void
}) {
  const color = themeCategoryColors[category]

  const icon = (
    <div
      className={cn(
        "w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 p-1",
        isClickable && "cursor-pointer hover:ring-2 hover:ring-[#2D7A7A]/40",
      )}
    >
      <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: color }}>
        {category === "complaint" && "!"}
        {category === "improvement" && "↑"}
        {category === "praise" && "✓"}
        {category === "question" && "?"}
        {category === "generic" && "•"}
      </div>
    </div>
  )

  if (!isClickable || !onCategoryChange) {
    return icon
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{icon}</DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={() => onCategoryChange("complaint")}>
          <CategoryIcon category="complaint" />
          <span className="ml-2">Complaint</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onCategoryChange("improvement")}>
          <CategoryIcon category="improvement" />
          <span className="ml-2">Improvement</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onCategoryChange("praise")}>
          <CategoryIcon category="praise" />
          <span className="ml-2">Praise</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onCategoryChange("question")}>
          <CategoryIcon category="question" />
          <span className="ml-2">Question</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onCategoryChange("generic")}>
          <CategoryIcon category="generic" />
          <span className="ml-2">Generic</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Theme color bar
function ThemeColorBar({ themes }: { themes: Theme[] }) {
  const distribution = getThemeDistribution(themes)

  if (distribution.length === 0) return null

  return (
    <div className="flex h-2 w-full rounded-full overflow-hidden">
      {distribution.map(({ category, percentage }) => (
        <div
          key={category}
          style={{
            width: `${percentage}%`,
            backgroundColor: themeCategoryColors[category],
          }}
        />
      ))}
    </div>
  )
}

function AutoExpandTextarea({
  value,
  onChange,
  onBlur,
  onKeyDown,
  placeholder,
  className,
  autoFocus,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  onBlur: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value])

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.selectionStart = textareaRef.current.value.length
    }
  }, [autoFocus])

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={cn(
        "w-full resize-none overflow-hidden bg-transparent focus:outline-none focus:ring-2 focus:ring-[#2D7A7A]/20",
        className,
      )}
      rows={1}
    />
  )
}

function ThemeItem({
  theme,
  depth = 0,
  isEditMode,
  onThemeNameChange,
  onThemeCategoryChange,
  onThemeDelete,
  onCreateSubTheme,
  siblingSubThemes,
  onMergeSubTheme,
  allThemes,
  onMergeTheme,
  currentL3Id,
  onSplitSubTheme,
  onPromoteSubTheme,
  parentThemeName,
}: {
  theme: Theme
  depth?: number
  isEditMode: boolean
  onThemeNameChange?: (themeId: string, newName: string) => void
  onThemeCategoryChange?: (themeId: string, newCategory: ThemeCategory) => void
  onThemeDelete?: (themeId: string) => void
  onCreateSubTheme?: (parentThemeId: string, parentThemeName: string, proposedSubThemeName: string) => void
  siblingSubThemes?: Theme[]
  onMergeSubTheme?: (sourceThemeId: string, sourceThemeName: string, destinationThemeId: string, destinationThemeName: string, sourceParentTheme?: string, destinationParentTheme?: string) => void
  allThemes?: ThemeWithPath[]
  onMergeTheme?: (sourceThemeId: string, sourceThemeName: string, destinationThemeId: string, destinationThemeName: string, destinationPath: string) => void
  currentL3Id?: string
  onSplitSubTheme?: (sourceThemeId: string, sourceThemeName: string, splitNames: string[], retainOriginal: boolean) => void
  onPromoteSubTheme?: (sourceThemeId: string, sourceThemeName: string, parentThemeName: string) => void
  parentThemeName?: string
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(theme.name)
  const [isHovered, setIsHovered] = useState(false)
  const [isCreatingSubTheme, setIsCreatingSubTheme] = useState(false)
  const [newSubThemeName, setNewSubThemeName] = useState("")
  const [isMergeDropdownOpen, setIsMergeDropdownOpen] = useState(false)
  const [mergeSearch, setMergeSearch] = useState("")
  const [isMergeThemeDropdownOpen, setIsMergeThemeDropdownOpen] = useState(false)
  const [mergeThemeSearch, setMergeThemeSearch] = useState("")
  const [isSplitFormOpen, setIsSplitFormOpen] = useState(false)
  const [splitDestinations, setSplitDestinations] = useState<string[]>(["", ""])
  const [retainOriginal, setRetainOriginal] = useState(false)
  const hasChildren = theme.children && theme.children.length > 0
  // In edit mode, parent themes (depth=0) should be expandable even without children
  const isExpandable = hasChildren || (isEditMode && depth === 0)

  // Filter out current theme from siblings for merge destination options (for sub-themes)
  const mergeDestinations = siblingSubThemes?.filter(s => s.id !== theme.id) || []

  // Filter out current theme from all themes for merge destination options (for themes at depth=0)
  // Exclude themes from the same L3 since we're merging to different L3s
  const mergeThemeDestinations = allThemes?.filter(t => t.theme.id !== theme.id) || []

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isEditMode) {
      setEditValue(theme.name)
      setIsEditing(true)
    }
  }

  const handleEditBlur = () => {
    if (editValue !== theme.name && onThemeNameChange) {
      onThemeNameChange(theme.id, editValue)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleEditBlur()
    } else if (e.key === "Escape") {
      setEditValue(theme.name)
      setIsEditing(false)
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onThemeDelete) {
      onThemeDelete(theme.id)
    }
  }

  const handleStartCreateSubTheme = (e: React.MouseEvent) => {
    e.stopPropagation()
    setNewSubThemeName("")
    setIsCreatingSubTheme(true)
  }

  const handleCreateSubThemeBlur = () => {
    setIsCreatingSubTheme(false)
    if (newSubThemeName.trim() && onCreateSubTheme) {
      onCreateSubTheme(theme.id, theme.name, newSubThemeName.trim())
    }
    setNewSubThemeName("")
  }

  const handleCreateSubThemeKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleCreateSubThemeBlur()
    } else if (e.key === "Escape") {
      setIsCreatingSubTheme(false)
      setNewSubThemeName("")
    }
  }

  // Split handlers
  const handleStartSplit = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSplitDestinations(["", ""])
    setRetainOriginal(false)
    setIsSplitFormOpen(true)
  }

  const handleCancelSplit = () => {
    setIsSplitFormOpen(false)
    setSplitDestinations(["", ""])
    setRetainOriginal(false)
  }

  const handleAddSplitDestination = () => {
    setSplitDestinations([...splitDestinations, ""])
  }

  const handleRemoveSplitDestination = (index: number) => {
    if (splitDestinations.length > 2) {
      setSplitDestinations(splitDestinations.filter((_, i) => i !== index))
    }
  }

  const handleUpdateSplitDestination = (index: number, value: string) => {
    const updated = [...splitDestinations]
    updated[index] = value
    setSplitDestinations(updated)
  }

  const handleSubmitSplit = () => {
    const validSplits = splitDestinations.filter(s => s.trim() !== "")
    if (validSplits.length >= 2 && onSplitSubTheme) {
      onSplitSubTheme(theme.id, theme.name, validSplits, retainOriginal)
      handleCancelSplit()
    }
  }

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-2 rounded px-1 group",
          isExpandable && "cursor-pointer hover:bg-muted/50",
          depth > 0 && "ml-4",
        )}
        onClick={() => isExpandable && setIsExpanded(!isExpanded)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isExpandable ? (
          <ChevronRight
            className={cn("w-4 h-4 text-muted-foreground transition-transform shrink-0", isExpanded && "rotate-90")}
          />
        ) : (
          depth > 0 && (
            <div className="w-4 h-4 flex items-center justify-center text-muted-foreground shrink-0">
              <span className="text-xs">└</span>
            </div>
          )
        )}

        {/* Only show category icon for parent themes (depth === 0) */}
        {depth === 0 && (
          <CategoryIcon
            category={theme.category}
            isClickable={isEditMode}
            onCategoryChange={(newCategory) => onThemeCategoryChange?.(theme.id, newCategory)}
          />
        )}

        {isEditing ? (
          <AutoExpandTextarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleEditBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className="text-sm py-0.5 px-1 border-2 border-dashed border-[#2D7A7A]/40 rounded flex-1"
          />
        ) : (
          <span
            className={cn("text-sm flex-1 truncate", isEditMode && "cursor-text hover:bg-muted/50 px-1 -mx-1 rounded")}
            onClick={handleEditClick}
          >
            {theme.name}
          </span>
        )}

        {/* Action buttons container - always takes up space to prevent layout shift */}
        {isEditMode && (
          <div className="flex items-center gap-0.5 shrink-0">
            {/* Merge Theme button - only for themes (depth === 0) */}
            {depth === 0 && mergeThemeDestinations.length > 0 && (
              <DropdownMenu
                open={isMergeThemeDropdownOpen}
                onOpenChange={(open) => {
                  setIsMergeThemeDropdownOpen(open)
                  if (!open) setMergeThemeSearch("") // Reset search when closing
                }}
              >
                <DropdownMenuTrigger
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "p-1 hover:bg-[#2D7A7A]/10 rounded text-[#2D7A7A] shrink-0 transition-opacity",
                    isHovered || isMergeThemeDropdownOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                  )}
                  title="Merge into another theme"
                >
                  <Merge className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80" sideOffset={5}>
                  <div className="px-2 py-1.5 text-xs text-muted-foreground border-b border-border">
                    Merge "{theme.name}" into:
                  </div>
                  {/* Search input */}
                  <div className="p-2 border-b border-border">
                    <input
                      type="text"
                      value={mergeThemeSearch}
                      onChange={(e) => setMergeThemeSearch(e.target.value)}
                      placeholder="Search themes..."
                      className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-[#2D7A7A]/20"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  {/* Filtered destinations */}
                  <div className="max-h-64 overflow-y-auto">
                    {mergeThemeDestinations
                      .filter((dest) =>
                        dest.theme.name.toLowerCase().includes(mergeThemeSearch.toLowerCase()) ||
                        dest.path.toLowerCase().includes(mergeThemeSearch.toLowerCase())
                      )
                      .map((dest) => (
                        <DropdownMenuItem
                          key={`${dest.l3Id}-${dest.theme.id}`}
                          onSelect={() => onMergeTheme?.(theme.id, theme.name, dest.theme.id, dest.theme.name, dest.path)}
                          className="flex flex-col items-start gap-0.5 py-2"
                        >
                          <span className="truncate font-medium">{dest.theme.name}</span>
                          <span className="text-xs text-muted-foreground truncate w-full">{dest.path}</span>
                        </DropdownMenuItem>
                      ))}
                    {mergeThemeDestinations.filter((dest) =>
                      dest.theme.name.toLowerCase().includes(mergeThemeSearch.toLowerCase()) ||
                      dest.path.toLowerCase().includes(mergeThemeSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                        No matching themes
                      </div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {/* Merge Sub-theme button - only for sub-themes (depth > 0) with sibling destinations */}
            {depth > 0 && mergeDestinations.length > 0 && (
              <DropdownMenu
                open={isMergeDropdownOpen}
                onOpenChange={(open) => {
                  setIsMergeDropdownOpen(open)
                  if (!open) setMergeSearch("") // Reset search when closing
                }}
              >
                <DropdownMenuTrigger
                  onClick={(e) => e.stopPropagation()}
                  className={cn(
                    "p-1 hover:bg-[#2D7A7A]/10 rounded text-[#2D7A7A] shrink-0 transition-opacity",
                    isHovered || isMergeDropdownOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                  )}
                  title="Merge into another sub-theme"
                >
                  <Merge className="w-4 h-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64" sideOffset={5}>
                  <div className="px-2 py-1.5 text-xs text-muted-foreground border-b border-border">
                    Merge "{theme.name}" into:
                  </div>
                  {/* Search input */}
                  <div className="p-2 border-b border-border">
                    <input
                      type="text"
                      value={mergeSearch}
                      onChange={(e) => setMergeSearch(e.target.value)}
                      placeholder="Search sub-themes..."
                      className="w-full px-2 py-1.5 text-sm border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-[#2D7A7A]/20"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  {/* Filtered destinations */}
                  <div className="max-h-48 overflow-y-auto">
                    {mergeDestinations
                      .filter((dest) => dest.name.toLowerCase().includes(mergeSearch.toLowerCase()))
                      .map((dest) => (
                        <DropdownMenuItem
                          key={dest.id}
                          onSelect={() => onMergeSubTheme?.(theme.id, theme.name, dest.id, dest.name, parentThemeName, parentThemeName)}
                        >
                          <span className="truncate">{dest.name}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{dest.count}</span>
                        </DropdownMenuItem>
                      ))}
                    {mergeDestinations.filter((dest) => dest.name.toLowerCase().includes(mergeSearch.toLowerCase())).length === 0 && (
                      <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                        No matching sub-themes
                      </div>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {/* Promote button - only for sub-themes (depth > 0) */}
            {depth > 0 && onPromoteSubTheme && parentThemeName && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onPromoteSubTheme(theme.id, theme.name, parentThemeName)
                }}
                className={cn(
                  "p-1 hover:bg-[#2D7A7A]/10 rounded text-[#2D7A7A] shrink-0 transition-opacity",
                  isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                title="Promote to theme"
              >
                <ArrowUpCircle className="w-4 h-4" />
              </button>
            )}
            {/* Split button - only for sub-themes (depth > 0) */}
            {depth > 0 && (
              <button
                onClick={handleStartSplit}
                className={cn(
                  "p-1 hover:bg-[#2D7A7A]/10 rounded text-[#2D7A7A] shrink-0 transition-opacity",
                  isHovered || isSplitFormOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                title="Split into multiple sub-themes"
              >
                <Scissors className="w-4 h-4" />
              </button>
            )}
            {/* Delete button */}
            <button
              onClick={handleDelete}
              className={cn(
                "p-1 hover:bg-destructive/10 rounded text-destructive shrink-0 transition-opacity",
                isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
              title="Delete theme"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <FileText className="w-3 h-3" />
          <span>{theme.count}</span>
        </div>
      </div>

      {/* Inline Split Form - appears below the sub-theme when split is clicked */}
      {isSplitFormOpen && depth > 0 && (
        <div className={cn("ml-4 mt-1 mb-2 p-3 border border-dashed border-[#2D7A7A]/40 rounded-lg bg-[#2D7A7A]/5", depth > 0 && "ml-8")}>
          <div className="text-xs text-muted-foreground mb-2">
            Split "{theme.name}" into:
          </div>

          {/* Split destination inputs */}
          <div className="space-y-2 mb-3">
            {splitDestinations.map((dest, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={dest}
                  onChange={(e) => handleUpdateSplitDestination(index, e.target.value)}
                  placeholder={`New sub-theme ${index + 1}...`}
                  className="flex-1 text-sm py-1.5 px-2 border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-[#2D7A7A]/20"
                  onClick={(e) => e.stopPropagation()}
                />
                {splitDestinations.length > 2 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveSplitDestination(index)
                    }}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    title="Remove"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add another split button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleAddSplitDestination()
            }}
            className="text-xs text-[#2D7A7A] hover:underline mb-3"
          >
            + Add another split
          </button>

          {/* Retain original toggle */}
          <div className="flex items-center gap-2 mb-3 pt-2 border-t border-border/50">
            <input
              type="checkbox"
              id={`retain-${theme.id}`}
              checked={retainOriginal}
              onChange={(e) => setRetainOriginal(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 rounded border-border text-[#2D7A7A] focus:ring-[#2D7A7A]/20"
            />
            <label
              htmlFor={`retain-${theme.id}`}
              className="text-xs text-muted-foreground cursor-pointer"
              onClick={(e) => e.stopPropagation()}
            >
              Retain "{theme.name}" as catch-all for uncategorized feedback
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleCancelSplit()
              }}
              className="text-xs px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleSubmitSplit()
              }}
              disabled={splitDestinations.filter(s => s.trim() !== "").length < 2}
              className={cn(
                "text-xs px-3 py-1.5 bg-[#2D7A7A] text-white rounded transition-colors",
                splitDestinations.filter(s => s.trim() !== "").length >= 2
                  ? "hover:bg-[#256666]"
                  : "opacity-50 cursor-not-allowed"
              )}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {isExpanded && isExpandable && (
        <div className="ml-2 border-l border-border/50 pl-1">
          {theme.children?.map((child) => (
            <ThemeItem
              key={child.id}
              theme={child}
              depth={depth + 1}
              isEditMode={isEditMode}
              onThemeNameChange={onThemeNameChange}
              onThemeCategoryChange={onThemeCategoryChange}
              onThemeDelete={onThemeDelete}
              onCreateSubTheme={onCreateSubTheme}
              siblingSubThemes={theme.children}
              onMergeSubTheme={onMergeSubTheme}
              allThemes={allThemes}
              onMergeTheme={onMergeTheme}
              currentL3Id={currentL3Id}
              onSplitSubTheme={onSplitSubTheme}
              onPromoteSubTheme={onPromoteSubTheme}
              parentThemeName={theme.name}
            />
          ))}
          {/* Add Sub-theme button/input - only for parent themes (depth=0) in edit mode */}
          {isEditMode && depth === 0 && (
            isCreatingSubTheme ? (
              <div className="flex items-center gap-2 py-2 px-1 ml-4">
                <div className="w-4 h-4 flex items-center justify-center text-muted-foreground shrink-0">
                  <span className="text-xs">+</span>
                </div>
                <AutoExpandTextarea
                  value={newSubThemeName}
                  onChange={(e) => setNewSubThemeName(e.target.value)}
                  onBlur={handleCreateSubThemeBlur}
                  onKeyDown={handleCreateSubThemeKeyDown}
                  placeholder="Enter sub-theme name..."
                  autoFocus
                  className="text-sm py-0.5 px-1 border-2 border-dashed border-[#2D7A7A]/40 rounded flex-1"
                />
              </div>
            ) : (
              <div
                className="flex items-center gap-2 py-2 px-1 ml-4 text-sm text-muted-foreground cursor-pointer hover:text-foreground hover:bg-muted/50 rounded transition-colors"
                onClick={handleStartCreateSubTheme}
              >
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                  <span className="text-xs">+</span>
                </div>
                <span>Add Sub-theme</span>
              </div>
            )
          )}
        </div>
      )}
    </div>
  )
}

function isCatchAllNode(nodeName: string): boolean {
  const name = nodeName.toLowerCase()
  return name === "miscellaneous" || name === "generic"
}

// Helper to get all themes from the entire taxonomy with their L3 path context
interface ThemeWithPath {
  theme: Theme
  l3Name: string
  l3Id: string
  path: string // "L1 > L2 > L3"
}

function getAllThemesFromTaxonomy(taxonomyData: { level1: any[] }): ThemeWithPath[] {
  const allThemes: ThemeWithPath[] = []

  taxonomyData.level1.forEach((l1) => {
    l1.children?.forEach((l2: any) => {
      l2.children?.forEach((l3: any) => {
        l3.themes?.forEach((theme: Theme) => {
          allThemes.push({
            theme,
            l3Name: l3.name,
            l3Id: l3.id,
            path: `${l1.name} > ${l2.name} > ${l3.name}`,
          })
        })
      })
    })
  })

  return allThemes
}

export function DetailPane() {
  const { getSelectedNode, isEditMode, addDraftChange, draftChanges, selectedL1Id, selectedL2Id, selectedL3Id, initiateHighRiskReview, taxonomyData, buildNodePath, currentNavIds, creatingNode, cancelCreatingNode, commitCreatingNode } =
    useTaxonomy()
  const [themeSearch, setThemeSearch] = useState("")
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState("")
  const [editingDescription, setEditingDescription] = useState(false)
  const [descriptionValue, setDescriptionValue] = useState("")

  // State for creating new theme
  const [isCreatingTheme, setIsCreatingTheme] = useState(false)
  const [newThemeName, setNewThemeName] = useState("")
  const [newThemeCategory, setNewThemeCategory] = useState<ThemeCategory>("complaint")
  // Multi-path support: each path has l1Id, l2Id, l3Id
  const [newThemePaths, setNewThemePaths] = useState<Array<{ l1Id: string; l2Id: string; l3Id: string }>>([])

  // Helper to get L2 options for a given L1
  const getL2OptionsForL1 = (l1Id: string) => {
    const l1Node = taxonomyData.level1.find((n) => n.id === l1Id)
    return l1Node?.children || []
  }

  // Helper to get L3 options for a given L1 and L2
  const getL3OptionsForL2 = (l1Id: string, l2Id: string) => {
    const l1Node = taxonomyData.level1.find((n) => n.id === l1Id)
    const l2Node = l1Node?.children?.find((n) => n.id === l2Id)
    return l2Node?.children || []
  }

  const selectedNode = getSelectedNode()

  // Creation form state — local to this component, reset when creatingNode changes
  const [newNodeName, setNewNodeName] = useState("")
  const [newNodeDescription, setNewNodeDescription] = useState("")
  const prevCreatingLevelRef = useRef<string | null>(null)

  useEffect(() => {
    const currentLevel = creatingNode?.level ?? null
    if (currentLevel !== prevCreatingLevelRef.current) {
      setNewNodeName("")
      setNewNodeDescription("")
      prevCreatingLevelRef.current = currentLevel
    }
  }, [creatingNode])

  // Show creation form when creatingNode is set
  if (creatingNode) {
    const levelDescriptions: Record<string, string> = {
      L1: "Describe what this product area covers...",
      L2: "Describe what features this group includes...",
      L3: "Describe the specific topic this keyword captures...",
    }

    return (
      <div className="w-[340px] h-full bg-background border-l border-border flex flex-col overflow-hidden transition-all duration-300 ease-spring">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="mb-4">
            <h3 className="text-xs font-medium text-muted-foreground mb-2">New {creatingNode.level} Keyword</h3>
            <AutoExpandTextarea
              value={newNodeName}
              onChange={(e) => setNewNodeName(e.target.value)}
              onBlur={() => {}}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  if (newNodeName.trim()) {
                    commitCreatingNode(newNodeName.trim(), newNodeDescription.trim())
                  }
                } else if (e.key === "Escape") {
                  cancelCreatingNode()
                }
              }}
              placeholder="Enter keyword name..."
              autoFocus
              className="text-lg font-semibold py-1 px-2 border-2 border-dashed border-[#2D7A7A]/40 rounded"
            />
          </div>

          {/* Description */}
          <div className="mb-4">
            <h3 className="text-xs font-medium text-muted-foreground mb-2">Description</h3>
            <AutoExpandTextarea
              value={newNodeDescription}
              onChange={(e) => setNewNodeDescription(e.target.value)}
              onBlur={() => {}}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  cancelCreatingNode()
                }
              }}
              placeholder={levelDescriptions[creatingNode.level]}
              className="text-sm text-muted-foreground py-1 px-2 border-2 border-dashed border-[#2D7A7A]/40 rounded"
            />
          </div>

          {/* Themes section — empty state */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-medium text-muted-foreground">Themes 0</h3>
            </div>
            <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted/30" />
          </div>
        </div>

        {/* Empty theme list area */}
        <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
          <p className="text-sm text-muted-foreground text-center px-4">
            Themes will appear after feedback is categorized under this keyword.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button
            onClick={cancelCreatingNode}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (newNodeName.trim()) {
                commitCreatingNode(newNodeName.trim(), newNodeDescription.trim())
              }
            }}
            disabled={!newNodeName.trim()}
            className={cn(
              "px-4 py-2 text-sm text-white rounded transition-colors",
              newNodeName.trim()
                ? "bg-[#2D7A7A] hover:bg-[#256666]"
                : "bg-[#2D7A7A]/50 cursor-not-allowed"
            )}
          >
            Create Keyword
          </button>
        </div>
      </div>
    )
  }

  if (!selectedNode) {
    return (
      <div className="w-[340px] h-full bg-background border-l border-border overflow-hidden transition-all duration-300 ease-spring">
        <EmptyState />
      </div>
    )
  }

  const themes = selectedNode.themes || []
  const themeCount = selectedNode.themeCount || themes.length

  const isNonEditable = isCatchAllNode(selectedNode.name)

  // Get all themes from taxonomy for merge theme destinations
  const allThemesForMerge = getAllThemesFromTaxonomy(taxonomyData)

  const filteredThemes = themes.filter((theme) => theme.name.toLowerCase().includes(themeSearch.toLowerCase()))

  const nodeChanges = draftChanges.filter((c) => c.nodeId === selectedNode.id)
  const hasTitleChange = nodeChanges.some((c) => c.field === "name")
  const hasDescriptionChange = nodeChanges.some((c) => c.field === "description")
  const getTitleDraftValue = () => nodeChanges.find((c) => c.field === "name")?.newValue || selectedNode.name
  const getDescriptionDraftValue = () =>
    nodeChanges.find((c) => c.field === "description")?.newValue || selectedNode.description

  const getNodeLevel = (): "L1" | "L2" | "L3" => {
    if (selectedL3Id) return "L3"
    if (selectedL2Id) return "L2"
    return "L1"
  }

  // All edits go through agent review panel — no silent path
  const routeEdit = (
    node: typeof selectedNode,
    level: "L1" | "L2" | "L3" | "Theme",
    operationType: TaxonomyOperationType,
    wisdomContext?: Partial<WisdomPromptContext>
  ) => {
    if (!node) return
    initiateHighRiskReview(node, level, operationType, wisdomContext)
  }

  const handleTitleEdit = () => {
    if (isEditMode && !isNonEditable && selectedNode) {
      setTitleValue(selectedNode.name)
      setEditingTitle(true)
    }
  }

  const handleTitleBlur = () => {
    setEditingTitle(false)
    if (titleValue !== selectedNode.name && titleValue.trim() !== "") {
      const level = getNodeLevel()
      const operationType: TaxonomyOperationType = level === "L3" ? "rename-subtheme" : "rename-theme"
      const wisdomContext: Partial<WisdomPromptContext> = {
        currentName: selectedNode.name,
        newName: titleValue,
        l3Name: level === "L3" ? selectedNode.name : undefined,
        themeName: level !== "L3" ? selectedNode.name : undefined,
      }
      routeEdit(selectedNode, level, operationType, wisdomContext)
    }
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleTitleBlur()
    } else if (e.key === "Escape") {
      setEditingTitle(false)
    }
  }

  const handleDescriptionEdit = () => {
    if (isEditMode && !isNonEditable && selectedNode) {
      // Enable inline editing first - changes will be added to draft on blur
      setDescriptionValue(selectedNode.description || "")
      setEditingDescription(true)
    }
  }

  const handleDescriptionBlur = () => {
    if (descriptionValue !== (selectedNode.description || "")) {
      addDraftChange({
        nodeId: selectedNode.id,
        nodeName: selectedNode.name,
        nodeLevel: getNodeLevel(),
        field: "description",
        oldValue: selectedNode.description || "",
        newValue: descriptionValue,
        nodePath: buildNodePath(),
        nodeNavIds: currentNavIds(),
      })
    }
    setEditingDescription(false)
  }

  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleDescriptionBlur()
    } else if (e.key === "Escape") {
      setEditingDescription(false)
    }
  }

  // Find a theme or sub-theme by ID across the themes tree
  const findThemeById = (id: string): { node: Theme; parent?: Theme } | undefined => {
    for (const theme of themes) {
      if (theme.id === id) return { node: theme }
      if (theme.children) {
        const child = theme.children.find(c => c.id === id)
        if (child) return { node: child, parent: theme }
      }
    }
    return undefined
  }

  const handleSubThemeNameChange = (themeId: string, newName: string) => {
    if (isNonEditable || !selectedNode) return
    const found = findThemeById(themeId)
    if (!found) return
    const { node: target, parent } = found
    const isSubTheme = !!parent
    const operationType: TaxonomyOperationType = isSubTheme ? "rename-subtheme" : "rename-theme"
    const wisdomContext: Partial<WisdomPromptContext> = {
      currentName: target.name,
      newName,
      themeName: isSubTheme ? parent.name : target.name,
      subThemeName: isSubTheme ? target.name : undefined,
    }
    routeEdit(selectedNode, "Theme", operationType, wisdomContext)
  }

  const handleThemeCategoryChange = (themeId: string, newCategory: ThemeCategory) => {
    if (isNonEditable || !selectedNode) return
    const theme = themes.find(t => t.id === themeId)
    const operationType: TaxonomyOperationType = "change-theme-category"
    const categoryMap: Record<ThemeCategory, "COMPLAINT" | "IMPROVEMENT" | "PRAISE" | "HELP"> = {
      complaint: "COMPLAINT",
      improvement: "IMPROVEMENT",
      praise: "PRAISE",
      question: "HELP",
      generic: "COMPLAINT", // Default mapping for generic
    }
    // Get sub-theme names from the theme's children
    const subThemeNames = theme?.children?.map(child => child.name) || []
    const themeVolume = theme?.count || 0
    const subThemeVolumes = theme?.children?.map(child => ({ name: child.name, count: child.count })) || []

    const wisdomContext: Partial<WisdomPromptContext> = {
      themeName: theme?.name || "",
      currentCategory: theme ? categoryMap[theme.category] : undefined,
      newCategory: categoryMap[newCategory],
      l3Name: selectedNode.name,
      // Pass additional context for richer Wisdom response
      subThemeNames: subThemeNames,
      themeVolume: themeVolume,
      subThemeVolumes: subThemeVolumes,
    }
    routeEdit(selectedNode, "Theme", operationType, wisdomContext)
  }

  const handleThemeDelete = (themeId: string) => {
    if (isNonEditable || !selectedNode) return
    const theme = themes.find(t => t.id === themeId)
    const operationType: TaxonomyOperationType = "delete-subtheme"
    const wisdomContext: Partial<WisdomPromptContext> = {
      currentName: theme?.name || "",
      themeName: theme?.name,
      subThemeName: theme?.name,
      l3Name: selectedNode.name,
    }
    routeEdit(selectedNode, "Theme", operationType, wisdomContext)
  }

  const handleDeleteKeyword = () => {
    if (isNonEditable || !selectedNode) return
    const level = getNodeLevel()
    const operationType: TaxonomyOperationType = "delete-keyword"
    const wisdomContext: Partial<WisdomPromptContext> = {
      currentName: selectedNode.name,
      l3Name: selectedNode.name,
    }
    routeEdit(selectedNode, level, operationType, wisdomContext)
  }

  const handleCreateSubTheme = (parentThemeId: string, parentThemeName: string, proposedSubThemeName: string) => {
    if (isNonEditable || !selectedNode) return
    const operationType: TaxonomyOperationType = "create-subtheme"
    const wisdomContext: Partial<WisdomPromptContext> = {
      parentThemeName: parentThemeName,
      themeName: parentThemeName,
      proposedName: proposedSubThemeName,
      newName: proposedSubThemeName,
      l3Name: selectedNode.name,
    }
    routeEdit(selectedNode, "Theme", operationType, wisdomContext)
  }

  const handleMergeSubTheme = (sourceThemeId: string, sourceThemeName: string, destinationThemeId: string, destinationThemeName: string, sourceParentTheme?: string, destinationParentTheme?: string) => {
    if (isNonEditable || !selectedNode) return
    const operationType: TaxonomyOperationType = "merge-subtheme"
    const wisdomContext: Partial<WisdomPromptContext> = {
      sourceName: sourceThemeName,
      destinationName: destinationThemeName,
      subThemeName: sourceThemeName,
      l3Name: selectedNode.name,
      sourceParentTheme,
      destinationParentTheme,
    }
    routeEdit(selectedNode, "Theme", operationType, wisdomContext)
  }

  const handleMergeTheme = (sourceThemeId: string, sourceThemeName: string, destinationThemeId: string, destinationThemeName: string, destinationPath: string) => {
    if (isNonEditable || !selectedNode) return
    const operationType: TaxonomyOperationType = "merge-theme"
    const wisdomContext: Partial<WisdomPromptContext> = {
      sourceName: sourceThemeName,
      destinationName: destinationThemeName,
      themeName: sourceThemeName,
      l3Name: selectedNode.name,
      l3Path: destinationPath,
    }
    routeEdit(selectedNode, "Theme", operationType, wisdomContext)
  }

  const handlePromoteSubTheme = (sourceThemeId: string, sourceThemeName: string, parentThemeName: string) => {
    if (isNonEditable || !selectedNode) return
    const operationType: TaxonomyOperationType = "promote-subtheme"
    const wisdomContext: Partial<WisdomPromptContext> = {
      currentName: sourceThemeName,
      subThemeName: sourceThemeName,
      parentThemeName: parentThemeName,
      themeName: parentThemeName,
      l3Name: selectedNode.name,
    }
    routeEdit(selectedNode, "Theme", operationType, wisdomContext)
  }

  const handleSplitSubTheme = (sourceThemeId: string, sourceThemeName: string, splitNames: string[], retainOriginal: boolean) => {
    if (isNonEditable || !selectedNode) return
    const operationType: TaxonomyOperationType = "split-subtheme"
    const wisdomContext: Partial<WisdomPromptContext> = {
      currentName: sourceThemeName,
      subThemeName: sourceThemeName,
      proposedSplits: splitNames,
      l3Name: selectedNode.name,
      // Note: retainOriginal is passed for context but the Wisdom prompt will evaluate this
    }
    routeEdit(selectedNode, "Theme", operationType, wisdomContext)
  }

  // Get name by ID helpers
  const getL1NameById = (l1Id: string): string => {
    const l1Node = taxonomyData.level1.find((n) => n.id === l1Id)
    return l1Node?.name || ""
  }

  const getL2NameById = (l1Id: string, l2Id: string): string => {
    const l1Node = taxonomyData.level1.find((n) => n.id === l1Id)
    const l2Node = l1Node?.children?.find((n) => n.id === l2Id)
    return l2Node?.name || ""
  }

  const getL3NameById = (l1Id: string, l2Id: string, l3Id: string): string => {
    const l1Node = taxonomyData.level1.find((n) => n.id === l1Id)
    const l2Node = l1Node?.children?.find((n) => n.id === l2Id)
    const l3Node = l2Node?.children?.find((n) => n.id === l3Id)
    return l3Node?.name || ""
  }

  // Create Theme handlers
  const handleStartCreateTheme = () => {
    setNewThemeName("")
    setNewThemeCategory("complaint")
    // Initialize with current selection if L3 is selected, otherwise start with empty path
    if (selectedL1Id && selectedL2Id && selectedL3Id) {
      setNewThemePaths([{ l1Id: selectedL1Id, l2Id: selectedL2Id, l3Id: selectedL3Id }])
    } else {
      setNewThemePaths([{ l1Id: "", l2Id: "", l3Id: "" }])
    }
    setIsCreatingTheme(true)
  }

  const handleCancelCreateTheme = () => {
    setIsCreatingTheme(false)
    setNewThemeName("")
    setNewThemeCategory("complaint")
    setNewThemePaths([])
  }

  const handleAddPath = () => {
    setNewThemePaths([...newThemePaths, { l1Id: "", l2Id: "", l3Id: "" }])
  }

  const handleRemovePath = (index: number) => {
    if (newThemePaths.length > 1) {
      setNewThemePaths(newThemePaths.filter((_, i) => i !== index))
    }
  }

  const handleUpdatePath = (index: number, field: "l1Id" | "l2Id" | "l3Id", value: string) => {
    const updated = [...newThemePaths]
    updated[index] = { ...updated[index], [field]: value }
    // Reset dependent fields when parent changes
    if (field === "l1Id") {
      updated[index].l2Id = ""
      updated[index].l3Id = ""
    } else if (field === "l2Id") {
      updated[index].l3Id = ""
    }
    setNewThemePaths(updated)
  }

  const handleSubmitCreateTheme = () => {
    // Validate: need at least one complete path and a theme name
    const validPaths = newThemePaths.filter((p) => p.l1Id && p.l2Id && p.l3Id)
    if (!newThemeName.trim() || validPaths.length === 0) {
      return
    }

    const level = getNodeLevel()
    const operationType: TaxonomyOperationType = "create-theme"

    // Map ThemeCategory to the Wisdom prompt format
    const categoryMap: Record<ThemeCategory, "COMPLAINT" | "IMPROVEMENT" | "PRAISE" | "HELP"> = {
      complaint: "COMPLAINT",
      improvement: "IMPROVEMENT",
      praise: "PRAISE",
      question: "HELP",
      generic: "COMPLAINT", // Default mapping
    }

    // Build path strings for all valid paths
    const pathStrings = validPaths.map((p) => {
      const l1Name = getL1NameById(p.l1Id)
      const l2Name = getL2NameById(p.l1Id, p.l2Id)
      const l3Name = getL3NameById(p.l1Id, p.l2Id, p.l3Id)
      return `${l1Name} → ${l2Name} → ${l3Name}`
    })

    // Use first path for primary context
    const firstPath = validPaths[0]
    const wisdomContext: Partial<WisdomPromptContext> = {
      proposedName: newThemeName.trim(),
      newName: newThemeName.trim(),
      newCategory: categoryMap[newThemeCategory],
      l1Name: getL1NameById(firstPath.l1Id),
      l2Name: getL2NameById(firstPath.l1Id, firstPath.l2Id),
      l3Name: getL3NameById(firstPath.l1Id, firstPath.l2Id, firstPath.l3Id),
      l3Path: pathStrings.length === 1 ? pathStrings[0] : pathStrings.join(" | "),
    }

    // Use selected node if available, otherwise create a placeholder
    const nodeForOverlay = selectedNode || {
      id: "new-theme",
      name: newThemeName.trim(),
      count: 0,
      description: "",
    }

    routeEdit(nodeForOverlay, level || "L3", operationType, wisdomContext)
    handleCancelCreateTheme()
  }

  const handleCreateThemeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmitCreateTheme()
    } else if (e.key === "Escape") {
      handleCancelCreateTheme()
    }
  }

  return (
    <div className="w-[340px] h-full bg-background border-l border-border flex flex-col overflow-hidden transition-all duration-300 ease-spring">
      {/* Header */}
      <div className="p-4 border-b border-border">
        {isEditMode && (
          <div className="flex justify-end mb-3">
            <button className="flex items-center gap-1 text-sm text-[#2D7A7A] hover:underline">
              <FileText className="w-4 h-4" />
              View {selectedNode.count.toLocaleString()} Records
              <ExternalLink className="w-3 h-3" />
            </button>
          </div>
        )}

        <div className="flex items-start justify-between gap-2 mb-2">
          {editingTitle ? (
            <AutoExpandTextarea
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              autoFocus
              className="text-lg font-semibold py-1 px-2 border-2 border-dashed border-[#2D7A7A]/40 rounded flex-1"
            />
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <h2
                className={cn(
                  "text-lg font-semibold text-foreground flex-1",
                  isEditMode && !isNonEditable && "cursor-text hover:bg-muted/50 px-1 -mx-1 rounded",
                  hasTitleChange && "border-b-2 border-dashed border-[#2D7A7A]/40 pb-0.5",
                )}
                onClick={handleTitleEdit}
              >
                {hasTitleChange ? getTitleDraftValue() : selectedNode.name}
              </h2>
              {isEditMode && !isNonEditable && (
                <button
                  onClick={handleDeleteKeyword}
                  className="p-1.5 hover:bg-destructive/10 rounded text-destructive transition-colors shrink-0"
                  title="Delete keyword"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {!isEditMode && (
            <button className="flex items-center gap-1 text-sm text-[#2D7A7A] hover:underline shrink-0">
              <FileText className="w-4 h-4" />
              View {selectedNode.count.toLocaleString()} Records
            </button>
          )}
        </div>

        {/* Description */}
        {selectedNode.description && (
          <div className="mb-4">
            <h3 className="text-xs font-medium text-muted-foreground mb-2">Description</h3>
            {editingDescription ? (
              <AutoExpandTextarea
                value={descriptionValue}
                onChange={(e) => setDescriptionValue(e.target.value)}
                onBlur={handleDescriptionBlur}
                onKeyDown={handleDescriptionKeyDown}
                autoFocus
                className="text-sm text-muted-foreground py-1 px-2 border-2 border-dashed border-[#2D7A7A]/40 rounded"
              />
            ) : (
              <p
                className={cn(
                  "text-sm text-muted-foreground",
                  isEditMode && !isNonEditable && "cursor-text hover:bg-muted/50 px-1 -mx-1 rounded",
                  hasDescriptionChange && "border-l-2 border-dashed border-[#2D7A7A]/40 pl-2",
                )}
                onClick={handleDescriptionEdit}
              >
                {hasDescriptionChange ? getDescriptionDraftValue() : selectedNode.description}
              </p>
            )}
          </div>
        )}

        {/* Themes Section */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-muted-foreground">Themes {themeCount}</h3>
          </div>
          <ThemeColorBar themes={themes} />
        </div>
      </div>

      {/* Theme Search */}
      <div className="p-4 border-b border-border">
        <input
          type="text"
          value={themeSearch}
          onChange={(e) => setThemeSearch(e.target.value)}
          placeholder="Search themes..."
          className="w-full px-3 py-2 text-sm border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-[#2D7A7A]/20"
        />
      </div>

      {/* Theme List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredThemes.length > 0 ? (
          filteredThemes.map((theme) => (
            <ThemeItem
              key={theme.id}
              theme={theme}
              depth={0}
              isEditMode={isEditMode}
              onThemeNameChange={handleSubThemeNameChange}
              onThemeCategoryChange={handleThemeCategoryChange}
              onThemeDelete={handleThemeDelete}
              onCreateSubTheme={handleCreateSubTheme}
              onMergeSubTheme={handleMergeSubTheme}
              onSplitSubTheme={handleSplitSubTheme}
              onPromoteSubTheme={handlePromoteSubTheme}
              allThemes={allThemesForMerge}
              onMergeTheme={handleMergeTheme}
              currentL3Id={selectedL3Id || undefined}
            />
          ))
        ) : (
          <div className="text-sm text-muted-foreground text-center py-8">No themes found</div>
        )}

        {/* Add Theme button/form - available in edit mode */}
        {isEditMode && !isNonEditable && (
          isCreatingTheme ? (
            <div className="mt-4 p-3 border border-dashed border-[#2D7A7A]/40 rounded-lg bg-[#2D7A7A]/5">
              {/* Theme Name */}
              <div className="mb-3">
                <label className="text-xs text-muted-foreground mb-1 block">Theme Name</label>
                <input
                  type="text"
                  value={newThemeName}
                  onChange={(e) => setNewThemeName(e.target.value)}
                  onKeyDown={handleCreateThemeKeyDown}
                  placeholder="Enter theme name..."
                  autoFocus
                  className="w-full text-sm py-1.5 px-2 border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-[#2D7A7A]/20"
                />
              </div>

              {/* Category */}
              <div className="mb-3">
                <label className="text-xs text-muted-foreground mb-1 block">Category</label>
                <div className="flex gap-1">
                  {(["complaint", "improvement", "praise", "question"] as ThemeCategory[]).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setNewThemeCategory(cat)}
                      className={cn(
                        "p-1 rounded transition-all",
                        newThemeCategory === cat
                          ? "ring-2 ring-[#2D7A7A] ring-offset-1"
                          : "opacity-60 hover:opacity-100"
                      )}
                      title={cat.charAt(0).toUpperCase() + cat.slice(1)}
                    >
                      <CategoryIcon category={cat} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Paths */}
              <div className="mb-3">
                <label className="text-xs text-muted-foreground mb-2 block">
                  Taxonomy Path(s)
                </label>
                <div className="space-y-3">
                  {newThemePaths.map((path, index) => {
                    const isComplete = path.l1Id && path.l2Id && path.l3Id
                    return (
                      <div key={index} className="relative">
                        {/* Show completed path as a compact chip */}
                        {isComplete ? (
                          <div className="flex items-center gap-2 p-2 bg-background border border-border rounded text-xs">
                            <span className="flex-1 truncate">
                              {getL1NameById(path.l1Id)} → {getL2NameById(path.l1Id, path.l2Id)} → {getL3NameById(path.l1Id, path.l2Id, path.l3Id)}
                            </span>
                            <button
                              onClick={() => handleUpdatePath(index, "l3Id", "")}
                              className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                              title="Edit path"
                            >
                              ✎
                            </button>
                            {newThemePaths.length > 1 && (
                              <button
                                onClick={() => handleRemovePath(index)}
                                className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                title="Remove path"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ) : (
                          /* Show dropdowns for incomplete path */
                          <div className="p-2 bg-background border border-dashed border-border rounded space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-6 shrink-0">L1</span>
                              <select
                                value={path.l1Id}
                                onChange={(e) => handleUpdatePath(index, "l1Id", e.target.value)}
                                className="flex-1 text-xs py-1.5 px-2 border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-[#2D7A7A]/20"
                              >
                                <option value="">Select L1 keyword...</option>
                                {taxonomyData.level1.map((l1) => (
                                  <option key={l1.id} value={l1.id}>{l1.name}</option>
                                ))}
                              </select>
                            </div>
                            {path.l1Id && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-6 shrink-0">L2</span>
                                <select
                                  value={path.l2Id}
                                  onChange={(e) => handleUpdatePath(index, "l2Id", e.target.value)}
                                  className="flex-1 text-xs py-1.5 px-2 border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-[#2D7A7A]/20"
                                >
                                  <option value="">Select L2 keyword...</option>
                                  {getL2OptionsForL1(path.l1Id).map((l2) => (
                                    <option key={l2.id} value={l2.id}>{l2.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {path.l2Id && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground w-6 shrink-0">L3</span>
                                <select
                                  value={path.l3Id}
                                  onChange={(e) => handleUpdatePath(index, "l3Id", e.target.value)}
                                  className="flex-1 text-xs py-1.5 px-2 border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-[#2D7A7A]/20"
                                >
                                  <option value="">Select L3 keyword...</option>
                                  {getL3OptionsForL2(path.l1Id, path.l2Id).map((l3) => (
                                    <option key={l3.id} value={l3.id}>{l3.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {newThemePaths.length > 1 && (
                              <div className="flex justify-end">
                                <button
                                  onClick={() => handleRemovePath(index)}
                                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
                <button
                  onClick={handleAddPath}
                  className="mt-2 text-xs text-[#2D7A7A] hover:underline"
                >
                  + Add another path
                </button>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                <button
                  onClick={handleCancelCreateTheme}
                  className="text-xs px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitCreateTheme}
                  disabled={!newThemeName.trim() || !newThemePaths.some((p) => p.l1Id && p.l2Id && p.l3Id)}
                  className={cn(
                    "text-xs px-3 py-1.5 bg-[#2D7A7A] text-white rounded transition-colors",
                    newThemeName.trim() && newThemePaths.some((p) => p.l1Id && p.l2Id && p.l3Id)
                      ? "hover:bg-[#256666]"
                      : "opacity-50 cursor-not-allowed"
                  )}
                >
                  Continue
                </button>
              </div>
            </div>
          ) : (
            <div
              className="mt-4 flex items-center justify-center px-4 py-3 text-sm text-muted-foreground border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 hover:border-[#2D7A7A]/40 transition-colors"
              onClick={handleStartCreateTheme}
            >
              <span>+ Add Theme</span>
            </div>
          )
        )}
      </div>
    </div>
  )
}
