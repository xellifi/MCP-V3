import React, { useState } from 'react';
import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    useReactFlow,
    EdgeProps,
} from 'reactflow';
import { X } from 'lucide-react';

interface CustomEdgeData {
    executionState?: 'idle' | 'executing' | 'completed';
}

const CustomEdge: React.FC<EdgeProps<CustomEdgeData>> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    selected,
    data,
}) => {
    const { setEdges } = useReactFlow();
    const [isHovered, setIsHovered] = useState(false);
    const executionState = data?.executionState || 'idle';

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const onEdgeDelete = (evt: React.MouseEvent | React.TouchEvent) => {
        evt.stopPropagation();
        evt.preventDefault();
        setEdges((edges) => edges.filter((edge) => edge.id !== id));
    };

    const showDeleteButton = isHovered || selected;
    const isVertical = sourcePosition === 'top' && targetPosition === 'bottom';
    const isExecuting = executionState === 'executing';
    const isCompleted = executionState === 'completed';

    // Determine stroke color based on state
    const getStrokeColor = () => {
        if (showDeleteButton) return '#f59e0b';
        if (isCompleted) return '#10b981'; // green
        if (isExecuting) return '#3b82f6'; // blue for lightning
        return style.stroke?.toString() || '#94a3b8';
    };

    const edgeStyle = {
        stroke: getStrokeColor(),
        strokeWidth: showDeleteButton ? 3 : 2,
        strokeDasharray: isVertical ? '10, 10' : 'none',
    };

    // Unique ID for gradient
    const gradientId = `lightning-gradient-${id}`;
    const glowId = `glow-${id}`;

    return (
        <g
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={() => setIsHovered(true)}
        >
            {/* Define animated gradient and glow for blue lightning effect */}
            <defs>
                <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}>
                    <stop offset="0%" stopColor={isCompleted ? '#10b981' : '#94a3b8'} />
                    <stop offset="40%" stopColor={isCompleted ? '#10b981' : '#94a3b8'}>
                        {isExecuting && <animate attributeName="offset" values="0;0.8;0" dur="1s" repeatCount="indefinite" />}
                    </stop>
                    <stop offset="50%" stopColor={isExecuting ? '#60a5fa' : (isCompleted ? '#10b981' : '#94a3b8')}>
                        {isExecuting && <animate attributeName="offset" values="0.1;0.9;0.1" dur="1s" repeatCount="indefinite" />}
                    </stop>
                    <stop offset="60%" stopColor={isCompleted ? '#10b981' : '#94a3b8'}>
                        {isExecuting && <animate attributeName="offset" values="0.2;1;0.2" dur="1s" repeatCount="indefinite" />}
                    </stop>
                    <stop offset="100%" stopColor={isCompleted ? '#10b981' : '#94a3b8'} />
                </linearGradient>

                {/* Strong blue glow filter for lightning effect */}
                <filter id={glowId} x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                    <feFlood floodColor="#3b82f6" floodOpacity="0.8" result="glowColor" />
                    <feComposite in="glowColor" in2="coloredBlur" operator="in" result="softGlow" />
                    <feMerge>
                        <feMergeNode in="softGlow" />
                        <feMergeNode in="softGlow" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Invisible wider path for easier hover/touch detection */}
            <path
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={50}
                style={{ cursor: 'pointer' }}
            />

            {/* Blue glow effect when executing */}
            {isExecuting && (
                <path
                    d={edgePath}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth={8}
                    strokeOpacity={0.3}
                    filter={`url(#${glowId})`}
                    style={{ pointerEvents: 'none' }}
                    className="animate-pulse"
                />
            )}

            {/* Main visible edge path */}
            <path
                d={edgePath}
                fill="none"
                stroke={isExecuting ? `url(#${gradientId})` : edgeStyle.stroke}
                strokeWidth={isExecuting ? 3 : 2}
                strokeDasharray={edgeStyle.strokeDasharray}
                markerEnd={markerEnd}
                style={{
                    pointerEvents: 'none',
                    transition: 'stroke 0.3s ease-in-out',
                }}
                className={`react-flow__edge-path ${isVertical ? 'animated-edge' : ''}`}
            />

            {/* Animated BLUE lightning orb traveling along path when executing */}
            {isExecuting && (
                <>
                    {/* Outer glow orb */}
                    <circle r="10" fill="#3b82f6" opacity="0.4" filter={`url(#${glowId})`}>
                        <animateMotion dur="1s" repeatCount="indefinite" path={edgePath} />
                    </circle>
                    {/* Middle orb */}
                    <circle r="6" fill="#60a5fa" filter={`url(#${glowId})`}>
                        <animateMotion dur="1s" repeatCount="indefinite" path={edgePath} />
                    </circle>
                    {/* Inner bright core */}
                    <circle r="3" fill="white">
                        <animateMotion dur="1s" repeatCount="indefinite" path={edgePath} />
                    </circle>
                </>
            )}

            {/* Green dot when completed */}
            {isCompleted && (
                <circle cx={labelX} cy={labelY} r="4" fill="#10b981" />
            )}

            {isVertical && (
                <style>
                    {`
                        @keyframes dashdraw {
                            from { stroke-dashoffset: 20; }
                            to { stroke-dashoffset: 0; }
                        }
                        .animated-edge {
                            animation: dashdraw 1s linear infinite;
                        }
                    `}
                </style>
            )}

            {/* Delete button at the center of the edge */}
            <EdgeLabelRenderer>
                <div
                    style={{
                        position: 'absolute',
                        transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        pointerEvents: 'all',
                        opacity: showDeleteButton ? 1 : 0,
                        visibility: showDeleteButton ? 'visible' : 'hidden',
                        transition: 'opacity 0.15s ease-in-out',
                    }}
                    className="nodrag nopan"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <button
                        type="button"
                        onClick={onEdgeDelete}
                        onTouchEnd={onEdgeDelete}
                        className="w-5 h-5 bg-amber-500 hover:bg-red-500 rounded-full flex items-center justify-center shadow-md transition-all hover:scale-110 border border-white/50"
                        title="Delete connection"
                        style={{ pointerEvents: 'auto' }}
                    >
                        <X className="w-3 h-3 text-white" strokeWidth={3} />
                    </button>
                </div>
            </EdgeLabelRenderer>
        </g>
    );
};

export default CustomEdge;

