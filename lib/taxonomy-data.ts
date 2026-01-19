// =============================================================================
// ZOOM TAXONOMY DATA - Structured from Zoom product taxonomy JSON
// =============================================================================

export type ThemeCategory = "complaint" | "improvement" | "praise" | "question" | "generic"

export interface SubTheme {
  name: string
  category: ThemeCategory
}

export interface Theme {
  id: string
  name: string
  category: ThemeCategory
  count: number
  children?: Theme[]
}

export interface TaxonomyNode {
  id: string
  name: string
  count: number
  description?: string
  isItalic?: boolean
  children?: TaxonomyNode[]
  themes?: Theme[]
  themeCount?: number
}

export interface TaxonomyData {
  level1: TaxonomyNode[]
}

// Theme category colors matching the reference images
export const themeCategoryColors: Record<ThemeCategory, string> = {
  complaint: "#ef4444",
  improvement: "#f97316",
  praise: "#22c55e",
  question: "#6b7280",
  generic: "#3b82f6",
}

// Helper to generate unique IDs
function generateId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

// Helper to convert raw theme to our Theme type
function convertTheme(
  rawTheme: { name: string; category: string; sub_themes?: { name: string; category: string }[] },
  index: number,
): Theme {
  const baseId = generateId(rawTheme.name)
  return {
    id: `theme-${baseId}-${index}`,
    name: rawTheme.name,
    category: rawTheme.category as ThemeCategory,
    count: Math.floor(Math.random() * 130) + 20,
    children: rawTheme.sub_themes?.map((sub, subIndex) => ({
      id: `theme-${baseId}-${index}-${subIndex}`,
      name: sub.name,
      category: sub.category as ThemeCategory,
      count: Math.floor(Math.random() * 70) + 10,
    })),
  }
}

// =============================================================================
// ZOOM TAXONOMY DATA - Inline to avoid JSON import issues
// =============================================================================

interface RawAspect {
  name: string
  description: string
  level?: string
  parent?: string
  themes?: { name: string; category: string; sub_themes?: { name: string; category: string }[] }[]
}

