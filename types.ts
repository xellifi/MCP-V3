export enum UserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  affiliateCode?: string; // Unique code for referrals
  features?: string[];
  isEmailVerified?: boolean; // Email verification status
  authProvider?: 'email' | 'facebook' | 'google'; // Login method
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  google_webhook_url?: string;
}

export interface MetaConnection {
  id: string;
  workspaceId: string;
  platform: 'FACEBOOK' | 'INSTAGRAM';
  name: string;
  externalId: string; // Page ID or IG Business ID
  status: 'CONNECTED' | 'DISCONNECTED' | 'EXPIRED';
  imageUrl?: string;
}

export interface ConnectedPage {
  id: string;
  workspaceId: string;
  name: string;
  pageId: string;
  pageImageUrl: string;
  pageFollowers: number;

  instagram?: {
    id: string;
    username: string;
    imageUrl: string;
    followers: number;
  };

  isAutomationEnabled: boolean;
  status: 'CONNECTED' | 'DISCONNECTED';
}

export interface Subscriber {
  id: string;
  workspaceId: string;
  pageId?: string;  // Facebook page ID they came from
  name: string;
  email?: string;   // Email from Facebook (if granted permission)
  platform: 'FACEBOOK' | 'INSTAGRAM';
  externalId: string;
  avatarUrl?: string;
  status: 'SUBSCRIBED' | 'UNSUBSCRIBED';
  tags: string[];  // User tags
  labels: string[]; // Bot labels (e.g., "Commenter", "Messaged", "Purchased")
  lastActiveAt: string;
  source?: 'COMMENT' | 'MESSAGE' | 'POSTBACK'; // How they became a subscriber
}

export interface Conversation {
  id: string;
  workspaceId: string;
  subscriberId: string;
  platform: 'FACEBOOK' | 'INSTAGRAM';
  lastMessagePreview: string;
  unreadCount: number;
  updatedAt: string;
  externalId?: string; // Facebook PSID (Page-Scoped ID)
  pageId?: string; // Facebook Page ID
}

export interface Message {
  id: string;
  conversationId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  content: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE';
  attachmentUrl?: string;
  fileName?: string;
  createdAt: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  externalId?: string; // Facebook message ID
  senderId?: string; // Facebook sender PSID
}

export type ReactionType = 'LOVE' | 'HAHA' | 'WOW' | 'SAD' | 'ANGRY' | 'LIKE';

export interface Reaction {
  id: string;
  messageId: string;
  userId: string;
  reaction: ReactionType;
  createdAt: string;
}


export interface Flow {
  id: string;
  workspaceId: string;
  name: string;
  status: 'ACTIVE' | 'DRAFT';
  updatedAt: string;
  nodes: any[]; // simplified for demo
  edges: any[];
  configurations?: { [nodeId: string]: any }; // Node configurations
}

export interface ScheduledPost {
  id: string;
  workspaceId: string;
  content: string;
  platform: 'FACEBOOK' | 'INSTAGRAM';
  scheduledAt: string;
  status: 'PENDING' | 'PUBLISHED' | 'FAILED';
  imageUrl?: string;
}

export enum FlowNodeType {
  TRIGGER = 'trigger',
  ACTION = 'action',
  CONDITION = 'condition',
  AI_AGENT = 'ai_agent'
}

export interface AdminSettings {
  id?: number;
  facebookAppId: string;
  facebookAppSecret: string;
  facebookVerifyToken: string;
  // System-level AI Keys
  openaiApiKey?: string;
  geminiApiKey?: string;
  // SMTP Settings
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFromEmail?: string;
  smtpSecure?: boolean;
  // Menu Settings
  menuSequence?: string[];
  // Affiliate Settings
  affiliateEnabled?: boolean;
  affiliateCommission?: number; // Amount per referral
  affiliateCurrency?: string; // e.g. 'USD'
  affiliateMinWithdrawal?: number;
  affiliateWithdrawalDays?: number[]; // 0=Sun, 1=Mon...
  paymentConfig?: any; // JSONB for payment gateways
  defaultTheme?: 'dark' | 'light';
  // Email Verification Settings
  emailVerificationProvider?: 'supabase' | 'smtp'; // Which provider to use
  // Social Login Settings
  googleClientId?: string;
  googleClientSecret?: string;
  facebookLoginEnabled?: boolean;
  googleLoginEnabled?: boolean;
  // Support Settings
  supportAttachmentsEnabled?: boolean; // Allow file attachments in support tickets
  // Email Domain Whitelist Settings
  emailDomainRestrictionEnabled?: boolean; // Enable/disable domain restriction
  allowedEmailDomains?: string[]; // e.g. ['gmail.com', 'yahoo.com', 'outlook.com']
}

export interface UserSubscription {
  id: string;
  user_id: string;
  package_id: string;
  status: 'Active' | 'Pending' | 'Past Due' | 'Cancelled';
  billing_cycle: 'Monthly' | 'Yearly' | 'Lifetime' | 'Custom';
  amount: number;
  next_billing_date: string | null;
  created_at: string;
  proof_url?: string;

