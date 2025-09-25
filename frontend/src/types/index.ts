export interface User {
  id: string;
  email: string;
  name: string;
  role: 'job_seeker' | 'consultant' | 'community_manager' | 'sales_rep';
  createdAt: Date;
  preferences: {
    commonalityOrder: ('employer' | 'education' | 'mutual' | 'event')[];
    draftTone: 'professional' | 'friendly' | 'concise';
    reminderFrequency: number; // days
  };
}

export interface Contact {
  id: string;
  name: string;
  title: string;
  company: string;
  email?: string;
  linkedinUrl?: string;
  degree: 1 | 2; // connection degree - removed 3rd degree
  relationshipStrength: 'strong' | 'medium' | 'weak';
  commonalities: Commonality[];
  notes: string;
  tags: string[];
  addedAt: Date;
  lastInteraction?: Date;
}

export interface Commonality {
  id: string;
  type: 'employer' | 'education' | 'mutual' | 'event' | 'project';
  description: string;
  evidence: string;
  confidence: number; // 0-1
  timeframe?: string;
}

export interface Bridge {
  id: string;
  bridgeContactId: string; // 1st degree contact
  targetContactId: string; // 2nd degree target
  strength: number; // 0-1
  commonality: Commonality;
  reasoning: string;
}

export interface Conversation {
  id: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  topic?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    contacts?: string[]; // contact IDs mentioned
    bridges?: string[]; // bridge IDs suggested
    drafts?: string[]; // draft IDs generated
    images?: Array<{
      dataUrl: string;
      dimensions: { width: number; height: number };
      wasResized: boolean;
      originalDimensions?: { width: number; height: number };
    }>; // attached images
    hasImageAnalysis?: boolean; // indicates AI analyzed images
  };
}

export interface Draft {
  id: string;
  targetContactId: string;
  bridgeContactId?: string; // for intro requests
  type: 'linkedin_message' | 'linkedin_inmail' | 'gmail_intro' | 'follow_up';
  subject?: string;
  content: string;
  commonalityUsed: Commonality;
  tone: 'professional' | 'friendly' | 'concise';
  status: 'draft' | 'sent' | 'archived';
  createdAt: Date;
  sentAt?: Date;
}

export interface Email {
  id: string;
  draftId: string;
  recipientEmail: string;
  subject: string;
  content: string;
  sentAt: Date;
  deliveryStatus: 'sent' | 'delivered' | 'failed';
}

export interface Meeting {
  id: string;
  title: string;
  attendees: string[]; // contact IDs
  startTime: Date;
  duration: number; // minutes
  meetLink?: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: Date;
}

export interface Task {
  id: string;
  contactId: string;
  type: 'follow_up' | 'reminder' | 'meeting_prep';
  title: string;
  description: string;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'snoozed';
  createdAt: Date;
  completedAt?: Date;
}

export interface Recommendation {
  id: string;
  contactId: string;
  type: 'connect' | 'follow_up' | 'meeting';
  reasoning: string;
  confidence: number;
  commonality: Commonality;
  suggestedAction: string;
  createdAt: Date;
}

export interface Activity {
  id: string;
  type: 'connection_made' | 'message_sent' | 'message_received' | 'meeting_scheduled' | 'meeting_completed' | 'task_completed' | 'draft_created' | 'linkedin_connected' | 'gmail_connected' | 'calendar_connected';
  title: string;
  description: string;
  contactId?: string;
  contactName?: string;
  metadata?: {
    platform?: 'linkedin' | 'gmail' | 'calendar';
    messageType?: 'intro_request' | 'follow_up' | 'direct_message';
    meetingDuration?: number;
    draftType?: string;
  };
  timestamp: Date;
}

// Enhanced Gmail API Response Types
export interface EnhancedGmailResponse {
  emails_by_company: { [company: string]: GmailEmail[] };
  tool_originated_emails: GmailEmail[];
  metrics: {
    total_emails: number;
    company_matched_emails: number;
    tool_originated_emails: number;
    companies_with_emails: string[];
  };
  success: boolean;
  message?: string;
}

// Enhanced Gmail Email with tool-originated tracking
export interface GmailEmail {
  id: string;
  subject: string;
  sender: string;
  recipient: string;
  date: string;
  snippet: string;
  is_read: boolean;
  is_important: boolean;
  has_attachments: boolean;
  body_text?: string;
  body_html?: string;
  // Enhanced fields for tool-originated tracking
  is_tool_originated?: boolean;
  tool_metadata?: {
    initiated_by_tool: boolean;
    tool_session_id?: string;
    original_request?: string;
    created_at?: string;
  };
  // Company matching information
  matched_company?: string;
  domain_matched?: string;
}

// Target Company Management Types
export interface TargetCompany {
  name: string;
  domains: string[];
  is_active: boolean;
  added_at: Date;
  notes?: string;
}

export interface TargetCompanyStats {
  company: string;
  total_emails: number;
  tool_originated_emails: number;
  company_matched_emails: number;
  last_email_date?: string;
  response_rate?: number;
}

// Enhanced Message Filtering Types
export interface MessageFilter {
  status?: 'all' | 'draft' | 'sent' | 'archived';
  company?: string;
  message_type?: 'all' | 'tool_originated' | 'company_matched';
  date_range?: {
    start: Date;
    end: Date;
  };
  search_query?: string;
}

// Tool-Originated Message Badge Types
export interface ToolOriginatedBadge {
  type: 'tool_initiated' | 'ai_generated' | 'automated';
  label: string;
  color: 'blue' | 'green' | 'purple' | 'orange';
  icon?: string;
  tooltip?: string;
}