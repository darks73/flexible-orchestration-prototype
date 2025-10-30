import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

function getPortsForNode(node, allNodes, allEdges) {
  const type = node.type;
  const ports = [];
  const add = (id, side, index) => ports.push({ id, properties: { 'org.eclipse.elk.port.side': side, 'org.eclipse.elk.port.index': index != null ? String(index) : undefined } });

  if (type === 'start') {
    add('right', 'EAST');
  } else if (type === 'frontendForm') {
    add('input', 'WEST', 0);
    // Determine current vertical order of targets to minimize crossings
    const outgoing = allEdges.filter((e) => e.source === node.id);
    const byHandle = Object.fromEntries(outgoing.map((e) => [e.sourceHandle, e]));
    const successEdge = byHandle.success;
    const errorEdge = byHandle.error;
    const nodeById = Object.fromEntries(allNodes.map((n) => [n.id, n]));
    const successY = successEdge ? (nodeById[successEdge.target]?.position?.y ?? 0) : null;
    const errorY = errorEdge ? (nodeById[errorEdge.target]?.position?.y ?? 0) : null;
    if (successY != null && errorY != null) {
      if (successY <= errorY) {
        add('success', 'EAST', 0);
        add('error', 'EAST', 1);
      } else {
        add('error', 'EAST', 0);
        add('success', 'EAST', 1);
      }
    } else {
      // Fallback, success above error
      add('success', 'EAST', 0);
      add('error', 'EAST', 1);
    }
  } else if (type === 'successEnd' || type === 'errorEnd') {
    add('left', 'WEST', 0);
  } else if (type === 'condition') {
    add('input', 'WEST', 0);
    add('yes', 'NORTH', 0);
    add('no', 'SOUTH', 1);
  }
  return ports;
}

export async function layoutGraph(nodes, edges, { direction = 'RIGHT' } = {}) {
  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': direction,
      'elk.layered.cycleHandling': 'GREEDY',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.crossingMinimization.semiInteractive': 'true',
      'elk.spacing.nodeNode': '40',
      'elk.layered.spacing.nodeNodeBetweenLayers': '80',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.portConstraints': 'FIXED_ORDER',
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: n.width || 160,
      height: n.height || 80,
      layoutOptions: {
        'elk.portConstraints': 'FIXED_ORDER',
        'elk.portAlignment.east': 'CENTER',
        'elk.portAlignment.west': 'CENTER',
      },
      ports: getPortsForNode(n, nodes, edges),
    })),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
      sourcePort: e.sourceHandle || undefined,
      targetPort: e.targetHandle || undefined,
    })),
  };

  const res = await elk.layout(elkGraph);
  const positions = Object.fromEntries((res.children || []).map((c) => [c.id, { x: c.x, y: c.y }]));

  // Post-process: stabilize success above error for frontendForm nodes
  const nodeById = Object.fromEntries(nodes.map((n) => [n.id, n]));
  for (const form of nodes.filter((n) => n.type === 'frontendForm')) {
    const formPos = positions[form.id] || { x: form.position?.x || 0, y: form.position?.y || 0 };
    const outgoing = edges.filter((e) => e.source === form.id);
    const successEdge = outgoing.find((e) => e.sourceHandle === 'success');
    const errorEdge = outgoing.find((e) => e.sourceHandle === 'error');
    if (successEdge && errorEdge) {
      const sId = successEdge.target;
      const eId = errorEdge.target;
      const sPos = positions[sId];
      const ePos = positions[eId];
      if (sPos && ePos && sPos.y >= ePos.y) {
        const gap = 140; // vertical separation
        positions[sId] = { x: sPos.x, y: formPos.y - gap / 2 };
        positions[eId] = { x: ePos.x, y: formPos.y + gap / 2 };
      }
    }
  }

  return nodes.map((n) => ({
    ...n,
    position: positions[n.id] ?? n.position,
    positionAbsolute: undefined,
  }));
}


