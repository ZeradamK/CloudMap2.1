import { NextRequest, NextResponse } from 'next/server';
import { architectureStore } from '../store';

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { architectureId, cdkCode } = body;

    if (!architectureId || typeof cdkCode !== 'string') {
      return NextResponse.json(
        { message: 'Invalid request: architectureId and cdkCode are required' },
        { status: 400 }
      );
    }

    // Check if the architecture exists
    const architecture = architectureStore[architectureId];
    if (!architecture) {
      return NextResponse.json(
        { message: `Architecture with ID ${architectureId} not found` },
        { status: 404 }
      );
    }

    // Update the architecture in the store with the new CDK code
    architectureStore[architectureId] = {
      ...architecture,
      metadata: {
        ...architecture.metadata,
        cdkCode,
        cdkLastEdited: new Date().toISOString(),
      }
    };

    console.log(`Updated CDK code for architecture ID: ${architectureId}`);

    // Return success message
    return NextResponse.json({
      id: architectureId,
      message: 'CDK code updated successfully'
    });
  } catch (error: any) {
    console.error('Error in save-cdk API:', error);
    return NextResponse.json(
      { message: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 