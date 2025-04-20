"use client";

import React, { useState, useCallback, useMemo, useRef } from 'react';
import ReactFlow, {
  Controls,
  Background,
  MiniMap,
  Node,
  Edge,
  BackgroundVariant,
  NodeMouseHandler,
  NodeProps,
  Handle,
  Position,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  EdgeChange,
  NodeChange,
  applyNodeChanges,
  applyEdgeChanges,
  Panel,
  useReactFlow,
  ConnectionLineType
} from 'reactflow';
import 'reactflow/dist/style.css'; // Import React Flow styles
import { ToggleSwitch } from '@/components/ui/toggle';
import { Button } from '@/components/ui/button';
import { Pencil, Plus, Save, Trash2, Layers, Edit3 } from 'lucide-react';

// Custom node component for AWS services
const AWSServiceNode = ({ data, selected, isConnectable }: NodeProps) => {
  return (
    <div
      className={`p-2 ${selected ? 'ring-2 ring-blue-500' : ''}`}
      style={{
        background: data?.style?.background || '#42a5f5',
        color: data?.style?.color || 'white',
        border: data?.style?.border || '1px solid #1976d2',
        borderRadius: '8px',
        width: data?.style?.width || 180,
        minHeight: '80px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      }}
    >
      <Handle 
        type="target" 
        position={Position.Left} 
        isConnectable={isConnectable} 
        className="w-2 h-2 bg-blue-300 border-2 border-white"
      />
      <div className="font-semibold text-center mb-1">{data.label}</div>
      <div className="text-xs text-center mb-2">{data.service}</div>
      <Handle 
        type="source" 
        position={Position.Right} 
        isConnectable={isConnectable}
        className="w-2 h-2 bg-blue-300 border-2 border-white" 
      />
    </div>
  );
};

interface ArchitectureDiagramProps {
  initialNodes: Node[];
  initialEdges: Edge[];
}

// Get a new unique node ID
const getNewNodeId = (nodes: Node[]): string => {
  const existingIds = nodes.map(node => parseInt(node.id.replace('node-', '')));
  const maxId = Math.max(...existingIds, 0);
  return `node-${maxId + 1}`;
};

// Define AWS service options for new nodes
const awsServiceOptions = [
  { label: 'Lambda Function', service: 'AWS Lambda', color: '#42a5f5' },
  { label: 'DynamoDB Table', service: 'Amazon DynamoDB', color: '#5c6bc0' },
  { label: 'S3 Bucket', service: 'Amazon S3', color: '#66bb6a' },
  { label: 'API Gateway', service: 'Amazon API Gateway', color: '#ec407a' },
  { label: 'SQS Queue', service: 'Amazon SQS', color: '#ffa726' },
  { label: 'EC2 Instance', service: 'Amazon EC2', color: '#8d6e63' },
  { label: 'RDS Database', service: 'Amazon RDS', color: '#5c6bc0' },
  { label: 'ElastiCache', service: 'Amazon ElastiCache', color: '#7e57c2' },
  { label: 'CloudFront CDN', service: 'Amazon CloudFront', color: '#26a69a' },
  { label: 'ECS Container', service: 'Amazon ECS', color: '#ff7043' },
  { label: 'SNS Topic', service: 'Amazon SNS', color: '#ffca28' }
];

export default function ArchitectureDiagram({ initialNodes = [], initialEdges = [] }: ArchitectureDiagramProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showNodePalette, setShowNodePalette] = useState(false);
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Register the custom AWS service node
  const nodeTypes = useMemo(() => ({
    awsService: AWSServiceNode
  }), []);

  // Convert standard nodes to custom AWS service nodes if needed
  const processedNodes = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      // If the node doesn't have a type, set it to the custom AWS service node
      type: node.type || 'awsService',
      // Ensure the node has a position
      position: node.position || { x: 0, y: 0 },
      // Add draggable property based on edit mode
      draggable: editMode
    }));
  }, [nodes, editMode]);

  // Handle node click to show details or select for deletion
  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    setSelectedNode(node);
  }, []);

  // Handle connecting nodes
  const onConnect = useCallback((params: Connection) => {
    if (!editMode) return;
    
    const newEdge = {
      ...params,
      id: `edge-${params.source}-${params.target}`,
      animated: true,
      style: { stroke: '#ff9800' },
      data: {
        dataFlow: 'Data flow',
        protocol: 'HTTPS'
      }
    };
    setEdges((eds) => addEdge(newEdge, eds));
  }, [setEdges, editMode]);

  // Handle adding a new node
  const onAddNode = useCallback((serviceType: typeof awsServiceOptions[0]) => {
    const position = reactFlowInstance.project({
      x: Math.random() * 300 + 50,
      y: Math.random() * 300 + 50,
    });
    
    const newNode: Node = {
      id: getNewNodeId(nodes),
      type: 'awsService',
      position,
      data: {
        label: serviceType.label,
        service: serviceType.service,
        description: `New ${serviceType.service} service`,
        estCost: 'TBD',
        faultTolerance: 'Medium',
      },
      style: {
        background: serviceType.color,
        color: '#ffffff',
        border: '1px solid #000000',
        width: 180
      }
    };
    
    setNodes((nds) => nds.concat(newNode));
    setShowNodePalette(false);
  }, [nodes, reactFlowInstance, setNodes]);

  // Handle deleting a node
  const onDeleteNode = useCallback(() => {
    if (selectedNode) {
      setNodes(nodes.filter(node => node.id !== selectedNode.id));
      // Also delete any connected edges
      setEdges(edges.filter(edge => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
      setSelectedNode(null);
    }
  }, [selectedNode, nodes, edges, setNodes, setEdges]);

  // Handle saving the modified diagram
  const onSaveDiagram = useCallback(async () => {
    try {
      // Get the architecture ID from URL if available
      const pathParts = window.location.pathname.split('/');
      const architectureId = pathParts[pathParts.length - 1];
      
      if (!architectureId) {
        console.error('No architecture ID found');
        alert('Error: Could not determine which architecture to update');
        return;
      }
      
      // Prepare the data to send to the backend
      const diagramData = {
        architectureId,
        nodes: nodes,
        edges: edges
      };
      
      // Send the updated diagram to the backend
      const response = await fetch('/api/update-architecture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(diagramData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save diagram');
      }
      
      alert('Diagram saved successfully!');
      console.log('Updated Nodes:', nodes);
      console.log('Updated Edges:', edges);
      setEditMode(false);
    } catch (error: any) {
      console.error('Error saving diagram:', error);
      alert(`Error: ${error.message || 'Could not save the diagram.'}`);
    }
  }, [nodes, edges]);

  // Function to render the node details panel
  const renderNodeDetails = () => {
    if (!selectedNode) {
      return (
        <div className="text-gray-500 text-center py-4">
          <p>Select a service to view details</p>
        </div>
      );
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">{selectedNode.data.label}</h3>
          {editMode && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onDeleteNode}
              className="h-8 w-8 p-0 text-red-500"
            >
              <Trash2 size={16} />
            </Button>
          )}
        </div>
        
        <div className="mb-4 bg-blue-100 px-3 py-1 rounded text-blue-800 text-sm inline-block">
          {selectedNode.data.service}
        </div>
        
        <div className="mt-2 border-t pt-2">
          <h4 className="font-medium text-sm text-gray-700 mb-1">Description</h4>
          <p className="text-sm mb-3">{selectedNode.data.description || "No description provided"}</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-1">Estimated Cost</h4>
              <p className="text-sm mb-3">{selectedNode.data.estCost || "Not specified"}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-1">Fault Tolerance</h4>
              <p className="text-sm mb-3">{selectedNode.data.faultTolerance || "Not specified"}</p>
            </div>
          </div>
          
          {selectedNode.data.latency && (
            <>
              <h4 className="font-medium text-sm text-gray-700 mb-1">Latency</h4>
              <p className="text-sm mb-3">{selectedNode.data.latency}</p>
            </>
          )}
          
          {selectedNode.data.scalability && (
            <>
              <h4 className="font-medium text-sm text-gray-700 mb-1">Scalability</h4>
              <p className="text-sm mb-3">{selectedNode.data.scalability}</p>
            </>
          )}
          
          {selectedNode.data.security && (
            <>
              <h4 className="font-medium text-sm text-gray-700 mb-1">Security</h4>
              <p className="text-sm mb-3">{selectedNode.data.security}</p>
            </>
          )}
          
          {selectedNode.data.iamRoles && selectedNode.data.iamRoles.length > 0 && (
            <>
              <h4 className="font-medium text-sm text-gray-700 mb-1">Required IAM Roles</h4>
              <ul className="list-disc pl-5 text-sm mb-3">
                {selectedNode.data.iamRoles.map((role: string, index: number) => (
                  <li key={index}>{role}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    );
  };

  // Node palette for adding new services
  const renderNodePalette = () => {
    if (!showNodePalette) return null;
    
    return (
      <div className="absolute top-16 right-2 bg-white shadow-lg rounded-md border border-gray-200 p-3 z-10 w-64">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium">Add AWS Service</h3>
          <button 
            onClick={() => setShowNodePalette(false)} 
            className="text-gray-500 hover:text-gray-700"
          >
            &times;
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {awsServiceOptions.map((service, index) => (
            <button
              key={index}
              className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded mb-1 flex items-center"
              onClick={() => onAddNode(service)}
            >
              <div 
                className="w-3 h-3 rounded-full mr-2" 
                style={{ backgroundColor: service.color }}
              ></div>
              <span className="text-sm">{service.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col md:flex-row h-full" ref={reactFlowWrapper}>
      {/* On mobile: Stack both diagram and details in a single scrollable column */}
      <div className="md:hidden flex flex-col h-auto">
        {/* Diagram container with fixed minimum height */}
        <div className="w-full min-h-[50vh] relative">
          <ReactFlow
            nodes={processedNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={editMode ? onNodesChange : undefined}
            onEdgesChange={editMode ? onEdgesChange : undefined}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodesDraggable={editMode}
            nodesConnectable={editMode}
            elementsSelectable={true}
            fitView
            connectionLineType={ConnectionLineType.SmoothStep}
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={1.5} 
              color="#6b7280"
              style={{ backgroundColor: '#f9fafb' }}
            />
            <Controls />
            
            <Panel position="top-right" className="flex gap-2">
              <div className="flex items-center bg-white p-2 rounded shadow-sm">
                <span className="text-xs mr-2">Edit Mode</span>
                <ToggleSwitch checked={editMode} onCheckedChange={setEditMode} />
              </div>
              
              {editMode && (
                <>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => setShowNodePalette(true)}
                    className="bg-white"
                  >
                    <Plus size={16} className="mr-1" /> Add
                  </Button>
                  
                  <Button 
                    size="sm"
                    variant="default"
                    onClick={onSaveDiagram}
                  >
                    <Save size={16} className="mr-1" /> Save
                  </Button>
                </>
              )}
            </Panel>
            
            {renderNodePalette()}
          </ReactFlow>
        </div>
        
        {/* Details panel without fixed height */}
        <div className="border-t border-gray-200 p-4 w-full">
          {renderNodeDetails()}
        </div>
      </div>

      {/* On desktop: Use the original side-by-side layout */}
      <div className="hidden md:flex md:flex-row h-full w-full">
        <div className="h-full w-3/4 relative">
          <ReactFlow
            nodes={processedNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={editMode ? onNodesChange : undefined}
            onEdgesChange={editMode ? onEdgesChange : undefined}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            nodesDraggable={editMode}
            nodesConnectable={editMode}
            elementsSelectable={true}
            fitView
            connectionLineType={ConnectionLineType.SmoothStep}
          >
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={20} 
              size={1.5} 
              color="#6b7280"
              style={{ backgroundColor: '#f9fafb' }}
            />
            <Controls />
            <MiniMap 
              nodeStrokeWidth={3} 
              zoomable 
              pannable 
              maskColor="rgba(240, 240, 240, 0.5)"
              nodeColor={(node) => {
                return (node.style?.background || '#42a5f5') as string;
              }}
            />
            
            <Panel position="top-right" className="flex gap-2">
              <div className="flex items-center bg-white p-2 rounded shadow-sm">
                <span className="text-xs mr-2">Edit Mode</span>
                <ToggleSwitch checked={editMode} onCheckedChange={setEditMode} />
              </div>
              
              {editMode && (
                <>
                  <Button 
                    size="sm"
                    variant="outline"
                    onClick={() => setShowNodePalette(true)}
                    className="bg-white"
                  >
                    <Plus size={16} className="mr-1" /> Add
                  </Button>
                  
                  <Button 
                    size="sm"
                    variant="default"
                    onClick={onSaveDiagram}
                  >
                    <Save size={16} className="mr-1" /> Save
                  </Button>
                </>
              )}
            </Panel>
            
            {renderNodePalette()}
          </ReactFlow>
        </div>

        <div className="border-l border-gray-200 p-4 overflow-y-auto w-1/4 h-full">
          {renderNodeDetails()}
        </div>
      </div>
    </div>
  );
}
