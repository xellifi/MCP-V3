import React, { useState, useEffect } from 'react';
import { HelpCircle, ExternalLink, Check, AlertCircle, Link, ShoppingCart, FileText, Package } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface GoogleSheetNodeFormProps {
    workspaceId: string;
    initialConfig?: any;
    onChange: (config: any) => void;
}

type SourceType = 'form' | 'checkout' | 'auto';

const GoogleSheetNodeForm: React.FC<GoogleSheetNodeFormProps> = ({ workspaceId, initialConfig, onChange }) => {
    const { isDark } = useTheme();
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

    // Theme-aware styles
    const inputClass = isDark
        ? "w-full px-3 py-2 bg-slate-800/60 border border-slate-600/50 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
        : "w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50";

    const labelClass = isDark
        ? "block text-sm font-medium text-slate-300 mb-1.5"
        : "block text-sm font-bold text-slate-700 mb-1.5";

    const mutedText = isDark ? "text-slate-400" : "text-slate-500";
    const cardBg = isDark ? "bg-slate-800/40" : "bg-white";
    const borderColor = isDark ? "border-slate-600/30" : "border-slate-200";

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
        <div className="space-y-6">
            {/* Header */}
            <div className={`flex items-center gap-3 p-4 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className={`p-2.5 rounded-xl ${isDark ? 'bg-green-500/20' : 'bg-green-50'}`}>
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none">
                        <rect x="3" y="3" width="18" height="18" rx="2" className="fill-green-500" />
                        <rect x="6" y="7" width="12" height="2" rx="0.5" className="fill-white" />
                        <rect x="6" y="11" width="12" height="2" rx="0.5" className="fill-white" />
                        <rect x="6" y="15" width="8" height="2" rx="0.5" className="fill-white" />
                    </svg>
                </div>
                <div>
                    <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>Google Sheets Sync</h3>
                    <p className={`text-xs ${mutedText}`}>Sync form submissions to spreadsheet</p>
                </div>
            </div>

            {/* Source Type Selection */}
            <div>
                <label className={labelClass}>
                    Data Source
                </label>
                <div className="space-y-2">
                    {sourceOptions.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setSourceType(option.value)}
                            className={`w-full p-3 rounded-xl border transition-all text-left flex items-start gap-3 ${sourceType === option.value
                                ? (isDark ? 'bg-green-500/20 border-green-500/50' : 'bg-green-50 border-green-200 shadow-sm')
                                : (isDark ? 'bg-slate-800/40 border-slate-600/30 hover:border-slate-500/50' : 'bg-white border-slate-200 hover:border-slate-300')
                                }`}
                        >
                            <div className={`p-1.5 rounded-lg ${sourceType === option.value
                                ? (isDark ? 'bg-green-500/30 text-green-400' : 'bg-green-100 text-green-700')
                                : (isDark ? 'bg-slate-700/50 text-slate-400' : 'bg-slate-100 text-slate-500')
                                }`}>
                                {option.icon}
                            </div>
                            <div className="flex-1">
                                <div className={`text-sm font-medium ${sourceType === option.value
                                    ? (isDark ? 'text-white' : 'text-slate-900')
                                    : (isDark ? 'text-slate-300' : 'text-slate-600')
                                    }`}>
                                    {option.label}
                                </div>
                                <div className={`text-xs ${mutedText}`}>{option.desc}</div>
                            </div>
                            {sourceType === option.value && (
                                <Check className={`w-5 h-5 mt-0.5 ${isDark ? 'text-green-500' : 'text-green-600'}`} />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Connection Info Box */}
            <div className={`p-3 border rounded-xl ${isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-100'}`}>
                <div className="flex items-center gap-2">
                    <Link className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-500'}`} />
                    <span className={`font-bold text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>How it works</span>
                </div>
                <p className={`text-[11px] mt-1 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {sourceType === 'form' ? (
                        <>Connect this node to a <span className={`font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Form</span> node. When the form is submitted, data will automatically sync to your Google Sheet.</>
                    ) : sourceType === 'checkout' ? (
                        <>Connect this node after <span className={`font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>Checkout</span> or <span className={`font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Invoice</span> node. Complete order data (main product + upsells + downsells) will sync to your Google Sheet.</>
                    ) : (
                        <>Connect to a <span className={`font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>Form</span> node for form data, or <span className={`font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>Checkout/Invoice</span> node for complete order data including upsells and downsells.</>
                    )}
                </p>
            </div>

            {/* Order-specific options - only show for checkout/auto */}
            {(sourceType === 'checkout' || sourceType === 'auto') && (
                <div className={`p-4 border rounded-xl space-y-3 ${isDark ? 'bg-slate-800/40 border-slate-600/30' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <Package className={`w-4 h-4 ${isDark ? 'text-orange-400' : 'text-orange-500'}`} />
                        <span className={`font-bold text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Order Data Options</span>
                    </div>

                    {[
                        { label: 'Include main product', checked: includeMainProduct, onChange: setIncludeMainProduct },
                        { label: 'Include upsell products', checked: includeUpsells, onChange: setIncludeUpsells },
                        { label: 'Include downsell products', checked: includeDownsells, onChange: setIncludeDownsells },
                        { label: 'Include customer info (name, address, phone)', checked: includeCustomerInfo, onChange: setIncludeCustomerInfo },
                        { label: 'Include order timestamp', checked: includeTimestamp, onChange: setIncludeTimestamp },
                    ].map((item, idx) => (
                        <label key={idx} className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={item.checked}
                                onChange={(e) => item.onChange(e.target.checked)}
                                className={`w-4 h-4 rounded border-slate-300 text-green-500 focus:ring-green-500/50 transition-colors ${isDark ? 'bg-slate-700 border-slate-600' : 'bg-white'}`}
                            />
                            <span className={`text-xs transition-colors ${isDark ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-600 group-hover:text-slate-800'}`}>{item.label}</span>
                        </label>
                    ))}
                </div>
            )}

            {/* Spreadsheet ID */}
            <div>
                <div className="flex items-center justify-between mb-1.5">
                    <label className={labelClass}>
                        Spreadsheet ID or URL
                    </label>
                    <button
                        type="button"
                        onClick={() => setShowGuide(!showGuide)}
                        className={`transition text-xs font-medium flex items-center gap-1 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800'}`}
                        title="Setup Guide"
                    >
                        <HelpCircle className="w-3.5 h-3.5" /> Setup Guide
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
                <label className={labelClass}>
                    Sheet Tab Name
                </label>
                <input
                    type="text"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    placeholder="Sheet1"
                    className={inputClass}
                />
                <p className={`text-xs mt-1 ${mutedText}`}>The tab name at the bottom of your spreadsheet</p>
            </div>

            {/* Webhook URL */}
            <div>
                <label className={labelClass}>
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
                <p className={`text-xs mt-1 ${mutedText}`}>
                    Deploy an Apps Script to receive form data
                </p>
            </div>

            {/* Setup Guide */}
            {showGuide && (
                <div className={`p-4 border rounded-xl space-y-4 shadow-sm ${isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <h4 className={`font-bold text-sm flex items-center gap-2 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                        📋 Setup Guide
                    </h4>

                    <div className="space-y-3 text-sm">
                        <div className="flex gap-2">
                            <span className={`font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>1.</span>
                            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                                Open or create a Google Sheet
                                <a
                                    href="https://sheets.google.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`font-medium hover:underline ml-1 inline-flex items-center gap-0.5 ${isDark ? 'text-green-400' : 'text-green-600'}`}
                                >
                                    sheets.google.com <ExternalLink className="w-3 h-3" />
                                </a>
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <span className={`font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>2.</span>
                            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                                Copy the spreadsheet URL from your browser
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <span className={`font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>3.</span>
                            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                                Go to <span className={`font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>Extensions → Apps Script</span>
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <span className={`font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>4.</span>
                            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                                Paste this code:
                            </span>
                        </div>

                        <div className={`p-3 rounded-lg text-[10px] font-mono overflow-x-auto border ${isDark ? 'bg-slate-950 border-slate-800 text-green-300' : 'bg-slate-50 border-slate-200 text-slate-800'}`}>
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
                            <span className={`font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>5.</span>
                            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                                Click <span className={`font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>Deploy → New deployment → Web app</span>
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <span className={`font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>6.</span>
                            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                                Set "Who has access" to <span className={`font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>Anyone</span>, then deploy
                            </span>
                        </div>

                        <div className="flex gap-2">
                            <span className={`font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>7.</span>
                            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
                                Copy the Web app URL and paste it above
                            </span>
                        </div>
                    </div>

                    <div className={`mt-3 p-3 rounded-lg border ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-slate-50 border-slate-100'}`}>
                        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            💡 <strong>Tip for Order Sync:</strong> Add these headers: "Order ID", "Customer Name", "Products", "Quantities", "Prices", "Total", "Timestamp", "Customer Phone", "Customer Address"
                        </p>
                    </div>
                </div>
            )}

            {/* Status */}
            {isFullyConfigured ? (
                <div className={`p-4 border rounded-xl ${isDark ? 'bg-green-500/10 border-green-500/30' : 'bg-green-50 border-green-200'}`}>
                    <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                        <span className={`text-sm font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>Ready to sync!</span>
                    </div>
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-green-800/70'}`}>
                        {sourceType === 'checkout'
                            ? `Complete order data will be added as new rows to "${sheetName}"`
                            : sourceType === 'form'
                                ? `Form submissions will be added as new rows to "${sheetName}"`
                                : `Data will be added as new rows to "${sheetName}" (auto-detected source)`
                        }
                    </p>
                </div>
            ) : isValidId && !isValidWebhook ? (
                <div className={`p-4 border rounded-xl ${isDark ? 'bg-orange-500/10 border-orange-500/30' : 'bg-orange-50 border-orange-200'}`}>
                    <div className="flex items-center gap-2">
                        <AlertCircle className={`w-4 h-4 ${isDark ? 'text-orange-400' : 'text-orange-600'}`} />
                        <span className={`text-sm font-bold ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>Webhook URL required</span>
                    </div>
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-orange-800/70'}`}>
                        Add the Apps Script webhook URL to enable sync
                    </p>
                </div>
            ) : null}
        </div>
    );
};

export default GoogleSheetNodeForm;
