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
    <Handle
      type="source"
      position={Position.Right}
      id="right"
      style={{ 
        background: '#2563eb',
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
        background: '#2563eb',
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
        background: '#2563eb',
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
        background: '#2563eb',
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
        background: '#2563eb',
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
        background: '#2563eb',
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
        background: '#2563eb',
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
      position={Position.Top}
      id="yes"
      style={{ 
        background: '#059669',
        border: '2px solid white',
        width: '8px',
        height: '8px',
        top: '-4px',
        left: '50%',
        transform: 'translateX(-50%)'
      }}
    />
    <Handle
      type="source"
      position={Position.Bottom}
      id="no"
      style={{ 
        background: '#dc2626',
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

// Node types configuration
const nodeTypes = {
  start: StartNode,
  successEnd: SuccessEndNode,
  errorEnd: ErrorEndNode,
  condition: ConditionNode,
  frontendForm: FrontendFormNode,
};

const initialNodes = [
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
];

const initialEdges = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    sourceHandle: 'right',
    targetHandle: 'left',
    type: 'default',
    style: { 
      stroke: '#2563eb', 
      strokeWidth: 2 
    },
    markerEnd: {
      type: 'arrowclosed',
      color: '#2563eb',
      width: 20,
      height: 20,
    },
    selected: false,
  },
];

function InnerCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedElements, setSelectedElements] = useState([]);
  const [nextNodeId, setNextNodeId] = useState(3); // Start from 3 since we have nodes 1 and 2
  const [showNodeMenu, setShowNodeMenu] = useState(false);
  const [activeFormNodeId, setActiveFormNodeId] = useState(null);
  const reactFlowInstance = useReactFlow();
  const canvasRef = useRef(null);
  const [activeTab, setActiveTab] = useState('details');
  const [formSchema, setFormSchema] = useState(null);
  const [selectedElementIndex, setSelectedElementIndex] = useState(null);
  
  const selectedFrontendForm = nodes.find(n => n.id === activeFormNodeId);

  // hydrate schema when selection changes
  React.useEffect(() => {
    if (!selectedFrontendForm) { setFormSchema(null); return; }
    const fromNode = selectedFrontendForm.data?.formSchema;
    const fromStorage = loadFormSchema(selectedFrontendForm.id);
    const schema = fromNode || fromStorage || createEmptySchema();
    setFormSchema(schema);
    setActiveTab('details');
    setSelectedElementIndex(null);
  }, [selectedFrontendForm?.id]);

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

  const closeSidesheet = useCallback(() => {
    // Deselect any selected nodes
    setNodes((nds) => nds.map(node => ({ ...node, selected: false })));
    setSelectedElements([]);
    setActiveFormNodeId(null);
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
    setFormSchema(s => ({ ...s, elements: [...(s.elements||[]), el] }));
    setActiveTab('form');
  };

  const updateElement = (idx, next) => {
    setFormSchema(s => {
      const arr = [...s.elements];
      arr[idx] = next;
      return { ...s, elements: arr };
    });
  };

  const onDragStart = (e, idx) => { e.dataTransfer.setData('text/plain', String(idx)); };
  const onDragOver = (e) => { e.preventDefault(); };
  const onDrop = (e, targetIdx) => {
    e.preventDefault();
    const from = Number(e.dataTransfer.getData('text/plain'));
    if (Number.isNaN(from) || from === targetIdx) return;
    setFormSchema(s => {
      const arr = [...s.elements];
      const [item] = arr.splice(from, 1);
      arr.splice(targetIdx, 0, item);
      return { ...s, elements: arr };
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

  // Debug logging
  console.log('Current nodes:', nodes);
  console.log('Current edges:', edges);

  // Function to add a new node of specified type
  const addNode = useCallback((nodeType) => {
    let label = 'Node';
    if (nodeType === 'successEnd') label = 'Success';
    if (nodeType === 'errorEnd') label = 'Error';
    if (nodeType === 'condition') label = 'Condition';
    if (nodeType === 'frontendForm') label = 'Frontend - Form';
    
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
      data: { label },
      selected: false,
    };
    
    setNodes((nds) => [...nds, newNode]);
    setNextNodeId((id) => id + 1);
    setShowNodeMenu(false); // Close the menu after adding
    
    console.log(`Added new ${nodeType} node:`, newNode);
  }, [nextNodeId, setNodes]);

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
      let edgeColor = '#2563eb'; // Default blue
      let edgeLabel = '';
      if (params.sourceHandle === 'yes') {
        edgeColor = '#059669'; // Green for YES
        edgeLabel = 'YES';
      } else if (params.sourceHandle === 'no') {
        edgeColor = '#dc2626'; // Red for NO
        edgeLabel = 'NO';
      } else if (params.sourceHandle === 'success') {
        edgeColor = '#059669';
        edgeLabel = 'success';
      } else if (params.sourceHandle === 'error') {
        edgeColor = '#dc2626';
        edgeLabel = 'error';
      }
      
      // Create the new edge with arrow styling
      const newEdge = {
        ...params,
        id: `e${params.source}-${params.target}`,
        sourceHandle: params.sourceHandle || 'right',
        targetHandle: params.targetHandle || 'left',
        type: 'default',
        animated: false,
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

  // Handle selection changes
  const onSelectionChange = useCallback(({ nodes: selectedNodes, edges: selectedEdges }) => {
    console.log('Selection changed:', { selectedNodes, selectedEdges });
    setSelectedElements([...selectedNodes, ...selectedEdges]);
    
    // Update node selection state
    setNodes((nds) => nds.map(node => {
      const isSelected = selectedNodes.some(selNode => selNode.id === node.id);
      return {
        ...node,
        selected: isSelected,
      };
    }));
    
    // Track active frontend form node id for sidesheet
    const activeForm = selectedNodes.find(n => n.type === 'frontendForm');
    setActiveFormNodeId(activeForm ? activeForm.id : null);
    
    // Update edge colors based on selection
    setEdges((eds) => eds.map(edge => {
      const isSelected = selectedEdges.some(selEdge => selEdge.id === edge.id);
      return {
        ...edge,
        selected: isSelected,
        style: {
          ...edge.style,
          stroke: isSelected ? '#dc2626' : '#2563eb',
          strokeWidth: isSelected ? 4 : 2,
        },
        markerEnd: {
          ...edge.markerEnd,
          color: isSelected ? '#dc2626' : '#2563eb',
        },
      };
    }));
  }, [setNodes, setEdges]);

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
        edges={edges}
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
        connectionLineStyle={{ stroke: '#2563eb', strokeWidth: 2 }}
        defaultEdgeOptions={{
          style: { stroke: '#2563eb', strokeWidth: 2 },
          markerEnd: {
            type: 'arrowclosed',
            color: '#2563eb',
            width: 20,
            height: 20,
          },
        }}
        selectNodesOnDrag={false}
        deleteKeyCode={null}
        elementsSelectable={true}
        edgesUpdatable={false}
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
              <div className="node-menu-icon end-icon">✔</div>
              <span>Success End</span>
            </div>
            <div className="node-menu-item" onClick={() => addNode('errorEnd')}>
              <div className="node-menu-icon end-error-icon">✖</div>
              <span>Error End</span>
            </div>
            <div className="node-menu-item" onClick={() => addNode('frontendForm')}>
              <div className="node-menu-icon frontend-form-icon">UI</div>
              <span>Frontend - Form</span>
            </div>
            <div className="node-menu-item" onClick={() => addNode('condition')}>
              <div className="node-menu-icon condition-icon">?</div>
              <span>Condition Node</span>
            </div>
            {/* Future node types can be added here */}
          </div>
        )}
      </div>
      
      {/* Overlay to close menu when clicking outside */}
      {showNodeMenu && (
        <div className="menu-overlay" onClick={closeNodeMenu} />
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
            <button className={`tab-btn ${activeTab==='details'?'active':''}`} onClick={()=>setActiveTab('details')}>Details</button>
            <button className={`tab-btn ${activeTab==='form'?'active':''}`} onClick={()=>setActiveTab('form')}>Form</button>
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
                    <button className="btn-secondary" onClick={()=>addElement('input')}>+ Input</button>
                    <button className="btn-secondary" onClick={()=>addElement('password')}>+ Password</button>
                    <button className="btn-secondary" onClick={()=>addElement('checkbox')}>+ Checkbox</button>
                    <button className="btn-secondary" onClick={()=>addElement('label')}>+ Label</button>
                    <button className="btn-secondary" onClick={()=>addElement('button')}>+ Button</button>
                  </div>
                  <div className="element-list" onDragOver={onDragOver}>
                    {(formSchema?.elements||[]).map((el, idx) => (
                      <div
                        key={el.id}
                        className={`element-item ${selectedElementIndex===idx?'selected':''}`}
                        draggable
                        onDragStart={(e)=>onDragStart(e, idx)}
                        onDrop={(e)=>onDrop(e, idx)}
                        onClick={()=>setSelectedElementIndex(idx)}
                      >
                        <span className="element-type">{el.type}</span>
                        <span className="element-label">{el.label || el.i18nKey || el.id}</span>
                        <button
                          className="btn-danger"
                          style={{ marginLeft: 'auto', padding: '2px 6px' }}
                          title="Remove"
                          onClick={(e)=>{ e.stopPropagation(); deleteElement(idx); }}
                        >
                          🗑
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="form-properties">
                  <div className="section-title">Properties</div>
                  <FormEditorFields
                    element={formSchema?.elements?.[selectedElementIndex]}
                    onChange={(next)=>updateElement(selectedElementIndex, next)}
                  />
                  <div className="section-title" style={{marginTop:'12px'}}>Preview</div>
                  <FormPreview
                    schema={formSchema}
                    onSubmit={(values)=>console.log('Submit (simulate success):', values)}
                  />
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
