// src/app/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Code, Zap, Server, Cloud, Database, Shield, Cpu, Workflow, GitBranch, Check } from 'lucide-react';

const featurePhrases = [
  "Map a cloud architecture from a prompt",
  "Visualize microservices in real time",
  "Design cloud systems with AI precision",
  "Auto-generate scalable backend blueprints",
  "Prompt → Deployable cloud infra",
  "Diagram your ideas into production-ready systems"
];

export default function HomePage() {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('generating');
  const router = useRouter();
  
  // Rotating loading messages
  useEffect(() => {
    if (!isLoading) return;
    
    const messages = [
      'generating', 
      'building architecture', 
      'connecting services', 
      'optimizing design'
    ];
    
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setLoadingMessage(messages[index]);
    }, 3000);
    
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    console.log("Sending prompt to backend:", prompt);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.id) {
          throw new Error("Backend did not return an architecture ID.");
      }

      router.push(`/architecture/${data.id}`);
    } catch (error: any) {
      console.error("Error generating architecture:", error);
      alert(`Error: ${error.message || "Could not connect to the backend."}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white relative overflow-hidden">
      {/* Metallic background with blue glares */}
      <div className="metallic-background">
        <div className="metallic-overlay"></div>
        <div className="metallic-shimmer"></div>
      </div>
      
      {/* Blue glowing spheres */}
      <div className="luminous-sphere sphere-1"></div>
      <div className="luminous-sphere sphere-2"></div>
      <div className="luminous-sphere sphere-3"></div>
      
      {/* Logo positioned at exactly 15px from top and left */}
     
      
      {/* Main content with top padding to avoid overlapping with the logo */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 relative">
        <div className="max-w-[1100px] w-full mx-auto mt-10 flex flex-col items-center bg-white/10 rounded-2xl p-8 ">
          {/* Div 1: Feature Button */}
          <div className="mb-8 w-full flex justify-center">
            <div className="feature-button-container">
              <Button 
                variant="outline" 
                className="feature-button rounded-full text-sm font-light py-1.5 px-6 text-gray-800 transition-all hover:shadow-md border-0 relative z-1"
              >
                <span className="mr-2 text-blue-500 font-medium">✨</span>
                Cloud architecture to CDK conversion available
              </Button>

              {/* CDK Converter Popup Overlay */}
              <div className="cdk-popup-overlay">
                <div className="cdk-popup-content">
                  <div className="cdk-popup-header">
                    <h2 className="text-xl font-medium text-gray-900 mb-2 flex items-center">
                      <Code className="w-5 h-5 mr-2 text-blue-500" />
                      CloudArc CDK Converter
                    </h2>
                    <p className="text-sm text-gray-600">Transform your architecture diagrams into production-ready infrastructure code</p>
                  </div>

                  <div className="cdk-popup-section">
                    <h3><Code className="w-4 h-4" /> Technical Overview</h3>
                    <p>Our CDK converter performs a sophisticated translation of visual architecture designs into fully deployable AWS CDK code in TypeScript. The process leverages advanced graph analysis algorithms to identify node relationships and service dependencies, ensuring the generated code follows AWS best practices.</p>
                    <p>The converter maps each service node to its corresponding CDK construct, preserving all defined properties, configurations, and connections. It implements proper IAM permissions, networking configurations, and security settings automatically based on your architecture's intent.</p>
                    
                    <div className="cdk-popup-tech-list">
                      <span className="cdk-popup-tech-tag">AWS CDK v2</span>
                      <span className="cdk-popup-tech-tag">TypeScript</span>
                      <span className="cdk-popup-tech-tag">IaC</span>
                      <span className="cdk-popup-tech-tag">CloudFormation</span>
                      <span className="cdk-popup-tech-tag">Graph Analysis</span>
                    </div>
                  </div>

                  <div className="cdk-popup-section">
                    <h3><Zap className="w-4 h-4" /> Key Benefits</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <div className="flex items-start gap-2">
                        <Server className="w-4 h-4 text-blue-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm mb-1">Infrastructure as Code</p>
                          <p className="text-xs">Enables version-controlled, repeatable deployments across environments</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Cloud className="w-4 h-4 text-blue-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm mb-1">Multi-Region Support</p>
                          <p className="text-xs">Generated code includes multi-AZ and regional failover configurations</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Database className="w-4 h-4 text-blue-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm mb-1">Stateful Resource Management</p>
                          <p className="text-xs">Properly handles stateful services with data persistence strategies</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-blue-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm mb-1">Security Best Practices</p>
                          <p className="text-xs">Implements least-privilege IAM policies and security groups</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="cdk-popup-section">
                    <h3><Cpu className="w-4 h-4" /> Conversion Process</h3>
                    <p>The CloudArc system uses a five-step conversion pipeline to transform your architecture design to CDK code:</p>
                    
                    <ol className="ml-5 mt-3 space-y-2 text-sm">
                      <li className="text-gray-700">
                        <span className="font-medium">Graph Analysis:</span> Parses your architecture diagram's nodes and edges to create a directed dependency graph
                      </li>
                      <li className="text-gray-700">
                        <span className="font-medium">Service Mapping:</span> Maps each AWS service to its corresponding CDK construct with appropriate configuration
                      </li>
                      <li className="text-gray-700">
                        <span className="font-medium">Dependency Ordering:</span> Determines the correct order for resource creation to handle cross-service dependencies
                      </li>
                      <li className="text-gray-700">
                        <span className="font-medium">Code Generation:</span> Produces TypeScript CDK code with proper imports, stack definition, and resource configurations
                      </li>
                      <li className="text-gray-700">
                        <span className="font-medium">Validation:</span> Verifies the generated code against AWS CDK best practices and deployment constraints
                      </li>
                    </ol>
                  </div>

                  <div className="cdk-popup-section">
                    <h3><Workflow className="w-4 h-4" /> Development Roadmap</h3>
                    <p>The CloudArc engineering team is actively working on enhancing the CDK converter with these upcoming features:</p>
                    
                    <div className="space-y-3 mt-4">
                      <div className="cdk-popup-roadmap-item">
                        <div className="cdk-popup-roadmap-icon"><Check className="w-3 h-3" /></div>
                        <div>
                          <p className="font-medium text-sm">Multi-language Support</p>
                          <p className="text-xs text-gray-600">Extending beyond TypeScript to support Python, Java, and Go CDK implementations</p>
                        </div>
                      </div>
                      <div className="cdk-popup-roadmap-item">
                        <div className="cdk-popup-roadmap-icon"><Check className="w-3 h-3" /></div>
                        <div>
                          <p className="font-medium text-sm">Cost Estimation Integration</p>
                          <p className="text-xs text-gray-600">Providing deployment cost projections alongside generated CDK code</p>
                        </div>
                      </div>
                      <div className="cdk-popup-roadmap-item">
                        <div className="cdk-popup-roadmap-icon"><Check className="w-3 h-3" /></div>
                        <div>
                          <p className="font-medium text-sm">CI/CD Pipeline Templates</p>
                          <p className="text-xs text-gray-600">Including deployment pipeline templates for GitHub Actions, AWS CodePipeline, and more</p>
                        </div>
                      </div>
                      <div className="cdk-popup-roadmap-item">
                        <div className="cdk-popup-roadmap-icon"><Check className="w-3 h-3" /></div>
                        <div>
                          <p className="font-medium text-sm">Custom Construct Library</p>
                          <p className="text-xs text-gray-600">Building a library of optimized custom CDK constructs for common architecture patterns</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="cdk-popup-footer">
                  <div className="text-xs text-gray-500">Hover away to close this information panel</div>
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs text-gray-600">CloudArc | Latest update: CDK v2.80.0 support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Div 2: Main Heading */}
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl lg:text-4xl font-light text-gray-900 mb-4">
              What do you want to build today?
        </h1>
          </div>

          {/* Div 3: Input Field */}
          <div className="w-full max-w-[800px] mb-8 relative">
            <div className="input-container relative">
              <textarea
          placeholder="Describe the system you want to build on AWS..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-[320px] p-6 text-base border rounded-xl focus:outline-none resize-none bg-white/90 backdrop-blur-sm text-gray-800 font-light shadow-md"
          disabled={isLoading}
        />
              
              <div className="absolute bottom-4 right-4 z-10">
                <button
          onClick={handleGenerate}
          disabled={isLoading || !prompt.trim()}
                  className={`flex items-center justify-center w-10 h-10 rounded-full transition-all bg-blue-500 shadow-sm ${
                    !prompt.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md hover:bg-blue-600'
                  }`}
                  aria-label="Generate Architecture"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <ArrowRight className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>
              
              <div className={`generate-tooltip font-light text-xs text-gray-800 ${isLoading ? 'tooltip-visible' : ''}`}>
                {loadingMessage}<span className="dot-animation"></span>
              </div>
            </div>
          </div>

          {/* Div 4: Feature Phrases - One at a time loop */}
          <div className="text-loop-container my-8 h-8 overflow-hidden text-center w-full">
            <div className="text-loop-wrapper">
              {featurePhrases.map((phrase, index) => (
                <div key={index} className="text-loop-item">
                  <p className="font-extralight text-gray-800 text-sm">{phrase}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-2 relative z-1">
        <div className="max-w-5xl mx-auto px-4">
          <div className="border-t border-gray-200 pt-3 mt-3">
            <p className="text-center text-gray-600 font-extralight text-sm">
              CloudArc since 2025, built by <a href="https://www.linkedin.com/in/zeradamkiflefantaye/" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">Zeradam Fantaye</a>
            </p>
          </div>
      </div>
      </footer>
    </div>
  );
}
