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

    if (!architecture.metadata?.cdkCode) {
      return NextResponse.json(
        { message: `No CDK code found for architecture ${id}` },
        { status: 404 }
      );
    }

    // Determine file extension based on language
    const language = architecture.metadata.cdkLanguage || 'typescript';
    let fileExtension = 'ts';
    
    switch (language) {
      case 'javascript':
        fileExtension = 'js';
        break;
      case 'python':
        fileExtension = 'py';
        break;
      case 'java':
        fileExtension = 'java';
        break;
      case 'csharp':
        fileExtension = 'cs';
        break;
      default:
        fileExtension = 'ts';
    }

    console.log(`Downloading CDK code for architecture ID: ${id}`);

    // Return the CDK code as a text file with appropriate extension
    const cdkCode = architecture.metadata.cdkCode;
    const headers = new Headers();
    headers.append('Content-Type', 'text/plain');
    headers.append('Content-Disposition', `attachment; filename="architecture-${id}.${fileExtension}"`);

    return new NextResponse(cdkCode, {
      status: 200,
      headers
    });
  } catch (error: any) {
    console.error('Error in download-cdk API:', error);
    return NextResponse.json(
      { message: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 