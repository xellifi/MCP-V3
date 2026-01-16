
import {
    LayoutDashboard,
    Workflow,
    MessageSquare,
    CalendarDays,
    Settings,
    Link as LinkIcon,
    Layers,
    Users,
    Banknote,
    Sliders,
    LifeBuoy,
    GraduationCap,
    FileText,
    Store,
    Package
} from 'lucide-react';

// Map of all available nav items
export const ALL_NAV_ITEMS: Record<string, { icon: any, label: string }> = {
    '/': { icon: LayoutDashboard, label: 'Dashboard' },
    '/connections': { icon: LinkIcon, label: 'Connections' },
    '/connected-pages': { icon: Layers, label: 'Pages' },
    '/subscribers': { icon: Users, label: 'Subscribers' },
    '/messages': { icon: MessageSquare, label: 'Inbox' },
    '/flows': { icon: Workflow, label: 'Flows' },
    '/scheduled': { icon: CalendarDays, label: 'Scheduler' },
    '/settings': { icon: Sliders, label: 'Settings' },
    '/affiliates': { icon: Banknote, label: 'Affiliates' },
    '/academy': { icon: GraduationCap, label: 'Academy' },
    '/forms-manager': { icon: FileText, label: 'Forms' },
    '/store': { icon: Store, label: 'Store' },
    '/packages': { icon: Package, label: 'Packages' },
    '/support': { icon: LifeBuoy, label: 'Support' },
    // Backward compatibility maps
    '/api-keys': { icon: Sliders, label: 'Settings' }
};

export const DEFAULT_ORDER = [
    '/',
    '/connections',
    '/connected-pages',
    '/subscribers',
    '/messages',
    '/flows',
    '/forms-manager',
    '/store',
    '/packages',
    '/scheduled',
    '/academy',
    '/settings',
    '/affiliates',
    '/support'
];
