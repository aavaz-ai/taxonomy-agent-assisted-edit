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

// Enterpret logo component
function EnterpretLogo() {
  return (
    <div className="flex items-center gap-2 px-2">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#2D7A7A]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 4C12 4 8 4 8 8V10H16V8C16 4 12 4 12 4Z"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="14" r="2" fill="white" />
          <path d="M12 16V20" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <span className="text-lg font-semibold text-[#2D7A7A]">Enterpret</span>
    </div>
  )
}

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
        <EnterpretLogo />
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
          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-sm font-medium">
            SC
          </div>
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
