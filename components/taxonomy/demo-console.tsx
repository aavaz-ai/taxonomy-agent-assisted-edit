"use client"

import { useState } from "react"

type ActiveTab = "recipes" | "data"

interface Recipe {
  title: string
  steps: string[]
  result: string
  note?: string
}

interface VerdictGroup {
  verdict: string
  color: string
  recipes: Recipe[]
}

const verdictGroups: VerdictGroup[] = [
  {
    verdict: "APPROVE",
    color: "text-green-400",
    recipes: [
      {
        title: "Rename sub-theme",
        steps: [
          "Select any sub-theme",
          "Rename to a non-conflicting name",
        ],
        result: "Auto-approved, added to drafts",
      },
      {
        title: "Create sub-theme",
        steps: [
          "Select any theme",
          'Click "+" → Enter name',
        ],
        result: "Auto-approved if name is unique",
      },
      {
        title: "Change category",
        steps: [
          "Select any theme",
          "Change category dropdown",
        ],
        result: "Auto-approved when target theme exists",
      },
      {
        title: "Create theme",
        steps: [
          "Select any L3 keyword",
          'Click "+" → Enter name + category',
        ],
        result: "Auto-approved if name is unique",
      },
    ],
  },
  {
    verdict: "APPROVE WITH CONDITIONS",
    color: "text-blue-400",
    recipes: [
      {
        title: "Merge themes (same L3)",
        steps: [
          "Select a theme",
          "Merge with sibling theme under same L3",
        ],
        result: "Conditional — consolidate overlapping sub-themes post-merge",
      },
      {
        title: "Split sub-theme",
        steps: [
          "Select a sub-theme",
          "Split into 2-3 names",
        ],
        result: "Conditional — ensure clear naming for each split",
      },
      {
        title: "Rename to generic name",
        steps: [
          "Select any sub-theme",
          'Rename to "Other" or "Miscellaneous"',
        ],
        result: "Conditional — generic names reduce discoverability",
      },
    ],
  },
  {
    verdict: "WORKAROUND",
    color: "text-amber-400",
    recipes: [
      {
        title: "Merge sub-themes (cross-parent, related)",
        steps: [
          "Select a sub-theme",
          "Merge with sub-theme under a different but related parent theme",
        ],
        result: 'Workaround: "Move to parent first, then merge"',
        note: '"Accept workaround" creates a MOVE draft change',
      },
      {
        title: "Promote sub-theme",
        steps: [
          "Select a sub-theme",
          'Click "Promote to theme"',
        ],
        result: 'Workaround: "Create a new theme instead"',
        note: '"Accept workaround" creates a CREATE draft change',
      },
      {
        title: "Change category (no target theme)",
        steps: [
          "Select a theme",
          "Change to a category with no existing theme",
        ],
        result: 'Workaround: "Create theme with target category first"',
      },
      {
        title: "Rename with sibling overlap",
        steps: [
          "Rename a sub-theme to share 2+ words with a sibling",
        ],
        result: 'Workaround: "Merge with sibling instead"',
      },
    ],
  },
  {
    verdict: "REJECT",
    color: "text-red-400",
    recipes: [
      {
        title: "Merge sub-themes (cross-parent, unrelated)",
        steps: [
          "Select a sub-theme",
          "Merge with sub-theme under a completely different parent",
        ],
        result: "Blocked — parents are unrelated",
      },
      {
        title: "Merge sub-themes (low similarity)",
        steps: [
          'Merge "Calendar Connection Errors" with "Permission Denied Messages"',
        ],
        result: "Blocked — different root causes",
      },
      {
        title: "Delete catch-all",
        steps: [
          'Delete a sub-theme named "Miscellaneous" or "Other"',
        ],
        result: "Blocked — split into specific sub-themes instead",
      },
      {
        title: "Create duplicate",
        steps: [
          "Create a sub-theme or theme with the same name as an existing sibling",
        ],
        result: "Blocked — duplicate name",
      },
    ],
  },
  {
    verdict: "PARTIAL",
    color: "text-orange-400",
    recipes: [
      {
        title: "Merge sub-themes (moderate similarity)",
        steps: [
          "Merge sub-themes with partial semantic overlap",
        ],
        result: "Partial — some items included, others flagged for review",
      },
      {
        title: "Split with name collision",
        steps: [
          "Split a sub-theme where one proposed name matches an existing sibling",
        ],
        result: "Partial — colliding splits need renaming, others proceed",
      },
    ],
  },
]

