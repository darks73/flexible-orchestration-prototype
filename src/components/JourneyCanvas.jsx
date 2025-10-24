import React, { useCallback, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

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

const EndNode = ({ data, selected }) => (
  <div className={`journey-end-node ${data.error ? 'error' : ''} ${selected ? 'selected' : ''}`}>
    <div>{data.error ? 'Error' : 'End'}</div>
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
  end: EndNode,
  condition: ConditionNode,
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
    type: 'end',
    position: { x: 500, y: 250 },
    data: { label: 'End' },
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

export default function JourneyCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedElements, setSelectedElements] = useState([]);
  const [nextNodeId, setNextNodeId] = useState(3); // Start from 3 since we have nodes 1 and 2
  const [showNodeMenu, setShowNodeMenu] = useState(false);

  // Debug logging
  console.log('Current nodes:', nodes);
  console.log('Current edges:', edges);

  // Function to add a new node of specified type
  const addNode = useCallback((nodeType) => {
    let label = 'Node';
    if (nodeType === 'end') label = 'End';
    if (nodeType === 'condition') label = 'Condition';
    
    // Calculate position to ensure node is visible
    // Start from a reasonable position and spread nodes vertically if needed
    const baseX = 400; // Start closer to center
    const baseY = 200; // Start higher up
    const spacingX = 200; // Horizontal spacing
    const spacingY = 150; // Vertical spacing
    
    // Calculate grid position
    const nodeIndex = nextNodeId - 2; // Start from 0 for new nodes
    const row = Math.floor(nodeIndex / 3); // 3 nodes per row
    const col = nodeIndex % 3; // Column within row
    
    const newNode = {
      id: nextNodeId.toString(),
      type: nodeType,
      position: { 
        x: baseX + col * spacingX, 
        y: baseY + row * spacingY 
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
        panOnDrag={[1, 2]}
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
        panOnScroll={false}
        panOnScrollMode="free"
      >
        <Background />
        <Controls />
        <MiniMap />
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
        
        {/* Node Selection Menu */}
        {showNodeMenu && (
          <div className="node-menu">
            <div className="node-menu-item" onClick={() => addNode('end')}>
              <div className="node-menu-icon end-icon">End</div>
              <span>End Node</span>
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
    </div>
  );
}
