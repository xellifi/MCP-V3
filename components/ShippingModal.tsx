
import React from 'react';
import { Truck, X, User } from 'lucide-react';

interface ShippingInfo {
    carrier: string;
    customCarrier: string;
    trackingNumber: string;
    trackingUrl: string;
    notes: string;
}

interface Order {
    id: string;
    customer_name: string;
    customer_address: string | null;
}

interface ShippingModalProps {
    shippingOrder: Order | null;
    shippingInfo: ShippingInfo;
    setShippingInfo: (info: ShippingInfo) => void;
    onClose: () => void;
    onSend: () => void;
    sendingNotification: boolean;
    isDark: boolean;
}

// Carriers with tracking URLs
const carrierTrackingUrls: Record<string, string> = {
    'J&T Express': 'https://www.jtexpress.ph/trajectoryQuery?waybillNo={TRACKING}',
    'LBC Express': 'https://www.lbcexpress.com/track?tracking_no={TRACKING}',
    'Grab Express': '',
    'Lalamove': '',
    'GoGo Xpress': 'https://www.gogoxpress.com/tracking?tracking_code={TRACKING}',
    'Flash Express': 'https://www.flashexpress.ph/fle/tracking?se={TRACKING}',
    '2GO Express': 'https://supplychain.2go.com.ph/tracking?waybill={TRACKING}',
    'Ninja Van': 'https://www.ninjavan.co/en-ph/tracking?id={TRACKING}',
    'DHL': 'https://www.dhl.com/ph-en/home/tracking.html?tracking-id={TRACKING}',
    'FedEx': 'https://www.fedex.com/fedextrack/?trknbr={TRACKING}',
    'Other': ''
};

const shippingCarriers = Object.keys(carrierTrackingUrls);

const getCarrierTrackingUrl = (carrier: string, trackingNumber: string): string => {
    const urlTemplate = carrierTrackingUrls[carrier] || '';
    if (!urlTemplate) return '';
    return urlTemplate.replace('{TRACKING}', encodeURIComponent(trackingNumber));
};

const ShippingModal: React.FC<ShippingModalProps> = ({
    shippingOrder,
    shippingInfo,
    setShippingInfo,
    onClose,
    onSend,
    sendingNotification,
    isDark
}) => {
    if (!shippingOrder) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 pb-8" onClick={onClose}>
            <div className={`rounded-2xl w-full max-w-md overflow-hidden border shadow-2xl ${isDark ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-200'}`} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={`p-5 border-b flex items-center justify-between ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-500/20 rounded-xl">
                            <Truck className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Ship Order</h2>
                            <p className={`text-xs font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{shippingOrder.id}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                        <X className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                    </button>
                </div>

                {/* Form */}
                <div className="p-5 space-y-4">
                    {/* Customer Info Summary */}
                    <div className={`rounded-lg p-3 ${isDark ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-100'}`}>
                        <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isDark ? 'bg-purple-500/20' : 'bg-purple-100'}`}>
                                <User className="w-4 h-4 text-purple-400" />
                            </div>
                            <div>
                                <p className={`font-medium text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{shippingOrder.customer_name}</p>
                                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{shippingOrder.customer_address || 'No address'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Carrier Selection */}
                    <div>
                        <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Carrier
                        </label>
                        <select
                            value={shippingInfo.carrier}
                            onChange={(e) => {
                                const newCarrier = e.target.value;
                                setShippingInfo({
                                    ...shippingInfo,
                                    carrier: newCarrier,
                                    trackingUrl: getCarrierTrackingUrl(newCarrier, shippingInfo.trackingNumber)
                                });
                            }}
                            className={`w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 border text-sm ${isDark ? 'bg-black/30 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                        >
                            {shippingCarriers.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    {/* Custom Carrier Name (for 'Other') */}
                    {shippingInfo.carrier === 'Other' && (
                        <div className="mb-4">
                            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                Courier Name <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                value={shippingInfo.customCarrier}
                                onChange={(e) => setShippingInfo({ ...shippingInfo, customCarrier: e.target.value })}
                                placeholder="Enter courier name"
                                className={`w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 border text-sm ${isDark ? 'bg-black/30 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'}`}
                            />
                        </div>
                    )}

                    {/* Tracking Number */}
                    <div>
                        <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Tracking Number <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={shippingInfo.trackingNumber}
                            onChange={(e) => {
                                const newTracking = e.target.value;
                                setShippingInfo({
                                    ...shippingInfo,
                                    trackingNumber: newTracking,
                                    trackingUrl: getCarrierTrackingUrl(shippingInfo.carrier, newTracking)
                                });
                            }}
                            placeholder="Enter tracking number"
                            autoFocus
                            className={`w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 border text-sm ${isDark ? 'bg-black/30 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'}`}
                        />
                    </div>

                    {/* Tracking URL */}
                    <div>
                        <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Tracking URL
                        </label>
                        <input
                            type="text"
                            value={shippingInfo.trackingUrl}
                            onChange={(e) => setShippingInfo({ ...shippingInfo, trackingUrl: e.target.value })}
                            placeholder="https://..."
                            className={`w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 border text-sm ${isDark ? 'bg-black/30 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'}`}
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            Notes (Optional)
                        </label>
                        <input
                            type="text"
                            value={shippingInfo.notes}
                            onChange={(e) => setShippingInfo({ ...shippingInfo, notes: e.target.value })}
                            placeholder="e.g., Delivery in 3-5 days"
                            className={`w-full px-3 py-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 border text-sm ${isDark ? 'bg-black/30 border-white/10 text-white placeholder-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'}`}
                        />
                    </div>

                    {/* Info */}
                    <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Customer will receive a Messenger notification with tracking info.
                    </p>
                </div>

                {/* Footer */}
                <div className={`p-5 border-t flex items-center justify-end gap-2 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${isDark ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onSend}
                        disabled={sendingNotification || !shippingInfo.trackingNumber.trim()}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-all"
                    >
                        <Truck className="w-4 h-4" />
                        {sendingNotification ? 'Sending...' : 'Ship & Notify'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShippingModal;
