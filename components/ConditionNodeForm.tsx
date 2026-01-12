import React, { useState, useEffect } from 'react';
import { Plus, Trash2, GitBranch, AlertCircle, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ConditionNodeFormProps {
    workspaceId: string;
    initialConfig?: any;
    onChange: (config: any) => void;
}

// Available variables that can be checked
const AVAILABLE_VARIABLES = [
    { value: 'subscriber_name', label: 'Subscriber Name', type: 'string' },
    { value: 'subscriber_id', label: 'Subscriber ID', type: 'string' },
    { value: 'message_text', label: 'Message Text', type: 'string' },
    { value: 'comment_text', label: 'Comment Text', type: 'string' },
    { value: 'payment_method', label: 'Payment Method', type: 'string' },
    { value: 'order_total', label: 'Order Total', type: 'number' },
    { value: 'quantity', label: 'Quantity', type: 'number' },
    { value: 'upsell_response', label: 'Upsell Response', type: 'string' },  // 'accepted' or 'declined'
    { value: 'downsell_response', label: 'Downsell Response', type: 'string' },  // 'accepted' or 'declined'
    { value: 'cart_count', label: 'Cart Item Count', type: 'number' },
    { value: 'webview_completed', label: 'Webview Completed', type: 'boolean' },
    { value: 'has_coupon', label: 'Has Coupon Applied', type: 'boolean' },
    { value: 'is_returning', label: 'Is Returning Customer', type: 'boolean' },
    { value: 'form_submitted', label: 'Form Submitted', type: 'boolean' },
    { value: 'custom', label: 'Custom Variable...', type: 'custom' },
];

// Operators based on variable type
const OPERATORS = {
    string: [
        { value: 'equals', label: 'equals' },
        { value: 'not_equals', label: 'does not equal' },
        { value: 'contains', label: 'contains' },
        { value: 'not_contains', label: 'does not contain' },
        { value: 'starts_with', label: 'starts with' },
        { value: 'ends_with', label: 'ends with' },
        { value: 'is_empty', label: 'is empty' },
        { value: 'is_not_empty', label: 'is not empty' },
    ],
    number: [
        { value: 'equals', label: 'equals' },
        { value: 'not_equals', label: 'does not equal' },
        { value: 'greater_than', label: 'is greater than' },
        { value: 'less_than', label: 'is less than' },
        { value: 'greater_or_equal', label: 'is greater or equal to' },
        { value: 'less_or_equal', label: 'is less or equal to' },
    ],
    boolean: [
        { value: 'is_true', label: 'is true' },
        { value: 'is_false', label: 'is false' },
    ],
    custom: [
        { value: 'equals', label: 'equals' },
        { value: 'not_equals', label: 'does not equal' },
        { value: 'contains', label: 'contains' },
        { value: 'is_empty', label: 'is empty' },
        { value: 'is_not_empty', label: 'is not empty' },
    ],
};

interface Condition {
    id: string;
    variable: string;
    customVariable?: string;
    operator: string;
    value: string;
}

const ConditionNodeForm: React.FC<ConditionNodeFormProps> = ({ workspaceId, initialConfig, onChange }) => {
    const { isDark } = useTheme();
    const [conditionName, setConditionName] = useState(initialConfig?.conditionName || 'Check Condition');
    const [matchType, setMatchType] = useState<'all' | 'any'>(initialConfig?.matchType || 'all');
    const [conditions, setConditions] = useState<Condition[]>(initialConfig?.conditions || [
        { id: 'cond_1', variable: 'message_text', operator: 'contains', value: '' }
    ]);

    useEffect(() => {
        // Create a readable condition summary
        const summary = conditions.length > 0
            ? conditions.map(c => {
                const varLabel = AVAILABLE_VARIABLES.find(v => v.value === c.variable)?.label || c.customVariable || c.variable;
                const opLabel = Object.values(OPERATORS).flat().find(o => o.value === c.operator)?.label || c.operator;
                const needsValue = !['is_empty', 'is_not_empty', 'is_true', 'is_false'].includes(c.operator);
                return needsValue ? `${varLabel} ${opLabel} "${c.value}"` : `${varLabel} ${opLabel}`;
            }).join(matchType === 'all' ? ' AND ' : ' OR ')
            : 'No conditions set';

        onChange({
            conditionName,
            matchType,
            conditions,
            conditionSummary: summary,
        });
    }, [conditionName, matchType, conditions]);

    const addCondition = () => {
        setConditions([
            ...conditions,
            { id: `cond_${Date.now()}`, variable: 'message_text', operator: 'contains', value: '' }
        ]);
    };

    const updateCondition = (id: string, updates: Partial<Condition>) => {
        setConditions(conditions.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    const removeCondition = (id: string) => {
        if (conditions.length > 1) {
            setConditions(conditions.filter(c => c.id !== id));
        }
    };

    const getVariableType = (variable: string): string => {
        return AVAILABLE_VARIABLES.find(v => v.value === variable)?.type || 'string';
    };

    const getOperatorsForVariable = (variable: string) => {
        const type = getVariableType(variable) as keyof typeof OPERATORS;
        return OPERATORS[type] || OPERATORS.string;
    };

    const needsValue = (operator: string): boolean => {
        return !['is_empty', 'is_not_empty', 'is_true', 'is_false'].includes(operator);
    };

    const inputClass = `w-full px-3 py-2 ${isDark ? 'bg-slate-800/60 border-slate-600/50 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50`;
    const selectClass = `w-full px-3 py-2 ${isDark ? 'bg-slate-800/60 border-slate-600/50 text-white' : 'bg-white border-slate-200 text-slate-900'} border rounded-xl text-sm focus:outline-none cursor-pointer`;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-amber-500/20 rounded-xl">
                    <GitBranch className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                    <h3 className={`${isDark ? 'text-white' : 'text-slate-900'} font-semibold`}>Condition Node</h3>
                    <p className="text-slate-400 text-xs">Branch flow based on conditions</p>
                </div>
            </div>

            {/* Condition Name */}
            <div>
                <label className={`block text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'} mb-1.5`}>Condition Name</label>
                <input
                    type="text"
                    value={conditionName}
                    onChange={(e) => setConditionName(e.target.value)}
                    className={inputClass}
                    placeholder="e.g., Check Payment Method"
                />
            </div>

            {/* Match Type */}
            <div className={`p-3 ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'} border rounded-xl`}>
                <label className={`block text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'} mb-2`}>When to take the TRUE path:</label>
                <div className="flex gap-2">
                    <button
                        onClick={() => setMatchType('all')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${matchType === 'all'
                            ? 'bg-amber-500 text-white'
                            : (isDark ? 'bg-slate-700/50 text-slate-400 hover:text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50')
                            }`}
                    >
                        ALL conditions match
                    </button>
                    <button
                        onClick={() => setMatchType('any')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${matchType === 'any'
                            ? 'bg-amber-500 text-white'
                            : (isDark ? 'bg-slate-700/50 text-slate-400 hover:text-white' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50')
                            }`}
                    >
                        ANY condition matches
                    </button>
                </div>
            </div>

            {/* Conditions List */}
            <div className="space-y-3">
                <label className={`block text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Conditions:</label>

                {conditions.map((condition, index) => {
                    const varType = getVariableType(condition.variable);
                    const operators = getOperatorsForVariable(condition.variable);
                    const showValue = needsValue(condition.operator);
                    const isCustom = condition.variable === 'custom';

                    return (
                        <div key={condition.id} className={`p-3 ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'} border rounded-xl space-y-2`}>
                            {/* Condition header */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">
                                    {index > 0 && (
                                        <span className="text-amber-400 font-medium mr-1">
                                            {matchType === 'all' ? 'AND' : 'OR'}
                                        </span>
                                    )}
                                    Condition {index + 1}
                                </span>
                                {conditions.length > 1 && (
                                    <button
                                        onClick={() => removeCondition(condition.id)}
                                        className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Variable selector */}
                            <select
                                value={condition.variable}
                                onChange={(e) => {
                                    const newVar = e.target.value;
                                    const newType = getVariableType(newVar);
                                    const defaultOp = OPERATORS[newType as keyof typeof OPERATORS]?.[0]?.value || 'equals';
                                    updateCondition(condition.id, {
                                        variable: newVar,
                                        operator: defaultOp,
                                        value: ''
                                    });
                                }}
                                className={selectClass}
                            >
                                {AVAILABLE_VARIABLES.map(v => (
                                    <option key={v.value} value={v.value}>{v.label}</option>
                                ))}
                            </select>

                            {/* Custom variable input */}
                            {isCustom && (
                                <input
                                    type="text"
                                    value={condition.customVariable || ''}
                                    onChange={(e) => updateCondition(condition.id, { customVariable: e.target.value })}
                                    className={inputClass}
                                    placeholder="Enter variable name..."
                                />
                            )}

                            {/* Operator selector */}
                            <select
                                value={condition.operator}
                                onChange={(e) => updateCondition(condition.id, { operator: e.target.value })}
                                className={selectClass}
                            >
                                {operators.map(op => (
                                    <option key={op.value} value={op.value}>{op.label}</option>
                                ))}
                            </select>

                            {/* Value input */}
                            {showValue && (
                                <input
                                    type={varType === 'number' ? 'number' : 'text'}
                                    value={condition.value}
                                    onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                                    className={inputClass}
                                    placeholder={varType === 'number' ? 'Enter number...' : 'Enter value...'}
                                />
                            )}
                        </div>
                    );
                })}

                {/* Add condition button */}
                <button
                    onClick={addCondition}
                    className="w-full py-2 px-3 border border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-amber-400 hover:border-amber-500/50 transition-all flex items-center justify-center gap-2 text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Add Condition
                </button>
            </div>

            {/* Output paths info */}
            <div className={`p-3 ${isDark ? 'bg-slate-800/40 border-slate-700/50' : 'bg-slate-50 border-slate-200'} border rounded-xl space-y-2`}>
                <div className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'} mb-2`}>Output Paths:</div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-400">TRUE</span>
                    <span className="text-xs text-slate-500">— Conditions matched</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-xs text-red-400">FALSE</span>
                    <span className="text-xs text-slate-500">— Conditions not matched</span>
                </div>
            </div>

            {/* Preview */}
            {conditions.length > 0 && conditions[0].value && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                        <Check className="w-4 h-4 text-amber-400" />
                        <span className="text-amber-400 font-medium text-xs">Condition Preview</span>
                    </div>
                    <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        If {conditions.map((c, i) => {
                            const varLabel = AVAILABLE_VARIABLES.find(v => v.value === c.variable)?.label || c.customVariable || c.variable;
                            const opLabel = Object.values(OPERATORS).flat().find(o => o.value === c.operator)?.label || c.operator;
                            const prefix = i > 0 ? (matchType === 'all' ? ' AND ' : ' OR ') : '';
                            const val = needsValue(c.operator) ? ` "${c.value}"` : '';
                            return `${prefix}${varLabel} ${opLabel}${val}`;
                        }).join('')}
                    </p>
                </div>
            )}
        </div>
    );
};

export default ConditionNodeForm;
