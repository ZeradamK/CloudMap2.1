import { NextRequest, NextResponse } from 'next/server';
import { generateArchitectureSuggestion } from '@/ai/flows/generate-architecture-suggestion';
import { architectureStore } from '../store';

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { architectureId, language = 'typescript' } = body;

    if (!architectureId) {
      return NextResponse.json(
        { message: 'Invalid request: architectureId is required' },
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

    // Convert architecture to string representation for the AI prompt
    const architectureNodesStr = JSON.stringify(architecture.nodes, null, 2);
    const architectureEdgesStr = JSON.stringify(architecture.edges, null, 2);
    const originalPrompt = architecture.metadata?.prompt || "Unknown requirements";

    // Determine language-specific instructions
    let languageInstructions = '';
    let languagePrefix = '';
    
    switch (language) {
      case 'javascript':
        languageInstructions = 'JavaScript';
        languagePrefix = 'js';
        break;
      case 'python':
        languageInstructions = 'Python';
        languagePrefix = 'py';
        break;
      case 'java':
        languageInstructions = 'Java';
        languagePrefix = 'java';
        break;
      case 'csharp':
        languageInstructions = 'C# (.NET)';
        languagePrefix = 'csharp';
        break;
      case 'typescript':
      default:
        languageInstructions = 'TypeScript';
        languagePrefix = 'ts';
    }

    // Generate CDK code using AI
    const prompt = `
I have a cloud architecture design with the following details:

Original Requirements:
${originalPrompt}

Architecture Description:
${architecture.metadata?.rationale || "No rationale provided"}

Architecture Nodes (AWS Services):
${architectureNodesStr}

Architecture Edges (Service Connections):
${architectureEdgesStr}

Please generate complete, deployable AWS CDK code in ${languageInstructions} for this architecture. Include:
1. All necessary imports
2. Main stack definition
3. All resources as per the architecture
4. Proper connections between services
5. IAM roles and permissions
6. Security best practices
7. Comments explaining key parts of the code

Make sure your code follows best practices for ${languageInstructions} and uses the most current AWS CDK constructs.
Include clear comments explaining how the infrastructure maps to the architecture diagram.
Format the code for direct use in an AWS CDK project.
`;

    const result = await generateArchitectureSuggestion({
      problemStatement: prompt
    });

    // Extract CDK code from the AI response
    let cdkCode = result.cdkCode || result.architectureSuggestion;
    
    // Update the architecture in the store with the CDK code
    architectureStore[architectureId] = {
      ...architecture,
      metadata: {
        ...architecture.metadata,
        cdkCode,
        cdkLanguage: language,
        cdkGeneratedAt: new Date().toISOString(),
      }
    };

    console.log(`Generated ${languageInstructions} CDK code for architecture ID: ${architectureId}`);

    // Return the CDK code
    return NextResponse.json({
      id: architectureId,
      cdkCode,
      language
    });
  } catch (error: any) {
    console.error('Error in generate-cdk API:', error);
    return NextResponse.json(
      { message: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 