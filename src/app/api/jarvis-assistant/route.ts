import { NextRequest, NextResponse } from 'next/server';
import { architectureStore } from '../store';
import { generateArchitectureSuggestion } from '@/ai/flows/generate-architecture-suggestion';

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    const { message, architectureId, messageHistory } = body;

    if (!message || !architectureId) {
      return NextResponse.json(
        { message: 'Invalid request: message and architectureId are required' },
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

    // Get architecture data for context
    const nodesJson = JSON.stringify(architecture.nodes);
    const edgesJson = JSON.stringify(architecture.edges);
    const serviceDetails = architecture.nodes.map((node: any) => 
      `Service: ${node.data.service}\nName: ${node.data.label}\nDescription: ${node.data.description || 'N/A'}\nEstimated Cost: ${node.data.estCost || 'N/A'}\nFault Tolerance: ${node.data.faultTolerance || 'N/A'}\n`
    ).join('\n');

    // Get connections between services
    const connections = architecture.edges.map((edge: any) => {
      const sourceNode = architecture.nodes.find((n: any) => n.id === edge.source);
      const targetNode = architecture.nodes.find((n: any) => n.id === edge.target);
      return `Connection from ${sourceNode?.data.label} (${sourceNode?.data.service}) to ${targetNode?.data.label} (${targetNode?.data.service})
      Data flow: ${edge.data?.dataFlow || 'Not specified'}
      Protocol: ${edge.data?.protocol || 'Not specified'}`;
    }).join('\n\n');
    
    // Prepare detailed context about the current architecture
    const architectureContext = `
Current Architecture Overview:
- Contains ${architecture.nodes.length} services
- Has ${architecture.edges.length} connections between services
- Original requirement: ${architecture.metadata?.prompt || 'Not specified'}

Services Details:
${serviceDetails}

Service Connections:
${connections}

Architecture JSON for reference:
Nodes: ${nodesJson}
Edges: ${edgesJson}
`;

    // Identify the intent of the message for specialized handling
    const isCdkRequest = /cdk|infrastructure as code|iac|cloudformation|terraform|generate code|code generation|python.*code|implementation|aws sdk/i.test(message);
    const isPythonRequest = /python/i.test(message);
    const isEditRequest = /update|edit|change|modify|add|remove|delete|connect|disconnect|create|revise/i.test(message);
    const isCodeRequest = /code|script|program|function|class|implementation|example|snippet/i.test(message) && !isCdkRequest;
    
    let response = '';
    let architectureUpdated = false;

    if (isCdkRequest) {
      // Handle CDK code generation request
      console.log("Detected CDK code generation request");
      
      // Get service count for context
      const serviceCount = architecture.nodes.length;
      
      // Prepare a compact version of the architecture for the prompt
      const servicesList = architecture.nodes.map((node: any, index: number) => 
        `${index+1}. ${node.data.service} (${node.data.label}): ${node.data.description || 'No description'}`
      ).join('\n');
      
      // Prepare connections list
      const connectionsList = architecture.edges.map((edge: any) => {
        const sourceNode = architecture.nodes.find((n: any) => n.id === edge.source);
        const targetNode = architecture.nodes.find((n: any) => n.id === edge.target);
        return `- ${sourceNode?.data.label} → ${targetNode?.data.label} (${edge.data?.protocol || 'default protocol'})`;
      }).join('\n');
      
      const preferredLanguage = isPythonRequest ? "Python" : "TypeScript";
      
      const cdkPrompt = `
You are Jarvis, an AWS cloud architecture expert specializing in CDK implementations. You must provide complete, deployable code that implements the architecture specified.

ARCHITECTURE OVERVIEW:
Original requirement: ${architecture.metadata?.prompt || 'Not specified'}
Services (${serviceCount}): 
${servicesList}

Service Connections:
${connectionsList}

IMPORTANT CONTEXT:
${architectureContext}

USER REQUEST: "${message}"

YOUR TASK: 
Generate complete, production-ready AWS CDK code in ${preferredLanguage} that implements this architecture.

REQUIREMENTS:
1. Use ${preferredLanguage} CDK (AWS CDK v2)
2. Include ALL necessary imports
3. Create a complete stack with ALL services shown in the architecture
4. Configure proper IAM permissions between services
5. Set up networking (VPC, subnets, security groups) as needed
6. Implement service connections exactly as shown in the architecture
7. Include comprehensive comments explaining each section
8. Add deployment instructions at the top

RESPONSE FORMAT:
1. Begin with a brief introduction explaining the approach
2. Present the complete CDK code in a properly formatted code block using markdown syntax
3. Include setup/deployment instructions after the code

CODE MUST INCLUDE:
- Complete imports section with exact versions
- Main stack class with all constructs
- Proper configuration for each service
- Connections between services with appropriate permissions
- Required props and configuration
- Error handling

DO NOT OMIT ANY PARTS OF THE CODE. The code must be complete and deployable.
`;

      try {
        // Call AI to generate CDK code
        console.log("Sending CDK code generation prompt to AI");
        const result = await generateArchitectureSuggestion({
          problemStatement: cdkPrompt
        });
        
        // Extract code from response if it's wrapped in tags
        const codeBlockMatch = result.architectureSuggestion.match(/```(?:python|typescript)?([\s\S]*?)```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          console.log("Found code block in AI response");
          // Clean the response to make sure code is properly presented
          response = result.architectureSuggestion;
        } else {
          console.log("No code block found, using full response");
          response = result.rationale || result.architectureSuggestion;
        }
        
        // Save CDK code to architecture metadata for future reference
        try {
          architectureStore[architectureId] = {
            ...architecture,
            metadata: {
              ...architecture.metadata,
              cdkCode: response,
              cdkLanguage: isPythonRequest ? "python" : "typescript",
              cdkGeneratedAt: new Date().toISOString()
            }
          };
          console.log("Saved CDK code to architecture metadata");
        } catch (error) {
          console.error("Error saving CDK code to metadata:", error);
        }
      } catch (error) {
        console.error("Error generating CDK code:", error);
        response = "I encountered an error while generating the CDK code. This might be due to the complexity of the architecture. Let me know if you'd like me to try a simplified approach or focus on a specific part of the implementation.";
      }
    } else if (isEditRequest) {
      // Handle architecture edit request
      const editPrompt = `
You are Jarvis, an expert AWS cloud architect collaborator. You respond in a conversational, helpful way without markers like checkmarks. You're knowledgeable but speak naturally, as a human collaborator would.

${architectureContext}

Conversation history: ${JSON.stringify(messageHistory || [])}

User Request: ${message}

INSTRUCTIONS:
1. Analyze the existing architecture and the user's edit request
2. Generate a modified version of the AWS architecture that fulfills the request
3. Format your response in two parts EXACTLY as shown below:

<architecture>
{
  "nodes": [
    {
      "id": "node-1",
      "type": "default",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Service Name",
        "service": "AWS Service",
        "description": "What this service does",
        "estCost": "$X/month",
        "faultTolerance": "High/Medium/Low"
      },
      "style": { "background": "#hexcolor", "color": "#ffffff", "border": "1px solid #hexcolor", "width": 180 }
    },
    ...more nodes...
  ],
  "edges": [
    {
      "id": "edge-node1-node2",
      "source": "node-1",
      "target": "node-2",
      "animated": true,
      "data": {
        "dataFlow": "Description of data flow",
        "protocol": "Protocol used"
      },
      "style": { "stroke": "#hexcolor" }
    },
    ...more edges...
  ]
}
</architecture>

<explanation>
• Explain what changes you made to the architecture
• Explain WHY these changes improve the architecture in terms of:
  - Reliability
  - Scalability
  - Performance
  - Cost optimization
  - Security
  - Operational efficiency
</explanation>

IMPORTANT:
- Be creative and thoughtful in your architecture modifications
- The architecture JSON MUST contain valid nodes and edges arrays
- Maintain position coordinates for existing nodes when possible
- Ensure all JSON is properly formatted with double quotes for properties and string values
- Ensure your response can be parsed as valid JSON within the architecture tags
- Use conversational language when explaining changes
`;

      // Call AI to generate updated architecture and explanation
      const result = await generateArchitectureSuggestion({
        problemStatement: editPrompt
      });

      // Extract architecture JSON and explanation
      let updatedArchitecture;
      let explanation = '';
      
      try {
        // Extract architecture JSON
        const architectureMatch = result.architectureSuggestion.match(/<architecture>([\s\S]*?)<\/architecture>/);
        if (architectureMatch && architectureMatch[1]) {
          // Clean the JSON string
          let jsonString = architectureMatch[1];
          jsonString = jsonString.replace(/```(json)?|```/g, '');
          jsonString = jsonString.replace(/'/g, '"');
          jsonString = jsonString.replace(/\/\/.*$/gm, '');
          jsonString = jsonString.replace(/\/\*[\s\S]*?\*\//g, '');
          jsonString = jsonString.trim();
          
          updatedArchitecture = JSON.parse(jsonString);
        }
        
        // Extract explanation
        const explanationMatch = result.architectureSuggestion.match(/<explanation>([\s\S]*?)<\/explanation>/);
        if (explanationMatch && explanationMatch[1]) {
          explanation = explanationMatch[1].trim();
        } else {
          // Try to use rationale if explanation tag not found
          explanation = result.rationale || "Here are the changes to the architecture based on your request.";
        }
        
        // If both parts were extracted successfully
        if (updatedArchitecture && updatedArchitecture.nodes && updatedArchitecture.edges) {
          // Validate and fix node positions if needed
          updatedArchitecture.nodes.forEach((node: any, index: number) => {
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
          
          // Update architecture in store
          architectureStore[architectureId] = {
            ...architecture,
            nodes: updatedArchitecture.nodes,
            edges: updatedArchitecture.edges,
            metadata: {
              ...architecture.metadata,
              lastEditedBy: 'Jarvis',
              lastEditedAt: new Date().toISOString(),
              lastEditRequest: message,
              lastEditExplanation: explanation
            }
          };
          
          architectureUpdated = true;
          response = explanation;
        } else {
          // Could not parse the architecture properly
          response = "I understand what you're trying to do, but I couldn't quite work out how to update the architecture properly. Could you clarify what you want to change?";
        }
      } catch (error) {
        console.error('Error processing architecture update:', error);
        response = "I ran into a problem while working on those changes. Maybe we could try a simpler approach?";
      }
    } else if (isCodeRequest) {
      // Handle code generation request (not for CDK specifically)
      const codePrompt = `
You are Jarvis, an expert cloud architect and software engineer who specializes in AWS services implementation. You speak conversationally and provide detailed, accurate code examples.

${architectureContext}

User Request: ${message}

Please provide code that addresses the user's request related to this architecture. Your response should:
1. Show complete, working examples (not pseudo-code)
2. Include all necessary imports, error handling, and configuration
3. Follow best practices for the requested language and AWS SDKs
4. Explain how the code relates to the architecture
5. Use proper markdown formatting with code blocks

Be thorough, accurate, and assume the user is a professional developer who needs production-quality code.
`;

      // Call AI to generate code
      const result = await generateArchitectureSuggestion({
        problemStatement: codePrompt
      });
      
      response = result.rationale || result.architectureSuggestion;
      
    } else {
      // Handle general information/explanation request
      const infoPrompt = `
You are Jarvis, an expert AWS cloud architect who speaks in a conversational, natural tone like a knowledgeable colleague. You are creative, thoughtful, and can generate detailed responses on any cloud architecture topic.

${architectureContext}

Conversation history: ${JSON.stringify(messageHistory || [])}

User Request: ${message}

CAPABILITIES:
- You can provide detailed architectural advice
- You can suggest optimizations and improvements
- You can explain AWS services, best practices, and patterns
- You can generate code examples when asked
- You can create diagrams and visualizations (describe them in markdown)
- You can compare different architectural approaches
- You can discuss costs, security, scalability, and reliability
- You can provide step-by-step implementation guidance

Format your response for readability with:
- Headings (using markdown syntax)
- Bullet points
- Paragraphs
- Code blocks using \`\`\`language\n code \`\`\` syntax for any code examples
- Tables using markdown format when appropriate
- Emphasis using **bold** and *italics* for important points

Be conversational, engaging, and thorough in your response. Don't hold back knowledge or capabilities.
`;

      // Call AI to generate a response
      const result = await generateArchitectureSuggestion({
        problemStatement: infoPrompt
      });
      
      response = result.rationale || result.architectureSuggestion;
      
      // Clean up any explanation tags if they exist
      response = response.replace(/<explanation>([\s\S]*?)<\/explanation>/g, '$1').trim();
      response = response.replace(/<architecture>([\s\S]*?)<\/architecture>/g, '$1').trim();
    }

    // Return the response
    return NextResponse.json({
      response,
      architectureUpdated
    });

  } catch (error: any) {
    console.error('Error in Jarvis assistant API:', error);
    return NextResponse.json(
      { message: error.message || 'An unexpected error occurred', response: "Sorry about that - I hit a snag while processing your request. Can we try again?" },
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