import React from 'react';
import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
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

    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const onEdgeDelete = (evt: React.MouseEvent) => {
        evt.stopPropagation();
        setEdges((edges) => edges.filter((edge) => edge.id !== id));
    };

    return (
        <>
            <BaseEdge
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    ...style,
                    stroke: selected ? '#ef4444' : style.stroke || '#64748b',
                    strokeWidth: selected ? 3 : style.strokeWidth || 2,
                }}
            />
            {selected && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: 'all',
                        }}
                        className="nodrag nopan"
                    >
                        <button
                            type="button"
                            onClick={onEdgeDelete}
                            className="w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 border-2 border-white"
                            title="Delete connection"
                        >
                            <X className="w-3.5 h-3.5 text-white" />
                        </button>
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
};

export default CustomEdge;
