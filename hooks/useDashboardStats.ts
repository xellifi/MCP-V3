import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Workspace } from '../types';

export interface DashboardOrder {
    id: string;
    productImage: string;
    invoice: string;
    items: string;
    qty: number;
    amount: number;
    status: string;
    created_at: string;
    type: string;
}

export interface TopCustomer {
    name: string;
    phone: string;
    orders: number;
    avatar: string;
}

export interface DashboardScheduledPost {
    id: string;
    name: string;
    description: string;
    scheduleType: string;
    scheduledAt: string;
    image: string;
    status: string;
    pageName: string;
    pageAvatar: string;
    caption: string;
}

export interface Transaction {
    id: string;
    name: string;
    type: string;
    amount: number;
    payment_method: string;
    created_at: string;
    positive: boolean;
}

export interface DashboardStats {
    totalSales: number;
    totalOrders: number;
    subscriberCount: number;
    connectedPagesCount: number;
    earningData: { month: string; checkout: number; leads: number; web: number }[];
    recentTransactions: Transaction[];
    recentOrders: DashboardOrder[];
    topPages: {
        id: string;
        name: string;
        pageId: string;
        pageImageUrl: string;
        pageFollowers: number;
        ordersCount: number;
        isAutomationEnabled: boolean;
    }[];
    topCustomers: TopCustomer[];
    scheduledPosts: DashboardScheduledPost[];
    loading: boolean;
}

