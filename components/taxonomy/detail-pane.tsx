"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useTaxonomy } from "@/lib/taxonomy-context"
import { themeCategoryColors, getThemeDistribution, type Theme, type ThemeCategory } from "@/lib/taxonomy-data"
import { EmptyState } from "./empty-state"
import { FileText, ExternalLink, ChevronRight, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

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
        <DropdownMenuItem onClick={() => onCategoryChange("complaint")}>
          <CategoryIcon category="complaint" />
          <span className="ml-2">Complaint</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCategoryChange("improvement")}>
          <CategoryIcon category="improvement" />
          <span className="ml-2">Improvement</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCategoryChange("praise")}>
          <CategoryIcon category="praise" />
          <span className="ml-2">Praise</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCategoryChange("question")}>
          <CategoryIcon category="question" />
          <span className="ml-2">Question</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCategoryChange("generic")}>
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
}: {
  theme: Theme
  depth?: number
  isEditMode: boolean
  onThemeNameChange?: (themeId: string, newName: string) => void
  onThemeCategoryChange?: (themeId: string, newCategory: ThemeCategory) => void
  onThemeDelete?: (themeId: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(theme.name)
  const [isHovered, setIsHovered] = useState(false)
  const hasChildren = theme.children && theme.children.length > 0

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

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-2 rounded px-1 group",
          hasChildren && "cursor-pointer hover:bg-muted/50",
          depth > 0 && "ml-4",
        )}
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {hasChildren ? (
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

        {isEditMode && isHovered && (
          <button
            onClick={handleDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded text-destructive shrink-0"
            title="Delete theme"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <FileText className="w-3 h-3" />
          <span>{theme.count}</span>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div className="ml-2 border-l border-border/50 pl-1">
          {theme.children!.map((child) => (
            <ThemeItem
              key={child.id}
              theme={child}
              depth={depth + 1}
              isEditMode={isEditMode}
              onThemeNameChange={onThemeNameChange}
              onThemeCategoryChange={onThemeCategoryChange}
              onThemeDelete={onThemeDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function isCatchAllNode(nodeName: string): boolean {
  const name = nodeName.toLowerCase()
  return name === "miscellaneous" || name === "generic"
}

export function DetailPane() {
  const { getSelectedNode, isEditMode, addDraftChange, draftChanges, selectedL1Id, selectedL2Id, selectedL3Id } =
    useTaxonomy()
  const [themeSearch, setThemeSearch] = useState("")
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState("")
  const [editingDescription, setEditingDescription] = useState(false)
  const [descriptionValue, setDescriptionValue] = useState("")

  const selectedNode = getSelectedNode()

  if (!selectedNode) {
    return (
      <div className="w-[340px] h-full bg-background rounded-xl border border-border shadow-sm overflow-hidden transition-all duration-300">
        <EmptyState />
      </div>
    )
  }

  const themes = selectedNode.themes || []
  const themeCount = selectedNode.themeCount || themes.length

  const isNonEditable = isCatchAllNode(selectedNode.name)

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

  const handleTitleEdit = () => {
    if (isEditMode && !isNonEditable) {
      setTitleValue(getTitleDraftValue())
      setEditingTitle(true)
    }
  }

  const handleTitleBlur = () => {
    if (titleValue !== selectedNode.name) {
      addDraftChange({
        nodeId: selectedNode.id,
        nodeName: selectedNode.name,
        nodeLevel: getNodeLevel(),
        field: "name",
        oldValue: selectedNode.name,
        newValue: titleValue,
      })
    }
    setEditingTitle(false)
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
    if (isEditMode && !isNonEditable) {
      setDescriptionValue(getDescriptionDraftValue() || "")
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

  const handleThemeNameChange = (themeId: string, newName: string) => {
    if (isNonEditable) return

    addDraftChange({
      nodeId: selectedNode.id,
      nodeName: selectedNode.name,
      nodeLevel: "Theme",
      field: `theme-${themeId}`,
      oldValue: themes.find((t) => t.id === themeId)?.name || "",
      newValue: newName,
    })
  }

  const handleThemeCategoryChange = (themeId: string, newCategory: ThemeCategory) => {
    if (isNonEditable) return

    const theme = themes.find((t) => t.id === themeId)
    if (!theme) return

    addDraftChange({
      nodeId: selectedNode.id,
      nodeName: selectedNode.name,
      nodeLevel: "Theme",
      field: `theme-category-${themeId}`,
      oldValue: theme.category,
      newValue: newCategory,
    })
  }

  const handleThemeDelete = (themeId: string) => {
    if (isNonEditable) return

    const theme = themes.find((t) => t.id === themeId)
    if (!theme) return

    addDraftChange({
      nodeId: selectedNode.id,
      nodeName: selectedNode.name,
      nodeLevel: "Theme",
      field: `theme-delete-${themeId}`,
      oldValue: theme.name,
      newValue: "[DELETED]",
    })
  }

  const handleDeleteKeyword = () => {
    if (isNonEditable) return

    addDraftChange({
      nodeId: selectedNode.id,
      nodeName: selectedNode.name,
      nodeLevel: getNodeLevel(),
      field: "delete-keyword",
      oldValue: selectedNode.name,
      newValue: "[DELETED]",
    })
  }

  return (
    <div className="w-[340px] h-full bg-background rounded-xl border border-border shadow-sm flex flex-col overflow-hidden transition-all duration-300">
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
              onThemeNameChange={handleThemeNameChange}
              onThemeCategoryChange={handleThemeCategoryChange}
              onThemeDelete={handleThemeDelete}
            />
          ))
        ) : (
          <div className="text-sm text-muted-foreground text-center py-8">No themes found</div>
        )}
      </div>
    </div>
  )
}
