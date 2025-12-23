import React, { useState } from 'react';
import {
    BaseEdge,
    EdgeLabelRenderer,
    getSmoothStepPath,
    useReactFlow,
    EdgeProps,
} from 'reactflow';
import { X } from 'lucide-react';

const CustomEdge: React.FC<EdgeProps> = ({
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
}) => {
    const { setEdges } = useReactFlow();
    const [isHovered, setIsHovered] = useState(false);

    const [edgePath, labelX, labelY] = getSmoothStepPath({
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

    // Show delete button on hover or when selected (for mobile touch)
    const showDeleteButton = isHovered || selected;

    return (
        <g
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onTouchStart={() => setIsHovered(true)}
        >
            {/* Invisible wider path for easier hover/touch detection */}
            <path
                d={edgePath}
                fill="none"
                stroke="transparent"
                strokeWidth={30}
                style={{ cursor: 'pointer' }}
            />
            {/* Visible edge path */}
            <path
                d={edgePath}
                fill="none"
                stroke={showDeleteButton ? '#f59e0b' : style.stroke?.toString() || '#64748b'}
                strokeWidth={showDeleteButton ? 2.5 : 2}
                strokeDasharray={style.strokeDasharray?.toString()}
                markerEnd={markerEnd}
                style={{
                    pointerEvents: 'none',
                    transition: 'stroke 0.15s ease-in-out'
                }}
                className={selected ? '' : 'react-flow__edge-path'}
            />
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