  // Joined fields
  profiles?: {
    name: string;
    email: string;
    avatar_url: string;
  };
  packages?: {
    name: string;
    color: string;
  };
}

export interface IntegrationSettings {
  workspaceId: string;
  openaiApiKey: string;
  geminiApiKey: string;
  // Workspace-level SMTP
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPassword?: string;
  smtpFromEmail?: string;
  // Google Sheets Integration
  googleWebhookUrl?: string;
}

export interface PayoutSettings {
  userId: string;
  method: 'PAYPAL' | 'BANK_TRANSFER';
  paypalEmail?: string;
  bankName?: string;
  accountNumber?: string;
  routingNumber?: string;
  accountName?: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredUserId: string;
  referredUserName: string;
  referredUserEmail: string;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'CANCELLED';
  commission: number;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  status: 'PENDING' | 'PAID' | 'REJECTED';
  requestedAt: string;
  processedAt?: string;
  method: string; // e.g., "PAYPAL - user@example.com"
  invoiceUrl?: string;
}

export interface AffiliateStats {
  clicks: number;
  referrals: number;
  totalEarnings: number; // Life-time earnings (Paid + Unpaid)
  unpaidEarnings: number; // Available to withdraw
  pendingEarnings: number; // Pending validation
}

export interface SupportTicket {
  id: string;
  workspaceId: string;
  userId: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  lastUpdateAt: string;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string; // userId or 'support'
  senderName: string;
  content: string;
  createdAt: string;
  isAdmin: boolean;
  attachments?: { name: string; url: string; type: string }[]; // File attachments
}

// Form Node Types
export interface FormField {
  id: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'textarea' | 'select' | 'radio' | 'checkbox';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select/radio/checkbox
}

export interface FormConfig {
  id: string;
  workspaceId: string;
  flowId?: string;
  nodeId?: string;
  name: string;
  headerImageUrl?: string;
  submitButtonText: string;
  submitButtonColor: string;
  borderRadius: 'rounded' | 'round' | 'full';
  successMessage: string;
  googleSheetId?: string;
  googleSheetName?: string;
  promoText?: string;
  promoIcon?: string;
  fields: FormField[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  subscriberExternalId?: string;
  subscriberName?: string;
  data: Record<string, any>;
  syncedToSheets: boolean;
  createdAt: string;
}

export interface Package {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  priceLifetime?: number; // Lifetime one-time payment price
  priceCustom?: number; // Custom duration price (e.g., $5 for X days)
  durationDays?: number; // Number of days for custom packages (1-365)
  currency: string;
  features: string[];
  limits: Record<string, number | string>;
  color: string;
  isActive: boolean;
  isVisible?: boolean; // Show on pricing page (default true)
  displayOrder?: number; // Controls sequence on pricing page (lower = first)
  allowedRoutes?: string[]; // List of allowed paths e.g. ['/', '/dashboard', '/settings']
}

// ============================================
// SCHEDULER WORKFLOW TYPES
// ============================================

export interface SchedulerWorkflow {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused';
  nodes: any[];
  edges: any[];
  configurations: Record<string, any>;
  scheduleType: 'daily' | 'weekly' | 'monthly' | 'custom';
  scheduleTime: string; // "09:00"
  scheduleDays: number[]; // days of week or day of month
  scheduleTimezone: string;
  cronExpression?: string;
  nextRunAt?: string;
  lastRunAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchedulerExecution {
  id: string;
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  result?: any;
  error?: string;
  generatedTopic?: string;
  generatedImageUrl?: string;
  generatedCaption?: string;
  facebookPostId?: string;
}

// Node configuration types for scheduler
export interface ScheduleTriggerConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  time: string; // "09:00" - primary time (backward compatible)
  times?: string[]; // Multiple times for daily frequency ["09:00", "12:00", "18:00"]
  daysOfWeek?: number[]; // [1,2,3,4,5] for Mon-Fri (0=Sunday)
  dayOfMonth?: number; // 1-31
  customCron?: string;
  timezone: string;
}

export interface TopicGeneratorConfig {
  aiProvider: 'openai' | 'gemini';
  seedTopics: string[]; // Base topics to inspire generation
  tone: 'professional' | 'casual' | 'humorous' | 'inspirational';
  niche?: string; // e.g., "fitness", "tech", "food"
  avoidDuplicates: boolean;
}

export interface ImageGeneratorConfig {
  aiProvider: 'openai' | 'gemini';
  mediaType: 'image';
  size: '1080x1080' | '1200x628' | '1080x1920' | 'custom';
  customWidth?: number;
  customHeight?: number;
  style?: 'photorealistic' | 'illustration' | '3d' | 'cartoon' | 'minimal';
}

export interface CaptionGeneratorConfig {
  aiProvider: 'openai' | 'gemini';
  tone: 'professional' | 'casual' | 'humorous' | 'inspirational';
  includeHashtags: boolean;
  hashtagCount?: number;
  includeEmojis: boolean;
  includeCTA: boolean;
  ctaText?: string;
  maxLength?: number;
}

export interface FacebookPostConfig {
  pageId: string;
  pageName?: string;
  publishImmediately: boolean;
}