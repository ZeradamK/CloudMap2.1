"use client";

import ReactFlow, {Controls, Background} from 'reactflow';
import 'reactflow/dist/style.css';

const initialNodes = [
  {id: '1', position: {x: 0, y: 0}, data: {label: 'Lambda Function'}, type: 'input'},
  {id: '2', position: {x: 250, y: 0}, data: {label: 'API Gateway'}},
];

const initialEdges = [
  {id: 'e1-2', source: '1', target: '2', animated: true},
];

const DiagramEditor = () => {
  return (
    <div className="flex-1 diagram-editor">
      <ReactFlow
        nodes={initialNodes}
        edges={initialEdges}
        fitView
      >
        <Controls/>
        <Background variant="dots" gap={12} size={1}/>
      </ReactFlow>
    </div>
  );
};

export default DiagramEditor;
