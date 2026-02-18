"use client"

import { TaxonomyProvider } from "@/lib/taxonomy-context"
import { Sidebar } from "@/components/taxonomy/sidebar"
import { TaxonomyHeader } from "@/components/taxonomy/taxonomy-header"
import { TaxonomyTree } from "@/components/taxonomy/taxonomy-tree"
import { DetailPane } from "@/components/taxonomy/detail-pane"
import { DemoConsole } from "@/components/taxonomy/demo-console"
import { ScanOverlay } from "@/components/taxonomy/scan-overlay"
import { AgentScanCard } from "@/components/taxonomy/agent-message-feed"

function TaxonomyContent() {
  return (
    <div className="flex h-screen bg-[#EEEEEC]">
      {/* Left Sidebar - Pane 1 */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden p-3 gap-3">
        <div className="flex-1 flex overflow-hidden gap-3 transition-all duration-300 ease-spring">
          {/* Center Content - Taxonomy columns card */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-xl shadow-sm">
            <TaxonomyHeader />
            <div className="flex-1 overflow-hidden relative">
              <TaxonomyTree />
              <ScanOverlay />
            </div>
          </div>

          {/* Right Pane - Detail card + Agent thinking card */}
          <div className="w-[340px] shrink-0 flex flex-col gap-3">
            <DetailPane />
            <AgentScanCard />
          </div>
        </div>

      </div>

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
