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
}

export interface Workspace {
  id: string;
  name: string;
  ownerId: string;
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
  name: string;
  platform: 'FACEBOOK' | 'INSTAGRAM';
  externalId: string;
  avatarUrl?: string;
  status: 'SUBSCRIBED' | 'UNSUBSCRIBED';
  tags: string[];
  lastActiveAt: string;
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

export interface Flow {
  id: string;
  workspaceId: string;
  name: string;
  status: 'ACTIVE' | 'DRAFT';
  updatedAt: string;
  nodes: any[]; // simplified for demo
  edges: any[];
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
}