const zoomData: { aspects: RawAspect[]; l2_aspects: RawAspect[]; l3_aspects: RawAspect[] } = {
  aspects: [
    {
      name: "Zoom Meetings",
      description:
        "The core video conferencing service for real-time collaboration and communication within the Zoom Workplace ecosystem. It enables users to host and join virtual meetings with HD video and audio, share content, and use various interactive tools to facilitate communication and productivity for teams of any size.",
      themes: [
        {
          name: "Overall Satisfaction with Zoom Meetings",
          category: "praise",
          sub_themes: [
            { name: "Praise for Ease of Use", category: "praise" },
            { name: "Appreciation of Versatility Across Use Cases", category: "praise" },
            { name: "Reliable Performance for Daily Standups", category: "praise" },
          ],
        },
        {
          name: "Frustration with Zoom Meetings Reliability",
          category: "complaint",
          sub_themes: [
            { name: "Lag & Connectivity Issues", category: "complaint" },
            { name: "Crashes & App Stability Problems", category: "complaint" },
            { name: "Meeting Disconnections During Peak Hours", category: "complaint" },
          ],
        },
        {
          name: "Confusion Navigating Zoom Meetings Interface",
          category: "complaint",
          sub_themes: [
            { name: "Unintuitive Interface Layout", category: "complaint" },
            { name: "Difficulty Finding Basic Features", category: "complaint" },
            { name: "Hidden Menu Options", category: "complaint" },
          ],
        },
        {
          name: "Perception That Zoom Meetings Lack Modern Features",
          category: "improvement",
          sub_themes: [
            { name: "Want More Customization & Integrations", category: "improvement" },
            { name: "Need Additional Collaboration Tools", category: "improvement" },
            { name: "Request for AI-Powered Meeting Insights", category: "improvement" },
          ],
        },
        {
          name: "Frequent Requests for Guidance on Using Zoom Meetings",
          category: "question",
          sub_themes: [
            { name: "Requests for Step-By-Step Guides", category: "question" },
            { name: "Need Clarification of Zoom Messages", category: "question" },
            { name: "How to Use Advanced Features", category: "question" },
          ],
        },
      ],
    },
    {
      name: "Zoom Team Chat",
      description:
        "A persistent messaging platform integrated within Zoom that enables teams to communicate asynchronously. It provides direct messaging, group channels, and the ability to share files, making it a central hub for team collaboration outside of meetings.",
      themes: [
        {
          name: "Overall Appreciation for Zoom Team Chat",
          category: "praise",
          sub_themes: [
            { name: "Quick Team Communication", category: "praise" },
            { name: "Seamless Integration with Meetings", category: "praise" },
            { name: "Easy File Sharing Experience", category: "praise" },
          ],
        },
        {
          name: "Frustration with Team Chat Notifications",
          category: "complaint",
          sub_themes: [
            { name: "Too Many Notifications", category: "complaint" },
            { name: "Missed Important Messages", category: "complaint" },
            { name: "Notification Settings Hard to Configure", category: "complaint" },
          ],
        },
        {
          name: "Request for Better Chat Organization",
          category: "improvement",
          sub_themes: [
            { name: "Need Threaded Conversations", category: "improvement" },
            { name: "Better Search in Chat History", category: "improvement" },
            { name: "Pin Important Messages", category: "improvement" },
          ],
        },
      ],
    },
    {
      name: "Zoom Phone",
      description:
        "A cloud-based phone system that replaces traditional PBX systems. It offers enterprise-grade voice services including inbound/outbound calling, voicemail, call recording, and integrations with the broader Zoom platform for a unified communications experience.",
      themes: [
        {
          name: "Overall Satisfaction with Zoom Phone",
          category: "praise",
          sub_themes: [
            { name: "Clear Call Quality", category: "praise" },
            { name: "Easy Setup and Configuration", category: "praise" },
            { name: "Reliable Voicemail Transcription", category: "praise" },
          ],
        },
        {
          name: "Call Quality Issues",
          category: "complaint",
          sub_themes: [
            { name: "Dropped Calls", category: "complaint" },
            { name: "Audio Quality Problems", category: "complaint" },
            { name: "Echo and Feedback Issues", category: "complaint" },
          ],
        },
        {
          name: "Phone System Configuration Questions",
          category: "question",
          sub_themes: [
            { name: "How to Set Up Call Forwarding", category: "question" },
            { name: "Understanding Phone System Permissions", category: "question" },
            { name: "Setting Up Auto-Attendant", category: "question" },
          ],
        },
      ],
    },
    {
      name: "Zoom Webinars",
      description:
        "A platform for hosting large-scale, broadcast-style virtual events. Webinars allow a few speakers to present to a large audience with features like registration, Q&A, polling, and analytics, designed for one-to-many communication.",
      themes: [
        {
          name: "Appreciation for Webinar Features",
          category: "praise",
          sub_themes: [
            { name: "Easy Audience Management", category: "praise" },
            { name: "Reliable Large-Scale Broadcasting", category: "praise" },
            { name: "Great Registration Flow", category: "praise" },
          ],
        },
        {
          name: "Webinar Analytics Improvements Needed",
          category: "improvement",
          sub_themes: [
            { name: "More Detailed Attendee Reports", category: "improvement" },
            { name: "Real-time Engagement Metrics", category: "improvement" },
            { name: "Better Export Options", category: "improvement" },
          ],
        },
        {
          name: "Issues with Webinar Registration",
          category: "complaint",
          sub_themes: [
            { name: "Registration Emails Going to Spam", category: "complaint" },
            { name: "Custom Fields Not Working", category: "complaint" },
            { name: "Duplicate Registration Problems", category: "complaint" },
          ],
        },
      ],
    },
    {
      name: "Zoom Events",
      description: "An all-in-one solution for hosting multi-session, multi-day virtual and hybrid events.",
      themes: [
        {
          name: "Appreciation for Event Management",
          category: "praise",
          sub_themes: [
            { name: "Smooth Multi-Day Event Handling", category: "praise" },
            { name: "Easy Session Scheduling", category: "praise" },
            { name: "Professional Event Branding", category: "praise" },
          ],
        },
        {
          name: "Event Setup Complexity",
          category: "complaint",
          sub_themes: [
            { name: "Too Many Configuration Options", category: "complaint" },
            { name: "Confusing Speaker Management", category: "complaint" },
            { name: "Difficult Session Linking", category: "complaint" },
          ],
        },
      ],
    },
    {
      name: "Zoom Whiteboard",
      description: "A digital canvas for visual collaboration that can be used during or outside of meetings.",
      themes: [
        {
          name: "Praise for Whiteboard Collaboration",
          category: "praise",
          sub_themes: [
            { name: "Real-time Drawing Works Well", category: "praise" },
            { name: "Good Template Selection", category: "praise" },
            { name: "Easy to Share Boards", category: "praise" },
          ],
        },
        {
          name: "Whiteboard Feature Requests",
          category: "improvement",
          sub_themes: [
            { name: "Need More Shape Options", category: "improvement" },
            { name: "Better Text Formatting", category: "improvement" },
            { name: "Request for Layers Support", category: "improvement" },
          ],
        },
      ],
    },
    {
      name: "Zoom Rooms",
      description: "A software-based room system that transforms physical meeting spaces into Zoom-enabled rooms.",
      themes: [
        {
          name: "Satisfaction with Room System",
          category: "praise",
          sub_themes: [
            { name: "Easy One-Touch Join", category: "praise" },
            { name: "Reliable Hardware Integration", category: "praise" },
            { name: "Professional Conference Experience", category: "praise" },
          ],
        },
        {
          name: "Room Hardware Issues",
          category: "complaint",
          sub_themes: [
            { name: "Display Connectivity Problems", category: "complaint" },
            { name: "Camera Quality Issues", category: "complaint" },
            { name: "Audio System Configuration Difficulties", category: "complaint" },
          ],
        },
      ],
    },
    {
      name: "Zoom Contact Center",
      description:
        "An omnichannel cloud contact center solution that enables businesses to provide customer support across voice, video, chat, and SMS channels.",
      themes: [
        {
          name: "Contact Center Efficiency",
          category: "praise",
          sub_themes: [
            { name: "Unified Agent Dashboard", category: "praise" },
            { name: "Smooth Channel Switching", category: "praise" },
            { name: "Good Call Routing", category: "praise" },
          ],
        },
        {
          name: "Contact Center Queue Management Issues",
          category: "complaint",
          sub_themes: [
            { name: "Long Queue Wait Times", category: "complaint" },
            { name: "Callback Feature Not Working", category: "complaint" },
            { name: "Skill-Based Routing Problems", category: "complaint" },
          ],
        },
      ],
    },
    {
      name: "Revenue Accelerator",
      description: "A conversation intelligence solution that uses AI to analyze sales calls and meetings.",
      themes: [
        {
          name: "Appreciation for Sales Insights",
          category: "praise",
          sub_themes: [
            { name: "Useful Conversation Analytics", category: "praise" },
            { name: "Helpful Deal Risk Indicators", category: "praise" },
            { name: "Good CRM Integration", category: "praise" },
          ],
        },
        {
          name: "AI Analysis Accuracy Concerns",
          category: "complaint",
          sub_themes: [
            { name: "Inaccurate Sentiment Detection", category: "complaint" },
            { name: "Missing Key Conversation Points", category: "complaint" },
            { name: "Transcription Errors", category: "complaint" },
          ],
        },
      ],
    },
    {
      name: "Zoom Scheduler",
      description:
        "A scheduling tool that allows users to share their availability and let others book time with them.",
      themes: [
        {
          name: "Easy Scheduling Experience",
          category: "praise",
          sub_themes: [
            { name: "Simple Availability Sharing", category: "praise" },
            { name: "Clean Booking Page Design", category: "praise" },
            { name: "Good Calendar Integration", category: "praise" },
          ],
        },
        {
          name: "Calendar Sync Issues",
          category: "complaint",
          sub_themes: [
            { name: "Google Calendar Sync Delays", category: "complaint" },
            { name: "Outlook Calendar Conflicts", category: "complaint" },
            { name: "Timezone Confusion", category: "complaint" },
          ],
        },
      ],
    },
    {
      name: "Zoom Docs",
      description:
        "A collaborative document creation tool that allows teams to create, edit, and share documents in real-time.",
      themes: [
        {
          name: "Praise for Document Collaboration",
          category: "praise",
          sub_themes: [
            { name: "Real-time Editing Works Well", category: "praise" },
            { name: "Easy to Share with Team", category: "praise" },
            { name: "Good Integration with Meetings", category: "praise" },
          ],
        },
        {
          name: "Document Feature Limitations",
          category: "improvement",
          sub_themes: [
            { name: "Need More Formatting Options", category: "improvement" },
            { name: "Request for Table Support", category: "improvement" },
            { name: "Better Export to PDF", category: "improvement" },
          ],
        },
      ],
    },
    {
      name: "Zoom Clips",
      description:
        "A short-form video messaging tool that allows users to record and share video messages asynchronously.",
      themes: [
        {
          name: "Love Async Video Messaging",
          category: "praise",
          sub_themes: [
            { name: "Easy to Record Quick Updates", category: "praise" },
            { name: "Good Screen Recording Quality", category: "praise" },
            { name: "Helpful for Remote Teams", category: "praise" },
          ],
        },
        {
          name: "Clip Editing Limitations",
          category: "improvement",
          sub_themes: [
            { name: "Need Basic Trimming Tools", category: "improvement" },
            { name: "Request for Annotations", category: "improvement" },
            { name: "Better Playback Speed Controls", category: "improvement" },
          ],
        },
      ],
    },
    {
      name: "Zoom Tasks",
      description: "A task management feature integrated within Zoom that helps users track action items and to-dos.",
      themes: [
        {
          name: "Task Integration Appreciation",
          category: "praise",
          sub_themes: [
            { name: "Easy to Create Tasks from Meetings", category: "praise" },
            { name: "Good Due Date Reminders", category: "praise" },
            { name: "Helpful Task Assignment", category: "praise" },
          ],
        },
        {
          name: "Task Management Improvements Needed",
          category: "improvement",
          sub_themes: [
            { name: "Need Subtasks Support", category: "improvement" },
            { name: "Better Priority Levels", category: "improvement" },
            { name: "Request for Kanban View", category: "improvement" },
          ],
        },
      ],
    },
    {
      name: "Account Administration",
      description:
        "Tools and settings for managing a Zoom account at the organizational level. This includes user management, security settings, billing, and compliance features for IT administrators.",
      themes: [
        {
          name: "Account Administration Interface Feels Unintuitive",
          category: "complaint",
          sub_themes: [
            { name: "Confusing Account Setup Process", category: "complaint" },
            { name: "Hard to Find Admin Settings", category: "complaint" },
            { name: "Role Permissions Are Complex", category: "complaint" },
          ],
        },
        {
          name: "Appreciation for Admin Controls",
          category: "praise",
          sub_themes: [
            { name: "Good User Management Tools", category: "praise" },
            { name: "Comprehensive Security Settings", category: "praise" },
            { name: "Detailed Usage Reports", category: "praise" },
          ],
        },
      ],
    },
    {
      name: "Platform & Integrations",
      description: "The ecosystem of third-party apps, APIs, and integrations that extend Zoom's functionality.",
      themes: [
        {
          name: "Need Stronger Platform & Integrations Ecosystem",
          category: "improvement",
          sub_themes: [
            { name: "Desire for Wider Third-Party Integrations", category: "improvement" },
            { name: "Better API Documentation Needed", category: "improvement" },
            { name: "Request for Webhook Improvements", category: "improvement" },
          ],
        },
        {
          name: "Integration Setup Questions",
          category: "question",
          sub_themes: [
            { name: "How to Connect Salesforce", category: "question" },
            { name: "Understanding OAuth Flows", category: "question" },
            { name: "API Rate Limits Clarification", category: "question" },
          ],
        },
      ],
    },
    {
      name: "Usability",
      description: "Cross-cutting concerns related to the overall user experience of Zoom products.",
      themes: [
        {
          name: "Praise for Zoom's Easy Usability",
          category: "praise",
          sub_themes: [
            { name: "Intuitive First-Time Experience", category: "praise" },
            { name: "Easy to Learn", category: "praise" },
            { name: "Consistent Across Platforms", category: "praise" },
          ],
        },
        {
          name: "Complaints About UI Complexity",
          category: "complaint",
          sub_themes: [
            { name: "Too Many Options", category: "complaint" },
            { name: "Inconsistent Design", category: "complaint" },
            { name: "Settings Hard to Find", category: "complaint" },
          ],
        },
      ],
    },
  ],
  l2_aspects: [
    {
      name: "Scheduling & Joining",
      description: "Features related to creating, managing, and accessing meetings.",
      parent: "Zoom Meetings",
      themes: [
        {
          name: "Confusion Navigating Scheduling & Joining",
          category: "complaint",
          sub_themes: [
            { name: "Calendar Integration Issues", category: "complaint" },
            { name: "Meeting Link Problems", category: "complaint" },
            { name: "Timezone Display Confusion", category: "complaint" },
          ],
        },
        {
          name: "Appreciation for Easy Scheduling & Joining",
          category: "praise",
          sub_themes: [
            { name: "One-Click Join Works Great", category: "praise" },
            { name: "Recurring Meeting Setup is Simple", category: "praise" },
            { name: "Mobile Join Experience", category: "praise" },
          ],
        },
      ],
    },
    {
      name: "In-Meeting Experience",
      description: "Features and interactions that occur during a live meeting session.",
      parent: "Zoom Meetings",
      themes: [
        {
          name: "Appreciation for Smooth In-Meeting Experience",
          category: "praise",
          sub_themes: [
            { name: "Stable Video Connection", category: "praise" },
            { name: "Easy Screen Sharing", category: "praise" },
            { name: "Responsive Controls", category: "praise" },
          ],
        },
        {
          name: "In-Meeting Feature Requests",
          category: "improvement",
          sub_themes: [
            { name: "Better Reaction Options", category: "improvement" },
            { name: "Improved Hand Raise Visibility", category: "improvement" },
            { name: "Custom Layouts Needed", category: "improvement" },
          ],
        },
      ],
    },
    {
      name: "Audio Management",
      description: "Capabilities related to audio quality, control, and enhancement.",
      parent: "Zoom Meetings",
      themes: [
        {
          name: "Frustration with Unreliable Audio Quality",
          category: "complaint",
          sub_themes: [
            { name: "Echo Issues During Calls", category: "complaint" },
            { name: "Background Noise Not Filtered", category: "complaint" },
            { name: "Audio Cutting Out", category: "complaint" },
          ],
        },
        {
          name: "Audio Feature Questions",
          category: "question",
          sub_themes: [
            { name: "How to Use Noise Suppression", category: "question" },
            { name: "Understanding Audio Settings", category: "question" },
            { name: "Microphone Selection Help", category: "question" },
          ],
        },
      ],
    },
    {
      name: "Video Management",
      description: "Capabilities related to video quality, control, and enhancement.",
      parent: "Zoom Meetings",
      themes: [
        {
          name: "Frustration with Video Quality Issues",
          category: "complaint",
          sub_themes: [
            { name: "Blurry Video Feed", category: "complaint" },
            { name: "Camera Not Detected", category: "complaint" },
            { name: "Video Freezing", category: "complaint" },
          ],
        },
        {
          name: "Video Enhancement Requests",
          category: "improvement",
          sub_themes: [
            { name: "Better Low-Light Performance", category: "improvement" },
            { name: "More Filter Options", category: "improvement" },
            { name: "Improved Touch-Up Feature", category: "improvement" },
          ],
        },
      ],
    },
    {
      name: "Recording & Transcription",
      description: "Features for capturing meeting content for later review.",
      parent: "Zoom Meetings",
      themes: [
        {
          name: "Issues with Recording Features",
          category: "complaint",
          sub_themes: [
            { name: "Recording Failed to Start", category: "complaint" },
            { name: "Cloud Storage Limits", category: "complaint" },
            { name: "Transcript Accuracy Problems", category: "complaint" },
          ],
        },
        {
          name: "Recording Feature Praise",
          category: "praise",
          sub_themes: [
            { name: "Easy to Find Recordings", category: "praise" },
            { name: "Good Video Quality", category: "praise" },
            { name: "Helpful Auto-Generated Chapters", category: "praise" },
          ],
        },
      ],
    },
    {
      name: "Channels & Groups",
      description: "Organizational structures within Team Chat for grouping conversations.",
      parent: "Zoom Team Chat",
      themes: [
        {
          name: "Channel Organization Challenges",
          category: "complaint",
          sub_themes: [
            { name: "Too Many Channels to Track", category: "complaint" },
            { name: "Difficulty Finding Old Conversations", category: "complaint" },
            { name: "Channel Permissions Confusing", category: "complaint" },
          ],
        },
        {
          name: "Channel Feature Requests",
          category: "improvement",
          sub_themes: [
            { name: "Need Channel Categories", category: "improvement" },
            { name: "Better Channel Discovery", category: "improvement" },
            { name: "Archive Inactive Channels", category: "improvement" },
          ],
        },
      ],
    },
    {
      name: "Direct Messaging",
      description: "One-on-one or small group private conversations within Team Chat.",
      parent: "Zoom Team Chat",
      themes: [
        {
          name: "Direct Message Appreciation",
          category: "praise",
          sub_themes: [
            { name: "Fast Message Delivery", category: "praise" },
            { name: "Easy to Start DMs", category: "praise" },
            { name: "Good Read Receipts", category: "praise" },
          ],
        },
        {
          name: "DM Privacy Concerns",
          category: "question",
          sub_themes: [
            { name: "Are DMs Visible to Admins", category: "question" },
            { name: "Understanding Message Retention", category: "question" },
            { name: "How to Delete Message History", category: "question" },
          ],
        },
      ],
    },
    {
      name: "File Sharing",
      description: "The ability to share files, images, and documents within Team Chat.",
      parent: "Zoom Team Chat",
      themes: [
        {
          name: "File Sharing Works Well",
          category: "praise",
          sub_themes: [
            { name: "Easy Drag and Drop", category: "praise" },
            { name: "Good Preview Support", category: "praise" },
            { name: "Fast Upload Speed", category: "praise" },
          ],
        },
        {
          name: "File Sharing Limitations",
          category: "complaint",
          sub_themes: [
            { name: "File Size Limits Too Small", category: "complaint" },
            { name: "Can't Share Certain File Types", category: "complaint" },
            { name: "Files Expire Too Quickly", category: "complaint" },
          ],
        },
      ],
    },
    {
      name: "Call Management",
      description: "Features for handling inbound and outbound calls.",
      parent: "Zoom Phone",
      themes: [
        {
          name: "Call Transfer Issues",
          category: "complaint",
          sub_themes: [
            { name: "Warm Transfer Not Working", category: "complaint" },
            { name: "Calls Dropped During Transfer", category: "complaint" },
            { name: "Transfer to Voicemail Fails", category: "complaint" },
          ],
        },
        {
          name: "Call Handling Appreciation",
          category: "praise",
          sub_themes: [
            { name: "Easy Call Parking", category: "praise" },
            { name: "Good Call History", category: "praise" },
            { name: "Reliable Caller ID", category: "praise" },
          ],
        },
      ],
    },
    {
      name: "Voicemail & Messages",
      description: "Features for receiving, managing, and responding to voicemail messages.",
      parent: "Zoom Phone",
      themes: [
        {
          name: "Voicemail Transcription Praise",
          category: "praise",
          sub_themes: [
            { name: "Accurate Transcriptions", category: "praise" },
            { name: "Fast Notification Delivery", category: "praise" },
            { name: "Easy to Listen and Respond", category: "praise" },
          ],
        },
        {
          name: "Voicemail Setup Confusion",
          category: "question",
          sub_themes: [
            { name: "How to Record Custom Greeting", category: "question" },
            { name: "Understanding Voicemail Routing", category: "question" },
            { name: "Setting Up Shared Mailbox", category: "question" },
          ],
        },
      ],
    },
    {
      name: "Webinar Setup",
      description: "Tools for configuring and customizing webinar settings before the event.",
      parent: "Zoom Webinars",
      themes: [
        {
          name: "Webinar Configuration Complexity",
          category: "complaint",
          sub_themes: [
            { name: "Too Many Settings to Configure", category: "complaint" },
            { name: "Practice Session Setup Issues", category: "complaint" },
            { name: "Panelist Invitation Problems", category: "complaint" },
          ],
        },
        {
          name: "Webinar Branding Appreciation",
          category: "praise",
          sub_themes: [
            { name: "Good Custom Branding Options", category: "praise" },
            { name: "Professional Registration Pages", category: "praise" },
            { name: "Easy Email Customization", category: "praise" },
          ],
        },
      ],
    },
    {
      name: "Audience Engagement",
      description: "Interactive features that allow hosts to engage with webinar attendees.",
      parent: "Zoom Webinars",
      themes: [
        {
          name: "Engagement Tools Work Well",
          category: "praise",
          sub_themes: [
            { name: "Q&A Feature is Great", category: "praise" },
            { name: "Polls Are Easy to Create", category: "praise" },
            { name: "Good Attendee Reactions", category: "praise" },
          ],
        },
        {
          name: "Need More Engagement Options",
          category: "improvement",
          sub_themes: [
            { name: "Want Live Quizzes", category: "improvement" },
            { name: "Better Breakout for Webinars", category: "improvement" },
            { name: "More Interactive Features", category: "improvement" },
          ],
        },
      ],
    },
    {
      name: "Event Setup & Configuration",
      description: "Tools for building and customizing the entire event experience.",
      parent: "Zoom Events",
      themes: [
        {
          name: "Event Builder Challenges",
          category: "complaint",
          sub_themes: [
            { name: "Complex Session Management", category: "complaint" },
            { name: "Expo Booth Setup Difficult", category: "complaint" },
            { name: "Networking Lounge Configuration", category: "complaint" },
          ],
        },
        {
          name: "Event Customization Questions",
          category: "question",
          sub_themes: [
            { name: "How to Add Sponsors", category: "question" },
            { name: "Understanding Ticket Types", category: "question" },
            { name: "Setting Up Event Lobby", category: "question" },
          ],
        },
      ],
    },
    {
      name: "Canvas & Content Tools",
      description: "The core set of tools for adding and manipulating content on the whiteboard.",
      parent: "Zoom Whiteboard",
      themes: [
        {
          name: "Canvas Tool Limitations",
          category: "improvement",
          sub_themes: [
            { name: "Need More Drawing Tools", category: "improvement" },
            { name: "Better Shape Library", category: "improvement" },
            { name: "Request for Templates", category: "improvement" },
          ],
        },
        {
          name: "Canvas Performance Issues",
          category: "complaint",
          sub_themes: [
            { name: "Lag with Large Boards", category: "complaint" },
            { name: "Sync Issues Between Users", category: "complaint" },
            { name: "Undo Not Working Properly", category: "complaint" },
          ],
        },
      ],
    },
    {
      name: "Room System & Hardware",
      description: "The core components and certified hardware that make up a Zoom Room.",
      parent: "Zoom Rooms",
      themes: [
        {
          name: "Hardware Compatibility Issues",
          category: "complaint",
          sub_themes: [
            { name: "USB Device Not Recognized", category: "complaint" },
            { name: "Display Resolution Problems", category: "complaint" },
            { name: "Microphone Array Issues", category: "complaint" },
          ],
        },
        {
          name: "Room System Reliability",
          category: "praise",
          sub_themes: [
            { name: "Consistent Performance", category: "praise" },
            { name: "Easy to Maintain", category: "praise" },
            { name: "Good Remote Management", category: "praise" },
          ],
        },
      ],
    },
    {
      name: "Omnichannel Engagement",
      description: "Support for various communication channels including voice, video, chat, and SMS.",
      parent: "Zoom Contact Center",
      themes: [
        {
          name: "Channel Integration Works Well",
          category: "praise",
          sub_themes: [
            { name: "Smooth Voice to Video Escalation", category: "praise" },
            { name: "Good Chat Widget", category: "praise" },
            { name: "SMS Support is Helpful", category: "praise" },
          ],
        },
        {
          name: "Channel Switching Issues",
          category: "complaint",
          sub_themes: [
            { name: "Context Lost Between Channels", category: "complaint" },
            { name: "SMS Delivery Delays", category: "complaint" },
            { name: "Video Escalation Failures", category: "complaint" },
          ],
        },
      ],
    },
    {
      name: "Conversation Analysis",
      description: "AI-powered tools to review and analyze recorded conversations.",
      parent: "Revenue Accelerator",
      themes: [
        {
          name: "Analysis Insights Are Helpful",
          category: "praise",
          sub_themes: [
            { name: "Good Talk Ratio Metrics", category: "praise" },
            { name: "Useful Keyword Tracking", category: "praise" },
            { name: "Helpful Coaching Tips", category: "praise" },
          ],
        },
        {
          name: "Analysis Accuracy Questions",
          category: "question",
          sub_themes: [
            { name: "How Is Sentiment Calculated", category: "question" },
            { name: "Understanding Score Methodology", category: "question" },
            { name: "Customizing Analysis Parameters", category: "question" },
          ],
        },
      ],
    },
    {
      name: "Booking Schedules",
      description: "The core functionality for creating different types of schedulable appointment slots.",
      parent: "Zoom Scheduler",
      themes: [
        {
          name: "Schedule Configuration Challenges",
          category: "complaint",
          sub_themes: [
            { name: "Buffer Time Not Working", category: "complaint" },
            { name: "Recurring Availability Issues", category: "complaint" },
            { name: "Multiple Schedule Conflicts", category: "complaint" },
          ],
        },
        {
          name: "Booking Page Appreciation",
          category: "praise",
          sub_themes: [
            { name: "Clean Booking Interface", category: "praise" },
            { name: "Easy Time Selection", category: "praise" },
            { name: "Good Mobile Experience", category: "praise" },
          ],
        },
      ],
    },
    {
      name: "Document Creation & Editing",
      description: "The core features for creating and formatting content within a Zoom Doc.",
      parent: "Zoom Docs",
      themes: [
        {
          name: "Document Editor Feedback",
          category: "improvement",
          sub_themes: [
            { name: "Need Offline Editing", category: "improvement" },
            { name: "Better Version History", category: "improvement" },
            { name: "More Import Options", category: "improvement" },
          ],
        },
        {
          name: "Collaboration Features Work Well",
          category: "praise",
          sub_themes: [
            { name: "Real-time Cursor Tracking", category: "praise" },
            { name: "Good Comment System", category: "praise" },
            { name: "Easy @Mentions", category: "praise" },
          ],
        },
      ],
    },
    {
      name: "Clip Creation & Editing",
      description: "The end-to-end workflow for producing a video clip.",
      parent: "Zoom Clips",
      themes: [
        {
          name: "Clip Recording Praise",
          category: "praise",
          sub_themes: [
            { name: "Easy Screen + Camera Recording", category: "praise" },
            { name: "Quick Start Recording", category: "praise" },
            { name: "Good Default Quality", category: "praise" },
          ],
        },
        {
          name: "Clip Editing Needs",
          category: "improvement",
          sub_themes: [
            { name: "Want Trim Capabilities", category: "improvement" },
            { name: "Need Text Overlays", category: "improvement" },
            { name: "Request for Blur Tool", category: "improvement" },
          ],
        },
      ],
    },
    {
      name: "Task Management",
      description: "Core features for creating, organizing, and tracking tasks.",
      parent: "Zoom Tasks",
      themes: [
        {
          name: "Task Tracking Works Well",
          category: "praise",
          sub_themes: [
            { name: "Easy Task Creation", category: "praise" },
            { name: "Good Due Date Reminders", category: "praise" },
            { name: "Helpful Assignment Notifications", category: "praise" },
          ],
        },
        {
          name: "Task Feature Requests",
          category: "improvement",
          sub_themes: [
            { name: "Need Recurring Tasks", category: "improvement" },
            { name: "Want Task Dependencies", category: "improvement" },
            { name: "Better Mobile Task View", category: "improvement" },
          ],
        },
      ],
    },
    {
      name: "Cross-Product Integration",
      description: "Features that enable seamless workflows and data sharing between different Zoom products.",
      parent: "Platform & Integrations",
      themes: [
        {
          name: "Integration Sync Issues",
          category: "complaint",
          sub_themes: [
            { name: "Data Not Syncing Properly", category: "complaint" },
            { name: "Delayed Updates Between Products", category: "complaint" },
            { name: "Settings Not Reflected Everywhere", category: "complaint" },
          ],
        },
        {
          name: "Integration Benefits",
          category: "praise",
          sub_themes: [
            { name: "Seamless Meeting to Chat", category: "praise" },
            { name: "Good Calendar Integration", category: "praise" },
            { name: "Unified Contact Management", category: "praise" },
          ],
        },
      ],
    },
    {
      name: "User Management",
      description: "Tools for adding, removing, and managing users within a Zoom account.",
      parent: "Account Administration",
      themes: [
        {
          name: "User Admin Challenges",
          category: "complaint",
          sub_themes: [
            { name: "Bulk User Import Issues", category: "complaint" },
            { name: "License Assignment Confusion", category: "complaint" },
            { name: "Group Management Complexity", category: "complaint" },
          ],
        },
        {
          name: "User Management Questions",
          category: "question",
          sub_themes: [
            { name: "How to Transfer User Data", category: "question" },
            { name: "Understanding User Roles", category: "question" },
            { name: "SSO Configuration Help", category: "question" },
          ],
        },
      ],
    },
    {
      name: "Security & Compliance",
      description: "Settings and features related to account security, data protection, and regulatory compliance.",
      parent: "Account Administration",
      themes: [
        {
          name: "Security Features Appreciation",
          category: "praise",
          sub_themes: [
            { name: "Good 2FA Implementation", category: "praise" },
            { name: "Comprehensive Audit Logs", category: "praise" },
            { name: "Strong Encryption Standards", category: "praise" },
          ],
        },
        {
          name: "Compliance Configuration Questions",
          category: "question",
          sub_themes: [
            { name: "HIPAA Setup Questions", category: "question" },
            { name: "GDPR Compliance Settings", category: "question" },
            { name: "Data Residency Options", category: "question" },
          ],
        },
      ],
    },
  ],
  l3_aspects: [
    {
      name: "Schedule a Meeting",
      description: "The fundamental capability to set up a future Zoom meeting.",
      parent: "Scheduling & Joining",
      themes: [
        {
          name: "Scheduling Blocked by Error Messages",
          category: "complaint",
          sub_themes: [
            { name: "Unknown Error During Scheduling", category: "complaint" },
            { name: "Calendar Connection Errors", category: "complaint" },
            { name: "Permission Denied Messages", category: "complaint" },
          ],
        },
        {
          name: "Struggle to Locate Schedule Option",
          category: "complaint",
          sub_themes: [
            { name: "Button Hidden in Menu", category: "complaint" },
            { name: "Different on Mobile vs Desktop", category: "complaint" },
            { name: "Schedule vs Meet Now Confusion", category: "complaint" },
          ],
        },
      ],
    },
    {
      name: "Personal Meeting ID (PMI)",
      description: "A static, personal meeting room that is always available.",
      parent: "Scheduling & Joining",
      themes: [
        {
          name: "Confusion About PMI vs Unique Meeting ID",
          category: "question",
          sub_themes: [
            { name: "When to Use PMI", category: "question" },
            { name: "PMI Security Concerns", category: "question" },
            { name: "How to Change PMI", category: "question" },
          ],
        },
        {
          name: "PMI Convenience",
          category: "praise",
          sub_themes: [
            { name: "Easy to Remember", category: "praise" },
            { name: "Quick Ad-Hoc Meetings", category: "praise" },
            { name: "Always Available", category: "praise" },
          ],
        },
      ],
    },
    {
      name: "Alternative Host",
      description: "The ability to designate another licensed user to start and manage a scheduled meeting.",
      parent: "Scheduling & Joining",
      themes: [
        {
          name: "Difficulty Assigning Alternative Host",
          category: "complaint",
          sub_themes: [
            { name: "User Not Found in Search", category: "complaint" },
            { name: "License Type Blocking Assignment", category: "complaint" },
            { name: "Alt Host Can't Start Meeting", category: "complaint" },
          ],
        },
        {
          name: "Alternative Host Questions",
          category: "question",
          sub_themes: [
            { name: "What Can Alt Host Do", category: "question" },
            { name: "How Many Alt Hosts Allowed", category: "question" },
            { name: "Difference from Co-Host", category: "question" },
          ],
        },
      ],
    },
    {
      name: "Join via Link",
      description: "The process of joining a Zoom meeting by clicking on a meeting link.",
      parent: "Scheduling & Joining",
      themes: [
        {
          name: "Join Link Issues",
          category: "complaint",
          sub_themes: [
            { name: "Link Not Working", category: "complaint" },
            { name: "Opens Wrong App", category: "complaint" },
            { name: "Browser vs App Confusion", category: "complaint" },
          ],
        },
        {
          name: "Join Experience Praise",
          category: "praise",
          sub_themes: [
            { name: "One-Click Join Works Great", category: "praise" },
            { name: "Good Pre-Join Preview", category: "praise" },
            { name: "Fast Connection Time", category: "praise" },
          ],
        },
      ],
    },
    {
      name: "Meeting Registration",
      description: "A feature that requires attendees to register before joining a meeting.",
      parent: "Scheduling & Joining",
      themes: [
        {
          name: "Annoyance at Repeated Registration Prompts",
          category: "complaint",
          sub_themes: [
            { name: "Registered But Asked Again", category: "complaint" },
            { name: "Registration Link Expired", category: "complaint" },
            { name: "Can't Find Confirmation Email", category: "complaint" },
          ],
        },
        {
          name: "Registration Feature Questions",
          category: "question",
          sub_themes: [
            { name: "How to Add Custom Fields", category: "question" },
            { name: "Setting Approval Workflow", category: "question" },
            { name: "Exporting Registrant Data", category: "question" },
          ],
        },
      ],
    },
    {
      name: "Host & Co-Host Controls",
      description: "The set of permissions and tools available to the meeting host and co-host(s).",
      parent: "In-Meeting Experience",
      themes: [
        {
          name: "Host Controls Appreciation",
          category: "praise",
          sub_themes: [
            { name: "Easy to Mute Participants", category: "praise" },
            { name: "Good Recording Controls", category: "praise" },
            { name: "Quick Access to Settings", category: "praise" },
          ],
        },
        {
          name: "Co-Host Permission Issues",
          category: "complaint",
          sub_themes: [
            { name: "Co-Host Can't Do Enough", category: "complaint" },
            { name: "Controls Different from Host", category: "complaint" },
            { name: "Can't Assign Co-Host Before Meeting", category: "complaint" },
          ],
        },
      ],
    },
    {
      name: "Participant Management",
      description: "Tools for viewing and managing the list of meeting attendees.",
      parent: "In-Meeting Experience",
      themes: [
        {
          name: "Participant Panel Works Well",
          category: "praise",
          sub_themes: [
            { name: "Easy to See Who's Here", category: "praise" },
            { name: "Quick Actions on Participants", category: "praise" },
            { name: "Good Waiting Room Management", category: "praise" },
          ],
        },
        {
          name: "Large Meeting Management Challenges",
          category: "complaint",
          sub_themes: [
            { name: "Hard to Find Specific Person", category: "complaint" },
            { name: "Participant List Slow to Load", category: "complaint" },
            { name: "Bulk Actions Needed", category: "complaint" },
          ],
        },
      ],
    },
    {
      name: "Breakout Rooms",
      description: "A feature that allows the host to split a meeting into smaller, separate sessions.",
      parent: "In-Meeting Experience",
      themes: [
        {
          name: "Frustration Setting Up Breakout Rooms",
          category: "complaint",
          sub_themes: [
            { name: "Pre-Assignment Not Working", category: "complaint" },
            { name: "Participants in Wrong Rooms", category: "complaint" },
            { name: "Timer Feature Issues", category: "complaint" },
          ],
        },
        {
          name: "Breakout Rooms Appreciation",
          category: "praise",
          sub_themes: [
            { name: "Great for Group Work", category: "praise" },
            { name: "Easy to Broadcast Messages", category: "praise" },
            { name: "Good for Training Sessions", category: "praise" },
          ],
        },
      ],
    },
    {
      name: "In-Meeting Chat",
      description: "A text-based communication channel available during a meeting.",
      parent: "In-Meeting Experience",
      themes: [
        {
          name: "In-Meeting Chat Feedback",
          category: "improvement",
          sub_themes: [
            { name: "Chat History Lost After Meeting", category: "improvement" },
            { name: "Need Better File Sharing in Chat", category: "improvement" },
            { name: "Want Threaded Replies", category: "improvement" },
          ],
        },
        {
          name: "Chat Works Well",
          category: "praise",
          sub_themes: [
            { name: "Easy to Send Links", category: "praise" },
            { name: "Private Messages Helpful", category: "praise" },
            { name: "Good for Q&A", category: "praise" },
          ],
        },
      ],
    },
    {
      name: "Polling & Quizzing",
      description: "Interactive tools that allow the host to launch questions during a meeting.",
      parent: "In-Meeting Experience",
      themes: [
        {
          name: "Polling Feature Appreciation",
          category: "praise",
          sub_themes: [
            { name: "Easy to Create Polls", category: "praise" },
            { name: "Results Display Clearly", category: "praise" },
            { name: "Good for Engagement", category: "praise" },
          ],
        },
        {
          name: "Polling Limitations",
          category: "improvement",
          sub_themes: [
            { name: "Need More Question Types", category: "improvement" },
            { name: "Want Anonymous Polling", category: "improvement" },
            { name: "Better Poll Analytics", category: "improvement" },
          ],
        },
      ],
    },
    {
      name: "AI Meeting Summary",
      description: "An AI-generated summary of a meeting recording.",
      parent: "In-Meeting Experience",
      themes: [
        {
          name: "AI Summary Appreciation",
          category: "praise",
          sub_themes: [
            { name: "Saves Time Reviewing Meetings", category: "praise" },
            { name: "Good Action Item Detection", category: "praise" },
            { name: "Helpful Key Points Summary", category: "praise" },
          ],
        },
        {
          name: "AI Summary Accuracy Issues",
          category: "complaint",
          sub_themes: [
            { name: "Missing Important Topics", category: "complaint" },
            { name: "Incorrect Speaker Attribution", category: "complaint" },
            { name: "Technical Terms Misunderstood", category: "complaint" },
          ],
        },
      ],
    },
    {
      name: "Audio Enhancement",
      description: "A collection of settings to improve audio quality.",
      parent: "Audio Management",
      themes: [
        {
          name: "Audio Enhancement Works Well",
          category: "praise",
          sub_themes: [
            { name: "Good Noise Cancellation", category: "praise" },
            { name: "Echo Reduction Helpful", category: "praise" },
            { name: "Voice Clarity Improved", category: "praise" },
          ],
        },
        {
          name: "Audio Enhancement Questions",
          category: "question",
          sub_themes: [
            { name: "Which Setting to Use", category: "question" },
            { name: "Low vs High Suppression", category: "question" },
            { name: "Music Mode Explained", category: "question" },
          ],
        },
      ],
    },
    {
      name: "Join by Phone",
      description: "The option for participants to dial into a meeting's audio using a telephone.",
      parent: "Audio Management",
      themes: [
        {
          name: "Phone Dial-In Issues",
          category: "complaint",
          sub_themes: [
            { name: "Toll-Free Number Not Working", category: "complaint" },
            { name: "PIN Entry Problems", category: "complaint" },
            { name: "Audio Sync Issues", category: "complaint" },
          ],
        },
        {
          name: "Phone Dial-In Helpful",
          category: "praise",
          sub_themes: [
            { name: "Great Backup Option", category: "praise" },
            { name: "Works When Internet Poor", category: "praise" },
            { name: "Easy Call-Me Feature", category: "praise" },
          ],
        },
      ],
    },
    {
      name: "HD Video",
      description: "The capability to transmit and receive video in high definition.",
      parent: "Video Management",
      themes: [
        {
          name: "HD Video Quality Praise",
          category: "praise",
          sub_themes: [
            { name: "Sharp and Clear Video", category: "praise" },
            { name: "Good Color Reproduction", category: "praise" },
            { name: "Smooth Frame Rate", category: "praise" },
          ],
        },
        {
          name: "HD Video Issues",
          category: "complaint",
          sub_themes: [
            { name: "HD Not Enabling", category: "complaint" },
            { name: "Bandwidth Not Sufficient", category: "complaint" },
            { name: "Quality Inconsistent", category: "complaint" },
          ],
        },
      ],
    },
    {
      name: "Virtual Backgrounds",
      description: "A feature that allows users to display an image or video as their background.",
      parent: "Video Management",
      themes: [
        {
          name: "Virtual Background Not Working Properly",
          category: "complaint",
          sub_themes: [
            { name: "Edge Detection Poor", category: "complaint" },
            { name: "Background Flickering", category: "complaint" },
            { name: "Green Screen Required Message", category: "complaint" },
          ],
        },
        {
          name: "Virtual Background Love",
          category: "praise",
          sub_themes: [
            { name: "Great for Privacy", category: "praise" },
            { name: "Fun Custom Backgrounds", category: "praise" },
            { name: "Professional Looking", category: "praise" },
          ],
        },
      ],
    },
    {
      name: "Gallery View",
      description: "A video layout that displays multiple participants in a grid format.",
      parent: "Video Management",
      themes: [
        {
          name: "Gallery View Appreciation",
          category: "praise",
          sub_themes: [
            { name: "See Everyone at Once", category: "praise" },
            { name: "Good Grid Layout", category: "praise" },
            { name: "Easy to Spot Reactions", category: "praise" },
          ],
        },
        {
          name: "Gallery View Limitations",
          category: "improvement",
          sub_themes: [
            { name: "Need More Than 49 Per Page", category: "improvement" },
            { name: "Want Custom Grid Arrangements", category: "improvement" },
            { name: "Pin Multiple Participants", category: "improvement" },
          ],
        },
      ],
    },
    {
      name: "Cloud Recording",
      description: "The ability to record meetings directly to Zoom's cloud storage.",
      parent: "Recording & Transcription",
      themes: [
        {
          name: "Cloud Recording Benefits",
          category: "praise",
          sub_themes: [
            { name: "Easy Access Anywhere", category: "praise" },
            { name: "Good Sharing Options", category: "praise" },
            { name: "Automatic Processing", category: "praise" },
          ],
        },
        {
          name: "Cloud Recording Issues",
          category: "complaint",
          sub_themes: [
            { name: "Processing Takes Too Long", category: "complaint" },
            { name: "Storage Limits Reached", category: "complaint" },
            { name: "Recording Quality Poor", category: "complaint" },
          ],
        },
      ],
    },
    {
      name: "Local Recording",
      description: "The ability to record meetings to a local device.",
      parent: "Recording & Transcription",
      themes: [
        {
          name: "Local Recording Preference",
          category: "praise",
          sub_themes: [
            { name: "Full Control Over Files", category: "praise" },
            { name: "No Cloud Storage Needed", category: "praise" },
            { name: "Faster Access to Recording", category: "praise" },
          ],
        },
        {
          name: "Local Recording Problems",
          category: "complaint",
          sub_themes: [
            { name: "File Conversion Fails", category: "complaint" },
            { name: "Large File Sizes", category: "complaint" },
            { name: "Recording Location Unclear", category: "complaint" },
          ],
        },
      ],
    },
    {
      name: "Meeting Transcript",
      description: "An AI-generated text transcript of the meeting audio.",
      parent: "Recording & Transcription",
      themes: [
        {
          name: "Transcript Feature Helpful",
          category: "praise",
          sub_themes: [
            { name: "Easy to Search Content", category: "praise" },
            { name: "Good for Accessibility", category: "praise" },
            { name: "Helpful for Note-Taking", category: "praise" },
          ],
        },
        {
          name: "Transcript Accuracy Concerns",
          category: "complaint",
          sub_themes: [
            { name: "Many Transcription Errors", category: "complaint" },
            { name: "Speaker Names Wrong", category: "complaint" },
            { name: "Technical Terms Misspelled", category: "complaint" },
          ],
        },
      ],
    },
  ],
}

