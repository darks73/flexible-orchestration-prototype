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

const SWITCH_HANDLE_PREFIX = 'switch-case-';
const LEGACY_SWITCH_HANDLE_REGEX = /^switch-\d+$/;

const generateSwitchCaseHandleId = () => `${SWITCH_HANDLE_PREFIX}${Math.random().toString(36).slice(2, 11)}`;

const isSwitchCaseHandle = (handleId) =>
  typeof handleId === 'string' &&
  (handleId.startsWith(SWITCH_HANDLE_PREFIX) || LEGACY_SWITCH_HANDLE_REGEX.test(handleId));

const findSwitchCaseByHandle = (switchNode, handleId) => {
  if (!switchNode || !handleId) {
    return { caseItem: null, index: -1 };
  }

  const cases = switchNode.data?.cases || [];
  const idIndex = cases.findIndex((caseItem) => caseItem?.id === handleId);
  if (idIndex !== -1) {
    return { caseItem: cases[idIndex], index: idIndex };
  }

  if (LEGACY_SWITCH_HANDLE_REGEX.test(handleId)) {
    const legacyIndex = parseInt(handleId.replace('switch-', ''), 10);
    if (!Number.isNaN(legacyIndex)) {
      return { caseItem: cases[legacyIndex], index: legacyIndex };
    }
  }

  return { caseItem: null, index: -1 };
};

const sanitizeEdgeSegment = (value) =>
  (value ?? 'null').toString().replace(/[^a-zA-Z0-9_-]/g, '_');

const buildEdgeId = ({ source, sourceHandle, target, targetHandle }) => {
  const parts = [
    sanitizeEdgeSegment(source),
    sanitizeEdgeSegment(sourceHandle || 'right'),
    sanitizeEdgeSegment(target),
    sanitizeEdgeSegment(targetHandle || 'left'),
  ];
  return `e-${parts.join('--')}`;
};

const createDefaultHttpAuthentication = () => ({
  type: 'none',
  username: '',
  password: '',
  token: '',
  apiKeyName: '',
  apiKeyValue: '',
});

const createDefaultHttpResponseStorage = () => ({
  attributeName: 'httpResponse',
  storeCode: true,
  storeHeaders: true,
  storeBody: true,
});

const createDefaultFormResponseStorage = () => ({
  attributeName: 'formData',
  storeAllFields: true,
  selectedFields: [],
});

const extractFormFieldOptions = (schema) => {
  const options = [];

  if (!schema || !Array.isArray(schema.elements)) {
    return options;
  }

  const excludedTypes = new Set(['label', 'button']);

  const walk = (elements) => {
    if (!Array.isArray(elements)) return;
    elements.forEach((el) => {
      if (!el) return;
      if (el.type === 'row') {
        walk(el.children || []);
        return;
      }
      const label = el.label || el.i18nKey || el.id;
      if (!excludedTypes.has(el.type)) {
        options.push({ id: el.id, label });
      }
    });
  };

  walk(schema.elements);
  return options;
};

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
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span className="material-icons" style={{ fontSize: '20px', color: '#041295' }}>widgets</span>
      <div className="frontend-form-title">{data.label || 'Frontend - Form'}</div>
    </div>
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
        background: '#B81500', // darker error red
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
      <div className="condition-content">{data.label || 'Simple Condition'}</div>
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
        background: '#B81500', // darker error red
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span className="material-icons" style={{ fontSize: '20px', color: '#041295' }}>http</span>
      <div className="frontend-form-title">{data.label || 'HTTP Request'}</div>
    </div>
    <div className="frontend-form-subtitle">{data.nodeType === 'backend' ? 'Internal' : 'External'}</div>
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
        background: '#B81500', // darker error red
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
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span className="material-icons" style={{ fontSize: '20px', color: '#041295' }}>data_object</span>
      <div className="frontend-form-title">{data.label || 'JSON Parser'}</div>
    </div>
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
        background: '#B81500', // darker error red
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="material-icons" style={{ fontSize: '20px', color: '#041295' }}>call_split</span>
        <div className="frontend-form-title">{data.label || 'Multiple Conditions'}</div>
      </div>
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
            key={condition.id || `condition-${idx}`}
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

