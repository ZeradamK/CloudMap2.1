import { NextRequest, NextResponse } from 'next/server';
import { generateArchitectureSuggestion } from '@/ai/flows/generate-architecture-suggestion';
import { architectureStore } from '../store';

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { originalPrompt, adjustmentPrompt, currentArchitectureId } = body;

    if (!originalPrompt || !adjustmentPrompt || !currentArchitectureId) {
      return NextResponse.json(
        { message: 'Invalid request: originalPrompt, adjustmentPrompt, and currentArchitectureId are required' },
        { status: 400 }
      );
    }

    // Check if the current architecture exists
    const currentArchitecture = architectureStore[currentArchitectureId];
    if (!currentArchitecture) {
      return NextResponse.json(
        { message: `Architecture with ID ${currentArchitectureId} not found` },
        { status: 404 }
      );
    }

    // Prepare a combined prompt with context from the original architecture
    const combinedPrompt = `
Original requirement: ${originalPrompt}

Current architecture context: This architecture has ${currentArchitecture.nodes.length} services and ${currentArchitecture.edges.length} connections.

Adjustment request: ${adjustmentPrompt}

Please provide an updated architecture based on the original requirements and the adjustment request.
`;

    // Generate adjusted architecture using AI
    const result = await generateArchitectureSuggestion({
      problemStatement: combinedPrompt
    });

    // Parse the JSON architecture from the AI response
    let architectureData;
    try {
      architectureData = JSON.parse(result.architectureSuggestion);
      
      // Ensure it has the expected structure
      if (!architectureData.nodes || !architectureData.edges) {
        throw new Error('Invalid architecture format received from AI');
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return NextResponse.json(
        { message: 'Failed to parse architecture data from AI' },
        { status: 500 }
      );
    }

    // Update the architecture in the store with the adjusted version
    architectureStore[currentArchitectureId] = {
      nodes: architectureData.nodes,
      edges: architectureData.edges,
      metadata: {
        ...currentArchitecture.metadata,
        originalPrompt,
        adjustmentPrompt,
        rationale: result.rationale,
        lastUpdated: new Date().toISOString(),
      }
    };

    console.log(`Updated architecture with ID: ${currentArchitectureId}`);

    // Return the updated architecture data
    return NextResponse.json({
      id: currentArchitectureId,
      nodes: architectureData.nodes,
      edges: architectureData.edges,
      metadata: architectureStore[currentArchitectureId].metadata
    });
  } catch (error: any) {
    console.error('Error in adjust API:', error);
    return NextResponse.json(
      { message: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 