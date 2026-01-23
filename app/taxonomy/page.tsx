"use client"

import { TaxonomyProvider, useTaxonomy } from "@/lib/taxonomy-context"
import { Sidebar } from "@/components/taxonomy/sidebar"
import { TaxonomyHeader } from "@/components/taxonomy/taxonomy-header"
import { TaxonomyTree } from "@/components/taxonomy/taxonomy-tree"
import { DetailPane } from "@/components/taxonomy/detail-pane"
import { BottomBar } from "@/components/taxonomy/bottom-bar"
import { ConfirmationModal } from "@/components/taxonomy/confirmation-modal"
import { AgentOverlay } from "@/components/taxonomy/agent-overlay"

function TaxonomyContent() {
  const { isEditMode, isBottomBarExpanded } = useTaxonomy()

  const getBottomPadding = () => {
    if (!isEditMode) return "pb-0"
    if (isBottomBarExpanded) return "pb-64" // More space when expanded
    return "pb-20" // Less space when collapsed
  }

  return (
    <div className="flex h-screen bg-[#F8F8F6]">
      {/* Left Sidebar - Pane 1 */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`flex-1 flex overflow-hidden transition-all duration-300 ease-in-out ${getBottomPadding()}`}>
          {/* Center Content - Pane 2 */}
          <div className="flex-1 flex flex-col overflow-hidden p-4 pr-0">
            <div className="flex-1 flex flex-col bg-background rounded-xl border border-border overflow-hidden shadow-sm transition-all duration-300">
              <TaxonomyHeader />
              <div className="flex-1 overflow-hidden">
                <TaxonomyTree />
              </div>
            </div>
          </div>

          {/* Right Detail Pane - Pane 3 */}
          <div className="py-4 px-4">
            <DetailPane />
          </div>
        </div>

        <BottomBar />
      </div>

      <ConfirmationModal />
      <AgentOverlay />
    </div>
  )
}

export default function TaxonomyPage() {
  return (
    <TaxonomyProvider>
      <TaxonomyContent />
    </TaxonomyProvider>
  )
}