export const useDashboardStats = (workspace: Workspace) => {
    const [stats, setStats] = useState<DashboardStats>({
        totalSales: 0,
        totalOrders: 0,
        subscriberCount: 0,
        connectedPagesCount: 0,
        earningData: [],
        recentTransactions: [],
        recentOrders: [],
        topPages: [],
        topCustomers: [],
        scheduledPosts: [],
        loading: true,
    });

    useEffect(() => {
        const fetchStats = async () => {
            if (!workspace?.id) return;

            try {
                setStats(prev => ({ ...prev, loading: true }));

                // 1. Fetch Messenger Orders
                const { data: ordersData, error: ordersError } = await supabase
                    .from('orders')
                    .select('id, total, status, created_at, flow_id, form_id, customer_name, items, payment_method, subscriber_external_id')
                    .eq('workspace_id', workspace.id);

                if (ordersError) throw ordersError;

                // 2. Fetch Connected Pages (Move up for attribution logic)
                const { data: connectedPages, error: pagesFetchError } = await supabase
                    .from('connected_pages')
                    .select('id, name, page_id, page_image_url, page_followers, is_automation_enabled')
                    .eq('workspace_id', workspace.id);

                if (pagesFetchError) throw pagesFetchError;

                // 3. Fetch Form Submissions (Leads from forms page)
                // First get forms to get IDs
                const { data: forms, error: formsError } = await supabase
                    .from('forms')
                    .select('id, page_id, name, is_order_form, product_name, header_image_url')
                    .eq('workspace_id', workspace.id);

                if (formsError) throw formsError;

                // Fetch flows to map forms/orders to pages
                const { data: flowsData } = await supabase
                    .from('flows')
                    .select('id, configurations, nodes')
                    .eq('workspace_id', workspace.id);

                const flowToPageId: Record<string, string> = {};
                const formToFlowId: Record<string, string> = {};

                flowsData?.forEach(flow => {
                    if (!flow.configurations || !flow.nodes) return;

                    // 1. Map Flow to Page (via Trigger Node)
                    for (const node of (flow.nodes as any[])) {
                        const nodeType = node.type || node.data?.nodeType;
                        const nodeLabel = node.data?.label?.toLowerCase() || '';

                        if (nodeType === 'triggerNode' || nodeType === 'startNode' ||
                            nodeLabel.includes('trigger') || nodeLabel.includes('start') ||
                            nodeLabel.includes('new comment')) {
                            const config = flow.configurations[node.id];
                            if (config?.pageId) {
                                // Match the UUID from config to the real page_id
                                const page = connectedPages?.find(p => p.id === config.pageId);
                                if (page) {
                                    flowToPageId[flow.id] = page.page_id;
                                    break;
                                }
                            }
                        }
                    }

                    // 2. Map Form to Flow
                    for (const node of (flow.nodes as any[])) {
                        if (node.type === 'formNode') {
                            const config = flow.configurations[node.id];
                            if (config?.formId) {
                                formToFlowId[config.formId] = flow.id;
                            }
                        }
                    }
                });

                let submissionsData: any[] = [];
                if (forms && forms.length > 0) {
                    const formIds = forms.map(f => f.id);
                    const { data: subs, error: subsError } = await supabase
                        .from('form_submissions')
                        .select('form_id, data, created_at, subscriber_name, subscriber_external_id')
                        .in('form_id', formIds);

                    if (subsError) throw subsError;
                    submissionsData = subs || [];
                }

                // 4. Fetch Direct Store Orders (Web)
                const { data: stores, error: storesError } = await supabase
                    .from('stores')
                    .select('id')
                    .eq('workspace_id', workspace.id);

                if (storesError) throw storesError;

                let storeOrdersData: any[] = [];
                if (stores && stores.length > 0) {
                    const storeIds = stores.map(s => s.id);
                    const { data: sOrders, error: sOrdersError } = await supabase
                        .from('store_orders')
                        .select('store_id, total, status, created_at, customer_name')
                        .in('store_id', storeIds);

                    if (sOrdersError) throw sOrdersError;
                    storeOrdersData = sOrders || [];
                }

                // 5. Fetch Subscribers for avatars/details
                const { data: subscribersData, count: subscriberCount, error: subError } = await supabase
                    .from('subscribers')
                    .select('*', { count: 'exact' })
                    .eq('workspace_id', workspace.id);

                if (subError) throw subError;

                // 6. Connected Pages count (already fetched above)
                const pagesCount = connectedPages?.length || 0;

                // --- Processing Logic ---
                let totalSales = 0;
                let totalOrders = (ordersData?.length || 0) + submissionsData.length + storeOrdersData.length;
                let refundedCount = 0;

                const monthlyStats: Record<string, { checkout: number; leads: number; web: number }> = {};
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

                // Initialize months
                months.forEach(m => monthlyStats[m] = { checkout: 0, leads: 0, web: 0 });

                // Process Messenger Orders (from 'orders' table)
                ordersData?.forEach(order => {
                    const amount = parseFloat(order.total) || 0;
                    const date = new Date(order.created_at);
                    const month = months[date.getMonth()];

                    if (order.status === 'completed' || order.status === 'Paid') {
                        totalSales += amount;

                        if (order.flow_id) {
                            monthlyStats[month].checkout += amount;
                        } else if (order.form_id) {
                            monthlyStats[month].leads += amount;
                        } else {
                            monthlyStats[month].checkout += amount;
                        }
                    } else if (order.status === 'refunded' || order.status === 'Cancelled') {
                        refundedCount++;
                    }
                });

                // Process Form Submissions (from 'form_submissions' table - The "Leads")
                submissionsData.forEach(sub => {
                    const data = sub.data || {};
                    const amount = parseFloat(data.total) || 0;
                    const date = new Date(sub.created_at);
                    const month = months[date.getMonth()];

                    // Consider submissions as "Leads" income
                    // Usually form_submissions are active leads/orders unless deleted
                    totalSales += amount;
                    monthlyStats[month].leads += amount;

                    if (data.status === 'cancelled' || data.order_status === 'cancelled') {
                        refundedCount++;
                    }
                });

                // Process Store Orders (Web)
                storeOrdersData.forEach(order => {
                    const amount = parseFloat(order.total) || 0;
                    const date = new Date(order.created_at);
                    const month = months[date.getMonth()];

                    if (order.status === 'completed' || order.status === 'delivered' || order.payment_status === 'paid') {
                        totalSales += amount;
                        monthlyStats[month].web += amount;
                    } else if (order.status === 'cancelled' || order.status === 'refunded') {
                        refundedCount++;
                    }
                });

                const earningData = months.map(month => ({
                    month,
                    checkout: monthlyStats[month].checkout,
                    leads: monthlyStats[month].leads,
                    web: monthlyStats[month].web
                }));

                // 6. Fetch Recent Transactions Base Data
                const { data: recentOrders } = await supabase
                    .from('orders')
                    .select('id, customer_name, total, payment_method, created_at, status, items')
                    .eq('workspace_id', workspace.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                const { data: recentStoreOrders } = await supabase
                    .from('store_orders')
                    .select('id, customer_name, total, payment_method, created_at, status')
                    .in('store_id', stores?.map(s => s.id) || [])
                    .order('created_at', { ascending: false })
                    .limit(5);

                // Fetch recent form submissions (Leads)
                let recentFormSubmissions: any[] = [];
                if (forms && forms.length > 0) {
                    const { data: recentSubs } = await supabase
                        .from('form_submissions')
                        .select('id, form_id, data, created_at')
                        .in('form_id', forms.map(f => f.id))
                        .order('created_at', { ascending: false })
                        .limit(5);
                    recentFormSubmissions = recentSubs || [];
                }

                // Fetch detailed store orders with items
                let storeOrdersWithItems: any[] = [];
                if (recentStoreOrders && recentStoreOrders.length > 0) {
                    const storeOrderIds = recentStoreOrders.map(o => o.id);
                    const { data: orderItems } = await supabase
                        .from('order_items')
                        .select('*')
                        .in('order_id', storeOrderIds);

                    storeOrdersWithItems = recentStoreOrders.map(order => ({
                        ...order,
                        items: orderItems?.filter(item => item.order_id === order.id) || []
                    }));
                }

                const getImageUrl = (url: string | null | undefined) => {
                    if (!url) return 'https://via.placeholder.com/40?text=Product';
                    if (url.startsWith('/images/')) {
                        const fileName = url.replace('/images/', '');
                        return `https://avpfabqxnyurhkbbkmvp.supabase.co/storage/v1/object/public/attachments/${fileName}`;
                    }
                    return url;
                };

                const recentOrdersList: DashboardOrder[] = [
                    ...(recentOrders || []).map(o => {
                        const itemsArr = Array.isArray(o.items) ? o.items : [];
                        return {
                            id: o.id,
                            productImage: getImageUrl(itemsArr[0]?.productImage || itemsArr[0]?.product_image),
                            invoice: o.id.toString().substring(0, 8).toUpperCase(),
                            items: itemsArr.map((i: any) => i.productName || i.product_name).join(', ') || 'No Items',
                            qty: itemsArr.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0),
                            amount: parseFloat(o.total) || 0,
                            status: o.status || 'Pending',
                            created_at: o.created_at,
                            type: 'Checkout'
                        };
                    }),
                    ...storeOrdersWithItems.map(o => {
                        const itemsArr = Array.isArray(o.items) ? o.items : [];
                        return {
                            id: o.id,
                            productImage: getImageUrl(itemsArr[0]?.product_image || itemsArr[0]?.productImage),
                            invoice: o.id.toString().substring(0, 8).toUpperCase(),
                            items: itemsArr.map((i: any) => i.product_name || i.productName).join(', ') || 'No Items',
                            qty: itemsArr.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0),
                            amount: parseFloat(o.total) || 0,
                            status: o.status || 'Pending',
                            created_at: o.created_at,
                            type: 'Store'
                        };
                    }),
                    ...recentFormSubmissions.map(s => {
                        const data = s.data || {};
                        const form = forms?.find(f => f.id === s.form_id);

                        // Handle form-specific status labels
                        let statusLabel = data.status || data.order_status || 'Received';
                        if (form?.is_order_form) {
                            const statusObj = [
                                { id: 'pending', label: 'Order Placed' },
                                { id: 'processing', label: 'Confirmed' },
                                { id: 'shipped', label: 'Shipped' },
                                { id: 'delivered', label: 'Delivered' },
                                { id: 'cancelled', label: 'Cancelled' },
                            ].find(os => os.id === (data.order_status || 'pending'));
                            statusLabel = statusObj ? statusObj.label : (data.order_status || 'Order Placed');
                        } else if (data.status) {
                            statusLabel = data.status.charAt(0).toUpperCase() + data.status.slice(1);
                        }

                        return {
                            id: s.id,
                            productImage: getImageUrl(form?.header_image_url || data.productImage),
                            invoice: s.id.toString().substring(0, 8).toUpperCase(),
                            items: form?.product_name || data.productName || 'Form Lead',
                            qty: parseInt(data.quantity) || 1,
                            amount: parseFloat(data.total) || 0,
                            status: statusLabel,
                            created_at: s.created_at,
                            type: 'Lead'
                        };
                    })
                ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 5);

                const recentTransactions: Transaction[] = [
                    ...(recentOrders || []).map(o => ({
                        id: o.id,
                        name: o.customer_name || 'Messenger User',
                        type: 'Checkout',
                        amount: parseFloat(o.total) || 0,
                        payment_method: o.payment_method || 'cod',
                        created_at: o.created_at,
                        positive: o.status !== 'cancelled' && o.status !== 'refunded'
                    })),
                    ...(recentStoreOrders || []).map(o => ({
                        id: o.id,
                        name: o.customer_name || 'Store Customer',
                        type: 'Store',
                        amount: parseFloat(o.total) || 0,
                        payment_method: o.payment_method || 'cod',
                        created_at: o.created_at,
                        positive: o.status !== 'cancelled' && o.status !== 'refunded'
                    })),
                    ...recentFormSubmissions.map(s => ({
                        id: s.id,
                        name: s.data?.name || s.data?.customer_name || 'Lead',
                        type: 'Lead',
                        amount: parseFloat(s.data?.total) || 0,
                        payment_method: s.data?.payment_method || 'form',
                        created_at: s.created_at,
                        positive: s.data?.status !== 'cancelled' && s.data?.order_status !== 'cancelled'
                    }))
                ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .slice(0, 5);

                // 7. Calculate Top Pages - show all connected pages
                const allPages = connectedPages || [];

                const pageOrderCounts: Record<string, number> = {};

                // 1. Count from Messenger Orders (Checkout / Leads via flow)
                ordersData?.forEach(order => {
                    // Try to attribute via flow_id mapping
                    const pid = order.flow_id ? flowToPageId[order.flow_id] : null;
                    if (pid) {
                        pageOrderCounts[pid] = (pageOrderCounts[pid] || 0) + 1;
                    }
                });

                // 2. Count from Form Submissions (Leads)
                if (forms && forms.length > 0) {
                    const formToPage: Record<string, string> = {};
                    forms.forEach(f => {
                        if (f.page_id) {
                            formToPage[f.id] = f.page_id;
                        } else {
                            // FALLBACK 1: Use direct form-to-flow mapping from flow configurations
                            const flowId = formToFlowId[f.id];
                            if (flowId && flowToPageId[flowId]) {
                                formToPage[f.id] = flowToPageId[flowId];
                            }
                        }
                    });

                    submissionsData.forEach(sub => {
                        const pid = formToPage[sub.form_id];
                        if (pid) {
                            pageOrderCounts[pid] = (pageOrderCounts[pid] || 0) + 1;
                        }
                    });
                }

                // 3. Count from Store Orders (Store) 
                // Note: Attribution to page is only possible if stores have page_id
                if (stores && stores.length > 0 && storeOrdersData.length > 0) {
                    const storeToPage: Record<string, string> = {};
                    stores.forEach((s: any) => {
                        if (s.page_id) storeToPage[s.id] = s.page_id;
                    });

                    storeOrdersData.forEach(order => {
                        const pid = storeToPage[order.store_id];
                        if (pid) {
                            pageOrderCounts[pid] = (pageOrderCounts[pid] || 0) + 1;
                        }
                    });
                }

                const topPages = allPages.map(p => ({
                    id: p.id,
                    name: p.name,
                    pageId: p.page_id,
                    pageImageUrl: p.page_image_url,
                    pageFollowers: p.page_followers || 0,
                    ordersCount: pageOrderCounts[p.page_id] || 0,
                    isAutomationEnabled: p.is_automation_enabled
                })).sort((a, b) => b.ordersCount - a.ordersCount);

                // 8. Calculate Top Customers
                const customerMap: Record<string, { identifier: string; name: string; orders: number; avatar: string; phone: string }> = {};

                // Helper to safely add to map
                const addToCustomerMap = (name: string, identifier?: string) => {
                    const cleanName = name?.trim() || 'Unknown Customer';
                    const key = identifier || cleanName;

                    if (!customerMap[key]) {
                        customerMap[key] = { identifier: key, name: cleanName, orders: 0, avatar: '', phone: '' };
                    }
                    customerMap[key].orders++;
                    // Update name if we moved from identifier/Unknown to a real name
                    if (cleanName !== 'Unknown Customer' && (customerMap[key].name === 'Unknown Customer' || !customerMap[key].name)) {
                        customerMap[key].name = cleanName;
                    }
                };

                // From Messenger Orders
                ordersData?.forEach(order => {
                    addToCustomerMap(order.customer_name, order.subscriber_external_id);
                });

                // From Form Submissions
                submissionsData.forEach(sub => {
                    const data = sub.data || {};
                    const name = data.firstName ? `${data.firstName} ${data.lastName || ''}`.trim() : (sub.subscriber_name || data.customerName || data.name);
                    addToCustomerMap(name, sub.subscriber_external_id);
                });

                // From Store Orders
                storeOrdersData.forEach(order => {
                    addToCustomerMap(order.customer_name);
                });

                // Link with subscribersData for final names and avatars
                Object.keys(customerMap).forEach(key => {
                    // Try to find by identifier first, then by name
                    // Since subscribersData is from Supabase directly, it has snake_case fields
                    const sub = subscribersData?.find(s =>
                        s.external_id === key ||
                        s.externalId === key || // In case it's mapped elsewhere
                        s.name.toLowerCase() === key.toLowerCase() ||
                        s.name.toLowerCase() === customerMap[key].name.toLowerCase()
                    );

                    if (sub) {
                        customerMap[key].name = sub.name; // Prioritize the real name from subscribers table
                        customerMap[key].avatar = sub.avatar_url || sub.avatarUrl || '';
                        const extId = sub.external_id || sub.externalId;
                        customerMap[key].phone = extId ? extId.substring(0, 3) + '******' + extId.substring(Math.max(0, extId.length - 2)) : 'Messenger User';
                    } else if (key.length > 15) { // Likely an ID
                        customerMap[key].phone = key.substring(0, 3) + '******' + key.substring(key.length - 2);
                    } else {
                        customerMap[key].phone = 'Guest Customer';
                    }
                });

                const topCustomers = Object.values(customerMap)
                    .filter(c => c.name !== 'Unknown Customer') // Filter out any remaining unknowns if possible
                    .sort((a, b) => b.orders - a.orders)
                    .slice(0, 6);

                // 9. Fetch Scheduled Posts
                const { data: workflowsData } = await supabase
                    .from('scheduler_workflows')
                    .select('id, name, description, schedule_type, next_run_at, status, configurations')
                    .eq('workspace_id', workspace.id)
                    .order('next_run_at', { ascending: true });

                let scheduledPosts: DashboardScheduledPost[] = [];
                if (workflowsData && workflowsData.length > 0) {
                    const workflowIds = workflowsData.map(w => w.id);

                    // Fetch last execution for each workflow to get images
                    const { data: executionsData } = await supabase
                        .from('scheduler_executions')
                        .select('workflow_id, generated_image_url, generated_caption')
                        .in('workflow_id', workflowIds)
                        .order('started_at', { ascending: false });

                    scheduledPosts = workflowsData.map(w => {
                        const execution = executionsData?.find(e => e.workflow_id === w.id);
                        const configs = w.configurations as any || {};

                        // Look for pageId in the standard Facebook node config keys
                        let pageId = configs.pageId;
                        if (!pageId) {
                            const facebookConfig = configs['facebook-1'] || configs['facebookPost-1'] || {};
                            pageId = facebookConfig.pageId;
                        }

                        let page = connectedPages?.find(p => p.page_id === pageId);

                        // Fallback logic similar to api/cron.ts
                        if (!page && connectedPages && connectedPages.length > 0) {
                            page = connectedPages.find(p => p.is_automation_enabled) || connectedPages[0];
                        }

                        return {
                            id: w.id,
                            name: w.name,
                            description: w.description || '',
                            scheduleType: w.schedule_type || 'daily',
                            scheduledAt: w.next_run_at || '',
                            image: execution?.generated_image_url || 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80',
                            status: w.status,
                            pageName: page?.name || 'Facebook Page',
                            pageAvatar: page?.page_image_url || '',
                            caption: execution?.generated_caption || "This is a preview of your AI generated caption that will appear here..."
                        };
                    });
                }

                setStats({
                    totalSales,
                    totalOrders,
                    subscriberCount: subscriberCount || 0,
                    connectedPagesCount: pagesCount || 0,
                    earningData,
                    recentTransactions,
                    recentOrders: recentOrdersList,
                    topPages,
                    topCustomers,
                    scheduledPosts,
                    loading: false,
                });

            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
                setStats(prev => ({ ...prev, loading: false }));
            }
        };

        fetchStats();
    }, [workspace.id]);

    return stats;
};
