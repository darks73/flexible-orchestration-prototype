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
const StartNode = ({ data }) => (
  <div className="journey-start-node">
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

const EndNode = ({ data }) => (
  <div className={`journey-end-node ${data.error ? 'error' : ''}`}>
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

// Node types configuration
const nodeTypes = {
  start: StartNode,
  end: EndNode,
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

  // Debug logging
  console.log('Current nodes:', nodes);
  console.log('Current edges:', edges);

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
      
      // Create the new edge with arrow styling
      const newEdge = {
        ...params,
        id: `e${params.source}-${params.target}`,
        sourceHandle: params.sourceHandle || 'right',
        targetHandle: params.targetHandle || 'left',
        type: 'default',
        animated: false,
        style: { stroke: '#2563eb', strokeWidth: 2 },
        markerEnd: {
          type: 'arrowclosed',
          color: '#2563eb',
          width: 20,
          height: 20,
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
  }, [setEdges]);

  // Handle keyboard events for deletion
  const onKeyDown = useCallback((event) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      console.log('Delete key pressed, selected elements:', selectedElements);
      
      // Find selected edges - edges have source and target properties
      const selectedEdges = selectedElements.filter(element => element.source && element.target);
      console.log('Selected edges to delete:', selectedEdges);
      
      if (selectedEdges.length > 0) {
        // Remove selected edges
        const edgeIdsToRemove = selectedEdges.map(edge => edge.id);
        console.log('Removing edge IDs:', edgeIdsToRemove);
        
        setEdges((eds) => eds.filter(edge => !edgeIdsToRemove.includes(edge.id)));
        
        // Clear selection
        setSelectedElements([]);
        
        // Prevent default behavior
        event.preventDefault();
      }
    }
  }, [selectedElements, setEdges]);

  return (
    <div 
      style={{ width: '100%', height: '100%' }}
      onKeyDown={onKeyDown}
      tabIndex={0}
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
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
