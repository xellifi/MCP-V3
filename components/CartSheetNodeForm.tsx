import React, { useState } from 'react';
import {
    Table2, Link2, FileSpreadsheet, Copy, Check, AlertCircle, ExternalLink, ChevronDown, ChevronUp
} from 'lucide-react';
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
    const [showSetupGuide, setShowSetupGuide] = useState(false);
    const [copied, setCopied] = useState(false);

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
        <div className="space-y-6">
            {/* Header Info */}
            <div className="flex items-start gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <Table2 className="w-5 h-5 text-green-400 mt-0.5" />
                <div className="text-sm text-slate-300">
                    <p className="font-medium text-green-400 mb-1">Cart Sheet Node</p>
                    <p>Automatically sends all cart items (product + upsells/downsells) to your Google Sheet when order is complete.</p>
                </div>
            </div>

            {/* Webhook URL */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <Link2 className="w-4 h-4 text-slate-400" />
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
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-all placeholder-slate-500"
                />
                {webhookUrl && webhookUrl.includes('script.google.com') && (
                    <div className="flex items-center gap-2 text-green-400 text-xs">
                        <Check className="w-3 h-3" />
                        Valid Google Apps Script URL
                    </div>
                )}
            </div>

            {/* Sheet Name */}
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-300">
                    <FileSpreadsheet className="w-4 h-4 text-slate-400" />
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
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-green-500/50 focus:border-green-500 outline-none transition-all placeholder-slate-500"
                />
            </div>

            {/* Data Options */}
            <div className="space-y-3 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <div className="text-sm font-medium text-slate-300 mb-3">Data to Include</div>

                <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Timestamp</span>
                    <button
                        onClick={() => {
                            setIncludeTimestamp(!includeTimestamp);
                            notifyChange({ includeTimestamp: !includeTimestamp });
                        }}
                        className={`w-10 h-5 rounded-full transition-all ${includeTimestamp ? 'bg-green-500' : 'bg-slate-600'}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${includeTimestamp ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Customer Name</span>
                    <button
                        onClick={() => {
                            setIncludeCustomerName(!includeCustomerName);
                            notifyChange({ includeCustomerName: !includeCustomerName });
                        }}
                        className={`w-10 h-5 rounded-full transition-all ${includeCustomerName ? 'bg-green-500' : 'bg-slate-600'}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${includeCustomerName ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Product Details (names, prices)</span>
                    <button
                        onClick={() => {
                            setIncludeProductDetails(!includeProductDetails);
                            notifyChange({ includeProductDetails: !includeProductDetails });
                        }}
                        className={`w-10 h-5 rounded-full transition-all ${includeProductDetails ? 'bg-green-500' : 'bg-slate-600'}`}
                    >
                        <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${includeProductDetails ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                </div>
            </div>

            {/* Setup Guide */}
            <div className="border border-slate-700 rounded-xl overflow-hidden">
                <button
                    onClick={() => setShowSetupGuide(!showSetupGuide)}
                    className="w-full flex items-center justify-between p-4 bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                    <span className="text-sm font-medium text-slate-300">📋 Setup Guide & Script</span>
                    {showSetupGuide ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {showSetupGuide && (
                    <div className="p-4 space-y-4 border-t border-slate-700">
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
