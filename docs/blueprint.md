# **App Name**: Cloud Architect AI

## Core Features:

- Architecture Suggestion: Interpret technical problem statements and generate cloud-native microservices architecture suggestions using AWS best practices as a tool.
- Visual Diagram: Display the architecture in a 2D diagram using React Flow, with nodes representing services and edges representing data flow.
- CDK Code Generation: Generate Infrastructure-as-Code (IaC) using AWS CDK in TypeScript.
- Documentation Generation: Provide documentation outlining service choices, data flow, and security, scalability, and cost-optimization rationale.
- Service Metadata Display: Display service metadata (estimated cost, latency, fault tolerance, IAM role requirements) on clickable nodes in the diagram.

## Style Guidelines:

- Primary color: AWS Blue (#232F3E) to align with AWS branding.
- Secondary color: Light gray (#F5F5F5) for backgrounds.
- Accent color: Teal (#00BCD4) for interactive elements and highlights.
- Firebase Studio-like interface with a project dashboard on the left and a visual diagram editor in the center.
- Use AWS service icons for nodes in the React Flow diagram.
- Subtle animations for data flow in the React Flow diagram and when displaying service metadata.

## Original User Request:
You are tasked with designing an AI Agent that functions like a professional AWS Cloud Solutions Architect.

### Objective:
Design an AI system capable of taking a high-level product or system request (e.g., “Build an AI-based e-commerce recommendation engine”) and automatically generating:

1. A cloud-native microservices architecture using AWS best practices.
2. A visual 2D diagram of the architecture (exportable as JSON for rendering in a React Flow canvas).
3. Infrastructure-as-Code (IaC) using AWS CDK in TypeScript.
4. Documentation outlining:
   - Service choices
   - Data flow
   - Security, scalability, and cost-optimization rationale

### Responsibilities of the AI Agent:
- Interpret technical problem statements
- Determine the best AWS services to use (e.g., Lambda, ECS, SQS, API Gateway)
- Generate:
   - Architecture JSON structure (for diagram rendering)
   - Complete CDK codebase for infrastructure setup
   - An inter-service dependency map
- Provide metadata for each component:
   - Estimated cost
   - Latency
   - Fault tolerance
   - IAM role requirements

### UI Requirements for This Agent’s Output:
The AI will power an interface that mimics Firebase Studio with:
- A project dashboard with architecture summaries
- A visual diagram editor using React Flow (nodes = services, edges = data flow)
- Clickable nodes that show service metadata
- “Export CDK” and “Deploy to AWS” buttons

### Output Expectations:
- Modular code generation (in TypeScript using AWS CDK)
- JSON-formatted architecture schema for rendering in a 2D canvas
- Markdown or HTML-formatted rationale for architecture decisions
- Suggestions for improvements or cost-cutting

Design this agent so it can be deployed as a backend API or run inside an IDE plugin.

### Final Deliverables:
- The design specs for this AI Agent
- An example prompt and full expected response
- Codebase scaffold if possible (for React Flow + backend)
  