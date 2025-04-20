import { NextRequest, NextResponse } from 'next/server';
import { architectureStore } from '../../store';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { message: 'Architecture ID is required' },
        { status: 400 }
      );
    }

    // Retrieve architecture from store
    const architecture = architectureStore[id];

    if (!architecture) {
      return NextResponse.json(
        { message: `Architecture with ID ${id} not found` },
        { status: 404 }
      );
    }

    console.log(`Retrieved architecture with ID: ${id}`);

    // Return the architecture data
    return NextResponse.json({
      nodes: architecture.nodes,
      edges: architecture.edges,
      metadata: architecture.metadata
    });
  } catch (error: any) {
    console.error('Error in architecture API:', error);
    return NextResponse.json(
      { message: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 