"use client"

import type React from "react"
import { useTaxonomy } from "@/lib/taxonomy-context"
import {
  Home,
  BarChart3,
  FileText,
  PieChart,
  LayoutDashboard,
  Bot,
  Bookmark,
  Grid3X3,
  HelpCircle,
  ChevronDown,
  Loader2,
} from "lucide-react"

interface NavItem {
  icon: React.ReactNode
  label: string
  isActive?: boolean
  badge?: string
}

const navItems: NavItem[] = [
  { icon: <Home className="w-5 h-5" />, label: "Home" },
  { icon: <BarChart3 className="w-5 h-5" />, label: "Wisdom" },
  { icon: <FileText className="w-5 h-5" />, label: "Feed" },
  { icon: <PieChart className="w-5 h-5" />, label: "Quantify" },
  { icon: <LayoutDashboard className="w-5 h-5" />, label: "Dashboards" },
  { icon: <Bot className="w-5 h-5" />, label: "Agents" },
  { icon: <Bookmark className="w-5 h-5" />, label: "Saved items" },
  { icon: <Grid3X3 className="w-5 h-5" />, label: "Taxonomy", isActive: true },
]

export function Sidebar() {
  const { isProcessing } = useTaxonomy()

  return (
    <div className="flex flex-col h-full w-[200px] bg-background border-r border-border">
      {/* Logo */}
      <div className="flex items-center py-4 px-4">
        <div className="flex items-center gap-2 px-2">
          <img src="/blueprint-icon.png" alt="Enterpret" className="w-8 h-8 rounded-lg" />
          <span className="text-lg font-semibold text-[#2D7A7A]">Enterpret</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-0.5 px-3 py-2">
        {navItems.map((item) => (
          <div
            key={item.label}
            className={`
              flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer
              transition-colors duration-150
              ${
                item.isActive ? "bg-[#2D7A7A]/10 text-[#2D7A7A] font-medium" : "text-muted-foreground hover:bg-muted/50"
              }
            `}
          >
            {item.icon}
            <span className="text-sm flex-1">{item.label}</span>
            {item.label === "Taxonomy" && isProcessing && (
              <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center">
                <Loader2 className="w-3 h-3 text-white animate-spin" />
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Bottom section - User */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-muted/50">
          <img src="/placeholder-user.jpg" alt="Sam Coleman" className="w-8 h-8 rounded-full object-cover" />
          <span className="text-sm text-foreground flex-1">Sam Coleman</span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer text-muted-foreground hover:bg-muted/50 mt-1">
          <HelpCircle className="w-5 h-5" />
        </div>
      </div>
    </div>
  )
}