function highlightNodes(text: string) {
  const parts = text.split(/(→|"[^"]+")/)
  return parts.map((part, i) => {
    if (part === "→") {
      return (
        <span key={i} className="text-amber-300">
          {" → "}
        </span>
      )
    }
    if (part.startsWith('"') && part.endsWith('"')) {
      return (
        <span key={i} className="text-amber-300">
          {part}
        </span>
      )
    }
    return part
  })
}

function RecipesTab() {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [expandedRecipes, setExpandedRecipes] = useState<Set<string>>(new Set())

  const toggleGroup = (verdict: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(verdict)) {
        next.delete(verdict)
      } else {
        next.add(verdict)
      }
      return next
    })
  }

  const toggleRecipe = (key: string) => {
    setExpandedRecipes((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <div className="space-y-1.5">
      {verdictGroups.map((group) => (
        <div key={group.verdict}>
          <button
            onClick={() => toggleGroup(group.verdict)}
            className="w-full text-left text-xs font-semibold font-mono flex items-center gap-1.5 py-1"
          >
            <span className="text-[10px] text-gray-500">
              {expandedGroups.has(group.verdict) ? "▼" : "▶"}
            </span>
            <span className={group.color}>{group.verdict}</span>
            <span className="text-gray-600 text-[10px] ml-auto">{group.recipes.length}</span>
          </button>

          {expandedGroups.has(group.verdict) && (
            <div className="ml-3 space-y-1 border-l border-gray-700 pl-2">
              {group.recipes.map((recipe, idx) => {
                const key = `${group.verdict}-${idx}`
                return (
                  <div key={key}>
                    <button
                      onClick={() => toggleRecipe(key)}
                      className="w-full text-left text-[11px] text-gray-300 font-mono flex items-center gap-1"
                    >
                      <span className="text-[9px] text-gray-500">
                        {expandedRecipes.has(key) ? "▼" : "▶"}
                      </span>
                      {recipe.title}
                    </button>

                    {expandedRecipes.has(key) && (
                      <div className="ml-3 mt-1 mb-2 space-y-1">
                        <ol className="space-y-0.5">
                          {recipe.steps.map((step, si) => (
                            <li key={si} className="text-[10px] text-gray-400 font-mono">
                              <span className="text-gray-600 mr-1">{si + 1}.</span>
                              {highlightNodes(step)}
                            </li>
                          ))}
                        </ol>
                        <p className="text-[10px] text-cyan-300 font-mono">
                          → {recipe.result}
                        </p>
                        {recipe.note && (
                          <p className="text-[9px] text-gray-500 font-mono italic">
                            {recipe.note}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function DataTab() {
  return (
    <div className="space-y-4 font-mono text-[10px]">
      <div>
        <div className="text-gray-400 font-semibold text-[11px] mb-2">Operation Distribution</div>
        <div className="text-gray-500 mb-1.5">{"━".repeat(33)}</div>
        <div className="space-y-1">
          <BarRow label="Merge (sub + theme)" pct={42} />
          <BarRow label="Transfer / Promote" pct={20} />
          <BarRow label="Split" pct={18} />
          <BarRow label="Rename" pct={7} />
          <BarRow label="Change Category" pct={7} />
          <BarRow label="Archive / Delete" pct={4} />
          <BarRow label="Create" pct={2} />
        </div>
      </div>

      <div>
        <div className="text-gray-400 font-semibold text-[11px] mb-2">Key Patterns</div>
        <div className="text-gray-500 mb-1.5">{"━".repeat(33)}</div>
        <div className="space-y-1.5 text-gray-300">
          <div className="flex gap-2">
            <span className="text-emerald-400 shrink-0">82%</span>
            <span>of operations target sub-themes</span>
          </div>
          <div className="flex gap-2">
            <span className="text-red-400 shrink-0">47%</span>
            <span>of merge requests blocked by cross-parent constraint</span>
          </div>
          <div className="flex gap-2">
            <span className="text-amber-400 shrink-0">20%</span>
            <span>of requests need multi-step workarounds</span>
          </div>
        </div>
      </div>

      <div className="text-[9px] text-gray-600 pt-2 border-t border-gray-700">
        Based on 45 analyzed Canva taxonomy edit requests
      </div>
    </div>
  )
}

function BarRow({ label, pct }: { label: string; pct: number }) {
  const filled = Math.round(pct / 5)
  const empty = 20 - filled
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-300 w-[130px] shrink-0 truncate">{label}</span>
      <span className="text-gray-500 w-[28px] text-right shrink-0">{pct}%</span>
      <span className="text-emerald-500">{"█".repeat(filled)}</span>
      <span className="text-gray-700">{"░".repeat(empty)}</span>
    </div>
  )
}

export function DemoConsole() {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<ActiveTab>("recipes")

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div className="mb-2 w-[360px] h-[480px] bg-[#1a1a2e] rounded-lg shadow-2xl border border-gray-700 flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between shrink-0">
            <span className="text-sm font-semibold text-white font-mono">
              Demo Guide
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white text-xs font-mono"
            >
              close
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-gray-700 shrink-0">
            <button
              onClick={() => setActiveTab("recipes")}
              className={`flex-1 text-xs font-mono py-2 transition-colors ${
                activeTab === "recipes"
                  ? "text-emerald-400 border-b-2 border-emerald-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Trigger flows
            </button>
            <button
              onClick={() => setActiveTab("data")}
              className={`flex-1 text-xs font-mono py-2 transition-colors ${
                activeTab === "data"
                  ? "text-emerald-400 border-b-2 border-emerald-400"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              Real-world data
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === "recipes" ? <RecipesTab /> : <DataTab />}
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ml-auto flex items-center justify-center w-10 h-10 rounded-full bg-[#1a1a2e] text-white text-sm font-semibold shadow-lg hover:bg-[#252545] transition-colors border border-gray-700"
      >
        ?
      </button>
    </div>
  )
}
