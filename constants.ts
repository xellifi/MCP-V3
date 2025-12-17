import { User, Workspace, MetaConnection, Flow, ScheduledPost, UserRole, FlowNodeType, Subscriber, Conversation, Message, ConnectedPage, Referral } from './types';

// Mock Database for Auth (includes passwords for demo)
export const MOCK_AUTH_DB = [
  {
    id: 'u1',
    email: 'admin@mychatpilot.com',
    password: 'admin1',
    name: 'Super Admin',
    role: UserRole.ADMIN,
    avatarUrl: 'https://ui-avatars.com/api/?name=Super+Admin&background=0D8ABC&color=fff',
    affiliateCode: 'superadmin'
  },
  {
    id: 'u2',
    email: 'User@gmail.com',
    password: '12345678',
    name: 'John User',
    role: UserRole.MEMBER, // Or OWNER of their own workspace
    avatarUrl: 'https://ui-avatars.com/api/?name=John+User&background=random',
    affiliateCode: 'johnuser'
  }
];

export const MOCK_USER: User = MOCK_AUTH_DB[0]; // Default fallback if needed

export const MOCK_WORKSPACES: Workspace[] = [
  { id: 'w1', name: 'My Business', ownerId: 'u2' },
  { id: 'w2', name: 'Admin Workspace', ownerId: 'u1' }
];

export const MOCK_CONNECTIONS: MetaConnection[] = [
  {
    id: 'c1',
    workspaceId: 'w1',
    platform: 'FACEBOOK',
    name: 'John User (Personal Profile)',
    externalId: 'fb_user_123',
    status: 'CONNECTED',
    imageUrl: 'https://ui-avatars.com/api/?name=John+User&background=1877F2&color=fff'
  }
];

export const MOCK_CONNECTED_PAGES: ConnectedPage[] = [
  {
    id: 'cp1',
    workspaceId: 'w1',
    name: 'Acme Brand Official',
    pageId: '1234567890',
    pageImageUrl: 'https://picsum.photos/id/20/100',
    pageFollowers: 12500,
    instagram: {
      id: 'ig_123',
      username: 'acme_brand_ig',
      imageUrl: 'https://picsum.photos/id/30/100',
      followers: 45200
    },
    isAutomationEnabled: true,
    status: 'CONNECTED'
  },
  {
    id: 'cp2',
    workspaceId: 'w1',
    name: 'Acme Support',
    pageId: '0987654321',
    pageImageUrl: 'https://picsum.photos/id/40/100',
    pageFollowers: 3200,
    // No Instagram linked
    isAutomationEnabled: false,
    status: 'CONNECTED'
  },
  {
    id: 'cp3',
    workspaceId: 'w1',
    name: 'Old Campaign Page',
    pageId: '55555555',
    pageImageUrl: 'https://picsum.photos/id/50/100',
    pageFollowers: 150,
    isAutomationEnabled: false,
    status: 'DISCONNECTED'
  }
];

export const MOCK_SUBSCRIBERS: Subscriber[] = [
  {
    id: 's1',
    workspaceId: 'w1',
    name: 'Jane Doe',
    platform: 'FACEBOOK',
    externalId: 'fb_123',
    avatarUrl: 'https://picsum.photos/150',
    status: 'SUBSCRIBED',
    tags: ['vip', 'new'],
    lastActiveAt: new Date().toISOString()
  },
  {
    id: 's2',
    workspaceId: 'w1',
    name: 'John Smith',
    platform: 'INSTAGRAM',
    externalId: 'ig_456',
    status: 'SUBSCRIBED',
    tags: ['lead'],
    lastActiveAt: new Date(Date.now() - 86400000).toISOString()
  },
   {
    id: 's3',
    workspaceId: 'w1',
    name: 'Sarah Connor',
    platform: 'FACEBOOK',
    externalId: 'fb_789',
    status: 'UNSUBSCRIBED',
    tags: [],
    lastActiveAt: new Date(Date.now() - 86400000 * 5).toISOString()
  }
];

export const MOCK_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv1',
    workspaceId: 'w1',
    subscriberId: 's1',
    platform: 'FACEBOOK',
    lastMessagePreview: 'Is this item still available?',
    unreadCount: 1,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'conv2',
    workspaceId: 'w1',
    subscriberId: 's2',
    platform: 'INSTAGRAM',
    lastMessagePreview: 'Thanks for the info!',
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 3600000).toISOString()
  }
];

