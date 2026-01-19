"use client"

import { useTaxonomy } from "@/lib/taxonomy-context"
import { TaxonomyColumn } from "./taxonomy-column"
import type { TaxonomyNode } from "@/lib/taxonomy-data"

function isCatchAllNode(node: TaxonomyNode): boolean {
  const name = node.name.toLowerCase()
  return name === "miscellaneous" || name === "generic"
}

function filterNodes(nodes: TaxonomyNode[], isEditMode: boolean): TaxonomyNode[] {
  if (isEditMode) return nodes
  return nodes.filter((node) => !isCatchAllNode(node))
}

export function TaxonomyTree() {
  const {
    taxonomyData,
    selectedL1Id,
    selectedL2Id,
    selectedL3Id,
    setSelectedL1Id,
    setSelectedL2Id,
    setSelectedL3Id,
    getL2Nodes,
    getL3Nodes,
    isEditMode,
    draftChanges,
  } = useTaxonomy()

  const l1Nodes = filterNodes(taxonomyData.level1, isEditMode)
  const l2Nodes = filterNodes(getL2Nodes(), isEditMode)
  const l3Nodes = filterNodes(getL3Nodes(), isEditMode)

  const changedNodeIds = draftChanges.map((c) => c.nodeId)

  return (
    <div className="flex h-full transition-all duration-300">
      {/* Level 1 Column */}
      <div className="flex-1 min-w-0 border-r border-border">
        <TaxonomyColumn
          title="Level 1 Keywords"
          count={l1Nodes.length}
          nodes={l1Nodes}
          selectedId={selectedL1Id}
          onSelect={setSelectedL1Id}
          level={1}
          isEditMode={isEditMode}
          changedNodeIds={changedNodeIds}
        />
      </div>

      {/* Level 2 Column */}
      <div className="flex-1 min-w-0 border-r border-border">
        <TaxonomyColumn
          title="Level 2 Keywords"
          count={l2Nodes.length}
          nodes={l2Nodes}
          selectedId={selectedL2Id}
          onSelect={setSelectedL2Id}
          level={2}
          isEditMode={isEditMode}
          changedNodeIds={changedNodeIds}
        />
      </div>

      {/* Level 3 Column */}
      <div className="flex-1 min-w-0">
        <TaxonomyColumn
          title="Level 3 Keywords"
          count={l3Nodes.length}
          nodes={l3Nodes}
          selectedId={selectedL3Id}
          onSelect={setSelectedL3Id}
          level={3}
          isEditMode={isEditMode}
          changedNodeIds={changedNodeIds}
        />
      </div>
    </div>
  )
}
