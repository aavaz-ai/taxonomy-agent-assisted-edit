"use client"

import { TaxonomyProvider, useTaxonomy } from "@/lib/taxonomy-context"
import { Sidebar } from "@/components/taxonomy/sidebar"
import { TaxonomyHeader } from "@/components/taxonomy/taxonomy-header"
import { TaxonomyTree } from "@/components/taxonomy/taxonomy-tree"
import { DetailPane } from "@/components/taxonomy/detail-pane"
import { BottomBar } from "@/components/taxonomy/bottom-bar"
import { ConfirmationModal } from "@/components/taxonomy/confirmation-modal"
import { DemoConsole } from "@/components/taxonomy/demo-console"
import { ReviewSidebar } from "@/components/taxonomy/review-sidebar"

function RightPane() {
  const { cardDisplayMode, isReviewPaneOpen } = useTaxonomy()

  if (cardDisplayMode === "sidebar" && isReviewPaneOpen) {
    return <ReviewSidebar />
  }

  return <DetailPane />
}

function TaxonomyContent() {
  return (
    <div className="flex h-screen bg-[#F8F8F6]">
      {/* Left Sidebar - Pane 1 */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex overflow-hidden transition-all duration-300 ease-spring">
          {/* Center Content - Pane 2 */}
          <div className="flex-1 flex flex-col overflow-hidden bg-background">
            <TaxonomyHeader />
            <div className="flex-1 overflow-hidden">
              <TaxonomyTree />
            </div>
          </div>

          {/* Right Pane - Pane 3 (Detail or Review) */}
          <RightPane />
        </div>

        <BottomBar />
      </div>

      <ConfirmationModal />
      <DemoConsole />
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
