"use client"

import { useState } from "react"

interface Recipe {
  title: string
  steps: string[]
  result: string
  note?: string
}

const recipes: Recipe[] = [
  {
    title: "1. APPROVE flow",
    steps: [
      "Enter Edit Mode",
      "Select: Zoom Meetings → Scheduling & Joining → Schedule a Meeting",
      'Edit: Rename "Unknown Error During Scheduling" → anything new',
    ],
    result: "Agent approves with green checkmark",
  },
  {
    title: "2. REJECT flow (blocked)",
    steps: [
      "Enter Edit Mode",
      "Select: Zoom Meetings → Scheduling & Joining → Schedule a Meeting",
      'Merge: "Calendar Connection Errors" with "Permission Denied Messages"',
    ],
    result: "Agent rejects (low similarity) — only Contact Enterpret or Dismiss",
  },
  {
    title: "3. WORKAROUND flow",
    steps: [
      "Enter Edit Mode",
      "Rename a sub-theme to a name overlapping a sibling",
    ],
    result: "Agent warns, suggests workaround (merge instead)",
    note: '"Accept workaround" creates a new draft change',
  },
  {
    title: "4. DELETE catch-all (blocked)",
    steps: [
      "Enter Edit Mode",
      'Select any node with "Miscellaneous" sub-themes',
      "Delete the catch-all sub-theme",
    ],
    result: "Agent rejects — only Contact Enterpret or Dismiss",
  },
  {
    title: "5. Search navigation",
    steps: [
      'Type "Calendar" in the search bar',
      "See dropdown with matching themes and paths",
      "Click a result to navigate directly",
    ],
    result: "Tree scrolls and highlights the matched node",
  },
]

function highlightNodes(text: string) {
  // Highlight arrow-separated paths and quoted node names
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

export function DemoConsole() {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedRecipes, setExpandedRecipes] = useState<Set<number>>(new Set())

  const toggleRecipe = (index: number) => {
    setExpandedRecipes((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div className="mb-2 w-[320px] h-[420px] bg-[#1a1a2e] rounded-lg shadow-2xl border border-gray-700 flex flex-col">
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {recipes.map((recipe, index) => (
              <div key={index} className="border-l-2 border-emerald-800 pl-3">
                <button
                  onClick={() => toggleRecipe(index)}
                  className="w-full text-left text-sm font-semibold text-emerald-400 font-mono flex items-center gap-1"
                >
                  <span className="text-[10px] text-gray-500">
                    {expandedRecipes.has(index) ? "▼" : "▶"}
                  </span>
                  {recipe.title}
                </button>

                {expandedRecipes.has(index) && (
                  <div className="mt-2 space-y-1.5">
                    <ol className="space-y-1">
                      {recipe.steps.map((step, stepIndex) => (
                        <li
                          key={stepIndex}
                          className="text-xs text-gray-300 font-mono leading-relaxed"
                        >
                          <span className="text-gray-500 mr-1.5">
                            {stepIndex + 1}.
                          </span>
                          {highlightNodes(step)}
                        </li>
                      ))}
                    </ol>
                    <p className="text-xs text-cyan-300 font-mono mt-1.5">
                      → {recipe.result}
                    </p>
                    {recipe.note && (
                      <p className="text-[10px] text-gray-500 font-mono italic">
                        Note: {recipe.note}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
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
