import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Facebook } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

interface ConnectedPage {
    page_id: string;
    name: string;
    page_image_url?: string;
}

interface FacebookPageDropdownProps {
    workspaceId: string;
    selectedPageId: string;
    onSelect: (pageId: string) => void;
    /** Filter to only show pages with automation enabled */
    automationEnabledOnly?: boolean;
    /** Custom placeholder text */
    placeholder?: string;
    /** Show error state */
    error?: boolean;
    /** Label text */
    label?: string;
    /** Helper text below label */
    helperText?: string;
    /** Required field indicator */
    required?: boolean;
    /** Custom class for the container */
    className?: string;
    /** Dark mode override */
    isDark?: boolean;
}

const FacebookPageDropdown: React.FC<FacebookPageDropdownProps> = ({
    workspaceId,
    selectedPageId,
    onSelect,
    automationEnabledOnly = true,
    placeholder = '-- Select a Facebook page --',
    error = false,
    label,
    helperText,
    required = false,
    className = '',
    isDark: isDarkProp
}) => {
    const { isDark: isDarkContext } = useTheme();
    const isDark = isDarkProp ?? isDarkContext;
    const [pages, setPages] = useState<ConnectedPage[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Text colors based on theme
    const textPrimary = isDark ? 'text-white' : 'text-gray-900';
    const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';

    // Fetch pages on mount
    useEffect(() => {
        const fetchPages = async () => {
            if (!workspaceId) return;

            setLoading(true);
            try {
                let query = supabase
                    .from('connected_pages')
                    .select('page_id, name, page_image_url')
                    .eq('workspace_id', workspaceId);

                if (automationEnabledOnly) {
                    query = query.eq('is_automation_enabled', true);
                }

                const { data, error } = await query;

                if (!error && data) {
                    setPages(data);
                    // Auto-select if only one page
                    if (data.length === 1 && !selectedPageId) {
                        onSelect(data[0].page_id);
                    }
                }
            } catch (err) {
                console.error('Error fetching pages:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPages();
    }, [workspaceId, automationEnabledOnly]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedPage = pages.find(p => p.page_id === selectedPageId);

    const getPageImageUrl = (pageId: string) => {
        return `https://graph.facebook.com/${pageId}/picture?type=small`;
    };

    if (loading) {
        return (
            <div className={className}>
                {label && (
                    <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                        {label} {required && <span className="text-red-500">*</span>}
                    </label>
                )}
                <div className={`w-full px-4 py-3 rounded-xl border ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-300'
                    } animate-pulse`}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-600" />
                        <div className="h-4 w-32 bg-slate-600 rounded" />
                    </div>
                </div>
            </div>
        );
    }

    if (pages.length === 0) {
        return (
            <div className={className}>
                {label && (
                    <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                        {label} {required && <span className="text-red-500">*</span>}
                    </label>
                )}
                <div className={`text-center py-4 ${textMuted}`}>
                    <Facebook className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="mb-2 text-sm">
                        {automationEnabledOnly
                            ? 'No pages with automation enabled'
                            : 'No connected pages found'
                        }
                    </p>
                    <a
                        href="/connected-pages"
                        className="text-indigo-400 hover:text-indigo-300 underline text-sm"
                    >
                        {automationEnabledOnly
                            ? 'Enable automation on a page'
                            : 'Connect a Facebook page'
                        }
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className={className} ref={dropdownRef}>
            {label && (
                <label className={`block text-sm font-medium ${textPrimary} mb-2`}>
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            {helperText && (
                <p className={`text-xs ${textMuted} mb-3`}>{helperText}</p>
            )}

            <div className="relative">
                {/* Dropdown Trigger */}
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-full px-4 py-3 rounded-xl border text-left flex items-center justify-between transition-colors ${error
                        ? 'border-red-500 focus:ring-red-500/50'
                        : isDark
                            ? 'bg-slate-800 border-slate-600 hover:bg-slate-700 focus:ring-indigo-500/50'
                            : 'bg-white border-gray-300 hover:bg-gray-50 focus:ring-indigo-500/50'
                        } focus:outline-none focus:ring-2`}
                >
                    {selectedPage ? (
                        <div className="flex items-center gap-3">
                            <img
                                src={getPageImageUrl(selectedPage.page_id)}
                                alt={selectedPage.name}
                                className="w-8 h-8 rounded-full object-cover border-2 border-indigo-500/30"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/32?text=FB';
                                }}
                            />
                            <span className={`font-medium ${textPrimary}`}>
                                {selectedPage.name}
                            </span>
                        </div>
                    ) : (
                        <span className={textMuted}>{placeholder}</span>
                    )}
                    <ChevronDown className={`w-5 h-5 ${textMuted} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Options */}
                {isOpen && (
                    <div className={`absolute z-50 w-full mt-2 rounded-xl border shadow-xl overflow-hidden ${isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-gray-200'
                        }`}>
                        <div className="max-h-64 overflow-y-auto">
                            {pages.map(page => (
                                <button
                                    key={page.page_id}
                                    type="button"
                                    onClick={() => {
                                        onSelect(page.page_id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${selectedPageId === page.page_id
                                        ? isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'
                                        : isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                                        }`}
                                >
                                    <img
                                        src={getPageImageUrl(page.page_id)}
                                        alt={page.name}
                                        className={`w-10 h-10 rounded-full object-cover border-2 ${selectedPageId === page.page_id
                                            ? 'border-indigo-500'
                                            : isDark ? 'border-white/20' : 'border-gray-200'
                                            }`}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40?text=FB';
                                        }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-medium truncate ${selectedPageId === page.page_id
                                            ? 'text-indigo-400'
                                            : textPrimary
                                            }`}>
                                            {page.name}
                                        </p>
                                    </div>
                                    {selectedPageId === page.page_id && (
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FacebookPageDropdown;