// Build the taxonomy tree from the data structure
function buildTaxonomyTree(): TaxonomyData {
  const l1Map = new Map<string, TaxonomyNode>()
  const l2Map = new Map<string, TaxonomyNode>()

  // First pass: Create L1 nodes
  zoomData.aspects.forEach((aspect) => {
    const node: TaxonomyNode = {
      id: generateId(aspect.name),
      name: aspect.name,
      count: Math.floor(Math.random() * 24000) + 1000,
      description: aspect.description,
      themes: aspect.themes?.map((t, i) => convertTheme(t, i)) || [],
      children: [],
    }
    node.themeCount = node.themes?.length || 0
    l1Map.set(aspect.name, node)
  })

  // Second pass: Create L2 nodes and attach to L1
  zoomData.l2_aspects.forEach((aspect) => {
    const node: TaxonomyNode = {
      id: generateId(aspect.name),
      name: aspect.name,
      count: Math.floor(Math.random() * 4500) + 500,
      description: aspect.description,
      themes: aspect.themes?.map((t, i) => convertTheme(t, i)) || [],
      children: [],
    }
    node.themeCount = node.themes?.length || 0
    l2Map.set(aspect.name, node)

    const parent = l1Map.get(aspect.parent!)
    if (parent) {
      parent.children = parent.children || []
      parent.children.push(node)
    }
  })

  // Third pass: Create L3 nodes and attach to L2
  zoomData.l3_aspects.forEach((aspect) => {
    const node: TaxonomyNode = {
      id: generateId(aspect.name),
      name: aspect.name,
      count: Math.floor(Math.random() * 1900) + 100,
      description: aspect.description,
      themes: aspect.themes?.map((t, i) => convertTheme(t, i)) || [],
    }
    node.themeCount = node.themes?.length || 0

    const parent = l2Map.get(aspect.parent!)
    if (parent) {
      parent.children = parent.children || []
      parent.children.push(node)
    }
  })

  return {
    level1: Array.from(l1Map.values()),
  }
}

