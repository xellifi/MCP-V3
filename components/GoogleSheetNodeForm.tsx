import React, { useState, useEffect } from 'react';
import { HelpCircle, ExternalLink, Check, AlertCircle, Link } from 'lucide-react';

interface GoogleSheetNodeFormProps {
    workspaceId: string;
    initialConfig?: any;
    onChange: (config: any) => void;
}

const GoogleSheetNodeForm: React.FC<GoogleSheetNodeFormProps> = ({ workspaceId, initialConfig, onChange }) => {
    const [spreadsheetId, setSpreadsheetId] = useState(initialConfig?.spreadsheetId || '');
    const [sheetName, setSheetName] = useState(initialConfig?.sheetName || 'Sheet1');
    const [webhookUrl, setWebhookUrl] = useState(initialConfig?.webhookUrl || '');
    const [showGuide, setShowGuide] = useState(false);

    useEffect(() => {
        onChange({
            spreadsheetId,
            sheetName,
            webhookUrl,
        });
    }, [spreadsheetId, sheetName, webhookUrl]);

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

            {/* Connection Info Box */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <div className="flex items-center gap-2">
                    <Link className="w-4 h-4 text-blue-400" />
                    <span className="text-blue-400 font-medium text-xs">How it works</span>
                </div>
                <p className="text-slate-400 text-[10px] mt-1 leading-relaxed">
                    Connect this node to a <span className="text-purple-400 font-medium">Form</span> node. When the form is submitted, data will automatically sync to your Google Sheet.
                </p>
            </div>

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
  var row = [];
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  headers.forEach(function(h) { row.push(data[h] || ''); });
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
                            💡 <strong>Tip:</strong> Add headers in your sheet's first row matching field names (e.g., "Full Name", "Phone", "Address").
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
                        Form submissions will be added as new rows to "{sheetName}"
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