const SwitchNode = ({ data, selected }) => {
  const cases = data?.cases || [];
  
  return (
    <div className={`frontend-form-node ${selected ? 'selected' : ''}`} style={{ minHeight: '120px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span className="material-icons" style={{ fontSize: '20px', color: '#041295' }}>shuffle</span>
        <div className="frontend-form-title">{data.label || 'Switch'}</div>
      </div>
      <div className="frontend-form-subtitle">Switch</div>
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
      {/* Dynamic output handles for each case */}
      {cases.map((caseItem, idx) => {
        const totalOutputs = cases.length + 1; // cases + default
        const baseOffset = 15;
        const range = 70;
        const topPercent = baseOffset + (idx * (range / totalOutputs));
        const handleId = caseItem?.id || `switch-${idx}`;
        return (
          <Handle
            key={handleId}
            type="source"
            position={Position.Right}
            id={handleId}
            style={{ 
              background: '#9C27B0', // purple for switch cases
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
      {/* Default handle - always last */}
      <Handle
        type="source"
        position={Position.Right}
        id="default"
        style={{ 
          background: '#9E9E9E', // Gray for default
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

const ContextOperationNode = ({ data, selected }) => (
  <div className={`frontend-form-node ${selected ? 'selected' : ''}`}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span className="material-icons" style={{ fontSize: '20px', color: '#041295' }}>settings</span>
      <div className="frontend-form-title">{data.label || 'Context Operation'}</div>
    </div>
    <div className="frontend-form-subtitle">Operation</div>
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
    {/* Output */}
    <Handle
      type="source"
      position={Position.Right}
      id="output"
      style={{ 
        background: '#041295', // var(--color-primary-blue)
        border: '2px solid white',
        width: '8px',
        height: '8px',
        right: '-4px',
        top: '50%',
        transform: 'translateY(-50%)'
      }}
    />
  </div>
);

// Node types configuration
const nodeTypes = {
  start: StartNode,
  successEnd: SuccessEndNode,
  errorEnd: ErrorEndNode,
  condition: ConditionNode,
  caseCondition: CaseConditionNode,
  switch: SwitchNode,
  contextOperation: ContextOperationNode,
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
      ],
      edges: savedEdges ? JSON.parse(savedEdges) : [],
      nextNodeId: savedNextId ? Number(savedNextId) : 2,
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
      ],
      edges: [],
      nextNodeId: 2,
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

// Export journey data including form schemas
const exportJourney = (nodes, edges, nextNodeId) => {
  try {
    const normalizedNodes = nodes.map(normalizeNode);
    const normalizedEdges = edges.map(normalizeEdge);
    
    // Gather all form schemas from localStorage
    const formSchemas = {};
    const frontendFormNodes = normalizedNodes.filter(n => n.type === 'frontendForm');
    frontendFormNodes.forEach(node => {
      const schema = loadFormSchema(node.id);
      if (schema) {
        formSchemas[node.id] = schema;
      }
      // Also check if schema is in node.data
      if (node.data?.formSchema) {
        formSchemas[node.id] = node.data.formSchema;
      }
    });
    
    const exportData = {
      nodes: normalizedNodes,
      edges: normalizedEdges,
      nextNodeId,
      formSchemas,
      version: '1.0',
      exportedAt: new Date().toISOString()
    };
    
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `journey-export-${timestamp}.json`;
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Failed to export journey', e);
    alert('Failed to export journey. Please try again.');
  }
};

// Validate imported journey data
const validateJourneyData = (data) => {
  const errors = [];
  const warnings = [];
  
  // Check JSON structure
  if (!data || typeof data !== 'object') {
    errors.push('Invalid JSON format');
    return { valid: false, errors, warnings };
  }
  
  // Check required fields
  if (!Array.isArray(data.nodes)) {
    errors.push('Missing or invalid "nodes" field (must be an array)');
  }
  if (!Array.isArray(data.edges)) {
    errors.push('Missing or invalid "edges" field (must be an array)');
  }
  if (typeof data.nextNodeId !== 'number') {
    errors.push('Missing or invalid "nextNodeId" field (must be a number)');
  }
  
  if (errors.length > 0) {
    return { valid: false, errors, warnings };
  }
  
  const validNodeTypes = ['start', 'successEnd', 'errorEnd', 'condition', 'caseCondition', 'switch', 'contextOperation', 'frontendForm', 'httpRequest', 'jsonParser'];
  const nodeIds = new Set();
  
  // Validate nodes
  data.nodes.forEach((node, index) => {
    if (!node.id) {
      errors.push(`Node at index ${index} is missing "id" field`);
      return;
    }
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate node ID: ${node.id}`);
    }
    nodeIds.add(node.id);
    
    if (!node.type) {
      errors.push(`Node "${node.id}" is missing "type" field`);
      return;
    }
    if (!validNodeTypes.includes(node.type)) {
      errors.push(`Node "${node.id}" has invalid type: ${node.type}`);
      return;
    }
    if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
      errors.push(`Node "${node.id}" has invalid or missing "position" field`);
    }
    if (!node.data || typeof node.data !== 'object') {
      errors.push(`Node "${node.id}" has invalid or missing "data" field`);
    }
  });
  
  // Validate edges
  data.edges.forEach((edge, index) => {
    if (!edge.source || !edge.target) {
      errors.push(`Edge at index ${index} is missing "source" or "target" field`);
      return;
    }
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge at index ${index} references non-existent source node: ${edge.source}`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge at index ${index} references non-existent target node: ${edge.target}`);
    }
  });
  
  // Check for at least one start node
  const hasStartNode = data.nodes.some(node => node.type === 'start');
  if (!hasStartNode) {
    errors.push('Journey must have at least one start node');
  }
  
  // Validate form schemas if present
  if (data.formSchemas && typeof data.formSchemas === 'object') {
    Object.entries(data.formSchemas).forEach(([nodeId, schema]) => {
      if (!nodeIds.has(nodeId)) {
        warnings.push(`Form schema found for non-existent node: ${nodeId}`);
        return;
      }
      if (typeof schema !== 'object' || !Array.isArray(schema.elements)) {
        warnings.push(`Invalid form schema structure for node: ${nodeId}`);
      }
    });
  }
  
  // Validate node data consistency
  data.nodes.forEach(node => {
    if (node.type === 'caseCondition' && node.data?.conditions) {
      if (!Array.isArray(node.data.conditions)) {
        errors.push(`Node "${node.id}" (caseCondition) has invalid conditions array`);
      }
    }
    if (node.type === 'switch' && node.data?.cases) {
      if (!Array.isArray(node.data.cases)) {
        errors.push(`Node "${node.id}" (switch) has invalid cases array`);
      }
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

const initialJourney = loadJourney();
const initialNodes = initialJourney.nodes;
// Ensure all initial edges have interactionWidth for extended grab area
const initialEdges = initialJourney.edges.map(edge => ({
  ...edge,
  interactionWidth: edge.interactionWidth || 30,
}));
const initialNextNodeId = initialJourney.nextNodeId;

function InnerCanvas({ onExportReady, onImportReady }) {
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
  const [activeSwitchNodeId, setActiveSwitchNodeId] = useState(null);
  const [activeContextOperationNodeId, setActiveContextOperationNodeId] = useState(null);
  const reactFlowInstance = useReactFlow();
  const canvasRef = useRef(null);
  const [activeTab, setActiveTab] = useState('details');
  const [activeHttpTab, setActiveHttpTab] = useState('details');
  const [activeJsonParserTab, setActiveJsonParserTab] = useState('details');
  const [activeConditionTab, setActiveConditionTab] = useState('details');
  const [activeCaseConditionTab, setActiveCaseConditionTab] = useState('details');
  const [activeSwitchTab, setActiveSwitchTab] = useState('details');
  const [activeContextOperationTab, setActiveContextOperationTab] = useState('details');
  const [formSchema, setFormSchema] = useState(null);
  const [selectedElementIndex, setSelectedElementIndex] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showImportFileModal, setShowImportFileModal] = useState(false);
  const [pendingImportData, setPendingImportData] = useState(null);
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const exportHandlerRef = useRef(null);
  const importHandlerRef = useRef(null);
  const handlersExposedRef = useRef(false);
  const isMountedRef = useRef(false);
  const isRegisteringHandlersRef = useRef(false);
  const exportWrapperRef = useRef(null);
  const importWrapperRef = useRef(null);
  const registrationCompleteRef = useRef(false);
  const exportReadyRef = useRef(false);
  const importReadyRef = useRef(false);
  
  // Selection rectangle state for multi-select
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  
  const selectedFrontendForm = nodes.find(n => n.id === activeFormNodeId);
  const selectedHttpNode = nodes.find(n => n.id === activeHttpNodeId);
  const selectedJsonParserNode = nodes.find(n => n.id === activeJsonParserNodeId);
  const selectedConditionNode = nodes.find(n => n.id === activeConditionNodeId);
  const selectedCaseConditionNode = nodes.find(n => n.id === activeCaseConditionNodeId);
  const selectedSwitchNode = nodes.find(n => n.id === activeSwitchNodeId);
  const selectedContextOperationNode = nodes.find(n => n.id === activeContextOperationNodeId);

  const formFieldOptions = React.useMemo(() => extractFormFieldOptions(formSchema), [formSchema]);

  React.useEffect(() => {
    if (!nodes?.length) {
      return;
    }

    const needsInitialization = nodes.some(
      (node) =>
        (node.type === 'httpRequest' && (!node.data?.authentication || !node.data?.responseStorage)) ||
        (node.type === 'frontendForm' && !node.data?.responseStorage)
    );

    if (!needsInitialization) {
      return;
    }

    setNodes((nds) =>
      nds.map((node) => {
        if (node.type === 'httpRequest') {
          const nextData = { ...node.data };
          if (!nextData.authentication) {
            nextData.authentication = createDefaultHttpAuthentication();
          }
          if (!nextData.responseStorage) {
            nextData.responseStorage = createDefaultHttpResponseStorage();
          }
          return {
            ...node,
            data: nextData,
          };
        }

        if (node.type === 'frontendForm') {
          if (node.data?.responseStorage) {
            return node;
          }
          return {
            ...node,
            data: {
              ...node.data,
              responseStorage: createDefaultFormResponseStorage(),
            },
          };
        }
        return node;
      })
    );
  }, [nodes, setNodes]);

  const selectedHttpAuthentication = React.useMemo(() => {
    const base = createDefaultHttpAuthentication();
    if (!selectedHttpNode?.data?.authentication) {
      return base;
    }
    return { ...base, ...selectedHttpNode.data.authentication };
  }, [selectedHttpNode?.data?.authentication]);

  const selectedHttpResponseStorage = React.useMemo(() => {
    const base = createDefaultHttpResponseStorage();
    if (!selectedHttpNode?.data?.responseStorage) {
      return base;
    }
    return { ...base, ...selectedHttpNode.data.responseStorage };
  }, [selectedHttpNode?.data?.responseStorage]);

  const selectedFormResponseStorage = React.useMemo(() => {
    const base = createDefaultFormResponseStorage();
    if (!selectedFrontendForm?.data?.responseStorage) {
      return base;
    }
    const stored = selectedFrontendForm.data.responseStorage;
    return {
      ...base,
      ...stored,
      selectedFields: Array.isArray(stored?.selectedFields) ? stored.selectedFields : base.selectedFields,
    };
  }, [selectedFrontendForm?.data?.responseStorage]);

  React.useEffect(() => {
    if (!nodes?.length) {
      return;
    }

    const legacyMappings = [];
    let shouldUpdateNodes = false;

    const normalizedNodes = nodes.map((node) => {
      if (node.type !== 'switch') {
        return node;
      }

      const cases = node.data?.cases || [];
      if (!cases.length) {
        return node;
      }

      let nodeChanged = false;
      const normalizedCases = cases.map((caseItem, idx) => {
        if (!caseItem) {
          return caseItem;
        }

        const handleId = caseItem.id || generateSwitchCaseHandleId();
        legacyMappings.push({
          nodeId: node.id,
          legacyHandle: `switch-${idx}`,
          newHandle: handleId,
        });

        if (!caseItem.id) {
          nodeChanged = true;
          shouldUpdateNodes = true;
          return { ...caseItem, id: handleId };
        }

        return caseItem;
      });

      if (!nodeChanged) {
        return node;
      }

      return {
        ...node,
        data: {
          ...node.data,
          cases: normalizedCases,
        },
      };
    });

    const edgesNeedUpdate = edges.some((edge) =>
      legacyMappings.some(
        (mapping) => mapping.nodeId === edge.source && edge.sourceHandle === mapping.legacyHandle
      )
    );

    if (!shouldUpdateNodes && !edgesNeedUpdate) {
      return;
    }

    if (shouldUpdateNodes) {
      setNodes(normalizedNodes);
    }

    if (edgesNeedUpdate) {
      setEdges((eds) =>
        eds.map((edge) => {
          const mapping = legacyMappings.find(
            (m) => m.nodeId === edge.source && edge.sourceHandle === m.legacyHandle
          );
          return mapping ? { ...edge, sourceHandle: mapping.newHandle } : edge;
        })
      );
    }
  }, [nodes, edges, setNodes, setEdges]);

  React.useEffect(() => {
    if (!edges?.length) {
      return;
    }

    const seenIds = new Set();
    let needsUpdate = false;

    const normalizedEdges = edges.map((edge) => {
      const normalizedSourceHandle = edge.sourceHandle || 'right';
      const normalizedTargetHandle = edge.targetHandle || 'left';
      const baseId = buildEdgeId({
        source: edge.source,
        sourceHandle: normalizedSourceHandle,
        target: edge.target,
        targetHandle: normalizedTargetHandle,
      });

      let finalId = baseId;
      let counter = 1;
      while (seenIds.has(finalId)) {
        finalId = `${baseId}__${counter}`;
        counter += 1;
      }
      seenIds.add(finalId);

      if (
        edge.id === finalId &&
        edge.sourceHandle === normalizedSourceHandle &&
        edge.targetHandle === normalizedTargetHandle
      ) {
        return edge;
      }

      needsUpdate = true;
      return {
        ...edge,
        id: finalId,
        sourceHandle: normalizedSourceHandle,
        targetHandle: normalizedTargetHandle,
      };
    });

    if (needsUpdate) {
      setEdges(normalizedEdges);
    }
  }, [edges, setEdges]);

  // hydrate schema when selection changes
  React.useEffect(() => {
    if (!selectedFrontendForm) { setFormSchema(null); return; }
    const fromNode = selectedFrontendForm.data?.formSchema;
    const fromStorage = loadFormSchema(selectedFrontendForm.id);
    const schema = fromNode || fromStorage || createEmptySchema();
    setFormSchema(schema);
    // restore active tab from localStorage
    const savedTab = localStorage.getItem(`sidesheetTab:${selectedFrontendForm.id}`);
    const validFormTabs = ['details', 'form', 'response'];
    setActiveTab(validFormTabs.includes(savedTab) ? savedTab : 'details');
    setSelectedElementIndex(null);
  }, [selectedFrontendForm?.id]);

  // hydrate HTTP node tab when selection changes
  React.useEffect(() => {
    if (!selectedHttpNode) return;
    // restore active tab from localStorage
    const savedTab = localStorage.getItem(`sidesheetTab:${selectedHttpNode.id}`);
    const validTabs = ['details', 'request', 'authentication', 'response'];
    setActiveHttpTab(validTabs.includes(savedTab) ? savedTab : 'details');
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

  // hydrate Multiple Conditions node tab when selection changes
  React.useEffect(() => {
    if (!selectedCaseConditionNode) return;
    // restore active tab from localStorage
    const savedTab = localStorage.getItem(`sidesheetTab:${selectedCaseConditionNode.id}`);
    setActiveCaseConditionTab(savedTab === 'cases' ? 'cases' : 'details');
  }, [selectedCaseConditionNode?.id]);

  // hydrate Switch node tab when selection changes
  React.useEffect(() => {
    if (!selectedSwitchNode) return;
    // restore active tab from localStorage
    const savedTab = localStorage.getItem(`sidesheetTab:${selectedSwitchNode.id}`);
    setActiveSwitchTab(savedTab === 'cases' ? 'cases' : 'details');
  }, [selectedSwitchNode?.id]);

  // hydrate Context Operation node tab when selection changes
  React.useEffect(() => {
    if (!selectedContextOperationNode) return;
    // restore active tab from localStorage
    const savedTab = localStorage.getItem(`sidesheetTab:${selectedContextOperationNode.id}`);
    setActiveContextOperationTab(savedTab === 'operations' ? 'operations' : 'details');
  }, [selectedContextOperationNode?.id]);

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

  // Update edge labels when switch data changes
  React.useEffect(() => {
    // Update all edges from switch nodes with their current case labels
    setEdges((eds) => {
      const updated = eds.map(edge => {
        if (isSwitchCaseHandle(edge.sourceHandle)) {
          const sourceNode = nodes.find(n => n.id === edge.source);
          const { caseItem, index } = findSwitchCaseByHandle(sourceNode, edge.sourceHandle);
          let newLabel = '';
          if (caseItem && caseItem.value) {
            newLabel = `${caseItem.value}`;
          } else if (index >= 0) {
            newLabel = `case ${index}`;
          } else {
            newLabel = 'case';
          }
          if (edge.label !== newLabel) {
            return { ...edge, label: newLabel };
          }
        } else if (edge.sourceHandle === 'default') {
          const sourceNode = nodes.find(n => n.id === edge.source);
          const newLabel = sourceNode?.data?.defaultLabel || 'default';
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
      const availableLabels = new Set(extractFormFieldOptions(formSchema).map((opt) => opt.label));
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id !== id) {
            return node;
          }

          const currentStorage = {
            ...createDefaultFormResponseStorage(),
            ...(node.data?.responseStorage || {}),
          };

          const filteredSelected = (currentStorage.selectedFields || []).filter((label) =>
            availableLabels.has(label)
          );

          return {
            ...node,
            data: {
              ...node.data,
              formSchema,
              responseStorage: {
                ...currentStorage,
                selectedFields: filteredSelected,
              },
            },
          };
        })
      );
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
          originalColor = '#C62828'; // Darker error color
        } else if (edge.sourceHandle?.startsWith('case-')) {
          originalColor = '#FF9800'; // Orange for case conditions
        } else if (edge.sourceHandle === 'else') {
          originalColor = '#9E9E9E'; // Gray for else/default
        } else if (isSwitchCaseHandle(edge.sourceHandle)) {
          originalColor = '#9C27B0'; // Purple for switch cases
        } else if (edge.sourceHandle === 'default') {
          originalColor = '#9E9E9E'; // Gray for default
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

  const updateFormResponseStorage = useCallback((updater) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id !== activeFormNodeId) {
          return node;
        }

        const currentStorage = {
          ...createDefaultFormResponseStorage(),
          ...(node.data?.responseStorage || {}),
        };

        const nextStorage =
          typeof updater === 'function'
            ? updater(currentStorage)
            : { ...currentStorage, ...updater };

        return {
          ...node,
          data: {
            ...node.data,
            responseStorage: nextStorage,
          },
        };
      })
    );
  }, [activeFormNodeId, setNodes]);

  React.useEffect(() => {
    if (!selectedFrontendForm?.data?.responseStorage) {
      return;
    }

    const availableLabels = new Set(formFieldOptions.map((option) => option.label));
    const currentSelected = selectedFrontendForm.data.responseStorage.selectedFields || [];
    const filteredSelected = currentSelected.filter((label) => availableLabels.has(label));

    if (filteredSelected.length !== currentSelected.length) {
      updateFormResponseStorage((storage) => ({
        ...storage,
        selectedFields: filteredSelected,
      }));
    }
  }, [selectedFrontendForm?.data?.responseStorage, formFieldOptions, updateFormResponseStorage]);

  // Update handlers for HTTP node
  const updateHttpNodeProperty = useCallback((property, value) => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeHttpNodeId) {
        return { ...node, data: { ...node.data, [property]: value } };
      }
      return node;
    }));
  }, [activeHttpNodeId, setNodes]);

  const updateHttpNodeAuthentication = useCallback((updater) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id !== activeHttpNodeId) {
          return node;
        }

        const currentAuth = {
          ...createDefaultHttpAuthentication(),
          ...(node.data?.authentication || {}),
        };

        const nextAuth =
          typeof updater === 'function'
            ? updater(currentAuth)
            : { ...currentAuth, ...updater };

        return {
          ...node,
          data: {
            ...node.data,
            authentication: nextAuth,
          },
        };
      })
    );
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

  const updateHttpNodeResponseStorage = useCallback((updater) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id !== activeHttpNodeId) {
          return node;
        }

        const currentStorage = {
          ...createDefaultHttpResponseStorage(),
          ...(node.data?.responseStorage || {}),
        };

        const nextStorage =
          typeof updater === 'function'
            ? updater(currentStorage)
            : { ...currentStorage, ...updater };

        return {
          ...node,
          data: {
            ...node.data,
            responseStorage: nextStorage,
          },
        };
      })
    );
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
    setActiveSwitchNodeId(null);
    setActiveContextOperationNodeId(null);
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

  // Update handlers for Switch node
  const deleteSelectedSwitchNode = useCallback(() => {
    const nodeId = activeSwitchNodeId;
    if (!nodeId) return;
    // Remove node and connected edges
    setNodes((nds) => nds.filter(n => n.id !== nodeId));
    setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedElements([]);
    setActiveSwitchNodeId(null);
  }, [activeSwitchNodeId, setNodes, setEdges]);

  const updateSwitchProperty = useCallback((property, value) => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeSwitchNodeId) {
        return { ...node, data: { ...node.data, [property]: value } };
      }
      return node;
    }));
  }, [activeSwitchNodeId, setNodes]);

  const addSwitchCase = useCallback(() => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeSwitchNodeId) {
        const cases = [...(node.data?.cases || [])];
        cases.push({
          id: generateSwitchCaseHandleId(),
          value: '',
        });
        return { ...node, data: { ...node.data, cases } };
      }
      return node;
    }));
  }, [activeSwitchNodeId, setNodes]);

  const removeSwitchCase = useCallback((index) => {
    let removedCaseHandleId = null;

    setNodes((nds) => nds.map(node => {
      if (node.id === activeSwitchNodeId) {
        const cases = [...(node.data?.cases || [])];
        const [removedCase] = cases.splice(index, 1);
        if (removedCase?.id) {
          removedCaseHandleId = removedCase.id;
        }
        return { ...node, data: { ...node.data, cases } };
      }
      return node;
    }));
    // Remove edges connected to this case (supports legacy index handles as fallback)
    setEdges((eds) =>
      eds.filter((edge) => {
        if (edge.source !== activeSwitchNodeId) {
          return true;
        }
        if (removedCaseHandleId && edge.sourceHandle === removedCaseHandleId) {
          return false;
        }
        const legacyHandle = `switch-${index}`;
        return edge.sourceHandle !== legacyHandle;
      })
    );
  }, [activeSwitchNodeId, setNodes, setEdges]);

  const updateSwitchCase = useCallback((index, field, value) => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeSwitchNodeId) {
        const cases = [...(node.data?.cases || [])];
        if (cases[index]) {
          cases[index] = { ...cases[index], [field]: value };
        }
        return { ...node, data: { ...node.data, cases } };
      }
      return node;
    }));
  }, [activeSwitchNodeId, setNodes]);

  // Update handlers for Context Operation node
  const deleteSelectedContextOperationNode = useCallback(() => {
    const nodeId = activeContextOperationNodeId;
    if (!nodeId) return;
    // Remove node and connected edges
    setNodes((nds) => nds.filter(n => n.id !== nodeId));
    setEdges((eds) => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedElements([]);
    setActiveContextOperationNodeId(null);
  }, [activeContextOperationNodeId, setNodes, setEdges]);

  const updateContextOperationProperty = useCallback((property, value) => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeContextOperationNodeId) {
        return { ...node, data: { ...node.data, [property]: value } };
      }
      return node;
    }));
  }, [activeContextOperationNodeId, setNodes]);

  const addContextOperation = useCallback(() => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeContextOperationNodeId) {
        const operations = [...(node.data?.operations || [])];
        operations.push({
          id: `context-op-${Date.now()}`,
          variable: '',
          operation: 'set',
          value: '',
        });
        return { ...node, data: { ...node.data, operations } };
      }
      return node;
    }));
  }, [activeContextOperationNodeId, setNodes]);

  const removeContextOperation = useCallback((index) => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeContextOperationNodeId) {
        const operations = [...(node.data?.operations || [])];
        operations.splice(index, 1);
        return { ...node, data: { ...node.data, operations } };
      }
      return node;
    }));
  }, [activeContextOperationNodeId, setNodes]);

  const updateContextOperation = useCallback((index, field, value) => {
    setNodes((nds) => nds.map(node => {
      if (node.id === activeContextOperationNodeId) {
        const operations = [...(node.data?.operations || [])];
        if (operations[index]) {
          operations[index] = { ...operations[index], [field]: value };
        }
        return { ...node, data: { ...node.data, operations } };
      }
      return node;
    }));
  }, [activeContextOperationNodeId, setNodes]);

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
    let previousLabel;
    let nextLabel;

    setFormSchema((schema) => {
      const arr = [...schema.elements];
      const prev = arr[idx];
      previousLabel = prev ? prev.label || prev.i18nKey || prev.id : undefined;
      nextLabel = next ? next.label || next.i18nKey || next.id : undefined;
      arr[idx] = next;
      return { ...schema, elements: arr };
    });

    if (
      previousLabel &&
      nextLabel &&
      previousLabel !== nextLabel
    ) {
      updateFormResponseStorage((storage) => {
        if (!storage.selectedFields?.includes(previousLabel)) {
          return storage;
        }
        const updatedSelection = storage.selectedFields.map((label) =>
          label === previousLabel ? nextLabel : label
        );
        return {
          ...storage,
          selectedFields: updatedSelection,
        };
      });
    }
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
    if (nodeType === 'condition') label = 'Simple Condition';
    if (nodeType === 'caseCondition') label = 'Multiple Conditions';
    if (nodeType === 'switch') label = 'Switch';
    if (nodeType === 'contextOperation') label = 'Context Operation';
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
        requestTemplate: '',
        authentication: createDefaultHttpAuthentication(),
        responseStorage: createDefaultHttpResponseStorage(),
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
      } : nodeType === 'switch' ? {
        label,
        expression: '',
        cases: [],
      } : nodeType === 'contextOperation' ? {
        label,
        operations: [],
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
      
      // All source handles can only have one outgoing connection
      const existingConnectionOnHandle = edges.some(edge => 
        edge.source === params.source && edge.sourceHandle === params.sourceHandle
      );
      if (existingConnectionOnHandle) {
        alert('This connection handler already has an outgoing connection. Remove the existing connection first.');
        return;
      }
      
      // Ensure handles are always populated for consistent IDs
      const sourceHandle = params.sourceHandle || 'right';
      const targetHandle = params.targetHandle || 'left';

      // Determine edge color and label based on source handle
      let edgeColor = '#041295'; // Default blue - var(--color-primary-blue)
      let edgeLabel = '';
      if (sourceHandle === 'yes') {
        edgeColor = '#00BBDD'; // Green for true - var(--color-success-green)
        edgeLabel = 'true';
      } else if (sourceHandle === 'no') {
        edgeColor = '#C62828'; // Darker error color - approximates rgba(224, 30, 0, 0.1) background tone of error node
        edgeLabel = 'false';
      } else if (sourceHandle === 'success') {
        edgeColor = '#00BBDD'; // var(--color-success-green)
        edgeLabel = 'success';
      } else if (sourceHandle === 'error') {
        edgeColor = '#C62828'; // Darker error color - approximates rgba(224, 30, 0, 0.1) background tone of error node
        edgeLabel = 'error';
      } else if (sourceHandle?.startsWith('case-')) {
        edgeColor = '#FF9800'; // Orange for case conditions
        const caseIndex = sourceHandle.replace('case-', '');
        const sourceNode = nodes.find(n => n.id === params.source);
        const condition = sourceNode?.data?.conditions?.[parseInt(caseIndex, 10)];
        if (condition) {
          edgeLabel = `${condition.condition} ${condition.operator} ${condition.value}`;
        } else {
          edgeLabel = `case ${caseIndex}`;
        }
      } else if (sourceHandle === 'else') {
        edgeColor = '#9E9E9E'; // Gray for else/default
        edgeLabel = 'else';
      } else if (isSwitchCaseHandle(sourceHandle)) {
        edgeColor = '#9C27B0'; // Purple for switch cases
        const sourceNode = nodes.find(n => n.id === params.source);
        const { caseItem, index } = findSwitchCaseByHandle(sourceNode, sourceHandle);
        if (caseItem && caseItem.value) {
          edgeLabel = `${caseItem.value}`;
        } else if (index >= 0) {
          edgeLabel = `case ${index}`;
        } else {
          edgeLabel = 'case';
        }
      } else if (sourceHandle === 'default') {
        edgeColor = '#9E9E9E'; // Gray for default
        const sourceNode = nodes.find(n => n.id === params.source);
        edgeLabel = sourceNode?.data?.defaultLabel || 'default';
      }

      const baseEdgeId = buildEdgeId({
        source: params.source,
        sourceHandle,
        target: params.target,
        targetHandle,
      });
      let finalEdgeId = baseEdgeId;
      let counter = 1;
      while (edges.some(edge => edge.id === finalEdgeId)) {
        finalEdgeId = `${baseEdgeId}__${counter}`;
        counter += 1;
      }
      
      // Create the new edge with arrow styling
      const newEdge = {
        ...params,
        id: finalEdgeId,
        sourceHandle,
        targetHandle,
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

      // All source handles can only have one outgoing connection (excluding the current edge being updated)
      const existingConnectionOnHandle = edges.some(edge => 
        edge.source === newConnection.source && 
        edge.sourceHandle === newConnection.sourceHandle &&
        edge.id !== oldEdge.id
      );
      if (existingConnectionOnHandle) {
        alert('This connection handler already has an outgoing connection. Remove the existing connection first.');
        return;
      }

      const normalizedSourceHandle = newConnection.sourceHandle || currentEdge?.sourceHandle || 'right';
      const normalizedTargetHandle = newConnection.targetHandle || currentEdge?.targetHandle || 'left';

      // Determine edge color and label based on source handle
      let edgeColor = '#041295'; // Default blue - var(--color-primary-blue)
      let edgeLabel = '';
      if (normalizedSourceHandle === 'yes') {
        edgeColor = '#00BBDD'; // Green for true - var(--color-success-green)
        edgeLabel = 'true';
      } else if (normalizedSourceHandle === 'no') {
        edgeColor = '#C62828'; // Darker error color
        edgeLabel = 'false';
      } else if (normalizedSourceHandle === 'success') {
        edgeColor = '#00BBDD'; // var(--color-success-green)
        edgeLabel = 'success';
      } else if (normalizedSourceHandle === 'error') {
        edgeColor = '#C62828'; // Darker error color
        edgeLabel = 'error';
      } else if (normalizedSourceHandle?.startsWith('case-')) {
        edgeColor = '#FF9800'; // Orange for case conditions
        const caseIndex = normalizedSourceHandle.replace('case-', '');
        const sourceNode = nodes.find(n => n.id === newConnection.source);
        const condition = sourceNode?.data?.conditions?.[parseInt(caseIndex, 10)];
        if (condition) {
          edgeLabel = `${condition.condition} ${condition.operator} ${condition.value}`;
        } else {
          edgeLabel = `case ${caseIndex}`;
        }
      } else if (normalizedSourceHandle === 'else') {
        edgeColor = '#9E9E9E'; // Gray for else/default
        edgeLabel = 'else';
      } else if (isSwitchCaseHandle(normalizedSourceHandle)) {
        edgeColor = '#9C27B0'; // Purple for switch cases
        const sourceNode = nodes.find(n => n.id === newConnection.source);
        const { caseItem, index } = findSwitchCaseByHandle(sourceNode, normalizedSourceHandle);
        if (caseItem && caseItem.value) {
          edgeLabel = `${caseItem.value}`;
        } else if (index >= 0) {
          edgeLabel = `case ${index}`;
        } else {
          edgeLabel = 'case';
        }
      } else if (normalizedSourceHandle === 'default') {
        edgeColor = '#9E9E9E'; // Gray for default
        const sourceNode = nodes.find(n => n.id === newConnection.source);
        edgeLabel = sourceNode?.data?.defaultLabel || 'default';
      }

      // Update the edge with new connection, preserving some properties
      setEdges((eds) => {
        // Check if new edge ID would conflict with existing edges
        const baseEdgeId = buildEdgeId({
          source: newConnection.source,
          sourceHandle: normalizedSourceHandle,
          target: newConnection.target,
          targetHandle: normalizedTargetHandle,
        });
        const hasConflict = eds.some(edge => edge.id === baseEdgeId && edge.id !== oldEdge.id);
        
        // If reconnecting to the same node, keep the original ID to preserve selection
        const isReconnectingToSameNode = 
          oldEdge.source === newConnection.source && 
          oldEdge.target === newConnection.target &&
          oldEdge.sourceHandle === normalizedSourceHandle &&
          oldEdge.targetHandle === normalizedTargetHandle;
        
        // If there's a conflict, generate a unique ID (unless reconnecting to same node)
        let finalEdgeId = isReconnectingToSameNode ? oldEdge.id : baseEdgeId;
        if (hasConflict && !isReconnectingToSameNode) {
          let counter = 1;
          while (eds.some(edge => edge.id === `${baseEdgeId}__${counter}`)) {
            counter++;
          }
          finalEdgeId = `${baseEdgeId}__${counter}`;
        }

        // Selected edges use primary blue for marker and thicker stroke
        const selectedMarkerColor = '#041295'; // Primary blue for selected state
        const strokeWidth = 4; // Thicker stroke for selected edges

        return eds.map((edge) => {
          if (edge.id === oldEdge.id) {
            return {
              ...edge,
              source: newConnection.source,
              target: newConnection.target,
              sourceHandle: normalizedSourceHandle,
              targetHandle: normalizedTargetHandle,
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
    
    // Only open side sheet if exactly one node is selected (not multiple)
    // Multi-select should not open side sheets
    if (selectedNodes.length === 1 && selectedEdges.length === 0) {
      const activeForm = selectedNodes.find(n => n.type === 'frontendForm');
      const activeHttp = selectedNodes.find(n => n.type === 'httpRequest');
      const activeJsonParser = selectedNodes.find(n => n.type === 'jsonParser');
      const activeCondition = selectedNodes.find(n => n.type === 'condition');
      const activeCaseCondition = selectedNodes.find(n => n.type === 'caseCondition');
      const activeSwitch = selectedNodes.find(n => n.type === 'switch');
      const activeContextOperation = selectedNodes.find(n => n.type === 'contextOperation');
      setActiveFormNodeId(activeForm ? activeForm.id : null);
      setActiveHttpNodeId(activeHttp ? activeHttp.id : null);
      setActiveJsonParserNodeId(activeJsonParser ? activeJsonParser.id : null);
      setActiveConditionNodeId(activeCondition ? activeCondition.id : null);
      setActiveCaseConditionNodeId(activeCaseCondition ? activeCaseCondition.id : null);
      setActiveSwitchNodeId(activeSwitch ? activeSwitch.id : null);
      setActiveContextOperationNodeId(activeContextOperation ? activeContextOperation.id : null);
    } else {
      // Close side sheets when multiple items are selected or no items selected
      setActiveFormNodeId(null);
      setActiveHttpNodeId(null);
      setActiveJsonParserNodeId(null);
      setActiveConditionNodeId(null);
      setActiveCaseConditionNodeId(null);
      setActiveSwitchNodeId(null);
      setActiveContextOperationNodeId(null);
    }
    
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

  // Export journey handler
  const handleExport = useCallback(() => {
    if (!isMountedRef.current) {
      return;
    }
    exportJourney(nodes, edges, nextNodeId);
  }, [nodes, edges, nextNodeId]);
  
  // Update export ref
  React.useEffect(() => {
    exportHandlerRef.current = handleExport;
  }, [handleExport]);

  // Perform the actual import
  const performImport = useCallback((data) => {
    try {
      // Normalize nodes and edges
      const normalizedNodes = data.nodes.map(node => ({
        ...node,
        selected: false,
      }));
      const normalizedEdges = data.edges.map(edge => ({
        ...edge,
        selected: false,
        interactionWidth: edge.interactionWidth || 30,
      }));
      
      // Update state
      setNodes(normalizedNodes);
      setEdges(normalizedEdges);
      setNextNodeId(data.nextNodeId);
      
      // Clear all form schemas first
      const frontendFormNodes = normalizedNodes.filter(n => n.type === 'frontendForm');
      frontendFormNodes.forEach(node => {
        const STORAGE_PREFIX = 'frontendFormSchema:';
        localStorage.removeItem(STORAGE_PREFIX + node.id);
      });
      
      // Restore form schemas
      if (data.formSchemas && typeof data.formSchemas === 'object') {
        Object.entries(data.formSchemas).forEach(([nodeId, schema]) => {
          saveFormSchema(nodeId, schema);
        });
      }
      
      // Clear selection and active nodes
      setSelectedElements([]);
      setActiveFormNodeId(null);
      setActiveHttpNodeId(null);
      setActiveJsonParserNodeId(null);
      setActiveConditionNodeId(null);
      setActiveCaseConditionNodeId(null);
      setActiveSwitchNodeId(null);
      setActiveContextOperationNodeId(null);
      
      // Save to localStorage
      saveJourney(normalizedNodes, normalizedEdges, data.nextNodeId);
      
      // Fit view after import
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2 });
      }, 100);
      
      alert('Journey imported successfully!');
    } catch (error) {
      console.error('Failed to import journey:', error);
      alert(`Failed to import journey: ${error.message}`);
    }
  }, [setNodes, setEdges, setNextNodeId, reactFlowInstance]);

  // Handle import confirmation
  const handleImportConfirm = useCallback(() => {
    if (pendingImportData) {
      performImport(pendingImportData);
      setPendingImportData(null);
      setShowImportModal(false);
    }
  }, [pendingImportData, performImport]);

  // Handle import cancel
  const handleImportCancel = useCallback(() => {
    setPendingImportData(null);
    setShowImportModal(false);
  }, []);

  // Trigger file selection modal
  const handleImportClick = useCallback(() => {
    if (!isMountedRef.current) {
      return;
    }
    setShowImportFileModal(true);
  }, []);
  
  // Update import ref
  React.useEffect(() => {
    importHandlerRef.current = handleImportClick;
  }, [handleImportClick]);

  // Handle drag events
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  // Handle file drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer?.files || e.target?.files;
    const file = files?.[0];
    if (!file || !file.name.endsWith('.json')) {
      alert('Please select a valid JSON file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonText = event.target?.result;
        if (!jsonText) {
          alert('Failed to read file');
          return;
        }
        const data = JSON.parse(jsonText);
        
        // Validate the imported data
        const validation = validateJourneyData(data);
        if (!validation.valid) {
          alert(`Import validation failed:\n\n${validation.errors.join('\n')}`);
          setShowImportFileModal(false);
          return;
        }
        
        // Show warnings if any
        if (validation.warnings.length > 0) {
          console.warn('Import warnings:', validation.warnings);
        }
        
        // Check if current journey has content
        const hasCurrentContent = nodes.length > 1 || (nodes.length === 1 && nodes[0].type !== 'start') || edges.length > 0;
        
        setShowImportFileModal(false);
        
        if (hasCurrentContent) {
          // Show warning modal
          setPendingImportData(data);
          setShowImportModal(true);
        } else {
          // No current content, import directly
          performImport(data);
        }
      } catch (error) {
        console.error('Failed to parse JSON:', error);
        alert(`Failed to parse JSON file: ${error.message}`);
        setShowImportFileModal(false);
      }
    };
    reader.onerror = () => {
      alert('Failed to read file');
      setShowImportFileModal(false);
    };
    reader.readAsText(file);
  }, [nodes, edges, performImport]);

  // Handle file input change
  const handleFileInputChange = useCallback((e) => {
    handleDrop(e);
  }, [handleDrop]);

  // Mark component as mounted
  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Expose export handler only - simple approach
  React.useEffect(() => {
    if (!isMountedRef.current) return;
    if (!handleExport) return;
    if (!onExportReady) return;
    
    console.log('Setting up export handler...');
    
    // Create a stable wrapper that checks before executing
    const exportWrapper = () => {
      console.log('Export wrapper called');
      // Only allow execution if explicitly called (not during registration)
      if (!exportReadyRef.current) {
        console.log('Export blocked - not ready');
        return;
      }
      if (!isMountedRef.current) {
        console.log('Export blocked - not mounted');
        return;
      }
      if (!exportHandlerRef.current) {
        console.log('Export blocked - no handler');
        return;
      }
      console.log('Export executing');
      exportHandlerRef.current();
    };
    
    // Store wrapper in ref
    exportWrapperRef.current = exportWrapper;
    
    // Register with parent immediately
    // Pass the wrapper function directly
    if (onExportReady && typeof onExportReady === 'function') {
      try {
        // Register the wrapper
        onExportReady(exportWrapper);
        // Mark as ready AFTER registration completes using requestAnimationFrame
        // to ensure it happens after the current render cycle
        requestAnimationFrame(() => {
          exportReadyRef.current = true;
          console.log('Export handler registered with parent - SUCCESS');
        });
      } catch (error) {
        console.error('Error registering export handler:', error);
        exportReadyRef.current = false;
      }
    } else {
      console.error('onExportReady is not a function:', typeof onExportReady);
      exportReadyRef.current = false;
    }
    
    // Cleanup: mark as not ready when effect re-runs
    return () => {
      exportReadyRef.current = false;
    };
  }, [onExportReady, handleExport]);

  // Expose import handler - same approach as export
  React.useEffect(() => {
    if (!isMountedRef.current) return;
    if (!handleImportClick) return;
    if (!onImportReady) return;
    
    console.log('Setting up import handler...');
    
    // Create a stable wrapper that checks before executing
    const importWrapper = () => {
      console.log('Import wrapper called');
      // Only allow execution if explicitly called (not during registration)
      if (!importReadyRef.current) {
        console.log('Import blocked - not ready');
        return;
      }
      if (!isMountedRef.current) {
        console.log('Import blocked - not mounted');
        return;
      }
      if (!importHandlerRef.current) {
        console.log('Import blocked - no handler');
        return;
      }
      console.log('Import executing');
      importHandlerRef.current();
    };
    
    // Store wrapper in ref
    importWrapperRef.current = importWrapper;
    
    // Register with parent immediately
    // Pass the wrapper function directly
    if (onImportReady && typeof onImportReady === 'function') {
      try {
        // Register the wrapper
        onImportReady(importWrapper);
        // Mark as ready AFTER registration completes using requestAnimationFrame
        // to ensure it happens after the current render cycle
        requestAnimationFrame(() => {
          importReadyRef.current = true;
          console.log('Import handler registered with parent - SUCCESS');
        });
      } catch (error) {
        console.error('Error registering import handler:', error);
        importReadyRef.current = false;
      }
    } else {
      console.error('onImportReady is not a function:', typeof onImportReady);
      importReadyRef.current = false;
    }
    
    // Cleanup: mark as not ready when effect re-runs
    return () => {
      importReadyRef.current = false;
    };
  }, [onImportReady, handleImportClick]);

  // Helper function to check if a point is inside a rectangle
  const isPointInRect = useCallback((point, rect) => {
    return point.x >= rect.left && point.x <= rect.right &&
           point.y >= rect.top && point.y <= rect.bottom;
  }, []);

  // Helper function to check if two rectangles intersect
  const rectsIntersect = useCallback((rect1, rect2) => {
    return !(rect1.right < rect2.left || rect1.left > rect2.right ||
             rect1.bottom < rect2.top || rect1.top > rect2.bottom);
  }, []);

  // Get nodes and edges that intersect with the selection rectangle
  const getIntersectingNodesEdges = useCallback((startPos, endPos) => {
    if (!reactFlowInstance || !startPos || !endPos) return { nodes: [], edges: [] };

    // Convert screen coordinates to flow coordinates
    const flowStart = reactFlowInstance.screenToFlowPosition({ x: startPos.x, y: startPos.y });
    const flowEnd = reactFlowInstance.screenToFlowPosition({ x: endPos.x, y: endPos.y });

    // Normalize rectangle (handle dragging in any direction)
    const rectLeft = Math.min(flowStart.x, flowEnd.x);
    const rectRight = Math.max(flowStart.x, flowEnd.x);
    const rectTop = Math.min(flowStart.y, flowEnd.y);
    const rectBottom = Math.max(flowStart.y, flowEnd.y);

    const selectionRect = {
      left: rectLeft,
      right: rectRight,
      top: rectTop,
      bottom: rectBottom
    };

    const allNodes = reactFlowInstance.getNodes();
    const allEdges = reactFlowInstance.getEdges();

    // Find intersecting nodes
    const intersectingNodes = allNodes.filter(node => {
      // Estimate node size based on type (approximate bounding boxes)
      let nodeWidth = 100;
      let nodeHeight = 80;
      
      if (node.type === 'start' || node.type === 'successEnd' || node.type === 'errorEnd') {
        nodeWidth = 60;
        nodeHeight = 60;
      } else if (node.type === 'condition') {
        nodeWidth = 100;
        nodeHeight = 80;
      } else {
        // Frontend form, HTTP, etc.
        nodeWidth = 150;
        nodeHeight = 100;
      }

      const nodeRect = {
        left: node.position.x,
        right: node.position.x + nodeWidth,
        top: node.position.y,
        bottom: node.position.y + nodeHeight
      };

      return rectsIntersect(selectionRect, nodeRect);
    });

    // Find intersecting edges
    const intersectingEdges = allEdges.filter(edge => {
      // Get source and target node positions
      const sourceNode = allNodes.find(n => n.id === edge.source);
      const targetNode = allNodes.find(n => n.id === edge.target);
      
      if (!sourceNode || !targetNode) return false;

      // Get node center positions (approximate - edges connect to handles, not centers)
      // For more accuracy, we'd need handle positions, but center is a good approximation
      let sourcePoint = { x: sourceNode.position.x, y: sourceNode.position.y };
      let targetPoint = { x: targetNode.position.x, y: targetNode.position.y };
      
      // Estimate node sizes to get handle positions
      let sourceWidth = 150, sourceHeight = 100;
      let targetWidth = 150, targetHeight = 100;
      
      if (sourceNode.type === 'start' || sourceNode.type === 'successEnd' || sourceNode.type === 'errorEnd') {
        sourceWidth = 60;
        sourceHeight = 60;
      } else if (sourceNode.type === 'condition') {
        sourceWidth = 100;
        sourceHeight = 80;
      }
      
      if (targetNode.type === 'start' || targetNode.type === 'successEnd' || targetNode.type === 'errorEnd') {
        targetWidth = 60;
        targetHeight = 60;
      } else if (targetNode.type === 'condition') {
        targetWidth = 100;
        targetHeight = 80;
      }
      
      // Adjust points to approximate handle positions (edges connect at right/left sides)
      sourcePoint = { x: sourceNode.position.x + sourceWidth, y: sourceNode.position.y + sourceHeight / 2 };
      targetPoint = { x: targetNode.position.x, y: targetNode.position.y + targetHeight / 2 };
      
      // Check if endpoints are in selection
      if (isPointInRect(sourcePoint, selectionRect) || isPointInRect(targetPoint, selectionRect)) {
        return true;
      }

      // Check if any point along the edge line segment is inside the rectangle
      // This handles cases where the edge passes through the rectangle without touching edges
      const lineStart = sourcePoint;
      const lineEnd = targetPoint;
      
      // Check if line segment intersects rectangle by checking if any point on the line is inside
      // Use parametric form: P(t) = start + t * (end - start), where t is in [0, 1]
      const dx = lineEnd.x - lineStart.x;
      const dy = lineEnd.y - lineStart.y;
      
      // Sample points along the line segment to check if any are inside the rectangle
      // This is more reliable than just checking edge intersections
      const steps = Math.max(10, Math.floor(Math.sqrt(dx * dx + dy * dy) / 10)); // Sample every ~10px
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const point = {
          x: lineStart.x + t * dx,
          y: lineStart.y + t * dy
        };
        if (isPointInRect(point, selectionRect)) {
          return true;
        }
      }
      
      // Also check if line intersects any of the rectangle edges (for efficiency with short edges)
      const rectEdges = [
        { start: { x: selectionRect.left, y: selectionRect.top }, end: { x: selectionRect.right, y: selectionRect.top } },
        { start: { x: selectionRect.right, y: selectionRect.top }, end: { x: selectionRect.right, y: selectionRect.bottom } },
        { start: { x: selectionRect.right, y: selectionRect.bottom }, end: { x: selectionRect.left, y: selectionRect.bottom } },
        { start: { x: selectionRect.left, y: selectionRect.bottom }, end: { x: selectionRect.left, y: selectionRect.top } }
      ];

      for (const rectEdge of rectEdges) {
        if (lineIntersects(lineStart, lineEnd, rectEdge.start, rectEdge.end)) {
          return true;
        }
      }

      return false;
    });

    // Helper function to check if two line segments intersect
    function lineIntersects(p1, p2, p3, p4) {
      const ccw = (A, B, C) => (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
      return (ccw(p1, p3, p4) !== ccw(p2, p3, p4)) && (ccw(p1, p2, p3) !== ccw(p1, p2, p4));
    }

    return {
      nodes: intersectingNodes,
      edges: intersectingEdges
    };
  }, [reactFlowInstance, rectsIntersect, isPointInRect]);

  // Handle mouse down for selection rectangle
  const handleSelectionMouseDown = useCallback((event) => {
    // Only start selection if Shift key is pressed and click is on empty canvas
    if (!event.shiftKey) return;
    
    // Check if click is on a node or edge (React Flow handles this)
    const target = event.target;
    if (target.closest('.react-flow__node') || target.closest('.react-flow__edge')) {
      return;
    }

    // Get mouse position relative to canvas container
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setSelectionStart({ x, y });
    setSelectionEnd({ x, y });
    setIsSelecting(true);
    event.preventDefault();
  }, []);

  // Handle mouse move for selection rectangle
  const handleSelectionMouseMove = useCallback((event) => {
    if (!isSelecting || !selectionStart) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setSelectionEnd({ x, y });
  }, [isSelecting, selectionStart]);

  // Handle mouse up for selection rectangle
  const handleSelectionMouseUp = useCallback((event) => {
    // Always reset selection rectangle first to ensure it disappears immediately
    setIsSelecting(false);
    const start = selectionStart;
    const end = selectionEnd;
    setSelectionStart(null);
    setSelectionEnd(null);

    if (!start || !end) {
      return;
    }

    // Calculate which nodes/edges intersect with selection rectangle
    const { nodes: intersectingNodes, edges: intersectingEdges } = getIntersectingNodesEdges(
      start,
      end
    );

    // Update selection - add to existing selection
    if (intersectingNodes.length > 0 || intersectingEdges.length > 0) {
      // Mark nodes as selected (add to existing selection)
      setNodes((nds) =>
        nds.map((node) => ({
          ...node,
          selected: intersectingNodes.some((n) => n.id === node.id) || node.selected
        }))
      );

      // Mark edges as selected (add to existing selection)
      setEdges((eds) =>
        eds.map((edge) => ({
          ...edge,
          selected: intersectingEdges.some((e) => e.id === edge.id) || edge.selected
        }))
      );

      // Get all selected nodes and edges (including newly selected ones)
      // Use setTimeout to ensure state updates are complete
      setTimeout(() => {
        const allNodes = reactFlowInstance.getNodes();
        const allEdges = reactFlowInstance.getEdges();
        const allSelectedNodes = allNodes.filter(n => n.selected);
        const allSelectedEdges = allEdges.filter(e => e.selected);
        
        onSelectionChange({ nodes: allSelectedNodes, edges: allSelectedEdges });
      }, 0);
    }
  }, [selectionStart, selectionEnd, getIntersectingNodesEdges, setNodes, setEdges, reactFlowInstance, onSelectionChange]);

  // Add global mouse event listeners
  React.useEffect(() => {
    if (isSelecting) {
      const handleMouseMove = (e) => handleSelectionMouseMove(e);
      const handleMouseUp = (e) => handleSelectionMouseUp(e);

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isSelecting, handleSelectionMouseMove, handleSelectionMouseUp]);


  return (
    <div 
      className="journey-canvas-container"
      ref={canvasRef}
      style={{ width: '100%', height: '100%' }}
      onKeyDown={onKeyDown}
      tabIndex={0}
      onClick={handleCanvasClick}
      onMouseDown={handleSelectionMouseDown}
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
        multiSelectionKeyCode="Meta"
        panOnScroll={true}
        panOnScrollMode="free"
      >
        <Background />
        <Controls />
        <MiniMap pannable={true} zoomable={true} />
      </ReactFlow>
      
      {/* Selection Rectangle Overlay */}
      {isSelecting && selectionStart && selectionEnd && (
        <div
          className="selection-rectangle"
          style={{
            left: Math.min(selectionStart.x, selectionEnd.x),
            top: Math.min(selectionStart.y, selectionEnd.y),
            width: Math.abs(selectionEnd.x - selectionStart.x),
            height: Math.abs(selectionEnd.y - selectionStart.y),
          }}
        />
      )}
      
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
              <div className="node-menu-icon frontend-form-icon">
                <span className="material-icons">help_outline</span>
              </div>
              <span>Simple Condition</span>
            </div>
            <div className="node-menu-item" onClick={() => addNode('caseCondition')}>
              <div className="node-menu-icon frontend-form-icon">
                <span className="material-icons">call_split</span>
              </div>
              <span>Multiple Conditions</span>
            </div>
            <div className="node-menu-item" onClick={() => addNode('switch')}>
              <div className="node-menu-icon frontend-form-icon">
                <span className="material-icons">shuffle</span>
              </div>
              <span>Switch</span>
            </div>
            <div className="node-menu-item" onClick={() => addNode('contextOperation')}>
              <div className="node-menu-icon frontend-form-icon">
                <span className="material-icons">settings</span>
              </div>
              <span>Context Operation</span>
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
            <div className="sidesheet-title">Simple Condition</div>
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
                  placeholder="Simple Condition"
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

      {/* Sidesheet for Multiple Conditions */}
      {selectedCaseConditionNode && (
        <div 
          className="sidesheet"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="sidesheet-header">
            <div className="sidesheet-title">Multiple Conditions</div>
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
                  placeholder="Multiple Conditions"
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

      {/* Sidesheet for Switch */}
      {selectedSwitchNode && (
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
            <button className={`tab-btn ${activeSwitchTab==='details'?'active':''}`} onClick={()=>{
              setActiveSwitchTab('details');
              if (selectedSwitchNode?.id) localStorage.setItem(`sidesheetTab:${selectedSwitchNode.id}`, 'details');
            }}>Details</button>
            <button className={`tab-btn ${activeSwitchTab==='cases'?'active':''}`} onClick={()=>{
              setActiveSwitchTab('cases');
              if (selectedSwitchNode?.id) localStorage.setItem(`sidesheetTab:${selectedSwitchNode.id}`, 'cases');
            }}>Cases</button>
          </div>
          <div className="sidesheet-body">
            {activeSwitchTab === 'details' && (
              <div>
                <label className="input-label" htmlFor="switch-name">Name</label>
                <input
                  id="switch-name"
                  className="text-input"
                  type="text"
                  value={selectedSwitchNode.data?.label || ''}
                  onChange={(e) => updateSwitchProperty('label', e.target.value)}
                  placeholder="Switch"
                />
                <div style={{ height: '12px' }} />
                <label className="input-label" htmlFor="switch-expression">Expression</label>
                <input
                  id="switch-expression"
                  className="text-input"
                  type="text"
                  value={selectedSwitchNode.data?.expression || ''}
                  onChange={(e) => updateSwitchProperty('expression', e.target.value)}
                  placeholder="e.g., ${httpResponse.statusCode} or ${myVariable}"
                />
                <div style={{ height: '12px' }} />
                <label className="input-label" htmlFor="switch-default-label">Default Path Label</label>
                <input
                  id="switch-default-label"
                  className="text-input"
                  type="text"
                  value={selectedSwitchNode.data?.defaultLabel || 'default'}
                  onChange={(e) => updateSwitchProperty('defaultLabel', e.target.value)}
                  placeholder="default"
                />
                <div style={{ height: '12px' }} />
                <div style={{ fontSize: '12px', color: 'var(--color-gray-600)', backgroundColor: 'var(--color-gray-50)', padding: '12px', borderRadius: '4px' }}>
                  <strong>Switch Expression:</strong> Define the variable or expression to evaluate against case values.
                </div>
              </div>
            )}
            {activeSwitchTab === 'cases' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="input-label" style={{ margin: 0 }}>Cases</label>
                  <button className="btn-secondary" onClick={addSwitchCase} style={{ padding: '4px 8px', fontSize: '12px' }}>
                    Add Case
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginBottom: '12px' }}>
                  Define case values for each egress path. Default path is executed if expression value doesn't match any case.
                </div>
                {(selectedSwitchNode.data?.cases || []).map((caseItem, idx) => (
                  <div key={idx} style={{ border: '1px solid var(--color-gray-300)', borderRadius: '4px', padding: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        className="text-input"
                        style={{ flex: 1 }}
                        type="text"
                        value={caseItem.value || ''}
                        onChange={(e) => updateSwitchCase(idx, 'value', e.target.value)}
                        placeholder="Case value (e.g., 200, 404, error)"
                      />
                      <button className="btn-danger" onClick={() => removeSwitchCase(idx)} style={{ padding: '4px 12px', fontSize: '12px' }}>
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <div style={{ fontSize: '13px', color: 'var(--color-gray-600)', backgroundColor: 'var(--color-gray-100)', padding: '12px', borderRadius: '4px', border: '2px dashed var(--color-gray-300)' }}>
                  <strong>Default (Optional):</strong> The default path is always available and executes when no case matches.
                </div>
              </div>
            )}
          </div>
          <div className="sidesheet-footer">
            <div className="footer-left">
              <button className="btn-danger" onClick={deleteSelectedSwitchNode}>Delete</button>
            </div>
            <div className="footer-right">
              <button className="btn-secondary" onClick={closeSidesheet}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Sidesheet for Context Operation */}
      {selectedContextOperationNode && (
        <div 
          className="sidesheet"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="sidesheet-header">
            <div className="sidesheet-title">Context Operation</div>
          </div>
          <div className="sidesheet-tabs">
            <button className={`tab-btn ${activeContextOperationTab==='details'?'active':''}`} onClick={()=>{
              setActiveContextOperationTab('details');
              if (selectedContextOperationNode?.id) localStorage.setItem(`sidesheetTab:${selectedContextOperationNode.id}`, 'details');
            }}>Details</button>
            <button className={`tab-btn ${activeContextOperationTab==='operations'?'active':''}`} onClick={()=>{
              setActiveContextOperationTab('operations');
              if (selectedContextOperationNode?.id) localStorage.setItem(`sidesheetTab:${selectedContextOperationNode.id}`, 'operations');
            }}>Operations</button>
          </div>
          <div className="sidesheet-body">
            {activeContextOperationTab === 'details' && (
              <div>
                <label className="input-label" htmlFor="context-operation-name">Name</label>
                <input
                  id="context-operation-name"
                  className="text-input"
                  type="text"
                  value={selectedContextOperationNode.data?.label || ''}
                  onChange={(e) => updateContextOperationProperty('label', e.target.value)}
                  placeholder="Context Operation"
                />
              </div>
            )}
            {activeContextOperationTab === 'operations' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="input-label" style={{ margin: 0 }}>Operations</label>
                  <button className="btn-secondary" onClick={addContextOperation} style={{ padding: '4px 8px', fontSize: '12px' }}>
                    Add Operation
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginBottom: '12px' }}>
                  Define operations to modify context variables during journey execution.
                </div>
                {(selectedContextOperationNode.data?.operations || []).map((op, idx) => (
                  <div key={idx} style={{ border: '1px solid var(--color-gray-300)', borderRadius: '4px', padding: '12px', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input
                        className="text-input"
                        style={{ flex: 1 }}
                        type="text"
                        value={op.variable || ''}
                        onChange={(e) => updateContextOperation(idx, 'variable', e.target.value)}
                        placeholder="Variable name"
                      />
                      <select
                        className="text-input"
                        style={{ width: '150px' }}
                        value={op.operation || 'set'}
                        onChange={(e) => updateContextOperation(idx, 'operation', e.target.value)}
                      >
                        <option value="set">Set</option>
                        <option value="increment">Increment</option>
                        <option value="decrement">Decrement</option>
                        <option value="concat">Concatenate</option>
                        <option value="clear">Clear</option>
                        <option value="remove">Remove</option>
                      </select>
                      <button className="btn-danger" onClick={() => removeContextOperation(idx)} style={{ padding: '4px 12px', fontSize: '12px' }}>
                        Remove
                      </button>
                    </div>
                    <input
                      className="text-input"
                      type="text"
                      value={op.value || ''}
                      onChange={(e) => updateContextOperation(idx, 'value', e.target.value)}
                      placeholder="Value or expression"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="sidesheet-footer">
            <div className="footer-left">
              <button className="btn-danger" onClick={deleteSelectedContextOperationNode}>Delete</button>
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
            <button className={`tab-btn ${activeHttpTab==='authentication'?'active':''}`} onClick={()=>{
              setActiveHttpTab('authentication');
              if (selectedHttpNode?.id) localStorage.setItem(`sidesheetTab:${selectedHttpNode.id}`, 'authentication');
            }}>Authentication</button>
            <button className={`tab-btn ${activeHttpTab==='response'?'active':''}`} onClick={()=>{
              setActiveHttpTab('response');
              if (selectedHttpNode?.id) localStorage.setItem(`sidesheetTab:${selectedHttpNode.id}`, 'response');
            }}>Response</button>
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
                  <option value="frontend">External</option>
                  <option value="backend">Internal</option>
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
            {activeHttpTab === 'authentication' && (
              <div>
                <label className="input-label" htmlFor="http-auth-type">Authentication Type</label>
                <select
                  id="http-auth-type"
                  className="text-input"
                  value={selectedHttpAuthentication.type || 'none'}
                  onChange={(e) => {
                    const newType = e.target.value;
                    updateHttpNodeAuthentication((current) => ({
                      ...createDefaultHttpAuthentication(),
                      ...current,
                      type: newType,
                    }));
                  }}
                >
                  {selectedHttpNode.data?.nodeType === 'frontend' ? (
                    <>
                      <option value="none">None</option>
                      <option value="basic">Basic Auth</option>
                      <option value="bearer">Bearer Token</option>
                      <option value="apiKey">API Key</option>
                    </>
                  ) : (
                    <>
                      <option value="none">None</option>
                      <option value="m2m">M2M Token</option>
                      <option value="s2s">S2S Token</option>
                    </>
                  )}
                </select>
                <div style={{ height: '12px' }} />
                {selectedHttpNode.data?.nodeType === 'frontend' && selectedHttpAuthentication.type === 'basic' && (
                  <>
                    <label className="input-label" htmlFor="http-auth-username">Username</label>
                    <input
                      id="http-auth-username"
                      className="text-input"
                      type="text"
                      value={selectedHttpAuthentication.username || ''}
                      onChange={(e) =>
                        updateHttpNodeAuthentication((current) => ({
                          ...current,
                          username: e.target.value,
                        }))
                      }
                    />
                    <div style={{ height: '12px' }} />
                    <label className="input-label" htmlFor="http-auth-password">Password</label>
                    <input
                      id="http-auth-password"
                      className="text-input"
                      type="password"
                      value={selectedHttpAuthentication.password || ''}
                      onChange={(e) =>
                        updateHttpNodeAuthentication((current) => ({
                          ...current,
                          password: e.target.value,
                        }))
                      }
                    />
                  </>
                )}
                {selectedHttpNode.data?.nodeType === 'frontend' && selectedHttpAuthentication.type === 'bearer' && (
                  <>
                    <label className="input-label" htmlFor="http-auth-token">Bearer Token</label>
                    <textarea
                      id="http-auth-token"
                      className="text-input"
                      rows={4}
                      value={selectedHttpAuthentication.token || ''}
                      onChange={(e) =>
                        updateHttpNodeAuthentication((current) => ({
                          ...current,
                          token: e.target.value,
                        }))
                      }
                      placeholder="eyJhbGciOi..."
                    />
                  </>
                )}
                {selectedHttpNode.data?.nodeType === 'frontend' && selectedHttpAuthentication.type === 'apiKey' && (
                  <>
                    <label className="input-label" htmlFor="http-auth-api-key-name">Header Name</label>
                    <input
                      id="http-auth-api-key-name"
                      className="text-input"
                      type="text"
                      value={selectedHttpAuthentication.apiKeyName || ''}
                      onChange={(e) =>
                        updateHttpNodeAuthentication((current) => ({
                          ...current,
                          apiKeyName: e.target.value,
                        }))
                      }
                      placeholder="Authorization"
                    />
                    <div style={{ height: '12px' }} />
                    <label className="input-label" htmlFor="http-auth-api-key-value">Header Value</label>
                    <input
                      id="http-auth-api-key-value"
                      className="text-input"
                      type="text"
                      value={selectedHttpAuthentication.apiKeyValue || ''}
                      onChange={(e) =>
                        updateHttpNodeAuthentication((current) => ({
                          ...current,
                          apiKeyValue: e.target.value,
                        }))
                      }
                      placeholder="Bearer {{ secrets.apiToken }}"
                    />
                  </>
                )}
                {selectedHttpNode.data?.nodeType === 'frontend' && selectedHttpAuthentication.type === 'none' && (
                  <p style={{ marginTop: '4px', color: '#555', fontSize: '12px' }}>
                    Requests will be sent without additional authentication headers.
                  </p>
                )}
                {selectedHttpNode.data?.nodeType === 'backend' && selectedHttpAuthentication.type === 'none' && (
                  <p style={{ marginTop: '4px', color: '#555', fontSize: '12px' }}>
                    No internal token will be attached to this backend request.
                  </p>
                )}
                {selectedHttpNode.data?.nodeType === 'backend' && selectedHttpAuthentication.type === 'm2m' && (
                  <>
                    <label className="input-label" htmlFor="http-auth-m2m-client">M2M Client</label>
                    <select
                      id="http-auth-m2m-client"
                      className="text-input"
                      value={selectedHttpAuthentication.clientId || ''}
                      onChange={(e) =>
                        updateHttpNodeAuthentication((current) => ({
                          ...current,
                          clientId: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select client...</option>
                      <option value="client-001">Access Client 001</option>
                      <option value="client-002">Access Client 002</option>
                      <option value="client-003">Access Client 003</option>
                    </select>
                    <p style={{ marginTop: '4px', color: '#555', fontSize: '12px' }}>
                      Client credentials will be fetched from Access during execution.
                    </p>
                  </>
                )}
                {selectedHttpNode.data?.nodeType === 'backend' && selectedHttpAuthentication.type === 's2s' && (
                  <p style={{ marginTop: '4px', color: '#555', fontSize: '12px' }}>
                    Service-to-service token will be generated automatically at runtime.
                  </p>
                )}
              </div>
            )}
            {activeHttpTab === 'response' && (
              <div>
                <label className="input-label" htmlFor="http-response-attribute">Response Attribute Name</label>
                <input
                  id="http-response-attribute"
                  className="text-input"
                  type="text"
                  value={selectedHttpResponseStorage.attributeName || ''}
                  onChange={(e) =>
                    updateHttpNodeResponseStorage((current) => ({
                      ...current,
                      attributeName: e.target.value,
                    }))
                  }
                  placeholder="httpResponse"
                />
                <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '4px' }}>
                  This attribute will store the response data for this request at runtime.
                </div>

                <div style={{ marginTop: '24px' }}>
                  <label className="input-label" style={{ margin: 0 }}>Store Response Parts</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        id="http-response-store-code"
                        checked={!!selectedHttpResponseStorage.storeCode}
                        onChange={(e) =>
                          updateHttpNodeResponseStorage((current) => ({
                            ...current,
                            storeCode: e.target.checked,
                          }))
                        }
                      />
                      <label className="input-label" htmlFor="http-response-store-code" style={{ margin: 0 }}>Status Code</label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        id="http-response-store-headers"
                        checked={!!selectedHttpResponseStorage.storeHeaders}
                        onChange={(e) =>
                          updateHttpNodeResponseStorage((current) => ({
                            ...current,
                            storeHeaders: e.target.checked,
                          }))
                        }
                      />
                      <label className="input-label" htmlFor="http-response-store-headers" style={{ margin: 0 }}>Headers</label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        id="http-response-store-body"
                        checked={!!selectedHttpResponseStorage.storeBody}
                        onChange={(e) =>
                          updateHttpNodeResponseStorage((current) => ({
                            ...current,
                            storeBody: e.target.checked,
                          }))
                        }
                      />
                      <label className="input-label" htmlFor="http-response-store-body" style={{ margin: 0 }}>Body</label>
                    </div>
                  </div>
                </div>
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
            <button className={`tab-btn ${activeTab==='response'?'active':''}`} onClick={()=>{
              setActiveTab('response');
              if (selectedFrontendForm?.id) localStorage.setItem(`sidesheetTab:${selectedFrontendForm.id}`, 'response');
            }}>Response</button>
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
            {activeTab === 'response' && (
              <div>
                <label className="input-label" htmlFor="form-response-attribute">Context Attribute Name</label>
                <input
                  id="form-response-attribute"
                  className="text-input"
                  type="text"
                  value={selectedFormResponseStorage.attributeName || ''}
                  onChange={(e) =>
                    updateFormResponseStorage((storage) => ({
                      ...storage,
                      attributeName: e.target.value,
                    }))
                  }
                  placeholder="formData"
                />
                <div style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginTop: '4px' }}>
                  Submitted form data will be stored in this context attribute.
                </div>

                <div style={{ marginTop: '24px' }}>
                  <label className="input-label" style={{ margin: 0 }}>Fields to Store</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="radio"
                        name="form-response-storage-scope"
                        value="all"
                        checked={!!selectedFormResponseStorage.storeAllFields}
                        onChange={() =>
                          updateFormResponseStorage((storage) => ({
                            ...storage,
                            storeAllFields: true,
                          }))
                        }
                      />
                      <span>Store all fields</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="radio"
                        name="form-response-storage-scope"
                        value="selected"
                        checked={!selectedFormResponseStorage.storeAllFields}
                        onChange={() =>
                          updateFormResponseStorage((storage) => ({
                            ...storage,
                            storeAllFields: false,
                          }))
                        }
                      />
                      <span>Store selected fields</span>
                    </label>
                  </div>
                </div>

                {!selectedFormResponseStorage.storeAllFields && (
                  <div style={{ marginTop: '16px' }}>
                    {formFieldOptions.length === 0 ? (
                      <p style={{ fontSize: '12px', color: 'var(--color-gray-500)' }}>
                        No form fields available. Add inputs to the form to select specific fields.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {formFieldOptions.map((option) => {
                          const isChecked = selectedFormResponseStorage.selectedFields.includes(option.label);
                          return (
                            <label key={option.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const { checked } = e.target;
                                  updateFormResponseStorage((storage) => {
                                    const nextSelected = new Set(storage.selectedFields || []);
                                    if (checked) {
                                      nextSelected.add(option.label);
                                    } else {
                                      nextSelected.delete(option.label);
                                    }
                                    return {
                                      ...storage,
                                      selectedFields: Array.from(nextSelected),
                                    };
                                  });
                                }}
                              />
                              <span>{option.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
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

      {/* Import File Selection Modal */}
      {showImportFileModal && (
        <div className="modal-overlay" onClick={() => setShowImportFileModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Import Journey</h3>
            </div>
            <div className="modal-body">
              <div
                className={`import-drop-zone ${dragActive ? 'drag-active' : ''}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <span className="material-icons" style={{ fontSize: '48px', color: 'var(--color-primary-blue)', marginBottom: '16px' }}>cloud_upload</span>
                <p style={{ marginBottom: '8px', fontWeight: 500 }}>Drag & drop a JSON file here</p>
                <p style={{ fontSize: '12px', color: 'var(--color-gray-500)', marginBottom: '16px' }}>or</p>
                <button
                  className="btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <span className="material-icons">folder_open</span>
                  Browse Files
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowImportFileModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Warning Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={handleImportCancel}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Import</h3>
            </div>
            <div className="modal-body">
              <p>Importing a journey will overwrite your current work. This action cannot be undone.</p>
              <p style={{ marginTop: '12px', fontWeight: 500 }}>Are you sure you want to continue?</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleImportCancel}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleImportConfirm}>
                Confirm Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />
    </div>
  );
}

export default function JourneyCanvas({ onExportReady, onImportReady }) {
  return (
    <ReactFlowProvider>
      <InnerCanvas onExportReady={onExportReady} onImportReady={onImportReady} />
    </ReactFlowProvider>
  );
}
