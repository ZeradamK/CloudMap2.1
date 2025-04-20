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

    console.log(`Exporting architecture data for ID: ${id}`);

    // Prepare the complete architecture data for export
    const exportData = {
      nodes: architecture.nodes,
      edges: architecture.edges,
      metadata: architecture.metadata
    };

    // Return the architecture data as a JSON file
    const jsonData = JSON.stringify(exportData, null, 2);
    const headers = new Headers();
    headers.append('Content-Type', 'application/json');
    headers.append('Content-Disposition', `attachment; filename="architecture-${id}.json"`);

    return new NextResponse(jsonData, {
      status: 200,
      headers
    });
  } catch (error: any) {
    console.error('Error in export-architecture API:', error);
    return NextResponse.json(
      { message: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 