export const MOCK_MESSAGES: Message[] = [
  {
    id: 'm1',
    conversationId: 'conv1',
    direction: 'OUTBOUND',
    content: 'Hello! How can we help you today?',
    type: 'TEXT',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    status: 'READ'
  },
  {
    id: 'm2',
    conversationId: 'conv1',
    direction: 'INBOUND',
    content: 'Is this item still available?',
    type: 'TEXT',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    status: 'READ'
  },
  {
    id: 'm3',
    conversationId: 'conv2',
    direction: 'INBOUND',
    content: 'How much does shipping cost?',
    type: 'TEXT',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'READ'
  },
  {
    id: 'm4',
    conversationId: 'conv2',
    direction: 'OUTBOUND',
    content: 'Shipping is free on orders over $50!',
    type: 'TEXT',
    createdAt: new Date(Date.now() - 85000000).toISOString(),
    status: 'READ'
  },
  {
    id: 'm5',
    conversationId: 'conv2',
    direction: 'INBOUND',
    content: 'Thanks for the info!',
    type: 'TEXT',
    createdAt: new Date(Date.now() - 84000000).toISOString(),
    status: 'READ'
  }
];


export const MOCK_FLOWS: Flow[] = [
  {
    id: 'f1',
    workspaceId: 'w1',
    name: 'Welcome New Commenters',
    status: 'ACTIVE',
    updatedAt: new Date().toISOString(),
    nodes: [
      { id: '1', type: 'input', data: { label: 'New Comment Trigger' }, position: { x: 250, y: 5 } },
      { id: '2', data: { label: 'Reply with "Thanks!"' }, position: { x: 100, y: 100 } },
      { id: '3', data: { label: 'Send DM Offer' }, position: { x: 400, y: 100 } }
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e1-3', source: '1', target: '3', animated: true }
    ]
  },
  {
    id: 'f2',
    workspaceId: 'w1',
    name: 'Support Auto-Reply',
    status: 'DRAFT',
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    nodes: [],
    edges: []
  }
];

export const MOCK_POSTS: ScheduledPost[] = [
  {
    id: 'p1',
    workspaceId: 'w1',
    content: 'Check out our summer sale! ☀️ #summer #sale',
    platform: 'INSTAGRAM',
    scheduledAt: new Date(Date.now() + 3600000).toISOString(),
    status: 'PENDING',
    imageUrl: 'https://picsum.photos/400/300'
  },
  {
    id: 'p2',
    workspaceId: 'w1',
    content: 'We are hiring! Join the team.',
    platform: 'FACEBOOK',
    scheduledAt: new Date(Date.now() - 7200000).toISOString(),
    status: 'PUBLISHED'
  }
];

export const INITIAL_NODES = [
  {
    id: '1',
    type: 'input',
    data: { label: 'Trigger: New Message' },
    position: { x: 250, y: 25 },
    style: { background: '#f0fdf4', border: '1px solid #16a34a', color: '#14532d' }
  },
  {
    id: '2',
    data: { label: 'AI Agent: Determine Intent' },
    position: { x: 250, y: 125 },
    style: { background: '#eff6ff', border: '1px solid #2563eb', color: '#1e3a8a' }
  },
];

export const INITIAL_EDGES = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
];

export const MOCK_REFERRALS: Referral[] = [
  {
    id: 'ref1',
    referrerId: 'u2', // John User
    referredUserId: 'u3',
    referredUserName: 'Alice Walker',
    referredUserEmail: 'alice@example.com',
    status: 'PAID',
    commission: 15.00,
    createdAt: new Date(Date.now() - 86400000 * 10).toISOString()
  },
  {
    id: 'ref2',
    referrerId: 'u2',
    referredUserId: 'u4',
    referredUserName: 'Bob Builder',
    referredUserEmail: 'bob@example.com',
    status: 'PENDING',
    commission: 15.00,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'ref3',
    referrerId: 'u1',
    referredUserId: 'u5',
    referredUserName: 'Charlie Chef',
    referredUserEmail: 'charlie@example.com',
    status: 'PENDING',
    commission: 15.00,
    createdAt: new Date().toISOString()
  }
];