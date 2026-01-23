import { type TaxonomyOperationType, type WisdomPromptContext, OPERATION_CONFIGS } from "./wisdom-prompts"

export interface WisdomQueryResponse {
  success: boolean
  prompt: string
  response: string
  operationRisk: string
  verdict?: "APPROVE" | "REJECT" | "WORKAROUND" | "APPROVE WITH CONDITIONS"
  confidence?: "High" | "Med" | "Low"
  risks?: string[]
  workaround?: string
}

export async function queryWisdom(
  operationType: TaxonomyOperationType,
  context: WisdomPromptContext
): Promise<WisdomQueryResponse> {
  try {
    const response = await fetch("/api/wisdom", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        operationType,
        context,
      }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error("Error querying Wisdom:", error)

    // Return a fallback response
    return {
      success: false,
      prompt: "",
      response: "Unable to analyze this operation at the moment. Please try again.",
      operationRisk: OPERATION_CONFIGS[operationType]?.risk || "Unknown",
    }
  }
}

// Helper to format the Wisdom response for display
export function formatWisdomResponse(response: WisdomQueryResponse): {
  summary: string
  verdict: string
  verdictColor: string
  confidence: string
  risks: string[]
  details: string
} {
  const verdictColors: Record<string, string> = {
    APPROVE: "text-green-600",
    REJECT: "text-red-600",
    WORKAROUND: "text-amber-600",
    "APPROVE WITH CONDITIONS": "text-blue-600",
  }

  return {
    summary: extractSummary(response.response),
    verdict: response.verdict || "PENDING",
    verdictColor: verdictColors[response.verdict || ""] || "text-gray-600",
    confidence: response.confidence || "Unknown",
    risks: response.risks || [],
    details: response.response,
  }
}

function extractSummary(response: string): string {
  // Extract the verdict line (last meaningful line before workaround section)
  const lines = response.split("\n")
  const verdictIndex = lines.findIndex((line) => line.includes("**Verdict**"))

  if (verdictIndex !== -1 && verdictIndex + 1 < lines.length) {
    // Get the rationale line (usually right after verdict)
    const rationaleIndex = verdictIndex + 1
    if (rationaleIndex < lines.length) {
      const rationale = lines[rationaleIndex].trim()
      if (rationale && !rationale.startsWith("**")) {
        return rationale
      }
    }
  }

  // Fallback: return first paragraph
  const firstParagraph = response.split("\n\n")[0]
  return firstParagraph.replace(/\*\*/g, "").substring(0, 200)
}

// Parse the markdown-formatted response into structured sections
export function parseWisdomResponse(response: string): {
  sections: { title: string; content: string }[]
} {
  const sections: { title: string; content: string }[] = []
  const lines = response.split("\n")

  let currentTitle = ""
  let currentContent: string[] = []

  for (const line of lines) {
    if (line.startsWith("**") && line.endsWith("**:")) {
      // Save previous section
      if (currentTitle) {
        sections.push({
          title: currentTitle,
          content: currentContent.join("\n").trim(),
        })
      }
      // Start new section
      currentTitle = line.replace(/\*\*/g, "").replace(":", "")
      currentContent = []
    } else if (line.startsWith("**") && line.includes("**:")) {
      // Inline section like "**Verdict**: APPROVE"
      const match = line.match(/\*\*(.+?)\*\*:\s*(.+)/)
      if (match) {
        if (currentTitle) {
          sections.push({
            title: currentTitle,
            content: currentContent.join("\n").trim(),
          })
        }
        currentTitle = match[1]
        currentContent = [match[2]]
      }
    } else {
      currentContent.push(line)
    }
  }

  // Save last section
  if (currentTitle) {
    sections.push({
      title: currentTitle,
      content: currentContent.join("\n").trim(),
    })
  }

  return { sections }
}
