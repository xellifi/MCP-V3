import React, { useState, useEffect } from 'react';
import { HelpCircle, ExternalLink, Check, AlertCircle, Link, ShoppingCart, FileText, Package } from 'lucide-react';

interface GoogleSheetNodeFormProps {
    workspaceId: string;
    initialConfig?: any;
    onChange: (config: any) => void;
}

type SourceType = 'form' | 'checkout' | 'auto';

const GoogleSheetNodeForm: React.FC<GoogleSheetNodeFormProps> = ({ workspaceId, initialConfig, onChange }) => {
    const [spreadsheetId, setSpreadsheetId] = useState(initialConfig?.spreadsheetId || '');
    const [sheetName, setSheetName] = useState(initialConfig?.sheetName || 'Sheet1');
    const [webhookUrl, setWebhookUrl] = useState(initialConfig?.webhookUrl || '');
    const [sourceType, setSourceType] = useState<SourceType>(initialConfig?.sourceType || 'auto');
    const [showGuide, setShowGuide] = useState(false);

    // Order-specific options
    const [includeMainProduct, setIncludeMainProduct] = useState(initialConfig?.includeMainProduct ?? true);
    const [includeUpsells, setIncludeUpsells] = useState(initialConfig?.includeUpsells ?? true);
    const [includeDownsells, setIncludeDownsells] = useState(initialConfig?.includeDownsells ?? true);
    const [includeCustomerInfo, setIncludeCustomerInfo] = useState(initialConfig?.includeCustomerInfo ?? true);
    const [includeTimestamp, setIncludeTimestamp] = useState(initialConfig?.includeTimestamp ?? true);

    useEffect(() => {
        onChange({
            spreadsheetId,
            sheetName,
            webhookUrl,
            sourceType,
            includeMainProduct,
            includeUpsells,
            includeDownsells,
            includeCustomerInfo,
            includeTimestamp,
        });
    }, [spreadsheetId, sheetName, webhookUrl, sourceType, includeMainProduct, includeUpsells, includeDownsells, includeCustomerInfo, includeTimestamp]);

    // Extract spreadsheet ID from full URL if pasted
    const handleSpreadsheetInput = (value: string) => {
        // Check if it's a full Google Sheets URL
        const urlMatch = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (urlMatch) {
            setSpreadsheetId(urlMatch[1]);
        } else {
            setSpreadsheetId(value);
        }
    };

    const isValidId = spreadsheetId.length > 20;
    const isValidWebhook = webhookUrl.includes('script.google.com') || webhookUrl.includes('macros/s/');
    const isFullyConfigured = isValidId && isValidWebhook;

    const inputClass = "w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50";

    const sourceOptions = [
        {
            value: 'auto' as SourceType,
            label: 'Auto-detect',
            desc: 'Automatically detect based on connected node',
            icon: <Link className="w-4 h-4" />
        },
        {
            value: 'form' as SourceType,
            label: 'Form Submission',
            desc: 'Sync when form is submitted',
            icon: <FileText className="w-4 h-4" />
        },
        {
            value: 'checkout' as SourceType,
            label: 'Order Completion',
            desc: 'Sync complete order with all products',
            icon: <ShoppingCart className="w-4 h-4" />
        },
    ];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-green-500/20 rounded-xl">
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
                        <rect x="3" y="3" width="18" height="18" rx="2" className="fill-green-500" />
                        <rect x="6" y="7" width="12" height="2" rx="0.5" className="fill-white" />
                        <rect x="6" y="11" width="12" height="2" rx="0.5" className="fill-white" />
                        <rect x="6" y="15" width="8" height="2" rx="0.5" className="fill-white" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-white font-semibold">Google Sheets Sync</h3>
                    <p className="text-slate-400 text-xs">Sync form submissions to spreadsheet</p>
                </div>
            </div>

            {/* Source Type Selection */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                    Data Source
                </label>
                <div className="space-y-2">
                    {sourceOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setSourceType(option.value)}
                            className={`w-full p-3 rounded-xl border transition-all text-left flex items-start gap-3 ${sourceType === option.value
                                    ? 'bg-green-500/20 border-green-500/50'
                                    : 'bg-slate-800/40 border-slate-600/30 hover:border-slate-500/50'
                                }`}
                        >
                            <div className={`p-1.5 rounded-lg ${sourceType === option.value ? 'bg-green-500/30 text-green-400' : 'bg-slate-700/50 text-slate-400'
                                }`}>
                                {option.icon}
                            </div>
                            <div className="flex-1">
                                <div className={`text-sm font-medium ${sourceType === option.value ? 'text-white' : 'text-slate-300'
                                    }`}>
                                    {option.label}
                                </div>
                                <div className="text-xs text-slate-500">{option.desc}</div>
                            </div>
                            {sourceType === option.value && (
                                <Check className="w-5 h-5 text-green-500 mt-0.5" />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Connection Info Box */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <div className="flex items-center gap-2">
                    <Link className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-400 font-medium text-xs">How it works</span>
                </div>
                <p className="text-slate-400 text-[10px] mt-1 leading-relaxed">
                    {sourceType === 'form' ? (
                        <>Connect this node to a <span className="text-purple-400 font-medium">Form</span> node. When the form is submitted, data will automatically sync to your Google Sheet.</>
                    ) : sourceType === 'checkout' ? (
                        <>Connect this node after <span className="text-orange-400 font-medium">Checkout</span> or <span className="text-indigo-400 font-medium">Invoice</span> node. Complete order data (main product + upsells + downsells) will sync to your Google Sheet.</>
                    ) : (
                        <>Connect to a <span className="text-purple-400 font-medium">Form</span> node for form data, or <span className="text-orange-400 font-medium">Checkout/Invoice</span> node for complete order data including upsells and downsells.</>
                    )}
                </p>
            </div>

            {/* Order-specific options - only show for checkout/auto */}
            {(sourceType === 'checkout' || sourceType === 'auto') && (
                <div className="p-3 bg-slate-800/40 border border-slate-600/30 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-orange-400" />
                        <span className="text-slate-300 font-medium text-xs">Order Data Options</span>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={includeMainProduct}
                            onChange={(e) => setIncludeMainProduct(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-green-500 focus:ring-green-500/50"
                        />
                        <span className="text-slate-300 text-xs">Include main product</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={includeUpsells}
                            onChange={(e) => setIncludeUpsells(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-green-500 focus:ring-green-500/50"
                        />
                        <span className="text-slate-300 text-xs">Include upsell products</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={includeDownsells}
                            onChange={(e) => setIncludeDownsells(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-green-500 focus:ring-green-500/50"
                        />
                        <span className="text-slate-300 text-xs">Include downsell products</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={includeCustomerInfo}
                            onChange={(e) => setIncludeCustomerInfo(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-green-500 focus:ring-green-500/50"
                        />
                        <span className="text-slate-300 text-xs">Include customer info (name, address, phone)</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={includeTimestamp}
                            onChange={(e) => setIncludeTimestamp(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-green-500 focus:ring-green-500/50"
                        />
                        <span className="text-slate-300 text-xs">Include order timestamp</span>
                    </label>
                </div>
            )}

            {/* Spreadsheet ID */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-slate-300">
                        Spreadsheet ID or URL
                    </label>
                    <button
                        type="button"
                        onClick={() => setShowGuide(!showGuide)}
                        className="text-slate-400 hover:text-white transition"
                        title="Setup Guide"
                    >
                        <HelpCircle className="w-4 h-4" />
                    </button>
                </div>
                <div className="relative">
                    <input
                        type="text"
                        value={spreadsheetId}
                        onChange={(e) => handleSpreadsheetInput(e.target.value)}
                        placeholder="Paste Google Sheet URL or ID..."
                        className={`${inputClass} pr-10 ${isValidId ? 'border-green-500/50' : ''}`}
                    />
                    {isValidId && (
                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                    )}
                </div>
                {spreadsheetId && !isValidId && (
                    <p className="text-orange-400 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        ID looks too short
                    </p>
                )}
            </div>

            {/* Sheet Name */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Sheet Tab Name
                </label>
                <input
                    type="text"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    placeholder="Sheet1"
                    className={inputClass}
                />
                <p className="text-slate-500 text-xs mt-1">The tab name at the bottom of your spreadsheet</p>
            </div>

            {/* Webhook URL */}
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    Apps Script Webhook URL
                </label>
                <div className="relative">
                    <input
                        type="text"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://script.google.com/macros/s/.../exec"
                        className={`${inputClass} pr-10 ${isValidWebhook ? 'border-green-500/50' : ''}`}
                    />
                    {isValidWebhook && (
                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
                    )}
                </div>
                <p className="text-slate-500 text-xs mt-1">
                    Deploy an Apps Script to receive form data
                </p>
            </div>

            {/* Setup Guide */}
            {showGuide && (
                <div className="p-4 bg-slate-800/80 border border-green-500/30 rounded-xl space-y-3">
                    <h4 className="text-green-400 font-semibold text-sm flex items-center gap-2">
                        📋 Setup Guide
                    </h4>

                    <div className="space-y-2 text-sm">
                        <div className="flex gap-2">
                            <span className="text-green-400 font-bold">1.</span>
                            <span className="text-slate-300">
                                Open or create a Google Sheet
                                <a
                                    href="https://sheets.google.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-green-400 hover:underline ml-1 inline-flex items-center gap-0.5"
                                >
                                    sheets.google.com <ExternalLink className="w-3 h-3" />
                                </a>
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <span className="text-green-400 font-bold">2.</span>
                            <span className="text-slate-300">
                                Copy the spreadsheet URL from your browser
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <span className="text-green-400 font-bold">3.</span>
                            <span className="text-slate-300">
                                Go to <span className="text-green-400">Extensions → Apps Script</span>
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <span className="text-green-400 font-bold">4.</span>
                            <span className="text-slate-300">
                                Paste this code:
                            </span>
                        </div>

                        <div className="bg-slate-900/80 p-2 rounded-lg text-[10px] font-mono text-green-300 overflow-x-auto">
                            <pre>{`function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  var rowData = data.rowData || data;
  
  // Add unique row_id if not present
  if (!rowData.row_id) {
    rowData.row_id = Utilities.getUuid();
  }
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var row = [];
  headers.forEach(function(h) { row.push(rowData[h] || ''); });
  sheet.appendRow(row);
  return ContentService.createTextOutput(JSON.stringify({success: true}));
}`}</pre>
                        </div>

                        <div className="flex gap-2">
                            <span className="text-green-400 font-bold">5.</span>
                            <span className="text-slate-300">
                                Click <span className="text-green-400">Deploy → New deployment → Web app</span>
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <span className="text-green-400 font-bold">6.</span>
                            <span className="text-slate-300">
                                Set "Who has access" to <span className="text-green-400">Anyone</span>, then deploy
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <span className="text-green-400 font-bold">7.</span>
                            <span className="text-slate-300">
                                Copy the Web app URL and paste it above
                            </span>
                        </div>
                    </div>

                    <div className="mt-3 p-2 bg-slate-900/50 rounded-lg">
                        <p className="text-slate-500 text-xs">
                            💡 <strong>Tip for Order Sync:</strong> Add these headers: "Order ID", "Customer Name", "Products", "Quantities", "Prices", "Total", "Timestamp", "Customer Phone", "Customer Address"
                        </p>
                    </div>
                </div>
            )}

            {/* Status */}
            {isFullyConfigured ? (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-green-400 text-sm font-medium">Ready to sync!</span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1">
                        {sourceType === 'checkout'
                            ? `Complete order data will be added as new rows to "${sheetName}"`
                            : sourceType === 'form'
                                ? `Form submissions will be added as new rows to "${sheetName}"`
                                : `Data will be added as new rows to "${sheetName}" (auto-detected source)`
                        }
                    </p>
                </div>
            ) : isValidId && !isValidWebhook ? (
                <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-400" />
                        <span className="text-orange-400 text-sm font-medium">Webhook URL required</span>
                    </div>
                    <p className="text-slate-400 text-xs mt-1">
                        Add the Apps Script webhook URL to enable sync
                    </p>
                </div>
            ) : null}
        </div>
    );
};

export default GoogleSheetNodeForm;
