import React, { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { layoutGraph } from '../utils/layout.js';
import FormPreview from './FormPreview.jsx';
import FormEditorFields from './FormEditorFields.jsx';
import { loadFormSchema, saveFormSchema, createEmptySchema } from '../utils/formStorage.js';

// Custom node components
const StartNode = ({ data, selected }) => (
  <div className={`journey-start-node ${selected ? 'selected' : ''}`}>
    <div>Start</div>
    <span className="material-icons" style={{ 
      position: 'absolute',
      top: '-8px',
      right: '-8px',
      fontSize: '16px',
      color: '#041295', // var(--color-primary-blue)
      background: 'white',
      borderRadius: '50%',
      width: '20px',
      height: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0px 2px 4px 0px rgba(1, 5, 50, 0.04), 0px 4px 5px 0px rgba(1, 5, 50, 0.04), 0px 1px 10px 0px rgba(1, 5, 50, 0.08)'
    }}>lock_outline</span>
    <Handle
      type="source"
      position={Position.Right}
      id="right"
      style={{ 
        background: '#041295', // var(--color-primary-blue)
        border: '2px solid white',
        width: '8px',
        height: '8px'
      }}
    />
  </div>
);

const FrontendFormNode = ({ data, selected }) => (
  <div className={`frontend-form-node ${selected ? 'selected' : ''}`}>
    <div className="frontend-form-title">{data.label || 'Frontend - Form'}</div>
    <div className="frontend-form-subtitle">Form</div>
    {/* Input */}
    <Handle
      type="target"
      position={Position.Left}
      id="input"
      style={{ 
        background: '#041295', // var(--color-primary-blue)
        border: '2px solid white',
        width: '8px',
        height: '8px',
        left: '-4px',
        top: '50%',
        transform: 'translateY(-50%)'
      }}
    />
    {/* Output: success */}
    <Handle
      type="source"
      position={Position.Right}
      id="success"
      style={{ 
        background: '#00BBDD', // var(--color-success-green)
        border: '2px solid white',
        width: '8px',
        height: '8px',
        right: '-4px',
        top: '35%',
        transform: 'translateY(-50%)'
      }}
    />
    {/* small blue dot handle only */}
    {/* Output: error */}
    <Handle
      type="source"
      position={Position.Right}
      id="error"
      style={{ 
        background: '#E01E00', // var(--color-error-red)
        border: '2px solid white',
        width: '8px',
        height: '8px',
        right: '-4px',
        top: '65%',
        transform: 'translateY(-50%)'
      }}
    />
    {/* small blue dot handle only */}
  </div>
);

const SuccessEndNode = ({ data, selected }) => (
  <div className={`journey-end-node ${selected ? 'selected' : ''}`}>
    <div>Success</div>
    <Handle
      type="target"
      position={Position.Left}
      id="left"
      style={{ 
        background: '#041295', // var(--color-primary-blue)
        border: '2px solid white',
        width: '8px',
        height: '8px'
      }}
    />
  </div>
);

const ErrorEndNode = ({ data, selected }) => (
  <div className={`journey-end-node error ${selected ? 'selected' : ''}`}>
    <div>Error</div>
    <Handle
      type="target"
      position={Position.Left}
      id="left"
      style={{ 
        background: '#041295', // var(--color-primary-blue)
        border: '2px solid white',
        width: '8px',
        height: '8px'
      }}
    />
  </div>
);

const ConditionNode = ({ data, selected }) => (
  <div className={`journey-condition-node ${selected ? 'selected' : ''}`}>
    <div className="condition-diamond">
      <div className="condition-content">{data.label || 'Condition'}</div>
    </div>
    <Handle
      type="target"
      position={Position.Left}
      id="input"
      style={{ 
        background: '#041295', // var(--color-primary-blue)
        border: '2px solid white',
        width: '8px',
        height: '8px',
        left: '-4px',
        top: '50%',
        transform: 'translateY(-50%)'
      }}
    />
    <Handle
      type="source"
      position={Position.Right}
      id="yes"
      style={{ 
        background: '#00BBDD', // var(--color-success-green)
        border: '2px solid white',
        width: '8px',
        height: '8px',
        right: '-4px',
        top: '50%',
        transform: 'translateY(-50%)'
      }}
    />
    <Handle
      type="source"
      position={Position.Bottom}
      id="no"
      style={{ 
        background: '#E01E00', // var(--color-error-red)
        border: '2px solid white',
        width: '8px',
        height: '8px',
        bottom: '-4px',
        left: '50%',
        transform: 'translateX(-50%)'
      }}
    />
  </div>
);

const HttpBackendNode = ({ data, selected }) => (
  <div className={`frontend-form-node ${selected ? 'selected' : ''}`}>
    <div className="frontend-form-title">{data.label || 'HTTP Request'}</div>
    <div className="frontend-form-subtitle">{data.nodeType === 'backend' ? 'Backend' : 'Frontend'}</div>
    {/* Input */}
    <Handle
      type="target"
      position={Position.Left}
      id="input"
      style={{ 
        background: '#041295', // var(--color-primary-blue)
        border: '2px solid white',
        width: '8px',
        height: '8px',
        left: '-4px',
        top: '50%',
        transform: 'translateY(-50%)'
      }}
    />
    {/* Output: success */}
    <Handle
      type="source"
      position={Position.Right}
      id="success"
      style={{ 
        background: '#00BBDD', // var(--color-success-green)
        border: '2px solid white',
        width: '8px',
        height: '8px',
        right: '-4px',
        top: '35%',
        transform: 'translateY(-50%)'
      }}
    />
    {/* Output: error */}
    <Handle
      type="source"
      position={Position.Right}
      id="error"
      style={{ 
        background: '#E01E00', // var(--color-error-red)
        border: '2px solid white',
        width: '8px',
        height: '8px',
        right: '-4px',
        top: '65%',
        transform: 'translateY(-50%)'
      }}
    />
  </div>
);

const JsonParserNode = ({ data, selected }) => (
  <div className={`frontend-form-node ${selected ? 'selected' : ''}`}>
    <div className="frontend-form-title">{data.label || 'JSON Parser'}</div>
    <div className="frontend-form-subtitle">Parser</div>
    {/* Input */}
    <Handle
      type="target"
      position={Position.Left}
      id="input"
      style={{ 
        background: '#041295', // var(--color-primary-blue)
        border: '2px solid white',
        width: '8px',
        height: '8px',
        left: '-4px',
        top: '50%',
        transform: 'translateY(-50%)'
      }}
    />
    {/* Output: success */}
    <Handle
      type="source"
      position={Position.Right}
      id="success"
      style={{ 
        background: '#00BBDD', // var(--color-success-green)
        border: '2px solid white',
        width: '8px',
        height: '8px',
        right: '-4px',
        top: '35%',
        transform: 'translateY(-50%)'
      }}
    />
    {/* Output: error */}
    <Handle
      type="source"
      position={Position.Right}
      id="error"
      style={{ 
        background: '#E01E00', // var(--color-error-red)
        border: '2px solid white',
        width: '8px',
        height: '8px',
        right: '-4px',
        top: '65%',
        transform: 'translateY(-50%)'
      }}
    />
  </div>
);

const CaseConditionNode = ({ data, selected }) => {
  const conditions = data?.conditions || [];
  const hasElse = true; // else is always present
  
  return (
    <div className={`frontend-form-node ${selected ? 'selected' : ''}`} style={{ minHeight: '120px' }}>
      <div className="frontend-form-title">{data.label || 'Switch'}</div>
      <div className="frontend-form-subtitle">Condition</div>
      {/* Input */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{ 
          background: '#041295', // var(--color-primary-blue)
          border: '2px solid white',
          width: '8px',
          height: '8px',
          left: '-4px',
          top: '50%',
          transform: 'translateY(-50%)'
        }}
      />
      {/* Dynamic output handles for each condition */}
      {conditions.map((condition, idx) => {
        // Distribute handles evenly, similar to FrontendFormNode style (35% and 65%)
        const totalOutputs = conditions.length + 1; // conditions + else
        const baseOffset = 15; // start from 15% to have space from top
        const range = 70; // use 70% of height for distribution
        const topPercent = baseOffset + (idx * (range / totalOutputs));
        return (
          <Handle
            key={`condition-${idx}`}
            type="source"
            position={Position.Right}
            id={`case-${idx}`}
            style={{ 
              background: '#FF9800', // orange for case conditions
              border: '2px solid white',
              width: '8px',
              height: '8px',
              right: '-4px',
              top: `${topPercent}%`,
              transform: 'translateY(-50%)'
            }}
          />
        );
      })}
      {/* Else handle - always last */}
      <Handle
        type="source"
        position={Position.Right}
        id="else"
        style={{ 
          background: '#9E9E9E', // gray for else/default
          border: '2px solid white',
          width: '8px',
          height: '8px',
          right: '-4px',
          top: `${85}%`,
          transform: 'translateY(-50%)'
        }}
      />
    </div>
  );
};

// Node types configuration
const nodeTypes = {
  start: StartNode,
  successEnd: SuccessEndNode,
  errorEnd: ErrorEndNode,
  condition: ConditionNode,
  caseCondition: CaseConditionNode,
  frontendForm: FrontendFormNode,
  httpRequest: HttpBackendNode,
  jsonParser: JsonParserNode,
};

const loadJourney = () => {
  try {
    const savedNodes = localStorage.getItem('journey:nodes');
    const savedEdges = localStorage.getItem('journey:edges');
    const savedNextId = localStorage.getItem('journey:nextNodeId');
    return {
      nodes: savedNodes ? JSON.parse(savedNodes) : [
        {
          id: '1',
          type: 'start',
          position: { x: 100, y: 250 },
          data: { label: 'Start' },
        },
        {
          id: '2',
          type: 'successEnd',
          position: { x: 500, y: 250 },
          data: { label: 'Success' },
        },
      ],
      edges: savedEdges ? JSON.parse(savedEdges) : [
        {
          id: 'e1-2',
          source: '1',
          target: '2',
          sourceHandle: 'right',
          targetHandle: 'left',
          type: 'default',
          style: { 
            stroke: '#041295', // var(--color-primary-blue)
            strokeWidth: 2 
          },
          markerEnd: {
            type: 'arrowclosed',
            color: '#041295', // var(--color-primary-blue)
            width: 20,
            height: 20,
          },
          interactionWidth: 30, // Extended grab area including arrowhead
          selected: false,
        },
      ],
      nextNodeId: savedNextId ? Number(savedNextId) : 3,
    };
  } catch (e) {
    console.warn('Failed to load journey', e);
    return {
      nodes: [
        {
          id: '1',
          type: 'start',
          position: { x: 100, y: 250 },
          data: { label: 'Start' },
        },
        {
          id: '2',
          type: 'successEnd',
          position: { x: 500, y: 250 },
          data: { label: 'Success' },
        },
      ],
      edges: [
        {
          id: 'e1-2',
          source: '1',
          target: '2',
          sourceHandle: 'right',
          targetHandle: 'left',
          type: 'default',
          style: { 
            stroke: '#041295', // var(--color-primary-blue)
            strokeWidth: 2 
          },
          markerEnd: {
            type: 'arrowclosed',
            color: '#041295', // var(--color-primary-blue)
            width: 20,
            height: 20,
          },
          interactionWidth: 30, // Extended grab area including arrowhead
          selected: false,
        },
      ],
      nextNodeId: 3,
    };
  }
};

const normalizeNode = (node) => ({
  id: node.id,
  type: node.type,
  position: node.position,
  data: node.data,
  // don't save computed fields like positionAbsolute, selected, etc.
});

const normalizeEdge = (edge) => ({
  id: edge.id,
  source: edge.source,
  target: edge.target,
  sourceHandle: edge.sourceHandle,
  targetHandle: edge.targetHandle,
  type: edge.type,
  style: edge.style,
  markerEnd: edge.markerEnd,
  label: edge.label,
  labelStyle: edge.labelStyle,
  labelBgStyle: edge.labelBgStyle,
  interactionWidth: edge.interactionWidth || 30, // Ensure all edges have extended grab area
  // don't save computed fields like selected, etc.
});

const saveJourney = (nodes, edges, nextNodeId) => {
  try {
    const normalizedNodes = nodes.map(normalizeNode);
    const normalizedEdges = edges.map(normalizeEdge);
    localStorage.setItem('journey:nodes', JSON.stringify(normalizedNodes));
    localStorage.setItem('journey:edges', JSON.stringify(normalizedEdges));
    localStorage.setItem('journey:nextNodeId', String(nextNodeId));
  } catch (e) {
    console.warn('Failed to save journey', e);
  }
};

const initialJourney = loadJourney();
const initialNodes = initialJourney.nodes;
// Ensure all initial edges have interactionWidth for extended grab area
const initialEdges = initialJourney.edges.map(edge => ({
  ...edge,
  interactionWidth: edge.interactionWidth || 30,
}));
const initialNextNodeId = initialJourney.nextNodeId;

function InnerCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedElements, setSelectedElements] = useState([]);
  const [nextNodeId, setNextNodeId] = useState(initialNextNodeId);
  const [showNodeMenu, setShowNodeMenu] = useState(false);
  const [activeFormNodeId, setActiveFormNodeId] = useState(null);
  const [activeHttpNodeId, setActiveHttpNodeId] = useState(null);
  const [activeJsonParserNodeId, setActiveJsonParserNodeId] = useState(null);
  const [activeConditionNodeId, setActiveConditionNodeId] = useState(null);
  const [activeCaseConditionNodeId, setActiveCaseConditionNodeId] = useState(null);
  const reactFlowInstance = useReactFlow();
  const canvasRef = useRef(null);
  const [activeTab, setActiveTab] = useState('details');
  const [activeHttpTab, setActiveHttpTab] = useState('details');
  const [activeJsonParserTab, setActiveJsonParserTab] = useState('details');
  const [activeConditionTab, setActiveConditionTab] = useState('details');
  const [activeCaseConditionTab, setActiveCaseConditionTab] = useState('details');
  const [formSchema, setFormSchema] = useState(null);
  const [selectedElementIndex, setSelectedElementIndex] = useState(null);
  
  const selectedFrontendForm = nodes.find(n => n.id === activeFormNodeId);
  const selectedHttpNode = nodes.find(n => n.id === activeHttpNodeId);
  const selectedJsonParserNode = nodes.find(n => n.id === activeJsonParserNodeId);
  const selectedConditionNode = nodes.find(n => n.id === activeConditionNodeId);
  const selectedCaseConditionNode = nodes.find(n => n.id === activeCaseConditionNodeId);

  // hydrate schema when selection changes
  React.useEffect(() => {
    if (!selectedFrontendForm) { setFormSchema(null); return; }
    const fromNode = selectedFrontendForm.data?.formSchema;
    const fromStorage = loadFormSchema(selectedFrontendForm.id);
    const schema = fromNode || fromStorage || createEmptySchema();
    setFormSchema(schema);
    // restore active tab from localStorage
    const savedTab = localStorage.getItem(`sidesheetTab:${selectedFrontendForm.id}`);
    setActiveTab(savedTab === 'form' ? 'form' : 'details');
    setSelectedElementIndex(null);
  }, [selectedFrontendForm?.id]);

  // hydrate HTTP node tab when selection changes
  React.useEffect(() => {
    if (!selectedHttpNode) return;
    // restore active tab from localStorage
    const savedTab = localStorage.getItem(`sidesheetTab:${selectedHttpNode.id}`);
    setActiveHttpTab(savedTab === 'request' ? 'request' : savedTab === 'context' ? 'context' : 'details');
  }, [selectedHttpNode?.id]);

  // hydrate JSON Parser node tab when selection changes
  React.useEffect(() => {
    if (!selectedJsonParserNode) return;
    // restore active tab from localStorage
    const savedTab = localStorage.getItem(`sidesheetTab:${selectedJsonParserNode.id}`);
    setActiveJsonParserTab(savedTab === 'extraction' ? 'extraction' : savedTab === 'context' ? 'context' : 'details');
  }, [selectedJsonParserNode?.id]);

  // hydrate Condition node tab when selection changes
  React.useEffect(() => {
    if (!selectedConditionNode) return;
    // restore active tab from localStorage
    const savedTab = localStorage.getItem(`sidesheetTab:${selectedConditionNode.id}`);
    setActiveConditionTab(savedTab === 'condition' ? 'condition' : 'details');
  }, [selectedConditionNode?.id]);

  // hydrate Switch node tab when selection changes
  React.useEffect(() => {
    if (!selectedCaseConditionNode) return;
    // restore active tab from localStorage
    const savedTab = localStorage.getItem(`sidesheetTab:${selectedCaseConditionNode.id}`);
    setActiveCaseConditionTab(savedTab === 'cases' ? 'cases' : 'details');
  }, [selectedCaseConditionNode?.id]);

  // Update edge labels when case condition data changes
  React.useEffect(() => {
    // Update all edges from case condition nodes with their current condition labels
    setEdges((eds) => {
      const updated = eds.map(edge => {
        if (edge.sourceHandle?.startsWith('case-')) {
          const caseIndex = parseInt(edge.sourceHandle.replace('case-', ''), 10);
          const sourceNode = nodes.find(n => n.id === edge.source);
          const condition = sourceNode?.data?.conditions?.[caseIndex];
          const newLabel = condition ? `${condition.condition} ${condition.operator} ${condition.value}` : `case ${caseIndex}`;
          if (edge.label !== newLabel) {
            return { ...edge, label: newLabel };
          }
        }
        return edge;
      });
      // Only update if there were actual changes
      const hasChanges = updated.some((e, idx) => e.label !== eds[idx].label);
      return hasChanges ? updated : eds;
    });
  }, [nodes, setEdges]);

  // persist schema to node and storage (basic debounce)
  React.useEffect(() => {
    if (!selectedFrontendForm || !formSchema) return;
    const id = selectedFrontendForm.id;
    const timeout = setTimeout(() => {
      saveFormSchema(id, formSchema);
      setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, formSchema } } : n));
    }, 150);
    return () => clearTimeout(timeout);
  }, [formSchema, selectedFrontendForm?.id, setNodes]);

  // Update marker colors and stroke for selected edges to use primary blue highlight
  // Track selected edge IDs to detect selection changes
  const selectedEdgeIdsRef = React.useRef(new Set());
  React.useEffect(() => {
    const currentSelectedIds = new Set(edges.filter(e => e.selected).map(e => e.id));
    const prevSelectedIds = selectedEdgeIdsRef.current;
    
    // Check if selection actually changed
    const selectionChanged = 
      currentSelectedIds.size !== prevSelectedIds.size ||
      [...currentSelectedIds].some(id => !prevSelectedIds.has(id)) ||
      [...prevSelectedIds].some(id => !currentSelectedIds.has(id));
    
    if (!selectionChanged && edges.length > 0) return;
    
    selectedEdgeIdsRef.current = currentSelectedIds;
    
    setEdges((eds) => {
      let hasChanges = false;
      const updated = eds.map(edge => {
        // Determine original color based on source handle
        let originalColor = '#041295'; // Default primary blue
        if (edge.sourceHandle === 'success' || edge.sourceHandle === 'yes') {
          originalColor = '#00BBDD'; // Success green
        } else if (edge.sourceHandle === 'error' || edge.sourceHandle === 'no') {
          originalColor = '#F5D4D4'; // Toned down error color
        } else if (edge.sourceHandle?.startsWith('case-')) {
          originalColor = '#FF9800'; // Orange for case conditions
        } else if (edge.sourceHandle === 'else') {
          originalColor = '#9E9E9E'; // Gray for else/default
        }
        
        if (edge.selected) {
          // Selected edges use primary blue for both edge path and arrow head
          const selectedMarkerColor = '#041295'; // Primary blue for selected state
          const selectedStrokeWidth = 4; // Thicker stroke for selected
          
          // Check if marker color needs update
          const markerNeedsUpdate = edge.markerEnd?.color !== selectedMarkerColor;
          // Check if stroke color needs update
          const strokeNeedsUpdate = edge.style?.stroke !== selectedMarkerColor || edge.style?.strokeWidth !== selectedStrokeWidth;
          
          if (markerNeedsUpdate || strokeNeedsUpdate) {
            hasChanges = true;
            return {
              ...edge,
              style: {
                ...edge.style,
                stroke: selectedMarkerColor,
                strokeWidth: selectedStrokeWidth,
              },
              markerEnd: edge.markerEnd ? {
                ...edge.markerEnd,
                color: selectedMarkerColor,
              } : undefined,
            };
          }
        } else {
          // Restore original colors for non-selected edges
          const originalStrokeWidth = 2; // Normal stroke width for non-selected
          
          // Check if marker color needs update
          const markerNeedsUpdate = edge.markerEnd && edge.markerEnd.color !== originalColor;
          // Check if stroke color needs update
          const strokeNeedsUpdate = edge.style?.stroke !== originalColor || edge.style?.strokeWidth !== originalStrokeWidth;
          
          if (markerNeedsUpdate || strokeNeedsUpdate) {
            hasChanges = true;
            return {
              ...edge,
              style: {
                ...edge.style,
                stroke: originalColor,
                strokeWidth: originalStrokeWidth,
              },
              markerEnd: edge.markerEnd ? {
                ...edge.markerEnd,
                color: originalColor,
              } : undefined,
            };
          }
        }
        return edge;
      });
      // Only update if there are actual changes to avoid infinite loop
      return hasChanges ? updated : eds;
    });
  }, [edges, setEdges]);

  // persist journey to localStorage (debounced)
  const saveTimeoutRef = React.useRef(null);
  const prevSerializedRef = React.useRef(null);
  const isInitialMount = React.useRef(true);
  const nodesRef = React.useRef(nodes);
  const edgesRef = React.useRef(edges);
  const nextNodeIdRef = React.useRef(nextNodeId);
  
  // Keep refs in sync
  React.useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
    nextNodeIdRef.current = nextNodeId;
  }, [nodes, edges, nextNodeId]);
  
  React.useEffect(() => {
    const normalizedNodes = nodesRef.current.map(normalizeNode);
    const normalizedEdges = edgesRef.current.map(normalizeEdge);
    const currentSerialized = JSON.stringify({ 
      nodes: normalizedNodes, 
      edges: normalizedEdges, 
      nextNodeId: nextNodeIdRef.current 
    });
    
    if (isInitialMount.current) {
      prevSerializedRef.current = currentSerialized;
      isInitialMount.current = false;
      return;
    }
    
    if (prevSerializedRef.current === currentSerialized) return; // no actual change
    prevSerializedRef.current = currentSerialized;
    
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveJourney(nodesRef.current, edgesRef.current, nextNodeIdRef.current);
    }, 500);
    
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [nodes.length, edges.length, nextNodeId]);

  const updateSelectedFrontendFormLabel = useCallback((newLabel) => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeFormNodeId) {
        return { ...node, data: { ...node.data, label: newLabel } };
      }
      return node;
    }));
  }, [activeFormNodeId, setNodes]);

  const updateSelectedFrontendFormDescription = useCallback((newDesc) => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeFormNodeId) {
        return { ...node, data: { ...node.data, description: newDesc } };
      }
      return node;
    }));
  }, [activeFormNodeId, setNodes]);

  // Update handlers for HTTP node
  const updateHttpNodeProperty = useCallback((property, value) => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeHttpNodeId) {
        return { ...node, data: { ...node.data, [property]: value } };
      }
      return node;
    }));
  }, [activeHttpNodeId, setNodes]);

  const updateHttpNodeHeader = useCallback((index, key, value) => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeHttpNodeId) {
        const headers = [...(node.data?.headers || [])];
        if (headers[index]) {
          headers[index] = { ...headers[index], [key]: value };
        }
        return { ...node, data: { ...node.data, headers } };
      }
      return node;
    }));
  }, [activeHttpNodeId, setNodes]);

  const addHttpNodeHeader = useCallback(() => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeHttpNodeId) {
        const headers = [...(node.data?.headers || [])];
        headers.push({ key: '', value: '' });
        return { ...node, data: { ...node.data, headers } };
      }
      return node;
    }));
  }, [activeHttpNodeId, setNodes]);

  const removeHttpNodeHeader = useCallback((index) => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeHttpNodeId) {
        const headers = [...(node.data?.headers || [])];
        headers.splice(index, 1);
        return { ...node, data: { ...node.data, headers } };
      }
      return node;
    }));
  }, [activeHttpNodeId, setNodes]);

  const updateHttpNodeContextVariable = useCallback((index, value) => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeHttpNodeId) {
        const contextVariables = [...(node.data?.contextVariables || [])];
        contextVariables[index] = value;
        return { ...node, data: { ...node.data, contextVariables } };
      }
      return node;
    }));
  }, [activeHttpNodeId, setNodes]);

  const addHttpNodeContextVariable = useCallback(() => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeHttpNodeId) {
        const contextVariables = [...(node.data?.contextVariables || [])];
        contextVariables.push('');
        return { ...node, data: { ...node.data, contextVariables } };
      }
      return node;
    }));
  }, [activeHttpNodeId, setNodes]);

  const removeHttpNodeContextVariable = useCallback((index) => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeHttpNodeId) {
        const contextVariables = [...(node.data?.contextVariables || [])];
        contextVariables.splice(index, 1);
        return { ...node, data: { ...node.data, contextVariables } };
      }
      return node;
    }));
  }, [activeHttpNodeId, setNodes]);

  // Update handlers for JSON Parser node
  const updateJsonParserProperty = useCallback((property, value) => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeJsonParserNodeId) {
        return { ...node, data: { ...node.data, [property]: value } };
      }
      return node;
    }));
  }, [activeJsonParserNodeId, setNodes]);

  const updateExtractionRule = useCallback((index, field, value) => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeJsonParserNodeId) {
        const extractionRules = [...(node.data?.extractionRules || [])];
        if (extractionRules[index]) {
          extractionRules[index] = { ...extractionRules[index], [field]: value };
        }
        return { ...node, data: { ...node.data, extractionRules } };
      }
      return node;
    }));
  }, [activeJsonParserNodeId, setNodes]);

  const addExtractionRule = useCallback(() => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeJsonParserNodeId) {
        const extractionRules = [...(node.data?.extractionRules || [])];
        extractionRules.push({ outputName: '', jsonPath: '', required: false });
        return { ...node, data: { ...node.data, extractionRules } };
      }
      return node;
    }));
  }, [activeJsonParserNodeId, setNodes]);

  const removeExtractionRule = useCallback((index) => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeJsonParserNodeId) {
        const extractionRules = [...(node.data?.extractionRules || [])];
        extractionRules.splice(index, 1);
        return { ...node, data: { ...node.data, extractionRules } };
      }
      return node;
    }));
  }, [activeJsonParserNodeId, setNodes]);

  const closeSidesheet = useCallback(() => {
    // Deselect any selected nodes
    setNodes((nds) => nds.map(node => ({ ...node, selected: false })));
    setSelectedElements([]);
    setActiveFormNodeId(null);
    setActiveHttpNodeId(null);
    setActiveJsonParserNodeId(null);
    setActiveConditionNodeId(null);
    setActiveCaseConditionNodeId(null);
  }, [setNodes]);

  const deleteSelectedFrontendForm = useCallback(() => {
    const nodeId = activeFormNodeId;
    if (!nodeId) return;
    // Remove node and connected edges
    setNodes((nds) => nds.filter(n => n.id !== nodeId));
    setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedElements([]);
    setActiveFormNodeId(null);
  }, [activeFormNodeId, setNodes, setEdges]);

  const deleteSelectedHttpNode = useCallback(() => {
    const nodeId = activeHttpNodeId;
    if (!nodeId) return;
    // Remove node and connected edges
    setNodes((nds) => nds.filter(n => n.id !== nodeId));
    setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedElements([]);
    setActiveHttpNodeId(null);
  }, [activeHttpNodeId, setNodes, setEdges]);

  const deleteSelectedJsonParserNode = useCallback(() => {
    const nodeId = activeJsonParserNodeId;
    if (!nodeId) return;
    // Remove node and connected edges
    setNodes((nds) => nds.filter(n => n.id !== nodeId));
    setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedElements([]);
    setActiveJsonParserNodeId(null);
  }, [activeJsonParserNodeId, setNodes, setEdges]);

  const deleteSelectedConditionNode = useCallback(() => {
    const nodeId = activeConditionNodeId;
    if (!nodeId) return;
    // Remove node and connected edges
    setNodes((nds) => nds.filter(n => n.id !== nodeId));
    setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedElements([]);
    setActiveConditionNodeId(null);
  }, [activeConditionNodeId, setNodes, setEdges]);

  // Update handlers for Condition node
  const updateConditionProperty = useCallback((property, value) => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeConditionNodeId) {
        return { ...node, data: { ...node.data, [property]: value } };
      }
      return node;
    }));
  }, [activeConditionNodeId, setNodes]);

  // Update handlers for Switch node
  const deleteSelectedCaseConditionNode = useCallback(() => {
    const nodeId = activeCaseConditionNodeId;
    if (!nodeId) return;
    // Remove node and connected edges
    setNodes((nds) => nds.filter(n => n.id !== nodeId));
    setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedElements([]);
    setActiveCaseConditionNodeId(null);
  }, [activeCaseConditionNodeId, setNodes, setEdges]);

  const updateCaseConditionProperty = useCallback((property, value) => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeCaseConditionNodeId) {
        return { ...node, data: { ...node.data, [property]: value } };
      }
      return node;
    }));
  }, [activeCaseConditionNodeId, setNodes]);

  const addCaseCondition = useCallback(() => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeCaseConditionNodeId) {
        const conditions = [...(node.data?.conditions || [])];
        conditions.push({
          id: `case-${Date.now()}`,
          condition: '',
          operator: 'eq',
          value: '',
        });
        return { ...node, data: { ...node.data, conditions } };
      }
      return node;
    }));
  }, [activeCaseConditionNodeId, setNodes]);

  const removeCaseCondition = useCallback((index) => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeCaseConditionNodeId) {
        const conditions = [...(node.data?.conditions || [])];
        conditions.splice(index, 1);
        // Also remove connected edges
        const conditionId = conditions[index]?.id;
        return { ...node, data: { ...node.data, conditions } };
      }
      return node;
    }));
    // Remove edges connected to this condition
    setEdges((eds) => {
      const conditionPrefix = `case-${index}`;
      return eds.filter(e => !(e.source === activeCaseConditionNodeId && e.sourceHandle === conditionPrefix));
    });
  }, [activeCaseConditionNodeId, setNodes, setEdges]);

  const updateCaseCondition = useCallback((index, field, value) => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeCaseConditionNodeId) {
        const conditions = [...(node.data?.conditions || [])];
        if (conditions[index]) {
          conditions[index] = { ...conditions[index], [field]: value };
        }
        return { ...node, data: { ...node.data, conditions } };
      }
      return node;
    }));
  }, [activeCaseConditionNodeId, setNodes]);

  // Editor operations
  const genGuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

  const addElement = (type) => {
    if (!formSchema) return;
    const id = genGuid();
    const base = { id, type, label: type === 'button' ? 'Submit' : id, validations: {} };
    const el = type === 'checkbox' ? { ...base, value: false } : base;
    setFormSchema(s => {
      const newElements = [...(s.elements||[]), el];
      // Select the newly added element (last in array)
      setSelectedElementIndex(newElements.length - 1);
      return { ...s, elements: newElements };
    });
    setActiveTab('form');
  };

  const sanitizeSchema = (schema) => {
    const seenRoot = new Set();
    const dedupRoot = [];
    for (const el of schema.elements || []) {
      if (seenRoot.has(el.id)) continue;
      seenRoot.add(el.id);
      if (el.type === 'row') {
        const seenChild = new Set();
        const dedupChildren = [];
        for (const ch of el.children || []) {
          if (seenChild.has(ch.id)) continue;
          seenChild.add(ch.id);
          dedupChildren.push(ch);
        }
        dedupRoot.push({ ...el, children: dedupChildren });
      } else {
        dedupRoot.push(el);
      }
    }
    return { ...schema, elements: dedupRoot };
  };

  const updateElement = (idx, next) => {
    setFormSchema(s => {
      const arr = [...s.elements];
      arr[idx] = next;
      return { ...s, elements: arr };
    });
  };

  const addChild = (rowIdx, type) => {
    setFormSchema(s => {
      const arr = [...s.elements];
      const row = { ...(arr[rowIdx] || { type:'row', children:[] }) };
      row.children = [...(row.children||[]), { id: genGuid(), type, label: type==='button' ? 'Submit' : type }];
      arr[rowIdx] = row;
      return { ...s, elements: arr };
    });
  };

  const deleteChild = (rowIdx, childIdx) => {
    setFormSchema(s => {
      const arr = [...s.elements];
      const row = { ...arr[rowIdx] };
      row.children = [...(row.children||[])];
      row.children.splice(childIdx,1);
      arr[rowIdx] = row;
      return { ...s, elements: arr };
    });
  };

  const onChildDragStart = (e, rowIdx, childIdx) => {
    const payload = JSON.stringify({ rowIdx, childIdx });
    e.dataTransfer.setData('application/json', payload);
    e.dataTransfer.setData('text/plain', payload);
  };
  const onChildDrop = (e, rowIdx, targetChildIdx) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to root drop handler
    try {
      const parsed = JSON.parse(e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain'));
      setFormSchema(s => {
        const arr = [...(s.elements||[])];
        if (rowIdx >= arr.length || arr[rowIdx]?.type !== 'row') return s; // Validate row exists
        
        const to = { ...arr[rowIdx] };
        if (!to.children) to.children = [];
        to.children = [...to.children];
        
        if (parsed.rootIdx != null) {
          // Moving from root into row
          if (parsed.rootIdx >= arr.length) {
            console.warn('Invalid rootIdx:', parsed.rootIdx, 'array length:', arr.length);
            return s;
          }
          const spliced = arr.splice(parsed.rootIdx, 1);
          if (!spliced || spliced.length === 0) {
            console.warn('Nothing to move from rootIdx:', parsed.rootIdx);
            return s;
          }
          const moving = spliced[0];
          // Ensure row is properly initialized
          if (!to.children) to.children = [];
          // Remove any duplicate by id before adding
          to.children = to.children.filter(c => c.id !== moving.id);
          // Insert at target position
          const insertPos = Math.min(Math.max(0, targetChildIdx), to.children.length);
          to.children.splice(insertPos, 0, moving);
          arr[rowIdx] = to;
          console.log('Moved element to row:', { rootIdx: parsed.rootIdx, rowIdx, targetChildIdx, insertPos, movingId: moving.id, newChildrenCount: to.children.length });
          return sanitizeSchema({ ...s, elements: arr });
        }
        if (parsed.rowIdx != null && parsed.childIdx != null) {
          // Moving within or between rows
          if (parsed.rowIdx >= arr.length || !arr[parsed.rowIdx]?.children) return s;
          const from = { ...arr[parsed.rowIdx] };
          const moving = from.children?.[parsed.childIdx];
          if (!moving) return s;
          from.children = [...from.children];
          from.children.splice(parsed.childIdx, 1);
          // Remove duplicate by id before adding
          to.children = to.children.filter(c => c.id !== moving.id);
          // Insert at target position
          to.children.splice(Math.min(targetChildIdx, to.children.length), 0, moving);
          arr[parsed.rowIdx] = from;
          arr[rowIdx] = to;
          return sanitizeSchema({ ...s, elements: arr });
        }
        return s;
      });
    } catch (err) {
      console.error('onChildDrop error:', err);
    }
  };

  const onDragStart = (e, idx) => {
    const payload = JSON.stringify({ rootIdx: idx });
    e.dataTransfer.setData('application/json', payload);
    e.dataTransfer.setData('text/plain', payload);
  };
  const onDragOver = (e) => { e.preventDefault(); };
  const onDrop = (e, targetIdx) => {
    e.preventDefault();
    let data;
    try { data = JSON.parse(e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain')); } catch {}
    if (!data) return;
    setFormSchema(s => {
      const arr = [...(s.elements||[])];
      if (data.rootIdx != null) {
        if (data.rootIdx === targetIdx) return s;
        const [item] = arr.splice(data.rootIdx, 1);
        arr.splice(targetIdx, 0, item);
        return sanitizeSchema({ ...s, elements: arr });
      }
      if (data.rowIdx != null && data.childIdx != null) {
        const fromRow = { ...arr[data.rowIdx] };
        const moving = fromRow.children?.[data.childIdx];
        if (!moving) return s;
        fromRow.children = [...fromRow.children];
        fromRow.children.splice(data.childIdx,1);
        arr[data.rowIdx] = fromRow;
        arr.splice(targetIdx, 0, moving);
        return sanitizeSchema({ ...s, elements: arr });
      }
      return s;
    });
  };

  const deleteElement = (idx) => {
    setFormSchema(s => {
      const arr = [...(s.elements||[])];
      arr.splice(idx, 1);
      return { ...s, elements: arr };
    });
    setSelectedElementIndex((cur) => {
      if (cur == null) return cur;
      if (idx === cur) return null;
      if (idx < cur) return cur - 1;
      return cur;
    });
  };

  const getElementIcon = (type) => {
    const icons = {
      input: 'text_fields',
      password: 'lock_outline',
      checkbox: 'check_box_outline_blank',
      label: 'label_outline',
      button: 'radio_button_checked',
      row: 'view_column',
    };
    return icons[type] || 'description';
  };

  // Debug logging
  console.log('Current nodes:', nodes);
  console.log('Current edges:', edges);

  // Function to add a new node of specified type
  const addNode = useCallback((nodeType) => {
    let label = 'Node';
    if (nodeType === 'successEnd') label = 'Success';
    if (nodeType === 'errorEnd') label = 'Error';
    if (nodeType === 'condition') label = 'Condition';
    if (nodeType === 'caseCondition') label = 'Switch';
    if (nodeType === 'frontendForm') label = 'Frontend - Form';
    if (nodeType === 'httpRequest') label = 'HTTP Request';
    if (nodeType === 'jsonParser') label = 'JSON Parser';
    
    // Calculate position centered in the currently visible viewport
    const container = canvasRef.current || document.querySelector('.journey-canvas-container');
    const rect = container?.getBoundingClientRect();
    const centerScreen = rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const centerFlow = reactFlowInstance.screenToFlowPosition(centerScreen);

    // Slight offset to avoid perfect overlap when adding multiple quickly
    const nodeIndex = nextNodeId - 2;
    const offset = { x: (nodeIndex % 3) * 30, y: Math.floor(nodeIndex / 3) * 30 };

    const newNode = {
      id: nextNodeId.toString(),
      type: nodeType,
      position: { 
        x: centerFlow.x + offset.x, 
        y: centerFlow.y + offset.y 
      },
      data: nodeType === 'httpRequest' ? {
        label,
        nodeType: 'backend', // default to backend
        method: 'GET',
        endpoint: '',
        followRedirects: true,
        headers: [],
        caCertificate: '',
        contextVariables: [],
        requestTemplate: '',
      } : nodeType === 'jsonParser' ? {
        label,
        sourceVariable: 'data',
        extractionRules: [],
      } : nodeType === 'condition' ? {
        label,
        operator: 'eq',
        leftOperand: '',
        rightOperand: '',
      } : nodeType === 'caseCondition' ? {
        label,
        conditions: [],
      } : { label },
      selected: false,
    };
    
    setNodes((nds) => [...nds, newNode]);
    setNextNodeId((id) => id + 1);
    setShowNodeMenu(false); // Close the menu after adding
    
    console.log(`Added new ${nodeType} node:`, newNode);
  }, [nextNodeId, setNodes, reactFlowInstance, canvasRef]);

  // Function to toggle the node menu
  const toggleNodeMenu = useCallback(() => {
    setShowNodeMenu(prev => !prev);
  }, []);

  // Function to close the node menu when clicking outside
  const closeNodeMenu = useCallback(() => {
    setShowNodeMenu(false);
  }, []);

  const onConnect = useCallback(
    (params) => {
      // Validate connection rules
      const sourceNode = nodes.find(n => n.id === params.source);
      const targetNode = nodes.find(n => n.id === params.target);
      
      // Start nodes can only have outgoing connections
      if (sourceNode?.type === 'start') {
        // Check if start node already has an outgoing connection
        const existingOutgoing = edges.some(edge => edge.source === params.source);
        if (existingOutgoing) {
          alert('Start node can only have one outgoing connection');
          return;
        }
      }
      
      // Determine edge color and label based on source handle
      let edgeColor = '#041295'; // Default blue - var(--color-primary-blue)
      let edgeLabel = '';
      if (params.sourceHandle === 'yes') {
        edgeColor = '#00BBDD'; // Green for true - var(--color-success-green)
        edgeLabel = 'true';
      } else if (params.sourceHandle === 'no') {
        edgeColor = '#F5D4D4'; // Toned down error color - approximates rgba(224, 30, 0, 0.1) background tone of error node
        edgeLabel = 'false';
      } else if (params.sourceHandle === 'success') {
        edgeColor = '#00BBDD'; // var(--color-success-green)
        edgeLabel = 'success';
      } else if (params.sourceHandle === 'error') {
        edgeColor = '#F5D4D4'; // Toned down error color - approximates rgba(224, 30, 0, 0.1) background tone of error node
        edgeLabel = 'error';
      } else if (params.sourceHandle?.startsWith('case-')) {
        edgeColor = '#FF9800'; // Orange for case conditions
        const caseIndex = params.sourceHandle.replace('case-', '');
        const sourceNode = nodes.find(n => n.id === params.source);
        const condition = sourceNode?.data?.conditions?.[parseInt(caseIndex, 10)];
        if (condition) {
          edgeLabel = `${condition.condition} ${condition.operator} ${condition.value}`;
        } else {
          edgeLabel = `case ${caseIndex}`;
        }
      } else if (params.sourceHandle === 'else') {
        edgeColor = '#9E9E9E'; // Gray for else/default
        edgeLabel = 'else';
      }
      
      // Create the new edge with arrow styling
      const newEdge = {
        ...params,
        id: `e${params.source}-${params.target}`,
        sourceHandle: params.sourceHandle || 'right',
        targetHandle: params.targetHandle || 'left',
        type: 'default',
        animated: false,
        interactionWidth: 30, // Extended grab area including arrowhead
        style: { stroke: edgeColor, strokeWidth: 2 },
        markerEnd: {
          type: 'arrowclosed',
          color: edgeColor,
          width: 20,
          height: 20,
        },
        label: edgeLabel,
        labelStyle: {
          fill: edgeColor,
          fontWeight: 600,
          fontSize: 12,
        },
        labelBgStyle: {
          fill: 'white',
          fillOpacity: 0.8,
          stroke: edgeColor,
          strokeWidth: 1,
          rx: 4,
          ry: 4,
        },
      };
      
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, nodes, edges]
  );

  // Handle edge updates (redrawing connectors)
  // Only allow updates on selected edges
  const onEdgeUpdate = useCallback(
    (oldEdge, newConnection) => {
      // Check if the edge being updated is selected
      const currentEdge = edges.find(e => e.id === oldEdge.id);
      
      // If edge is not selected, do not allow update
      if (!currentEdge?.selected) {
        return;
      }
      
      
      // Original edge is selected, proceed with normal update
      // Validate connection rules (same as onConnect)
      const sourceNode = nodes.find(n => n.id === newConnection.source);
      const targetNode = nodes.find(n => n.id === newConnection.target);
      
      // Start nodes can only have outgoing connections
      if (sourceNode?.type === 'start') {
        // Check if start node already has an outgoing connection (excluding the current edge being updated)
        const existingOutgoing = edges.some(edge => 
          edge.source === newConnection.source && edge.id !== oldEdge.id
        );
        if (existingOutgoing) {
          alert('Start node can only have one outgoing connection');
          return;
        }
      }

      // Determine edge color and label based on source handle
      let edgeColor = '#041295'; // Default blue - var(--color-primary-blue)
      let edgeLabel = '';
      if (newConnection.sourceHandle === 'yes') {
        edgeColor = '#00BBDD'; // Green for true - var(--color-success-green)
        edgeLabel = 'true';
      } else if (newConnection.sourceHandle === 'no') {
        edgeColor = '#F5D4D4'; // Toned down error color
        edgeLabel = 'false';
      } else if (newConnection.sourceHandle === 'success') {
        edgeColor = '#00BBDD'; // var(--color-success-green)
        edgeLabel = 'success';
      } else if (newConnection.sourceHandle === 'error') {
        edgeColor = '#F5D4D4'; // Toned down error color
        edgeLabel = 'error';
      } else if (newConnection.sourceHandle?.startsWith('case-')) {
        edgeColor = '#FF9800'; // Orange for case conditions
        const caseIndex = newConnection.sourceHandle.replace('case-', '');
        const sourceNode = nodes.find(n => n.id === newConnection.source);
        const condition = sourceNode?.data?.conditions?.[parseInt(caseIndex, 10)];
        if (condition) {
          edgeLabel = `${condition.condition} ${condition.operator} ${condition.value}`;
        } else {
          edgeLabel = `case ${caseIndex}`;
        }
      } else if (newConnection.sourceHandle === 'else') {
        edgeColor = '#9E9E9E'; // Gray for else/default
        edgeLabel = 'else';
      }

      // Update the edge with new connection, preserving some properties
      setEdges((eds) => {
        // Check if new edge ID would conflict with existing edges
        const newEdgeId = `e${newConnection.source}-${newConnection.target}`;
        const hasConflict = eds.some(edge => edge.id === newEdgeId && edge.id !== oldEdge.id);
        
        // If reconnecting to the same node, keep the original ID to preserve selection
        const isReconnectingToSameNode = 
          oldEdge.source === newConnection.source && 
          oldEdge.target === newConnection.target &&
          oldEdge.sourceHandle === newConnection.sourceHandle &&
          oldEdge.targetHandle === newConnection.targetHandle;
        
        // If there's a conflict, generate a unique ID (unless reconnecting to same node)
        let finalEdgeId = isReconnectingToSameNode ? oldEdge.id : newEdgeId;
        if (hasConflict && !isReconnectingToSameNode) {
          let counter = 1;
          while (eds.some(edge => edge.id === `${newEdgeId}-${counter}`)) {
            counter++;
          }
          finalEdgeId = `${newEdgeId}-${counter}`;
        }

        // Preserve selection state - edge is selected since we only allow updates on selected edges
        const wasSelected = true; // Always true since we only allow updates on selected edges
        
        // Selected edges use primary blue for marker and thicker stroke
        const selectedMarkerColor = '#041295'; // Primary blue for selected state
        const strokeWidth = 4; // Thicker stroke for selected edges

        return eds.map((edge) => {
          if (edge.id === oldEdge.id) {
            return {
              ...edge,
              source: newConnection.source,
              target: newConnection.target,
              sourceHandle: newConnection.sourceHandle || edge.sourceHandle || 'right',
              targetHandle: newConnection.targetHandle || edge.targetHandle || 'left',
              // Update edge id to reflect new connection (or keep original if reconnecting to same node)
              id: finalEdgeId,
              // Preserve selection state - always true for updated edges
              selected: true,
              // Selected edges always use primary blue
              style: { stroke: selectedMarkerColor, strokeWidth },
              markerEnd: {
                type: 'arrowclosed',
                color: selectedMarkerColor, // Primary blue for selected edge arrowhead
                width: 20,
                height: 20,
              },
              label: edgeLabel,
              labelStyle: {
                fill: edgeColor,
                fontWeight: 600,
                fontSize: 12,
              },
              labelBgStyle: {
                fill: 'white',
                fillOpacity: 0.8,
                stroke: edgeColor,
                strokeWidth: 1,
                rx: 4,
                ry: 4,
              },
              interactionWidth: 30, // Extended grab area including arrowhead
            };
          }
          return edge;
        });
      });
    },
    [setEdges, nodes, edges]
  );

  // Handle selection changes
  const onSelectionChange = useCallback(({ nodes: selectedNodes, edges: selectedEdges }) => {
    // Only store selected elements and active form id; avoid mutating nodes/edges here
    setSelectedElements([...selectedNodes, ...selectedEdges]);
    const activeForm = selectedNodes.find(n => n.type === 'frontendForm');
    const activeHttp = selectedNodes.find(n => n.type === 'httpRequest');
    const activeJsonParser = selectedNodes.find(n => n.type === 'jsonParser');
    const activeCondition = selectedNodes.find(n => n.type === 'condition');
    const activeCaseCondition = selectedNodes.find(n => n.type === 'caseCondition');
    setActiveFormNodeId(activeForm ? activeForm.id : null);
    setActiveHttpNodeId(activeHttp ? activeHttp.id : null);
    setActiveJsonParserNodeId(activeJsonParser ? activeJsonParser.id : null);
    setActiveConditionNodeId(activeCondition ? activeCondition.id : null);
    setActiveCaseConditionNodeId(activeCaseCondition ? activeCaseCondition.id : null);
    
    // Ensure edges are only selected if explicitly clicked, not automatically when nodes are selected
    setEdges((eds) => {
      const selectedEdgeIds = new Set(selectedEdges.map(e => e.id));
      return eds.map(edge => ({
        ...edge,
        selected: selectedEdgeIds.has(edge.id) // Only selected if explicitly in selectedEdges
      }));
    });
  }, [setEdges]);

  // Handle keyboard events for deletion
  const onKeyDown = useCallback((event) => {
    // Ignore Delete/Backspace when focus is within the sidesheet or an input/textarea
    const isTextInput = ['INPUT', 'TEXTAREA'].includes(event.target.tagName) || event.target.isContentEditable;
    const isInSideSheet = typeof event.target.closest === 'function' && !!event.target.closest('.sidesheet');
    if ((event.key === 'Delete' || event.key === 'Backspace') && (isTextInput || isInSideSheet)) {
      return; // let the input handle the key normally
    }
    if (event.key === 'Delete' || event.key === 'Backspace') {
      console.log('Delete key pressed, selected elements:', selectedElements);
      
      // Find selected nodes and edges
      const selectedNodes = selectedElements.filter(element => element.position && element.data);
      const selectedEdges = selectedElements.filter(element => element.source && element.target);
      
      console.log('Selected nodes to delete:', selectedNodes);
      console.log('Selected edges to delete:', selectedEdges);
      
      if (selectedNodes.length > 0 || selectedEdges.length > 0) {
        // Filter out Start nodes (id: '1') - they cannot be deleted
        const deletableNodes = selectedNodes.filter(node => node.id !== '1');
        const nodeIdsToRemove = deletableNodes.map(node => node.id);
        
        if (selectedNodes.some(node => node.id === '1')) {
          console.log('Start node cannot be deleted');
        }
        
        console.log('Removing node IDs:', nodeIdsToRemove);
        
        // Remove selected edges
        const edgeIdsToRemove = selectedEdges.map(edge => edge.id);
        console.log('Removing edge IDs:', edgeIdsToRemove);
        
        // Remove edges connected to deleted nodes
        const connectedEdgeIds = edges
          .filter(edge => nodeIdsToRemove.includes(edge.source) || nodeIdsToRemove.includes(edge.target))
          .map(edge => edge.id);
        
        console.log('Removing connected edge IDs:', connectedEdgeIds);
        
        // Combine all edge IDs to remove
        const allEdgeIdsToRemove = [...new Set([...edgeIdsToRemove, ...connectedEdgeIds])];
        
        // Only proceed if there are nodes to delete or edges to delete
        if (nodeIdsToRemove.length > 0 || allEdgeIdsToRemove.length > 0) {
          // Update nodes and edges
          setNodes((nds) => nds.filter(node => !nodeIdsToRemove.includes(node.id)));
          setEdges((eds) => eds.filter(edge => !allEdgeIdsToRemove.includes(edge.id)));
          
          // Clear selection
          setSelectedElements([]);
          
          // Prevent default behavior
          event.preventDefault();
        }
      }
    }
  }, [selectedElements, setNodes, setEdges, edges]);

  // Handle canvas click to ensure focus
  const handleCanvasClick = useCallback(() => {
    console.log('Canvas clicked, ensuring focus');
    // Ensure the canvas div has focus for keyboard events
    const canvasDiv = document.querySelector('.journey-canvas-container');
    if (canvasDiv) {
      canvasDiv.focus();
    }
  }, []);

  return (
    <div 
      className="journey-canvas-container"
      ref={canvasRef}
      style={{ width: '100%', height: '100%' }}
      onKeyDown={onKeyDown}
      tabIndex={0}
      onClick={handleCanvasClick}
      onFocus={() => console.log('Canvas focused')}
      onBlur={() => console.log('Canvas blurred')}
    >
      <ReactFlow
        nodes={nodes}
        edges={[...edges].sort((a, b) => {
          // Put selected edges last so they render on top (React Flow picks top edge first)
          if (a.selected && !b.selected) return 1;
          if (!a.selected && b.selected) return -1;
          return 0;
        })}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={true}
        panOnDrag={true}
        zoomOnScroll={true}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        connectionLineStyle={{ stroke: '#041295', strokeWidth: 2 }} // var(--color-primary-blue)
        defaultEdgeOptions={{
          style: { stroke: '#041295', strokeWidth: 2 }, // var(--color-primary-blue)
          markerEnd: {
            type: 'arrowclosed',
            color: '#041295', // var(--color-primary-blue)
            width: 20,
            height: 20,
          },
        }}
        selectNodesOnDrag={false}
        deleteKeyCode={null}
        elementsSelectable={true}
        edgesUpdatable={(edge) => {
          // Find the edge in our state to check selection
          // React Flow passes the edge object, but we need to check our state
          const stateEdge = edges.find(e => e.id === edge.id);
          // Only allow updates if the edge is explicitly selected in our state
          return !!stateEdge?.selected;
        }}
        onEdgeUpdate={onEdgeUpdate}
        nodesConnectable={true}
        nodesFocusable={true}
        edgesFocusable={true}
        selectOnClick={true}
        multiSelectionKeyCode="Meta"
        panOnScroll={true}
        panOnScrollMode="free"
      >
        <Background />
        <Controls />
        <MiniMap pannable={true} zoomable={true} />
      </ReactFlow>
      
      {/* Add Node Button */}
      <div className="add-node-container">
        <button
          className="add-node-button"
          onClick={toggleNodeMenu}
          title="Add Node"
        >
          +
        </button>
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            className="add-node-button"
            title="Auto-arrange"
            onClick={async () => {
              try {
                const laidOut = await layoutGraph(reactFlowInstance.getNodes(), reactFlowInstance.getEdges(), { direction: 'RIGHT' });
                setNodes(laidOut);
                setTimeout(() => reactFlowInstance.fitView({ padding: 0.2 }), 0);
              } catch (e) {
                console.error('Auto layout failed', e);
              }
            }}
          >
            ↻
          </button>
        </div>
        
        {/* Node Selection Menu */}
        {showNodeMenu && (
          <div className="node-menu">
            <div className="node-menu-item" onClick={() => addNode('successEnd')}>
              <div className="node-menu-icon end-icon">
                <span className="material-icons">check_circle_outline</span>
              </div>
              <span>Success End</span>
            </div>
            <div className="node-menu-item" onClick={() => addNode('errorEnd')}>
              <div className="node-menu-icon end-error-icon">
                <span className="material-icons">cancel</span>
              </div>
              <span>Error End</span>
            </div>
            <div className="node-menu-item" onClick={() => addNode('frontendForm')}>
              <div className="node-menu-icon frontend-form-icon">
                <span className="material-icons">widgets</span>
              </div>
              <span>Frontend - Form</span>
            </div>
            <div className="node-menu-item" onClick={() => addNode('condition')}>
              <div className="node-menu-icon condition-icon">
                <span className="material-icons">help_outline</span>
              </div>
              <span>Condition</span>
            </div>
            <div className="node-menu-item" onClick={() => addNode('caseCondition')}>
              <div className="node-menu-icon frontend-form-icon">
                <span className="material-icons">call_split</span>
              </div>
              <span>Switch</span>
            </div>
            <div className="node-menu-item" onClick={() => addNode('httpRequest')}>
              <div className="node-menu-icon frontend-form-icon">
                <span className="material-icons">http</span>
              </div>
              <span>HTTP Request</span>
            </div>
            <div className="node-menu-item" onClick={() => addNode('jsonParser')}>
              <div className="node-menu-icon frontend-form-icon">
                <span className="material-icons">data_object</span>
              </div>
              <span>JSON Parser</span>
            </div>
            {/* Future node types can be added here */}
          </div>
        )}
      </div>
      
      {/* Overlay to close menu when clicking outside */}
      {showNodeMenu && (
        <div className="menu-overlay" onClick={closeNodeMenu} />
      )}

      {/* Sidesheet for Condition */}
      {selectedConditionNode && (
        <div 
          className="sidesheet"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="sidesheet-header">
            <div className="sidesheet-title">Condition</div>
          </div>
          <div className="sidesheet-tabs">
            <button className={`tab-btn ${activeConditionTab==='details'?'active':''}`} onClick={()=>{
              setActiveConditionTab('details');
              if (selectedConditionNode?.id) localStorage.setItem(`sidesheetTab:${selectedConditionNode.id}`, 'details');
            }}>Details</button>
            <button className={`tab-btn ${activeConditionTab==='condition'?'active':''}`} onClick={()=>{
              setActiveConditionTab('condition');
              if (selectedConditionNode?.id) localStorage.setItem(`sidesheetTab:${selectedConditionNode.id}`, 'condition');
            }}>Condition</button>
          </div>
          <div className="sidesheet-body">
            {activeConditionTab === 'details' && (
              <div>
                <label className="input-label" htmlFor="condition-name">Name</label>
                <input
                  id="condition-name"
                  className="text-input"
                  type="text"
                  value={selectedConditionNode.data?.label || ''}
                  onChange={(e) => updateConditionProperty('label', e.target.value)}
                  placeholder="Condition"
                />
              </div>
            )}
            {activeConditionTab === 'condition' && (
              <div>
                <label className="input-label" htmlFor="condition-left">Left Operand</label>
                <input
                  id="condition-left"
                  className="text-input"
                  type="text"
                  value={selectedConditionNode.data?.leftOperand || ''}
                  onChange={(e) => updateConditionProperty('leftOperand', e.target.value)}
                  placeholder="variable or value"
                />
                <div style={{ height: '12px' }} />
                <label className="input-label" htmlFor="condition-operator">Operator</label>
                <select
                  id="condition-operator"
                  className="text-input"
                  value={selectedConditionNode.data?.operator || 'eq'}
                  onChange={(e) => updateConditionProperty('operator', e.target.value)}
                >
                  <option value="eq">Equal (eq)</option>
                  <option value="ne">Not Equal (ne)</option>
                  <option value="gt">Greater Than (gt)</option>
                  <option value="gte">Greater Than or Equal (gte)</option>
                  <option value="lt">Less Than (lt)</option>
                  <option value="lte">Less Than or Equal (lte)</option>
                  <option value="contains">Contains</option>
                  <option value="startsWith">Starts With</option>
                  <option value="endsWith">Ends With</option>
                  <option value="in">In</option>
                  <option value="exists">Exists</option>
                </select>
                <div style={{ height: '12px' }} />
                <label className="input-label" htmlFor="condition-right">Right Operand</label>
                <input
                  id="condition-right"
                  className="text-input"
                  type="text"
                  value={selectedConditionNode.data?.rightOperand || ''}
                  onChange={(e) => updateConditionProperty('rightOperand', e.target.value)}
                  placeholder="variable or value"
                />
                <div style={{ height: '12px' }} />
                <div style={{ fontSize: '13px', color: 'var(--color-gray-600)', backgroundColor: 'var(--color-gray-50)', padding: '12px', borderRadius: '4px' }}>
                  <strong>Condition Preview:</strong><br/>
                  <code style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                    {selectedConditionNode.data?.leftOperand || '?'} {selectedConditionNode.data?.operator || 'eq'} {selectedConditionNode.data?.rightOperand || '?'}
                  </code>
                  <br/><br/>
                  <div style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>
                    <strong>Note:</strong> The "false" path is actually an "else" path that executes when the condition is not met.
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="sidesheet-footer">
            <div className="footer-left">
              <button className="btn-danger" onClick={deleteSelectedConditionNode}>Delete</button>
            </div>
            <div className="footer-right">
              <button className="btn-secondary" onClick={closeSidesheet}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidesheet for Switch */}
      {selectedCaseConditionNode && (
        <div 
          className="sidesheet"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="sidesheet-header">
            <div className="sidesheet-title">Switch</div>
          </div>
          <div className="sidesheet-tabs">
            <button className={`tab-btn ${activeCaseConditionTab==='details'?'active':''}`} onClick={()=>{
              setActiveCaseConditionTab('details');
              if (selectedCaseConditionNode?.id) localStorage.setItem(`sidesheetTab:${selectedCaseConditionNode.id}`, 'details');
            }}>Details</button>
            <button className={`tab-btn ${activeCaseConditionTab==='cases'?'active':''}`} onClick={()=>{
              setActiveCaseConditionTab('cases');
              if (selectedCaseConditionNode?.id) localStorage.setItem(`sidesheetTab:${selectedCaseConditionNode.id}`, 'cases');
            }}>Cases</button>
          </div>
          <div className="sidesheet-body">
            {activeCaseConditionTab === 'details' && (
              <div>
                <label className="input-label" htmlFor="case-condition-name">Name</label>
                <input
                  id="case-condition-name"
                  className="text-input"
                  type="text"
                  value={selectedCaseConditionNode.data?.label || ''}
                  onChange={(e) => updateCaseConditionProperty('label', e.target.value)}
                  placeholder="Switch"
                />
              </div>
            )}
            {activeCaseConditionTab === 'cases' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="input-label" style={{ margin: 0 }}>Conditions</label>
                  <button className="btn-secondary" onClick={addCaseCondition} style={{ padding: '4px 8px', fontSize: '12px' }}>
                    Add Condition
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginBottom: '12px' }}>
                  Define conditions evaluated top to bottom. First match wins. Else is executed if no condition matches.
                </div>
                {(selectedCaseConditionNode.data?.conditions || []).map((cond, idx) => (
                  <div key={idx} style={{ border: '1px solid var(--color-gray-300)', borderRadius: '4px', padding: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        className="text-input"
                        style={{ flex: 1 }}
                        type="text"
                        value={cond.condition || ''}
                        onChange={(e) => updateCaseCondition(idx, 'condition', e.target.value)}
                        placeholder="Variable or expression"
                      />
                      <select
                        className="text-input"
                        style={{ width: '120px' }}
                        value={cond.operator || 'eq'}
                        onChange={(e) => updateCaseCondition(idx, 'operator', e.target.value)}
                      >
                        <option value="eq">eq</option>
                        <option value="ne">ne</option>
                        <option value="gt">gt</option>
                        <option value="gte">gte</option>
                        <option value="lt">lt</option>
                        <option value="lte">lte</option>
                        <option value="contains">contains</option>
                      </select>
                      <input
                        className="text-input"
                        style={{ flex: 1 }}
                        type="text"
                        value={cond.value || ''}
                        onChange={(e) => updateCaseCondition(idx, 'value', e.target.value)}
                        placeholder="Value"
                      />
                      <button 
                        className="btn-danger" 
                        onClick={() => removeCaseCondition(idx)}
                        style={{ padding: '4px 8px' }}
                        title="Remove"
                      >
                        <span className="material-icons" style={{ fontSize: '16px' }}>delete_outline</span>
                      </button>
                    </div>
                  </div>
                ))}
                <div style={{ border: '1px solid var(--color-gray-300)', borderRadius: '4px', padding: '12px', backgroundColor: 'var(--color-gray-50)', marginTop: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="material-icons" style={{ fontSize: '16px', color: 'var(--color-gray-600)' }}>info_outline</span>
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: '13px' }}>Else (Default Path)</strong>
                      <div style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>Executed if no condition matches</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="sidesheet-footer">
            <div className="footer-left">
              <button className="btn-danger" onClick={deleteSelectedCaseConditionNode}>Delete</button>
            </div>
            <div className="footer-right">
              <button className="btn-secondary" onClick={closeSidesheet}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidesheet for HTTP Request */}
      {selectedHttpNode && (
        <div 
          className="sidesheet"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="sidesheet-header">
            <div className="sidesheet-title">HTTP Request</div>
          </div>
          <div className="sidesheet-tabs">
            <button className={`tab-btn ${activeHttpTab==='details'?'active':''}`} onClick={()=>{
              setActiveHttpTab('details');
              if (selectedHttpNode?.id) localStorage.setItem(`sidesheetTab:${selectedHttpNode.id}`, 'details');
            }}>Details</button>
            <button className={`tab-btn ${activeHttpTab==='request'?'active':''}`} onClick={()=>{
              setActiveHttpTab('request');
              if (selectedHttpNode?.id) localStorage.setItem(`sidesheetTab:${selectedHttpNode.id}`, 'request');
            }}>Request</button>
            <button className={`tab-btn ${activeHttpTab==='context'?'active':''}`} onClick={()=>{
              setActiveHttpTab('context');
              if (selectedHttpNode?.id) localStorage.setItem(`sidesheetTab:${selectedHttpNode.id}`, 'context');
            }}>Context</button>
          </div>
          <div className="sidesheet-body">
            {activeHttpTab === 'details' && (
              <div>
                <label className="input-label" htmlFor="http-node-name">Name</label>
                <input
                  id="http-node-name"
                  className="text-input"
                  type="text"
                  value={selectedHttpNode.data?.label || ''}
                  onChange={(e) => updateHttpNodeProperty('label', e.target.value)}
                  placeholder="HTTP Request"
                />
                <div style={{ height: '12px' }} />
                <label className="input-label" htmlFor="http-node-type">Type</label>
                <select
                  id="http-node-type"
                  className="text-input"
                  value={selectedHttpNode.data?.nodeType || 'backend'}
                  onChange={(e) => updateHttpNodeProperty('nodeType', e.target.value)}
                >
                  <option value="frontend">Frontend</option>
                  <option value="backend">Backend</option>
                </select>
              </div>
            )}
            {activeHttpTab === 'request' && (
              <div>
                <label className="input-label" htmlFor="http-method">API Method</label>
                <select
                  id="http-method"
                  className="text-input"
                  value={selectedHttpNode.data?.method || 'GET'}
                  onChange={(e) => updateHttpNodeProperty('method', e.target.value)}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                  <option value="DELETE">DELETE</option>
                  <option value="HEAD">HEAD</option>
                  <option value="OPTIONS">OPTIONS</option>
                </select>
                <div style={{ height: '12px' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    id="follow-redirects"
                    checked={selectedHttpNode.data?.followRedirects || false}
                    onChange={(e) => updateHttpNodeProperty('followRedirects', e.target.checked)}
                  />
                  <label className="input-label" htmlFor="follow-redirects" style={{ margin: 0 }}>Follow redirects</label>
                </div>
                <div style={{ height: '12px' }} />
                <label className="input-label" htmlFor="http-endpoint">API Endpoint</label>
                <input
                  id="http-endpoint"
                  className="text-input"
                  type="text"
                  value={selectedHttpNode.data?.endpoint || ''}
                  onChange={(e) => updateHttpNodeProperty('endpoint', e.target.value)}
                  placeholder="https://api.example.com/endpoint"
                />
                <div style={{ height: '24px' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="input-label" style={{ margin: 0 }}>Request Headers</label>
                  <button className="btn-secondary" onClick={addHttpNodeHeader} style={{ padding: '4px 8px', fontSize: '12px' }}>
                    Add Header
                  </button>
                </div>
                {(selectedHttpNode.data?.headers || []).map((header, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input
                      className="text-input"
                      style={{ flex: 1 }}
                      type="text"
                      value={header.key || ''}
                      onChange={(e) => updateHttpNodeHeader(idx, 'key', e.target.value)}
                      placeholder="Header name"
                    />
                    <input
                      className="text-input"
                      style={{ flex: 1 }}
                      type="text"
                      value={header.value || ''}
                      onChange={(e) => updateHttpNodeHeader(idx, 'value', e.target.value)}
                      placeholder="Header value"
                    />
                    <button 
                      className="btn-danger" 
                      onClick={() => removeHttpNodeHeader(idx)}
                      style={{ padding: '4px 8px' }}
                      title="Remove"
                    >
                      <span className="material-icons" style={{ fontSize: '16px' }}>delete_outline</span>
                    </button>
                  </div>
                ))}
                {selectedHttpNode.data?.nodeType === 'backend' && (
                  <>
                    <div style={{ height: '24px' }} />
                    <label className="input-label" htmlFor="ca-certificate">CA Certificate (TLS Configuration)</label>
                    <textarea
                      id="ca-certificate"
                      className="text-input"
                      rows={6}
                      value={selectedHttpNode.data?.caCertificate || ''}
                      onChange={(e) => updateHttpNodeProperty('caCertificate', e.target.value)}
                      placeholder="PEM encoded certificate..."
                    />
                  </>
                )}
                <div style={{ height: '24px' }} />
                <label className="input-label" htmlFor="request-template">Request Template</label>
                <textarea
                  id="request-template"
                  className="text-input"
                  rows={8}
                  value={selectedHttpNode.data?.requestTemplate || ''}
                  onChange={(e) => updateHttpNodeProperty('requestTemplate', e.target.value)}
                  placeholder={'Request body template (use {{variable}} for context variables)'}
                />
                <div style={{ height: '8px' }} />
                <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', fontStyle: 'italic' }}>
                  {'Use {{variable}} syntax to access context variables. Available: data, status, statusText, headers, config'}
                </div>
              </div>
            )}
            {activeHttpTab === 'context' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="input-label" style={{ margin: 0 }}>Store Variables in Context</label>
                  <button className="btn-secondary" onClick={addHttpNodeContextVariable} style={{ padding: '4px 8px', fontSize: '12px' }}>
                    Add Variable
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginBottom: '12px' }}>
                  Select which response fields to store in context: data, status, statusText, headers, config
                </div>
                {(selectedHttpNode.data?.contextVariables || []).map((variable, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <select
                      className="text-input"
                      style={{ flex: 1 }}
                      value={variable}
                      onChange={(e) => updateHttpNodeContextVariable(idx, e.target.value)}
                    >
                      <option value="">Select variable...</option>
                      <option value="data">data</option>
                      <option value="status">status</option>
                      <option value="statusText">statusText</option>
                      <option value="headers">headers</option>
                      <option value="config">config</option>
                    </select>
                    <button 
                      className="btn-danger" 
                      onClick={() => removeHttpNodeContextVariable(idx)}
                      style={{ padding: '4px 8px' }}
                      title="Remove"
                    >
                      <span className="material-icons" style={{ fontSize: '16px' }}>delete_outline</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="sidesheet-footer">
            <div className="footer-left">
              <button className="btn-danger" onClick={deleteSelectedHttpNode}>Delete</button>
            </div>
            <div className="footer-right">
              <button className="btn-secondary" onClick={closeSidesheet}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidesheet for JSON Parser */}
      {selectedJsonParserNode && (
        <div 
          className="sidesheet"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="sidesheet-header">
            <div className="sidesheet-title">JSON Parser</div>
          </div>
          <div className="sidesheet-tabs">
            <button className={`tab-btn ${activeJsonParserTab==='details'?'active':''}`} onClick={()=>{
              setActiveJsonParserTab('details');
              if (selectedJsonParserNode?.id) localStorage.setItem(`sidesheetTab:${selectedJsonParserNode.id}`, 'details');
            }}>Details</button>
            <button className={`tab-btn ${activeJsonParserTab==='extraction'?'active':''}`} onClick={()=>{
              setActiveJsonParserTab('extraction');
              if (selectedJsonParserNode?.id) localStorage.setItem(`sidesheetTab:${selectedJsonParserNode.id}`, 'extraction');
            }}>Extraction Rules</button>
            <button className={`tab-btn ${activeJsonParserTab==='context'?'active':''}`} onClick={()=>{
              setActiveJsonParserTab('context');
              if (selectedJsonParserNode?.id) localStorage.setItem(`sidesheetTab:${selectedJsonParserNode.id}`, 'context');
            }}>Context</button>
          </div>
          <div className="sidesheet-body">
            {activeJsonParserTab === 'details' && (
              <div>
                <label className="input-label" htmlFor="json-parser-name">Name</label>
                <input
                  id="json-parser-name"
                  className="text-input"
                  type="text"
                  value={selectedJsonParserNode.data?.label || ''}
                  onChange={(e) => updateJsonParserProperty('label', e.target.value)}
                  placeholder="JSON Parser"
                />
                <div style={{ height: '12px' }} />
                <label className="input-label" htmlFor="json-parser-source">Source Variable</label>
                <input
                  id="json-parser-source"
                  className="text-input"
                  type="text"
                  value={selectedJsonParserNode.data?.sourceVariable || ''}
                  onChange={(e) => updateJsonParserProperty('sourceVariable', e.target.value)}
                  placeholder="data"
                />
                <div style={{ height: '8px' }} />
                <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', fontStyle: 'italic' }}>
                  Context variable containing the JSON to parse
                </div>
              </div>
            )}
            {activeJsonParserTab === 'extraction' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="input-label" style={{ margin: 0 }}>Field Mappings</label>
                  <button className="btn-secondary" onClick={addExtractionRule} style={{ padding: '4px 8px', fontSize: '12px' }}>
                    Add Rule
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginBottom: '12px' }}>
                  Define JSONPath expressions to extract fields from JSON
                </div>
                {(selectedJsonParserNode.data?.extractionRules || []).map((rule, idx) => (
                  <div key={idx} style={{ border: '1px solid var(--color-gray-300)', borderRadius: '4px', padding: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        className="text-input"
                        style={{ flex: 1 }}
                        type="text"
                        value={rule.outputName || ''}
                        onChange={(e) => updateExtractionRule(idx, 'outputName', e.target.value)}
                        placeholder="Output variable name"
                      />
                      <button 
                        className="btn-danger" 
                        onClick={() => removeExtractionRule(idx)}
                        style={{ padding: '4px 8px' }}
                        title="Remove"
                      >
                        <span className="material-icons" style={{ fontSize: '16px' }}>delete_outline</span>
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        className="text-input"
                        style={{ flex: 1 }}
                        type="text"
                        value={rule.jsonPath || ''}
                        onChange={(e) => updateExtractionRule(idx, 'jsonPath', e.target.value)}
                        placeholder="JSONPath (e.g., $.data.userId)"
                      />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        id={`required-${idx}`}
                        checked={rule.required || false}
                        onChange={(e) => updateExtractionRule(idx, 'required', e.target.checked)}
                      />
                      <label className="input-label" htmlFor={`required-${idx}`} style={{ margin: 0, fontSize: '13px' }}>Required</label>
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', fontStyle: 'italic' }}>
                  Example JSONPath expressions: $.data.userId, $.result[0].name, $.items[*].id
                </div>
              </div>
            )}
            {activeJsonParserTab === 'context' && (
              <div>
                <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginBottom: '12px' }}>
                  The following variables will be added to context:
                </div>
                {(selectedJsonParserNode.data?.extractionRules || []).length > 0 ? (
                  <div>
                    {(selectedJsonParserNode.data?.extractionRules || []).map((rule, idx) => (
                      <div key={idx} style={{ 
                        padding: '8px', 
                        marginBottom: '4px', 
                        backgroundColor: 'var(--color-gray-50)', 
                        borderRadius: '4px',
                        fontSize: '13px',
                        fontFamily: 'monospace'
                      }}>
                        {rule.outputName || '(unnamed)'}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', color: 'var(--color-gray-400)', fontStyle: 'italic' }}>
                    No extraction rules defined yet
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="sidesheet-footer">
            <div className="footer-left">
              <button className="btn-danger" onClick={deleteSelectedJsonParserNode}>Delete</button>
            </div>
            <div className="footer-right">
              <button className="btn-secondary" onClick={closeSidesheet}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidesheet for Frontend - Form */}
      {selectedFrontendForm && (
        <div 
          className="sidesheet"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="sidesheet-header">
            <div className="sidesheet-title">Frontend - Form</div>
          </div>
          <div className="sidesheet-tabs">
            <button className={`tab-btn ${activeTab==='details'?'active':''}`} onClick={()=>{
              setActiveTab('details');
              if (selectedFrontendForm?.id) localStorage.setItem(`sidesheetTab:${selectedFrontendForm.id}`, 'details');
            }}>Details</button>
            <button className={`tab-btn ${activeTab==='form'?'active':''}`} onClick={()=>{
              setActiveTab('form');
              if (selectedFrontendForm?.id) localStorage.setItem(`sidesheetTab:${selectedFrontendForm.id}`, 'form');
            }}>Form</button>
          </div>
          <div className="sidesheet-body">
            {activeTab === 'details' && (
              <div>
                <label className="input-label" htmlFor="node-name">Name</label>
                <input
                  id="node-name"
                  className="text-input"
                  type="text"
                  value={selectedFrontendForm.data?.label || ''}
                  onChange={(e) => updateSelectedFrontendFormLabel(e.target.value)}
                  placeholder="Frontend - Form"
                />
                <div style={{ height: '12px' }} />
                <label className="input-label" htmlFor="node-desc">Description</label>
                <textarea
                  id="node-desc"
                  className="text-input"
                  rows={3}
                  value={selectedFrontendForm.data?.description || ''}
                  onChange={(e) => updateSelectedFrontendFormDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
            )}
            {activeTab === 'form' && (
              <div className="form-editor">
                <div className="form-elements">
                  <div className="section-title">Elements</div>
                  <div className="element-actions">
                    <button className="btn-secondary element-icon-btn" title="Add Input" onClick={()=>addElement('input')}>
                      <span className="material-icons">text_fields</span>
                    </button>
                    <button className="btn-secondary element-icon-btn" title="Add Password" onClick={()=>addElement('password')}>
                      <span className="material-icons">lock_outline</span>
                    </button>
                    <button className="btn-secondary element-icon-btn" title="Add Checkbox" onClick={()=>addElement('checkbox')}>
                      <span className="material-icons">check_box_outline_blank</span>
                    </button>
                    <button className="btn-secondary element-icon-btn" title="Add Label" onClick={()=>addElement('label')}>
                      <span className="material-icons">label_outline</span>
                    </button>
                    <button className="btn-secondary element-icon-btn" title="Add Button" onClick={()=>addElement('button')}>
                      <span className="material-icons">radio_button_checked</span>
                    </button>
                    <button className="btn-secondary element-icon-btn" title="Add Row (group)" onClick={()=>addElement('row')}>
                      <span className="material-icons">view_column</span>
                    </button>
                  </div>
                  <div className="element-list" onDragOver={onDragOver}>
                    {(formSchema?.elements||[]).map((el, idx) => (
                      <div key={el.id}>
                        <div
                          className={`element-item ${selectedElementIndex===idx?'selected':''}`}
                          draggable
                          onDragStart={(e)=>onDragStart(e, idx)}
                          onDrop={(e)=>onDrop(e, idx)}
                          onClick={()=>setSelectedElementIndex(idx)}
                        >
                          <span className="element-type">
                            <span className="material-icons">{getElementIcon(el.type)}</span>
                          </span>
                          {selectedElementIndex===idx ? (
                            <input
                              className="text-input"
                              style={{ flex: 1, minWidth: 0 }}
                              value={el.label || ''}
                              placeholder={el.i18nKey || el.id}
                              autoFocus
                              onMouseDown={(e)=>e.stopPropagation()}
                              onClick={(e)=>e.stopPropagation()}
                              onChange={(e)=>updateElement(idx, { ...el, label: e.target.value })}
                            />
                          ) : (
                            <span className="element-label">{el.label || el.i18nKey || el.id}</span>
                          )}
                          <button
                            className="btn-danger"
                            style={{ marginLeft: 'auto', padding: '2px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Remove"
                            onClick={(e)=>{ e.stopPropagation(); deleteElement(idx); }}
                          >
                            <span className="material-icons" style={{ fontSize: '16px' }}>delete_outline</span>
                          </button>
                        </div>
                        {el.type === 'row' && (
                          <div
                          className="row-drop-zone"
                          onDragOver={onDragOver}
                          onDrop={(e)=>{ e.stopPropagation(); onChildDrop(e, idx, (el.children||[]).length); }}
                          >
                            {(el.children||[]).map((child, cIdx) => (
                              <div
                                key={child.id}
                                className="element-item"
                                draggable
                                onDragStart={(e)=>onChildDragStart(e, idx, cIdx)}
                              onDrop={(e)=>{ e.stopPropagation(); onChildDrop(e, idx, cIdx); }}
                                onClick={(e)=>e.stopPropagation()}
                              >
                                <span className="element-type">
                                  <span className="material-icons">{getElementIcon(child.type)}</span>
                                </span>
                                <span className="element-label">{child.label || child.i18nKey || child.id}</span>
                                <button className="btn-danger" style={{ marginLeft:'auto', padding:'2px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Remove" onClick={(e)=>{e.stopPropagation(); deleteChild(idx,cIdx);}}>
                                  <span className="material-icons" style={{ fontSize: '16px' }}>delete_outline</span>
                                </button>
                              </div>
                            ))}
                            {(el.children||[]).length === 0 && (
                              <div className="drop-zone-placeholder">Drag & drop elements here</div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="form-properties">
                  <div className="section-title">Preview</div>
                  <FormPreview
                    schema={formSchema}
                    onSubmit={(values)=>console.log('Submit (simulate success):', values)}
                  />
                  {selectedElementIndex != null && (
                    <>
                      <div className="section-title" style={{marginTop:'12px'}}>Properties</div>
                      <FormEditorFields
                        element={formSchema?.elements?.[selectedElementIndex]}
                        onChange={(next)=>updateElement(selectedElementIndex, next)}
                      />
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="sidesheet-footer">
            <div className="footer-left">
              <button className="btn-danger" onClick={deleteSelectedFrontendForm}>Delete</button>
            </div>
            <div className="footer-right">
              <button className="btn-secondary" onClick={closeSidesheet}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JourneyCanvas() {
  return (
    <ReactFlowProvider>
      <InnerCanvas />
    </ReactFlowProvider>
  );
}
