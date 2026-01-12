import React, { useState } from 'react';
import { Table2, Link2, FileSpreadsheet, Copy, Check, ChevronDown, Settings, List } from 'lucide-react';
import CollapsibleTips from './CollapsibleTips';

interface CartSheetNodeFormProps {
    workspaceId: string;
    initialConfig?: {
        webhookUrl?: string;
        sheetName?: string;
        includeTimestamp?: boolean;
        includeCustomerName?: boolean;
        includeProductDetails?: boolean;
    };
    onChange: (config: any) => void;
}

const CartSheetNodeForm: React.FC<CartSheetNodeFormProps> = ({
    workspaceId,
    initialConfig,
    onChange
}) => {
    // State
    const [webhookUrl, setWebhookUrl] = useState(initialConfig?.webhookUrl || '');
    const [sheetName, setSheetName] = useState(initialConfig?.sheetName || 'Cart Orders');
    const [includeTimestamp, setIncludeTimestamp] = useState(initialConfig?.includeTimestamp ?? true);
    const [includeCustomerName, setIncludeCustomerName] = useState(initialConfig?.includeCustomerName ?? true);
    const [includeProductDetails, setIncludeProductDetails] = useState(initialConfig?.includeProductDetails ?? true);
    const [copied, setCopied] = useState(false);
    const [activeSection, setActiveSection] = useState<string>('connection');

    // Notify parent of changes
    const notifyChange = (updates: Partial<typeof initialConfig> = {}) => {
        onChange({
            webhookUrl,
            sheetName,
            includeTimestamp,
            includeCustomerName,
            includeProductDetails,
            ...updates
        });
    };

    const toggleSection = (id: string) => {
        setActiveSection(activeSection === id ? '' : id);
    };

    // Section header component - matching UpsellNodeForm pattern
    const SectionHeader = ({
        id,
        icon: Icon,
        title,
        color
    }: {
        id: string;
        icon: React.ElementType;
        title: string;
        color: string;
    }) => (
        <button
            onClick={() => toggleSection(id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${activeSection === id
                ? `bg-${color}-500/20 border-${color}-500/30`
                : 'bg-black/20 border-white/10 hover:bg-white/5'
                }`}
        >
            <div className={`p-1.5 rounded-lg bg-${color}-500/20`}>
                <Icon className={`w-4 h-4 text-${color}-400`} />
            </div>
            <span className="font-semibold text-sm text-white">{title}</span>
            <div className={`ml-auto transition-transform ${activeSection === id ? 'rotate-180' : ''}`}>
                <ChevronDown className="w-4 h-4 text-slate-400" />
            </div>
        </button>
    );

    const appsScriptCode = `function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("${sheetName || 'Cart Orders'}");
    if (!sheet) {
      sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet("${sheetName || 'Cart Orders'}");
      // Add headers
      sheet.appendRow([
        "Timestamp", "Customer Name", "Customer ID", 
        "Products", "Quantities", "Prices", "Total", "Status"
      ]);
    }
    
    var data = JSON.parse(e.postData.contents);
    
    sheet.appendRow([
      new Date().toISOString(),
      data.customerName || '',
      data.customerId || '',
      data.products || '',
      data.quantities || '',
      data.prices || '',
      data.total || 0,
      'New Order'
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({success: true}))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(error) {
    return ContentService.createTextOutput(JSON.stringify({error: error.message}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

    const copyScript = () => {
        navigator.clipboard.writeText(appsScriptCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-4">
            {/* Header Info */}
            <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <Table2 className="w-5 h-5 text-green-400 mt-0.5" />
                <div className="text-sm text-slate-300">
                    <p className="font-medium text-green-400 mb-1">Cart Sheet Node</p>
                    <p>Automatically sends all cart items (product + upsells/downsells) to your Google Sheet when order is complete.</p>
                </div>
            </div>

            {/* Connection Section */}
            <div className="space-y-3">
                <SectionHeader id="connection" icon={Link2} title="Webhook Connection" color="green" />
                {activeSection === 'connection' && (
                    <div className="space-y-4 p-4 bg-black/20 rounded-xl border border-white/10">
                        {/* Webhook URL */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Google Apps Script Webhook URL
                            </label>
                            <input
                                type="url"
                                value={webhookUrl}
                                onChange={(e) => {
                                    setWebhookUrl(e.target.value);
                                    notifyChange({ webhookUrl: e.target.value });
                                }}
                                placeholder="https://script.google.com/macros/s/..."
                                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
                            />
                            {webhookUrl && webhookUrl.includes('script.google.com') && (
                                <div className="flex items-center gap-2 text-green-400 text-xs mt-2">
                                    <Check className="w-3 h-3" />
                                    Valid Google Apps Script URL
                                </div>
                            )}
                        </div>

                        {/* Sheet Name */}
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Sheet Name
                            </label>
                            <input
                                type="text"
                                value={sheetName}
                                onChange={(e) => {
                                    setSheetName(e.target.value);
                                    notifyChange({ sheetName: e.target.value });
                                }}
                                placeholder="Cart Orders"
                                className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-white/40 focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 transition-all"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Data Options Section */}
            <div className="space-y-3">
                <SectionHeader id="data" icon={List} title="Data Options" color="blue" />
                {activeSection === 'data' && (
                    <div className="space-y-3 p-4 bg-black/20 rounded-xl border border-white/10">
                        <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/10">
                            <span className="text-white/80 text-sm">Include Timestamp</span>
                            <button
                                onClick={() => {
                                    setIncludeTimestamp(!includeTimestamp);
                                    notifyChange({ includeTimestamp: !includeTimestamp });
                                }}
                                className={`relative w-12 h-6 rounded-full transition-colors ${includeTimestamp ? 'bg-green-500' : 'bg-slate-600'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${includeTimestamp ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/10">
                            <span className="text-white/80 text-sm">Include Customer Name</span>
                            <button
                                onClick={() => {
                                    setIncludeCustomerName(!includeCustomerName);
                                    notifyChange({ includeCustomerName: !includeCustomerName });
                                }}
                                className={`relative w-12 h-6 rounded-full transition-colors ${includeCustomerName ? 'bg-green-500' : 'bg-slate-600'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${includeCustomerName ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/10">
                            <span className="text-white/80 text-sm">Include Product Details</span>
                            <button
                                onClick={() => {
                                    setIncludeProductDetails(!includeProductDetails);
                                    notifyChange({ includeProductDetails: !includeProductDetails });
                                }}
                                className={`relative w-12 h-6 rounded-full transition-colors ${includeProductDetails ? 'bg-green-500' : 'bg-slate-600'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${includeProductDetails ? 'left-7' : 'left-1'}`} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Setup Guide Section */}
            <div className="space-y-3">
                <SectionHeader id="setup" icon={Settings} title="Setup Guide & Script" color="violet" />
                {activeSection === 'setup' && (
                    <div className="p-4 space-y-4 bg-black/20 rounded-xl border border-white/10">
                        <ol className="text-sm text-slate-400 space-y-2 list-decimal list-inside">
                            <li>Open your Google Sheet</li>
                            <li>Go to Extensions → Apps Script</li>
                            <li>Delete any existing code and paste the script below</li>
                            <li>Click Deploy → New Deployment → Web App</li>
                            <li>Set "Execute as: Me" and "Who has access: Anyone"</li>
                            <li>Copy the Web App URL and paste above</li>
                        </ol>

                        <div className="relative">
                            <pre className="bg-slate-900 p-3 rounded-lg text-xs text-green-300 overflow-x-auto max-h-48">
                                {appsScriptCode}
                            </pre>
                            <button
                                onClick={copyScript}
                                className="absolute top-2 right-2 p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                                title="Copy script"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Tips */}
            <CollapsibleTips title="What Data is Sent" color="green">
                <ul className="text-sm space-y-1.5">
                    <li>• <strong>Products:</strong> All items from cart (main product + upsells/downsells)</li>
                    <li>• <strong>Prices:</strong> Individual prices and combined total</li>
                    <li>• <strong>Customer:</strong> Name and Facebook ID from subscriber</li>
                    <li>• <strong>Timestamp:</strong> When order was placed</li>
                </ul>
            </CollapsibleTips>
        </div>
    );
};

export default CartSheetNodeForm;
