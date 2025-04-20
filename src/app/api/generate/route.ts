import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { generateArchitectureSuggestion } from '@/ai/flows/generate-architecture-suggestion';
import { architectureStore } from '../store';

// Define types for nodes and edges
interface NodeData {
  label: string;
  service: string;
  description?: string;
  estCost?: string;
  faultTolerance?: string;
  [key: string]: any;
}

interface NodeStyle {
  background?: string;
  color?: string;
  border?: string;
  width?: number;
  [key: string]: any;
}

interface Node {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: NodeData;
  style?: NodeStyle;
  [key: string]: any;
}

interface EdgeData {
  dataFlow?: string;
  protocol?: string;
  [key: string]: any;
}

interface Edge {
  id: string;
  source: string;
  target: string;
  animated?: boolean;
  data?: EdgeData;
  style?: Record<string, any>;
  [key: string]: any;
}

interface ArchitectureData {
  nodes: Node[];
  edges: Edge[];
  [key: string]: any;
}

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { prompt } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { message: 'Invalid request: prompt is required' },
        { status: 400 }
      );
    }

    // Generate architecture using AI
    const result = await generateArchitectureSuggestion({
      problemStatement: prompt
    });

    // Parse the JSON architecture from the AI response
    let architectureData: ArchitectureData;
    try {
      // Extract JSON content from the response
      let jsonString = result.architectureSuggestion;
      
      // Clean up potential formatting issues that might cause JSON parsing errors
      // 1. Remove any markdown code block markers
      jsonString = jsonString.replace(/```(json)?|```/g, '');
      
      // 2. Replace any single quotes with double quotes (common AI model mistake)
      jsonString = jsonString.replace(/'/g, '"');
      
      // 3. Remove any potential JavaScript comments
      jsonString = jsonString.replace(/\/\/.*$/gm, '');
      jsonString = jsonString.replace(/\/\*[\s\S]*?\*\//g, '');
      
      // 4. Trim whitespace
      jsonString = jsonString.trim();

      console.log("Cleaned JSON string:", jsonString.substring(0, 100) + "...");
      
      // Parse the cleaned JSON string
      architectureData = JSON.parse(jsonString) as ArchitectureData;
      
      // Ensure it has the expected structure
      if (!architectureData.nodes || !architectureData.edges) {
        throw new Error('Invalid architecture format received from AI: missing nodes or edges');
      }
      
      // Additional validation of node positions to avoid overlaps
      architectureData.nodes.forEach((node: Node, index: number) => {
        if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
          // Provide default positions if missing or invalid
          node.position = { 
            x: 100 + (index * 200), 
            y: 100 + (Math.floor(index / 5) * 150) 
          };
        }
        
        // Ensure all nodes have proper styling
        if (!node.style) {
          node.style = { 
            background: getRandomColor(), 
            color: "#ffffff",
            border: "1px solid #000000",
            width: 180 
          };
        }
      });
      
    } catch (parseError: any) {
      console.error('Error parsing AI response:', parseError);
      return NextResponse.json(
        { message: `Failed to parse architecture data from AI: ${parseError.message}` },
        { status: 500 }
      );
    }

    // Generate a unique ID for this architecture
    const id = uuidv4();

    // Store the architecture data
    architectureStore[id] = {
      nodes: architectureData.nodes,
      edges: architectureData.edges,
      metadata: {
        prompt,
        rationale: result.rationale,
        timestamp: new Date().toISOString(),
      }
    };

    console.log(`Generated architecture with ID: ${id}`);

    // Return the ID to the client
    return NextResponse.json({ id });
  } catch (error: any) {
    console.error('Error in generate API:', error);
    return NextResponse.json(
      { message: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Helper function to generate a random color for services without styling
function getRandomColor(): string {
  const colors = [
    "#42a5f5", // Blue (Lambda)
    "#5c6bc0", // Indigo (DynamoDB)
    "#ec407a", // Pink (API Gateway)
    "#66bb6a", // Green (S3)
    "#ffa726", // Orange (SQS/SNS)
    "#8d6e63", // Brown (EC2)
    "#5c6bc0", // Indigo (RDS)
    "#7e57c2"  // Purple (CloudFront)
  ];
  return colors[Math.floor(Math.random() * colors.length)];
} 