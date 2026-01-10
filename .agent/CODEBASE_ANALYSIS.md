# MyChatPilot - Codebase Analysis & Architecture

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [Database Schema](#database-schema)
5. [API Structure](#api-structure)
6. [Frontend Structure](#frontend-structure)
7. [Flow Execution System](#flow-execution-system)
8. [Key Features](#key-features)
9. [Common Bug Patterns](#common-bug-patterns)
10. [Debugging Guide](#debugging-guide)

---

## 🎯 Project Overview

**MyChatPilot** is a Facebook/Instagram automation platform that enables users to:
- Build visual automation flows for social media engagement
- Auto-reply to comments and messages
- Create forms, invoices, and e-commerce experiences
- Manage subscribers and conversations
- Schedule posts and track analytics

---

## 🛠 Technology Stack

### Frontend
- **Framework**: React 19.2.3 with TypeScript
- **Build Tool**: Vite 5.0.8
- **Routing**: React Router DOM 7.10.1
- **Styling**: Tailwind CSS 3.4.0
- **Flow Builder**: ReactFlow 11.11.4
- **Charts**: Recharts 3.6.0
- **Drag & Drop**: @dnd-kit

### Backend
- **Runtime**: Vercel Serverless Functions
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **External APIs**: 
  - Facebook Graph API
  - OpenAI API
  - Google Gemini API

### Deployment
- **Platform**: Vercel
- **Database**: Supabase Cloud

---

## 🏗 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (React SPA)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Pages      │  │  Components  │  │   Services   │      │
│  │  (Routes)    │  │  (UI/Forms)  │  │   (api.ts)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE (Database + Auth)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  PostgreSQL  │  │  Auth Users  │  │  Row Level   │      │
│  │   Database   │  │   (JWT)      │  │   Security   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│           VERCEL SERVERLESS FUNCTIONS (API)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  /webhooks   │  │   /forms     │  │   /flows     │      │
│  │   /meta      │  │   /submit    │  │  /analytics  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              FACEBOOK GRAPH API                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Messenger   │  │   Comments   │  │    Pages     │      │
│  │  Send API    │  │   Webhooks   │  │   API        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄 Database Schema

### Core Tables

#### 1. **profiles** (Users)
```sql
- id: UUID (PK, references auth.users)
- email: TEXT
- name: TEXT
- role: TEXT (admin/member)
- avatar_url: TEXT
- affiliate_code: TEXT (unique)
- created_at, updated_at: TIMESTAMPTZ
```

#### 2. **workspaces**
```sql
- id: UUID (PK)
- name: TEXT
- owner_id: UUID (FK -> profiles)
- created_at, updated_at: TIMESTAMPTZ
```

#### 3. **connected_pages** (Facebook Pages)
```sql
- id: UUID (PK)
- workspace_id: UUID (FK)
- name: TEXT
- page_id: TEXT (Facebook Page ID)
- page_access_token: TEXT
- page_image_url: TEXT
- page_followers: INTEGER
- instagram_id, instagram_username: TEXT
- is_automation_enabled: BOOLEAN
- status: TEXT (CONNECTED/DISCONNECTED)
```

#### 4. **subscribers** (Bot Users)
```sql
- id: UUID (PK)
- workspace_id: UUID (FK)
- name: TEXT
- platform: TEXT (FACEBOOK/INSTAGRAM)
- external_id: TEXT (PSID - Page Scoped ID)
- avatar_url: TEXT
- status: TEXT (SUBSCRIBED/UNSUBSCRIBED)
- tags: TEXT[]
- last_active_at: TIMESTAMPTZ
```

#### 5. **flows** (Automation Flows)
```sql
- id: UUID (PK)
- workspace_id: UUID (FK)
- name: TEXT
- status: TEXT (ACTIVE/DRAFT)
- nodes: JSONB (ReactFlow nodes)
- edges: JSONB (ReactFlow edges)
- configurations: JSONB (node configs by nodeId)
- updated_at, created_at: TIMESTAMPTZ
```

#### 6. **node_analytics**
```sql
- id: UUID (PK)
- flow_id: UUID (FK)
- node_id: TEXT
- sent_count: INTEGER
- delivered_count: INTEGER
- subscriber_count: INTEGER
- error_count: INTEGER
- UNIQUE(flow_id, node_id)
```

#### 7. **conversations** (Messenger Threads)
```sql
- id: UUID (PK)
- workspace_id: UUID (FK)
- subscriber_id: UUID (FK)
- platform: TEXT
- external_id: TEXT (Facebook conversation ID)
- page_id: TEXT
- last_message_preview: TEXT
- unread_count: INTEGER
```

#### 8. **messages**
```sql
- id: UUID (PK)
- conversation_id: UUID (FK)
- direction: TEXT (INBOUND/OUTBOUND)
- content: TEXT
- type: TEXT (TEXT/IMAGE/VIDEO/FILE)
- attachment_url: TEXT
- external_id: TEXT (Facebook message ID)
- sender_id: TEXT (PSID)
- status: TEXT (SENT/DELIVERED/READ/FAILED)
```

---

## 🔌 API Structure

### Location: `/api/`

#### **Webhooks** (`/api/webhooks/meta.ts`)
**Purpose**: Main Facebook webhook handler (4,681 lines)

**Key Functions**:
- `handler()` - Main entry point for Facebook webhooks
- `handleVerification()` - Webhook verification
- `handleWebhookEvent()` - Route events to processors
- `processComment()` - Handle comment events
- `processTextMessage()` - Handle incoming messages
- `processPostback()` - Handle button clicks (1,430 lines!)
- `processCustomerInformation()` - Handle native checkout forms
- `executeAutomation()` - Trigger flow execution
- `executeFlowFromNode()` - Execute flow starting from any node
- `executeAction()` - Execute individual node actions (2,011 lines!)

**Supported Node Types in executeAction()**:
- `commentReplyNode` - Reply to comments
- `sendMessageNode` - Send DMs
- `textNode` - Send text messages
- `imageNode` - Send images
- `videoNode` - Send videos
- `buttonNode` - Send button templates
- `buttonsOnlyNode` - Quick reply buttons
- `formNode` - Webview forms
- `productNode` - Product cards
- `upsellNode` - Upsell offers
- `downsellNode` - Downsell offers
- `checkoutNode` - Checkout flow
- `invoiceNode` - Invoice generation
- `conditionNode` - Conditional branching
- `aiNode` - AI-powered responses
- `delayNode` - Time delays
- `labelNode` - Add/remove labels
- `sheetsNode` - Google Sheets sync

#### **Forms** (`/api/forms/`)
- `submit.ts` - Form submission handler
- `continue-flow.ts` - Continue flow after form submission (1,185 lines)
- `view.ts` - Public form view
- `[id].ts` - Form CRUD operations

**Key Functions in continue-flow.ts**:
- `handler()` - Main flow continuation logic
- `evaluateConditions()` - Condition node evaluation
- `sendTextMessage()` - Send text with buttons
- `sendUpsellOffer()` - Send upsell webview
- `sendDownsellOffer()` - Send downsell webview
- `sendCheckoutOffer()` - Send checkout confirmation

#### **Flows** (`/api/flows/`)
- `node-analytics.ts` - Fetch node analytics

#### **Other APIs**
- `/api/webview.ts` - Webview session management (18,553 bytes)
- `/api/invoices/view.ts` - Invoice viewing
- `/api/sheets/sync.ts` - Google Sheets sync
- `/api/track/view.ts` - Order tracking
- `/api/video-thumbnail.ts` - Video thumbnail generation
- `/api/cron/form-followup.ts` - Scheduled form followups

---

## 🎨 Frontend Structure

### Location: `/pages/` (39 files)

#### **Core Pages**
- `Home.tsx` - Landing page
- `Login.tsx` / `Register.tsx` - Authentication
- `Dashboard.tsx` - Main dashboard
- `FlowBuilder.tsx` - Visual flow editor (109,980 bytes!)

#### **Management Pages**
- `Flows.tsx` - Flow list (30,221 bytes)
- `Forms.tsx` - Form manager (114,115 bytes)
- `Store.tsx` - Product store (71,735 bytes)
- `Subscribers.tsx` - Subscriber management (43,064 bytes)
- `Inbox.tsx` - Messenger inbox (37,975 bytes)
- `Connections.tsx` - Facebook connections (24,070 bytes)
- `ConnectedPages.tsx` - Page management (22,013 bytes)

#### **Webview Pages** (For Messenger)
- `WebviewProduct.tsx` - Product view in Messenger
- `WebviewUpsell.tsx` - Upsell in Messenger
- `WebviewDownsell.tsx` - Downsell in Messenger
- `WebviewCart.tsx` - Cart in Messenger
- `WebviewForm.tsx` - Form in Messenger
- `WebviewCheckout.tsx` - Checkout in Messenger

#### **Preview Pages**
- `UpsellPreview.tsx` - Live upsell preview
- `DownsellPreview.tsx` - Live downsell preview
- `ProductPreview.tsx` - Live product preview

#### **Public Pages**
- `FormView.tsx` - Public form view (50,935 bytes)
- `InvoiceView.tsx` - Public invoice view
- `StoreView.tsx` - Public store view (59,369 bytes)
- `OrderTracking.tsx` - Public order tracking

### Location: `/components/` (36 form components + 3 subdirectories)

#### **Node Configuration Forms**
- `StartNodeForm.tsx` - Start node config
- `TextNodeForm.tsx` - Text message config (36,739 bytes)
- `SendMessageNodeForm.tsx` - Send message config (39,601 bytes)
- `FormNodeForm.tsx` - Form builder (86,122 bytes)
- `UpsellNodeForm.tsx` - Upsell config (86,215 bytes)
- `DownsellNodeForm.tsx` - Downsell config (86,254 bytes)
- `ProductNodeForm.tsx` - Product config (60,823 bytes)
- `CheckoutNodeForm.tsx` - Checkout config (39,063 bytes)
- `InvoiceNodeForm.tsx` - Invoice config (34,441 bytes)
- `CartInvoiceNodeForm.tsx` - Cart invoice (26,272 bytes)
- `ConditionNodeForm.tsx` - Condition logic (15,692 bytes)
- `CommentReplyNodeForm.tsx` - Comment reply (16,908 bytes)
- `ButtonNodeForm.tsx` - Button template
- `ButtonsOnlyNodeForm.tsx` - Quick replies
- `ImageNodeForm.tsx` - Image message
- `VideoNodeForm.tsx` - Video message
- `GoogleSheetNodeForm.tsx` - Google Sheets integration
- `CartSheetNodeForm.tsx` - Cart to Sheets
- `CheckoutFormNodeForm.tsx` - Checkout form
- `FollowupNodeForm.tsx` - Followup messages (28,749 bytes)
- `TriggerNodeForm.tsx` - Trigger config

#### **Subdirectories**
- `/components/nodes/` - Custom ReactFlow nodes (21 files)
- `/components/visual_nodes/` - Visual scheduler nodes (8 files)
- `/components/edges/` - Custom edges (1 file)

#### **Utility Components**
- `Layout.tsx` - Main app layout (21,102 bytes)
- `FacebookPageDropdown.tsx` - Page selector
- `NodeConfigModal.tsx` - Node configuration modal
- `DeleteConfirmModal.tsx` - Confirmation dialogs
- `PaymentModal.tsx` - Payment processing
- `SalesSummaryModal.tsx` - Sales analytics
- `ClickableVariables.tsx` - Variable insertion
- `CollapsibleTips.tsx` - Help tips
- `ReactionPicker.tsx` / `ReactionDisplay.tsx` - Reactions

### Location: `/services/api.ts` (1,817 lines)

**Main API Service** - Centralized API client

**Modules**:
- `api.auth` - Authentication (login, register, logout, getSession)
- `api.user` - User settings (payout settings)
- `api.workspace` - Workspace management
  - Connections (Facebook/Instagram)
  - Connected pages
  - Subscribers
  - Forms (CRUD)
  - Conversations & messages
  - Flows (CRUD)
  - Scheduled posts
  - Analytics
- `api.admin` - Admin settings
- `api.affiliates` - Affiliate program
- `api.support` - Support tickets

---

## ⚙️ Flow Execution System

### Flow Execution Lifecycle

```
1. TRIGGER EVENT
   ├─ Comment on post → processComment()
   ├─ Direct message → processTextMessage()
   └─ Button click → processPostback()
          │
          ▼
2. FIND ACTIVE FLOWS
   └─ Query flows table WHERE status='ACTIVE'
          │
          ▼
3. MATCH TRIGGER NODE
   ├─ Check node type (startNode/triggerNode)
   ├─ Match keyword/condition
   └─ Verify page_id matches
          │
          ▼
4. EXECUTE FLOW
   └─ executeFlowFromNode()
      ├─ Build context (user data, variables)
      ├─ Follow edges to next nodes
      └─ Execute each node sequentially
          │
          ▼
5. EXECUTE NODE ACTIONS
   └─ executeAction()
      ├─ Replace variables in templates
      ├─ Send Facebook API requests
      ├─ Update analytics
      ├─ Save subscriber data
      └─ Continue to next node
          │
          ▼
6. HANDLE RESPONSES
   ├─ Form submission → continue-flow.ts
   ├─ Button postback → processPostback()
   └─ Condition evaluation → branch to next node
```

### Context Object Structure

```typescript
{
  userId: string,              // Facebook PSID
  userName: string,            // User's name
  commentId: string,           // Original comment ID
  commentText: string,         // Comment content
  postId: string,              // Facebook post ID
  pageId: string,              // Facebook page ID
  workspaceId: string,         // Workspace UUID
  flowId: string,              // Flow UUID
  
  // Form data (if from form submission)
  formData: {
    [fieldName: string]: any
  },
  
  // Cart data (for e-commerce)
  cart: Array<{
    productId: string,
    name: string,
    price: number,
    quantity: number,
    image: string
  }>,
  
  // Subscriber metadata
  subscriberMetadata: {
    email?: string,
    phone?: string,
    address?: any,
    // ... custom fields
  }
}
```

### Variable Replacement System

**Available Variables**:
- `{{name}}` - User's name
- `{{email}}` - User's email
- `{{phone}}` - User's phone
- `{{address}}` - User's address
- `{{field_name}}` - Any form field value
- `{{product_name}}` - Product name
- `{{total_price}}` - Cart total

**Implementation**: `replaceVars()` function in `executeAction()`

---

## 🎯 Key Features

### 1. **Visual Flow Builder**
- Drag-and-drop interface (ReactFlow)
- 20+ node types
- Real-time preview
- Node analytics overlay
- Template system

### 2. **Facebook/Instagram Integration**
- OAuth connection flow
- Page management
- Webhook handling
- Messenger Send API
- Comment automation

### 3. **Form Builder**
- Custom field types (text, email, phone, select, etc.)
- Webview rendering in Messenger
- Google Sheets integration
- Template system with page logos

### 4. **E-commerce**
- Product catalog
- Shopping cart
- Upsell/Downsell funnels
- Native checkout forms
- Invoice generation
- Order tracking

### 5. **Analytics**
- Node-level metrics (sent, delivered, errors)
- Subscriber tracking
- Conversion tracking
- Sales summaries

### 6. **AI Integration**
- OpenAI GPT support
- Google Gemini support
- Context-aware responses
- Custom prompts

---

## 🐛 Common Bug Patterns

### 1. **Stale Analytics Display**
**Issue**: Node analytics persist in UI after clearing database
**Root Cause**: `flow.nodes` contains cached analytics that override fresh data
**Location**: `FlowBuilder.tsx` flow loading logic
**Fix**: Always merge fresh `node_analytics` data over `flow.nodes` data

### 2. **Form Duplication**
**Issue**: Updating forms creates duplicates instead of updating
**Root Cause**: Race condition in `FormNodeForm.tsx` onChange callback
**Location**: `FormNodeForm.tsx` save flow
**Fix**: Ensure `formId` is preserved through state updates

### 3. **Webview Not Delivering**
**Issue**: Upsell/Downsell nodes don't trigger webview
**Root Cause**: Missing `workspaceId` or `useWebview` flag not passed
**Location**: `continue-flow.ts` sendUpsellOffer/sendDownsellOffer
**Fix**: Verify `workspaceId` is in context and `useWebview` config exists

### 4. **Google Sheets Sync Failure**
**Issue**: Form data not appearing in Google Sheets
**Root Cause**: Header mismatch between form fields and sheet columns
**Location**: Google Apps Script webhook handler
**Fix**: Ensure sheet headers match form field names exactly

### 5. **Postback Infinite Loop**
**Issue**: Button clicks trigger multiple times
**Root Cause**: Missing deduplication in `processPostback()`
**Location**: `api/webhooks/meta.ts` processPostback
**Fix**: Implement `postbackProcessingCache` with timeout

### 6. **Missing Page Access Token**
**Issue**: "Page access token not found" errors
**Root Cause**: Token not saved during page connection
**Location**: `api.ts` createConnection / fetchPagesFromFacebook
**Fix**: Ensure `page_access_token` is saved to `connected_pages` table

---

## 🔍 Debugging Guide

### Frontend Debugging

#### 1. **Check Browser Console**
```javascript
// Common errors to look for:
- "Cannot read property 'X' of undefined" → Missing null checks
- "Maximum update depth exceeded" → Infinite re-render loop
- "Failed to fetch" → API endpoint issue
```

#### 2. **React DevTools**
- Inspect component state
- Check props flow
- Monitor re-renders

#### 3. **Network Tab**
- Verify API requests
- Check request/response payloads
- Monitor failed requests

### Backend Debugging

#### 1. **Vercel Function Logs**
```bash
# View logs in Vercel dashboard
# Or use Vercel CLI
vercel logs
```

#### 2. **Add Console Logs**
```typescript
// In api/webhooks/meta.ts
console.log('[DEBUG] Processing postback:', {
  payload: messagingEvent.postback.payload,
  userId: messagingEvent.sender.id,
  timestamp: new Date().toISOString()
});
```

#### 3. **Database Queries**
```sql
-- Check flow execution
SELECT * FROM flows WHERE status = 'ACTIVE';

-- Check node analytics
SELECT * FROM node_analytics WHERE flow_id = 'YOUR_FLOW_ID';

-- Check subscribers
SELECT * FROM subscribers WHERE workspace_id = 'YOUR_WORKSPACE_ID';

-- Check conversations
SELECT c.*, s.name, s.external_id 
FROM conversations c
JOIN subscribers s ON c.subscriber_id = s.id
WHERE c.workspace_id = 'YOUR_WORKSPACE_ID'
ORDER BY c.updated_at DESC;
```

### Facebook Webhook Debugging

#### 1. **Test Webhook**
```bash
# Use Facebook's webhook tester
# https://developers.facebook.com/tools/webhooks/
```

#### 2. **Check Webhook Subscriptions**
```bash
# Verify subscribed fields:
- messages
- messaging_postbacks
- messaging_customer_information
- feed (for comments)
```

#### 3. **Verify Token**
```bash
# Check verify token matches in:
- Facebook App Settings
- Environment variable: FACEBOOK_VERIFY_TOKEN
```

### Common Debug Checkpoints

#### Flow Not Triggering?
1. ✅ Is flow status = 'ACTIVE'?
2. ✅ Is page automation enabled?
3. ✅ Does trigger keyword match?
4. ✅ Is page_id correct in trigger node?
5. ✅ Check webhook subscriptions

#### Node Not Executing?
1. ✅ Check edges connect to node
2. ✅ Verify node configuration exists
3. ✅ Check condition node logic
4. ✅ Review console logs for errors
5. ✅ Verify page access token

#### Message Not Sending?
1. ✅ Check Facebook API response
2. ✅ Verify PSID (userId) is valid
3. ✅ Check page access token
4. ✅ Review message payload format
5. ✅ Check rate limits

#### Analytics Not Updating?
1. ✅ Check `node_analytics` table
2. ✅ Verify `incrementNodeAnalytics()` is called
3. ✅ Check flow_id and node_id match
4. ✅ Review RLS policies
5. ✅ Check service role permissions

---

## 📝 Environment Variables

```bash
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# Facebook
FACEBOOK_APP_ID=xxx
FACEBOOK_APP_SECRET=xxx
FACEBOOK_VERIFY_TOKEN=xxx

# AI (Optional)
OPENAI_API_KEY=sk-xxx
GEMINI_API_KEY=xxx

# App
VITE_APP_URL=https://yourdomain.com
```

---

## 🚀 Quick Start Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📚 Additional Resources

- **Facebook Graph API**: https://developers.facebook.com/docs/graph-api
- **Messenger Platform**: https://developers.facebook.com/docs/messenger-platform
- **Supabase Docs**: https://supabase.com/docs
- **ReactFlow Docs**: https://reactflow.dev/

---

**Last Updated**: January 10, 2026
**Version**: 1.0.0