export const sampleTaxonomyData: TaxonomyData = {
  level1: [
    // Zoom Meetings
    {
      id: "zoom-meetings",
      name: "Zoom Meetings",
      count: 24410,
      description:
        "The core video conferencing service for real-time collaboration and communication within the Zoom Workplace ecosystem.",
      themes: zoomData.aspects.find((a) => a.name === "Zoom Meetings")!.themes!.map((t, i) => convertTheme(t, i)),
      themeCount: zoomData.aspects.find((a) => a.name === "Zoom Meetings")!.themes!.length,
      children: zoomData.l2_aspects
        .filter((l2) => l2.parent === "Zoom Meetings")
        .map((l2) => {
          const l2Node: TaxonomyNode = {
            id: generateId(l2.name),
            name: l2.name,
            count: Math.floor(Math.random() * 4500) + 500,
            description: l2.description,
            themes: l2.themes?.map((t, i) => convertTheme(t, i)) || [],
            children: zoomData.l3_aspects
              .filter((l3) => l3.parent === l2.name)
              .map((l3) => ({
                id: generateId(l3.name),
                name: l3.name,
                count: Math.floor(Math.random() * 1900) + 100,
                description: l3.description,
                themes: l3.themes?.map((t, i) => convertTheme(t, i)) || [],
                themeCount: l3.themes?.length || 0,
              })),
          }
          l2Node.themeCount = l2Node.themes?.length || 0
          return l2Node
        }),
    },
    // Team Chat
    {
      id: "team-chat",
      name: "Zoom Team Chat",
      count: 9670,
      description:
        "A persistent messaging platform integrated within Zoom that enables teams to communicate asynchronously.",
      themes: zoomData.aspects.find((a) => a.name === "Zoom Team Chat")!.themes!.map((t, i) => convertTheme(t, i)),
      themeCount: zoomData.aspects.find((a) => a.name === "Zoom Team Chat")!.themes!.length,
      children: zoomData.l2_aspects
        .filter((l2) => l2.parent === "Zoom Team Chat")
        .map((l2) => {
          const l2Node: TaxonomyNode = {
            id: generateId(l2.name),
            name: l2.name,
            count: Math.floor(Math.random() * 4500) + 500,
            description: l2.description,
            themes: l2.themes?.map((t, i) => convertTheme(t, i)) || [],
            children: zoomData.l3_aspects
              .filter((l3) => l3.parent === l2.name)
              .map((l3) => ({
                id: generateId(l3.name),
                name: l3.name,
                count: Math.floor(Math.random() * 1900) + 100,
                description: l3.description,
                themes: l3.themes?.map((t, i) => convertTheme(t, i)) || [],
                themeCount: l3.themes?.length || 0,
              })),
          }
          l2Node.themeCount = l2Node.themes?.length || 0
          return l2Node
        }),
    },
    // Workflow Automation - This seems to be a placeholder, as there's no direct data for it.
    // We'll create a basic structure for now.
    {
      id: "workflow-automation",
      name: "Workflow Automation",
      count: 1500,
      description: "Features related to automating workflows within Zoom.",
      themes: [],
      themeCount: 0,
      children: [],
    },
    // Webinars
    {
      id: "webinars",
      name: "Zoom Webinars",
      count: 18500,
      description:
        "A platform for hosting large-scale, broadcast-style virtual events. Webinars allow a few speakers to present to a large audience.",
      themes: zoomData.aspects.find((a) => a.name === "Zoom Webinars")!.themes!.map((t, i) => convertTheme(t, i)),
      themeCount: zoomData.aspects.find((a) => a.name === "Zoom Webinars")!.themes!.length,
      children: zoomData.l2_aspects
        .filter((l2) => l2.parent === "Zoom Webinars")
        .map((l2) => {
          const l2Node: TaxonomyNode = {
            id: generateId(l2.name),
            name: l2.name,
            count: Math.floor(Math.random() * 4500) + 500,
            description: l2.description,
            themes: l2.themes?.map((t, i) => convertTheme(t, i)) || [],
            children: zoomData.l3_aspects
              .filter((l3) => l3.parent === l2.name)
              .map((l3) => ({
                id: generateId(l3.name),
                name: l3.name,
                count: Math.floor(Math.random() * 1900) + 100,
                description: l3.description,
                themes: l3.themes?.map((t, i) => convertTheme(t, i)) || [],
                themeCount: l3.themes?.length || 0,
              })),
          }
          l2Node.themeCount = l2Node.themes?.length || 0
          return l2Node
        }),
    },
    // Phone
    {
      id: "phone",
      name: "Zoom Phone",
      count: 21000,
      description:
        "A cloud-based phone system that replaces traditional PBX systems. It offers enterprise-grade voice services.",
      themes: zoomData.aspects.find((a) => a.name === "Zoom Phone")!.themes!.map((t, i) => convertTheme(t, i)),
      themeCount: zoomData.aspects.find((a) => a.name === "Zoom Phone")!.themes!.length,
      children: zoomData.l2_aspects
        .filter((l2) => l2.parent === "Zoom Phone")
        .map((l2) => {
          const l2Node: TaxonomyNode = {
            id: generateId(l2.name),
            name: l2.name,
            count: Math.floor(Math.random() * 4500) + 500,
            description: l2.description,
            themes: l2.themes?.map((t, i) => convertTheme(t, i)) || [],
            children: zoomData.l3_aspects
              .filter((l3) => l3.parent === l2.name)
              .map((l3) => ({
                id: generateId(l3.name),
                name: l3.name,
                count: Math.floor(Math.random() * 1900) + 100,
                description: l3.description,
                themes: l3.themes?.map((t, i) => convertTheme(t, i)) || [],
                themeCount: l3.themes?.length || 0,
              })),
          }
          l2Node.themeCount = l2Node.themes?.length || 0
          return l2Node
        }),
    },
    // Whiteboard
    {
      id: "whiteboard",
      name: "Zoom Whiteboard",
      count: 6500,
      description: "A digital canvas for visual collaboration that can be used during or outside of meetings.",
      themes: zoomData.aspects.find((a) => a.name === "Zoom Whiteboard")!.themes!.map((t, i) => convertTheme(t, i)),
      themeCount: zoomData.aspects.find((a) => a.name === "Zoom Whiteboard")!.themes!.length,
      children: zoomData.l2_aspects
        .filter((l2) => l2.parent === "Zoom Whiteboard")
        .map((l2) => {
          const l2Node: TaxonomyNode = {
            id: generateId(l2.name),
            name: l2.name,
            count: Math.floor(Math.random() * 4500) + 500,
            description: l2.description,
            themes: l2.themes?.map((t, i) => convertTheme(t, i)) || [],
            children: zoomData.l3_aspects
              .filter((l3) => l3.parent === l2.name)
              .map((l3) => ({
                id: generateId(l3.name),
                name: l3.name,
                count: Math.floor(Math.random() * 1900) + 100,
                description: l3.description,
                themes: l3.themes?.map((t, i) => convertTheme(t, i)) || [],
                themeCount: l3.themes?.length || 0,
              })),
          }
          l2Node.themeCount = l2Node.themes?.length || 0
          return l2Node
        }),
    },
    // Events
    {
      id: "events",
      name: "Zoom Events",
      count: 7800,
      description: "An all-in-one solution for hosting multi-session, multi-day virtual and hybrid events.",
      themes: zoomData.aspects.find((a) => a.name === "Zoom Events")!.themes!.map((t, i) => convertTheme(t, i)),
      themeCount: zoomData.aspects.find((a) => a.name === "Zoom Events")!.themes!.length,
      children: zoomData.l2_aspects
        .filter((l2) => l2.parent === "Zoom Events")
        .map((l2) => {
          const l2Node: TaxonomyNode = {
            id: generateId(l2.name),
            name: l2.name,
            count: Math.floor(Math.random() * 4500) + 500,
            description: l2.description,
            themes: l2.themes?.map((t, i) => convertTheme(t, i)) || [],
            children: zoomData.l3_aspects
              .filter((l3) => l3.parent === l2.name)
              .map((l3) => ({
                id: generateId(l3.name),
                name: l3.name,
                count: Math.floor(Math.random() * 1900) + 100,
                description: l3.description,
                themes: l3.themes?.map((t, i) => convertTheme(t, i)) || [],
                themeCount: l3.themes?.length || 0,
              })),
          }
          l2Node.themeCount = l2Node.themes?.length || 0
          return l2Node
        }),
    },
    // Contact Center
    {
      id: "contact-center",
      name: "Zoom Contact Center",
      count: 5400,
      description:
        "An omnichannel cloud contact center solution that enables businesses to provide customer support across voice, video, chat, and SMS channels.",
      themes: zoomData.aspects.find((a) => a.name === "Zoom Contact Center")!.themes!.map((t, i) => convertTheme(t, i)),
      themeCount: zoomData.aspects.find((a) => a.name === "Zoom Contact Center")!.themes!.length,
      children: zoomData.l2_aspects
        .filter((l2) => l2.parent === "Zoom Contact Center")
        .map((l2) => {
          const l2Node: TaxonomyNode = {
            id: generateId(l2.name),
            name: l2.name,
            count: Math.floor(Math.random() * 4500) + 500,
            description: l2.description,
            themes: l2.themes?.map((t, i) => convertTheme(t, i)) || [],
            children: zoomData.l3_aspects
              .filter((l3) => l3.parent === l2.name)
              .map((l3) => ({
                id: generateId(l3.name),
                name: l3.name,
                count: Math.floor(Math.random() * 1900) + 100,
                description: l3.description,
                themes: l3.themes?.map((t, i) => convertTheme(t, i)) || [],
                themeCount: l3.themes?.length || 0,
              })),
          }
          l2Node.themeCount = l2Node.themes?.length || 0
          return l2Node
        }),
    },
    // Rooms
    {
      id: "rooms",
      name: "Zoom Rooms",
      count: 12300,
      description: "A software-based room system that transforms physical meeting spaces into Zoom-enabled rooms.",
      themes: zoomData.aspects.find((a) => a.name === "Zoom Rooms")!.themes!.map((t, i) => convertTheme(t, i)),
      themeCount: zoomData.aspects.find((a) => a.name === "Zoom Rooms")!.themes!.length,
      children: zoomData.l2_aspects
        .filter((l2) => l2.parent === "Zoom Rooms")
        .map((l2) => {
          const l2Node: TaxonomyNode = {
            id: generateId(l2.name),
            name: l2.name,
            count: Math.floor(Math.random() * 4500) + 500,
            description: l2.description,
            themes: l2.themes?.map((t, i) => convertTheme(t, i)) || [],
            children: zoomData.l3_aspects
              .filter((l3) => l3.parent === l2.name)
              .map((l3) => ({
                id: generateId(l3.name),
                name: l3.name,
                count: Math.floor(Math.random() * 1900) + 100,
                description: l3.description,
                themes: l3.themes?.map((t, i) => convertTheme(t, i)) || [],
                themeCount: l3.themes?.length || 0,
              })),
          }
          l2Node.themeCount = l2Node.themes?.length || 0
          return l2Node
        }),
    },
    // Revenue Accelerator
    {
      id: "revenue-accelerator",
      name: "Revenue Accelerator",
      count: 4100,
      description: "A conversation intelligence solution that uses AI to analyze sales calls and meetings.",
      themes: zoomData.aspects.find((a) => a.name === "Revenue Accelerator")!.themes!.map((t, i) => convertTheme(t, i)),
      themeCount: zoomData.aspects.find((a) => a.name === "Revenue Accelerator")!.themes!.length,
      children: zoomData.l2_aspects
        .filter((l2) => l2.parent === "Revenue Accelerator")
        .map((l2) => {
          const l2Node: TaxonomyNode = {
            id: generateId(l2.name),
            name: l2.name,
            count: Math.floor(Math.random() * 4500) + 500,
            description: l2.description,
            themes: l2.themes?.map((t, i) => convertTheme(t, i)) || [],
            children: zoomData.l3_aspects
              .filter((l3) => l3.parent === l2.name)
              .map((l3) => ({
                id: generateId(l3.name),
                name: l3.name,
                count: Math.floor(Math.random() * 1900) + 100,
                description: l3.description,
                themes: l3.themes?.map((t, i) => convertTheme(t, i)) || [],
                themeCount: l3.themes?.length || 0,
              })),
          }
          l2Node.themeCount = l2Node.themes?.length || 0
          return l2Node
        }),
    },
    // Usability
    {
      id: "usability",
      name: "Usability",
      count: 17900,
      description: "Cross-cutting concerns related to the overall user experience of Zoom products.",
      themes: zoomData.aspects.find((a) => a.name === "Usability")!.themes!.map((t, i) => convertTheme(t, i)),
      themeCount: zoomData.aspects.find((a) => a.name === "Usability")!.themes!.length,
      children: [],
    },
    // Account Administration
    {
      id: "account-administration",
      name: "Account Administration",
      count: 2500,
      description:
        "Tools and settings for managing a Zoom account at the organizational level. This includes user management, security settings, billing, and compliance features for IT administrators.",
      themes: zoomData.aspects
        .find((a) => a.name === "Account Administration")!
        .themes!.map((t, i) => convertTheme(t, i)),
      themeCount: zoomData.aspects.find((a) => a.name === "Account Administration")!.themes!.length,
      children: zoomData.l2_aspects
        .filter((l2) => l2.parent === "Account Administration")
        .map((l2) => {
          const l2Node: TaxonomyNode = {
            id: generateId(l2.name),
            name: l2.name,
            count: Math.floor(Math.random() * 4500) + 500,
            description: l2.description,
            themes: l2.themes?.map((t, i) => convertTheme(t, i)) || [],
            children: zoomData.l3_aspects
              .filter((l3) => l3.parent === l2.name)
              .map((l3) => ({
                id: generateId(l3.name),
                name: l3.name,
                count: Math.floor(Math.random() * 1900) + 100,
                description: l3.description,
                themes: l3.themes?.map((t, i) => convertTheme(t, i)) || [],
                themeCount: l3.themes?.length || 0,
              })),
          }
          l2Node.themeCount = l2Node.themes?.length || 0
          return l2Node
        }),
    },
    // Clips
    {
      id: "clips",
      name: "Zoom Clips",
      count: 3200,
      description:
        "A short-form video messaging tool that allows users to record and share video messages asynchronously.",
      themes: zoomData.aspects.find((a) => a.name === "Zoom Clips")!.themes!.map((t, i) => convertTheme(t, i)),
      themeCount: zoomData.aspects.find((a) => a.name === "Zoom Clips")!.themes!.length,
      children: zoomData.l2_aspects
        .filter((l2) => l2.parent === "Zoom Clips")
        .map((l2) => {
          const l2Node: TaxonomyNode = {
            id: generateId(l2.name),
            name: l2.name,
            count: Math.floor(Math.random() * 4500) + 500,
            description: l2.description,
            themes: l2.themes?.map((t, i) => convertTheme(t, i)) || [],
            children: zoomData.l3_aspects
              .filter((l3) => l3.parent === l2.name)
              .map((l3) => ({
                id: generateId(l3.name),
                name: l3.name,
                count: Math.floor(Math.random() * 1900) + 100,
                description: l3.description,
                themes: l3.themes?.map((t, i) => convertTheme(t, i)) || [],
                themeCount: l3.themes?.length || 0,
              })),
          }
          l2Node.themeCount = l2Node.themes?.length || 0
          return l2Node
        }),
    },
    // Tasks
    {
      id: "tasks",
      name: "Zoom Tasks",
      count: 2800,
      description: "A task management feature integrated within Zoom that helps users track action items and to-dos.",
      themes: zoomData.aspects.find((a) => a.name === "Zoom Tasks")!.themes!.map((t, i) => convertTheme(t, i)),
      themeCount: zoomData.aspects.find((a) => a.name === "Zoom Tasks")!.themes!.length,
      children: zoomData.l2_aspects
        .filter((l2) => l2.parent === "Zoom Tasks")
        .map((l2) => {
          const l2Node: TaxonomyNode = {
            id: generateId(l2.name),
            name: l2.name,
            count: Math.floor(Math.random() * 4500) + 500,
            description: l2.description,
            themes: l2.themes?.map((t, i) => convertTheme(t, i)) || [],
            children: zoomData.l3_aspects
              .filter((l3) => l3.parent === l2.name)
              .map((l3) => ({
                id: generateId(l3.name),
                name: l3.name,
                count: Math.floor(Math.random() * 1900) + 100,
                description: l3.description,
                themes: l3.themes?.map((t, i) => convertTheme(t, i)) || [],
                themeCount: l3.themes?.length || 0,
              })),
          }
          l2Node.themeCount = l2Node.themes?.length || 0
          return l2Node
        }),
    },
    // Docs
    {
      id: "docs",
      name: "Zoom Docs",
      count: 3900,
      description:
        "A collaborative document creation tool that allows teams to create, edit, and share documents in real-time.",
      themes: zoomData.aspects.find((a) => a.name === "Zoom Docs")!.themes!.map((t, i) => convertTheme(t, i)),
      themeCount: zoomData.aspects.find((a) => a.name === "Zoom Docs")!.themes!.length,
      children: zoomData.l2_aspects
        .filter((l2) => l2.parent === "Zoom Docs")
        .map((l2) => {
          const l2Node: TaxonomyNode = {
            id: generateId(l2.name),
            name: l2.name,
            count: Math.floor(Math.random() * 4500) + 500,
            description: l2.description,
            themes: l2.themes?.map((t, i) => convertTheme(t, i)) || [],
            children: zoomData.l3_aspects
              .filter((l3) => l3.parent === l2.name)
              .map((l3) => ({
                id: generateId(l3.name),
                name: l3.name,
                count: Math.floor(Math.random() * 1900) + 100,
                description: l3.description,
                themes: l3.themes?.map((t, i) => convertTheme(t, i)) || [],
                themeCount: l3.themes?.length || 0,
              })),
          }
          l2Node.themeCount = l2Node.themes?.length || 0
          return l2Node
        }),
    },
    // Scheduler
    {
      id: "scheduler",
      name: "Zoom Scheduler",
      count: 5100,
      description:
        "A scheduling tool that allows users to share their availability and let others book time with them.",
      themes: zoomData.aspects.find((a) => a.name === "Zoom Scheduler")!.themes!.map((t, i) => convertTheme(t, i)),
      themeCount: zoomData.aspects.find((a) => a.name === "Zoom Scheduler")!.themes!.length,
      children: zoomData.l2_aspects
        .filter((l2) => l2.parent === "Zoom Scheduler")
        .map((l2) => {
          const l2Node: TaxonomyNode = {
            id: generateId(l2.name),
            name: l2.name,
            count: Math.floor(Math.random() * 4500) + 500,
            description: l2.description,
            themes: l2.themes?.map((t, i) => convertTheme(t, i)) || [],
            children: zoomData.l3_aspects
              .filter((l3) => l3.parent === l2.name)
              .map((l3) => ({
                id: generateId(l3.name),
                name: l3.name,
                count: Math.floor(Math.random() * 1900) + 100,
                description: l3.description,
                themes: l3.themes?.map((t, i) => convertTheme(t, i)) || [],
                themeCount: l3.themes?.length || 0,
              })),
          }
          l2Node.themeCount = l2Node.themes?.length || 0
          return l2Node
        }),
    },
    // Platform & Integrations
    {
      id: "platform-integrations",
      name: "Platform & Integrations",
      count: 8900,
      description: "The ecosystem of third-party apps, APIs, and integrations that extend Zoom's functionality.",
      themes: zoomData.aspects
        .find((a) => a.name === "Platform & Integrations")!
        .themes!.map((t, i) => convertTheme(t, i)),
      themeCount: zoomData.aspects.find((a) => a.name === "Platform & Integrations")!.themes!.length,
      children: zoomData.l2_aspects
        .filter((l2) => l2.parent === "Platform & Integrations")
        .map((l2) => {
          const l2Node: TaxonomyNode = {
            id: generateId(l2.name),
            name: l2.name,
            count: Math.floor(Math.random() * 4500) + 500,
            description: l2.description,
            themes: l2.themes?.map((t, i) => convertTheme(t, i)) || [],
            children: zoomData.l3_aspects
              .filter((l3) => l3.parent === l2.name)
              .map((l3) => ({
                id: generateId(l3.name),
                name: l3.name,
                count: Math.floor(Math.random() * 1900) + 100,
                description: l3.description,
                themes: l3.themes?.map((t, i) => convertTheme(t, i)) || [],
                themeCount: l3.themes?.length || 0,
              })),
          }
          l2Node.themeCount = l2Node.themes?.length || 0
          return l2Node
        }),
    },
    {
      id: "miscellaneous",
      name: "Miscellaneous",
      count: 432,
      description:
        "Miscellaneous keywords collect feedback that doesn't fit your existing Keywords and isn't frequent enough to warrant its own category. This keeps your taxonomy focused and manageable. Creating new Keywords gives you more granular categorization, but also means more Keywords to maintain. We recommend creating keywords only when patterns are clear and recurring.",
      themes: [
        {
          id: "misc-complaint-1",
          name: "Miscellaneous Complaint About Enterpret Inc",
          category: "complaint" as ThemeCategory,
          count: 213,
          children: [
            { id: "misc-complaint-1-1", name: "Unspecified Issues", category: "complaint" as ThemeCategory, count: 89 },
          ],
        },
        {
          id: "misc-praise-1",
          name: "Miscellaneous Praise For Enterpret",
          category: "praise" as ThemeCategory,
          count: 66,
          children: [
            {
              id: "misc-praise-1-1",
              name: "General Positive Feedback",
              category: "praise" as ThemeCategory,
              count: 42,
            },
          ],
        },
        {
          id: "misc-improvement-1",
          name: "Miscellaneous Improvement In Enterpret Inc",
          category: "improvement" as ThemeCategory,
          count: 18,
          children: [
            {
              id: "misc-improvement-1-1",
              name: "General Suggestions",
              category: "improvement" as ThemeCategory,
              count: 12,
            },
          ],
        },
        {
          id: "misc-question-1",
          name: "Miscellaneous Help With Enterpret Inc",
          category: "question" as ThemeCategory,
          count: 41,
          children: [
            { id: "misc-question-1-1", name: "General Inquiries", category: "question" as ThemeCategory, count: 25 },
          ],
        },
      ],
      themeCount: 8,
      children: [
        {
          id: "miscellaneous-l2",
          name: "Miscellaneous",
          count: 432,
          description: "Shared across 24 paths",
          themes: [],
          themeCount: 0,
          children: [
            {
              id: "miscellaneous-l3",
              name: "Miscellaneous",
              count: 432,
              description: "Catch-all for unspecified feedback",
              themes: [],
              themeCount: 0,
            },
          ],
        },
      ],
    },
    {
      id: "generic",
      name: "Generic",
      count: 274,
      description:
        'Generic keywords capture feedback that mentions a concept without actionable detail. For example: "I love Acme" references your product but provides no specific insight. These tags help you identify feedback that needs follow-up or clarification.',
      themes: [
        {
          id: "generic-complaint-1",
          name: "Generic Complaint About Enterpret",
          category: "complaint" as ThemeCategory,
          count: 89,
          children: [
            {
              id: "generic-complaint-1-1",
              name: "Vague Dissatisfaction",
              category: "complaint" as ThemeCategory,
              count: 89,
            },
          ],
        },
        {
          id: "generic-praise-1",
          name: "Generic Praise For Enterpret",
          category: "praise" as ThemeCategory,
          count: 61,
          children: [
            { id: "generic-praise-1-1", name: "Positive Mentions", category: "praise" as ThemeCategory, count: 61 },
          ],
        },
        {
          id: "generic-improvement-1",
          name: "Generic Improvement Request",
          category: "improvement" as ThemeCategory,
          count: 92,
          children: [
            {
              id: "generic-improvement-1-1",
              name: "Unspecified Improvements",
              category: "improvement" as ThemeCategory,
              count: 92,
            },
          ],
        },
        {
          id: "generic-question-1",
          name: "Generic Help Request",
          category: "question" as ThemeCategory,
          count: 32,
          children: [
            { id: "generic-question-1-1", name: "Basic Questions", category: "question" as ThemeCategory, count: 32 },
          ],
        },
      ],
      themeCount: 8,
      children: [
        {
          id: "generic-l2",
          name: "Generic",
          count: 274,
          description: "Catch-all for generic feedback",
          themes: [],
          themeCount: 0,
          children: [
            {
              id: "generic-l3",
              name: "Generic",
              count: 274,
              description: "Catch-all for generic feedback",
              themes: [],
              themeCount: 0,
            },
          ],
        },
      ],
    },
  ],
}

// Helper function to get theme distribution for color bar
export function getThemeDistribution(themes: Theme[]): { category: ThemeCategory; percentage: number }[] {
  if (!themes || themes.length === 0) return []

  const categoryCounts: Record<ThemeCategory, number> = {
    complaint: 0,
    improvement: 0,
    praise: 0,
    question: 0,
    generic: 0,
  }

  let total = 0
  themes.forEach((theme) => {
    categoryCounts[theme.category] += theme.count
    total += theme.count
  })

  if (total === 0) return []

  return Object.entries(categoryCounts)
    .filter(([_, count]) => count > 0)
    .map(([category, count]) => ({
      category: category as ThemeCategory,
      percentage: (count / total) * 100,
    }))
    .sort((a, b) => b.percentage - a.percentage)
}
