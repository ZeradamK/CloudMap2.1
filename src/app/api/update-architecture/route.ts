import { NextRequest, NextResponse } from 'next/server';
import { architectureStore } from '../store';

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { architectureId, nodes, edges } = body;

    if (!architectureId || !nodes || !edges) {
      return NextResponse.json(
        { message: 'Invalid request: architectureId, nodes, and edges are required' },
        { status: 400 }
      );
    }

    // Check if the architecture exists
    const currentArchitecture = architectureStore[architectureId];
    if (!currentArchitecture) {
      return NextResponse.json(
        { message: `Architecture with ID ${architectureId} not found` },
        { status: 404 }
      );
    }

    // Update the architecture in the store
    architectureStore[architectureId] = {
      ...currentArchitecture,
      nodes: nodes,
      edges: edges,
      metadata: {
        ...currentArchitecture.metadata,
        lastEdited: new Date().toISOString(),
        userEdited: true
      }
    };

    console.log(`Updated architecture with ID: ${architectureId}`);

    // Return the updated architecture
    return NextResponse.json({
      id: architectureId,
      message: 'Architecture updated successfully'
    });
  } catch (error: any) {
    console.error('Error in update-architecture API:', error);
    return NextResponse.json(
      { message: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 