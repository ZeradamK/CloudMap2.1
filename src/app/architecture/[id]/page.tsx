// src/app/architecture/[id]/page.tsx
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import ArchitectureDiagram from '@/components/architecture-diagram';
import JarvisChat from '@/components/jarvis-chat';
import { Node, Edge } from 'reactflow';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Menu, X, Download, FileJson, Sparkles } from 'lucide-react';
import { ReactFlowProvider } from 'reactflow';
import dynamic from 'next/dynamic';
import LanguageSelectModal from '@/components/language-select-modal';
// import { useToast } from "@/hooks/use-toast"; // For error feedback
// import { Skeleton } from "@/components/ui/skeleton"; // For loading state

// Add type declarations for modules that don't have type definitions
declare module 'react-syntax-highlighter';
declare module 'react-syntax-highlighter/dist/esm/styles/prism';

// Use dynamic import with no SSR for Monaco Editor
const CdkEditor = dynamic(() => import('@/components/cdk-editor'), {
  ssr: false,
});

interface ArchitectureData {
    nodes: Node[];
    edges: Edge[];
    metadata?: {
        prompt?: string;
        rationale?: string;
        cdkCode?: string;
        cdkLanguage?: string;
        [key: string]: any;
    };
}

// Custom syntax highlighter theme based on light theme
const customSyntaxTheme = {
  ...oneLight,
  'pre[class*="language-"]': {
    ...oneLight['pre[class*="language-"]'],
    background: '#ffffff',
    fontSize: '14px',
    lineHeight: '1.5',
    padding: '1em',
    margin: '0',
    overflow: 'auto',
    borderRadius: '0',
  },
  'code[class*="language-"]': {
    ...oneLight['code[class*="language-"]'],
    fontFamily: 'Monaco, Consolas, "Andale Mono", "Ubuntu Mono", monospace',
    background: '#ffffff',
  },
};

export default function ArchitecturePage() {
  const params = useParams();
  const id = params.id as string;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [architectureData, setArchitectureData] = useState<ArchitectureData | null>(null);
  const [activeTab, setActiveTab] = useState('diagram');
  const [menuOpen, setMenuOpen] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number>(0);
  const [languageSelectOpen, setLanguageSelectOpen] = useState(false);
  const [cdkLanguage, setCdkLanguage] = useState('typescript');
  const [isGeneratingCdk, setIsGeneratingCdk] = useState(false);
  // const { toast } = useToast();

  useEffect(() => {
    if (!id) {
        setError("No architecture ID provided.");
        setIsLoading(false);
        return;
    };

    const fetchArchitecture = async () => {
      setIsLoading(true);
      setError(null);
      setArchitectureData(null); // Clear previous data
      console.log(`Fetching architecture for ID: ${id}`);

      try {
        // --- Actual Backend API Call ---
        const response = await fetch(`/api/architecture/${id}`); // Target Next.js API route

        if (!response.ok) {
           const errorData = await response.json().catch(() => ({}));
           throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }

        const data: ArchitectureData = await response.json();

        // Basic validation of received data
        if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
            throw new Error("Invalid data format received from backend.");
        }

        setArchitectureData(data);

      } catch (fetchError: any) {
        console.error("Error fetching architecture:", fetchError);
        setError(fetchError.message || 'An unknown error occurred while fetching the diagram.');
        // toast({
        //   title: "Loading Failed",
        //   description: fetchError.message || "Could not load the architecture diagram.",
        //   variant: "destructive",
        // });
      } finally {
        setIsLoading(false);
      }
    };

    fetchArchitecture();
  }, [id]); // Re-run effect if the ID changes

  // Setup touch events for tab swiping
  useEffect(() => {
    const tabsElement = tabsRef.current;
    if (!tabsElement) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartXRef.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!e.changedTouches[0]) return;
      
      const touchEndX = e.changedTouches[0].clientX;
      const diff = touchStartXRef.current - touchEndX;
      const threshold = 50; // Minimum swipe distance

      if (Math.abs(diff) < threshold) return;

      const tabs = ['diagram', 'rationale', 'jarvis'];
      if (architectureData?.metadata?.cdkCode) tabs.push('cdk');
      
      const currentIndex = tabs.indexOf(activeTab);
      if (diff > 0 && currentIndex < tabs.length - 1) {
        // Swipe left -> next tab
        setActiveTab(tabs[currentIndex + 1]);
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe right -> previous tab
        setActiveTab(tabs[currentIndex - 1]);
      }
    };

    tabsElement.addEventListener('touchstart', handleTouchStart);
    tabsElement.addEventListener('touchend', handleTouchEnd);

    return () => {
      tabsElement.removeEventListener('touchstart', handleTouchStart);
      tabsElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [activeTab, architectureData?.metadata?.cdkCode]);

  const handleGenerateCdk = async () => {
    setMenuOpen(false); // Close menu after action

    // Open language selection modal instead of immediately generating
    setLanguageSelectOpen(true);
  };

  const handleCdkLanguageSelect = async (language: string) => {
    // Close modal and set language
    setLanguageSelectOpen(false);
    setCdkLanguage(language);
    
    // Set loading state
    setIsGeneratingCdk(true);

    try {
      const response = await fetch('/api/generate-cdk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          architectureId: id,
          language 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate CDK');
      }

      const data = await response.json();
      
      // Refresh architecture data to get updated CDK code
      const refreshResponse = await fetch(`/api/architecture/${id}`);
      if (refreshResponse.ok) {
        const refreshedData = await refreshResponse.json();
        setArchitectureData(refreshedData);
        
        // Switch to CDK tab
        setActiveTab('cdk');
      }
    } catch (error: any) {
      console.error('Error generating CDK:', error);
      alert(`Error generating CDK: ${error.message}`);
    } finally {
      setIsGeneratingCdk(false);
    }
  };

  const handleSaveCdkChanges = async (newCode: string) => {
    if (!id) return;

    const response = await fetch('/api/save-cdk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        architectureId: id,
        cdkCode: newCode,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to save CDK changes');
    }

    // Refresh architecture data
    await refreshArchitecture();
  };

  const handleCdkLanguageChange = (language: string) => {
    if (language === cdkLanguage) return;
    
    // Confirm language change as it will require regenerating the code
    if (confirm(`Changing the language will regenerate your CDK code in ${language}. Any unsaved edits will be lost. Continue?`)) {
      setCdkLanguage(language);
      handleCdkLanguageSelect(language);
    }
  };

  const handleExportArchitecture = () => {
    setMenuOpen(false); // Close menu after action
    if (id) {
      window.open(`/api/export-architecture/${id}`, '_blank');
    }
  };

  const handleDownloadCdk = () => {
    setMenuOpen(false); // Close menu after action
    if (id) {
      window.open(`/api/download-cdk/${id}`, '_blank');
    }
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const refreshArchitecture = async () => {
    if (!id) return;
    
    try {
      const response = await fetch(`/api/architecture/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to refresh architecture data');
      }
      
      const refreshedData = await response.json();
      setArchitectureData(refreshedData);
    } catch (error) {
      console.error('Error refreshing architecture:', error);
    }
  };

  // Process architecture data to populate the rationale sections
  useEffect(() => {
    if (!architectureData || !architectureData.metadata?.rationale) return;
    
    const populateWellArchitectedFramework = () => {
      // Extract insights from the rationale text for each pillar
      const rationale = architectureData.metadata?.rationale || '';
      
      // Helper to extract insights for each pillar
      const extractInsights = (pillar: string, container: string) => {
        const regex = new RegExp(`${pillar}[:\\s]([^#]+)`, 'i');
        const match = rationale.match(regex);
        
        if (match && match[1]) {
          const containerEl = document.querySelector(`.${container}`);
          if (!containerEl) return;
          
          // Extract bullet points or create them from paragraphs
          const text = match[1].trim();
          const points = text.split(/\n- |\n\*/);
          
          if (points.length > 1) {
            // If bullet points exist
            points.forEach((point, index) => {
              if (index === 0 && !point.trim().startsWith('-')) return; // Skip first item if it's not a point
              
              const pointEl = document.createElement('p');
              pointEl.textContent = point.trim().replace(/^- /, '');
              containerEl.appendChild(pointEl);
            });
          } else {
            // If no bullet points, add as paragraphs
            const sentences = text.split(/\.\s+/);
            sentences.forEach(sentence => {
              if (!sentence.trim()) return;
              
              const pointEl = document.createElement('p');
              pointEl.textContent = sentence.trim() + '.';
              containerEl.appendChild(pointEl);
            });
          }
        } else {
          // If specific section not found, use pattern matching to extract relevant insights
          interface KeywordMap {
            [key: string]: string[];
          }
          
          const keywords: KeywordMap = {
            'operational-insights': ['monitoring', 'observability', 'alarm', 'deployment', 'automation', 'pipeline', 'ci/cd'],
            'security-insights': ['security', 'authentication', 'authorization', 'encryption', 'iam', 'compliance', 'firewall', 'waf'],
            'reliability-insights': ['failover', 'redundancy', 'availability', 'disaster recovery', 'backup', 'multi-az', 'resilience'],
            'performance-insights': ['latency', 'throughput', 'caching', 'optimization', 'response time', 'read replica', 'performance'],
            'cost-insights': ['cost', 'budget', 'expense', 'pricing', 'savings', 'reserved', 'spot', 'on-demand'],
            'sustainability-insights': ['sustainability', 'carbon', 'energy', 'efficient', 'waste', 'environment']
          };
          
          if (keywords[container]) {
            const containerEl = document.querySelector(`.${container}`);
            if (!containerEl) return;
            
            const relevantInsights = keywords[container]
              .map((keyword: string) => {
                const regex = new RegExp(`[^.!?]*(?:${keyword})[^.!?]*[.!?]`, 'gi');
                return [...rationale.matchAll(regex)].map(m => m[0]);
              })
              .flat()
              .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i) // Remove duplicates
              .slice(0, 3); // Limit to 3 insights
            
            if (relevantInsights.length > 0) {
              relevantInsights.forEach((insight: string) => {
                const pointEl = document.createElement('p');
                pointEl.textContent = insight.trim();
                containerEl.appendChild(pointEl);
              });
            } else {
              const placeholderEl = document.createElement('p');
              placeholderEl.textContent = `Review the detailed rationale for ${pillar.toLowerCase()} considerations.`;
              containerEl.appendChild(placeholderEl);
            }
          }
        }
      };
      
      // Extract insights for each pillar
      extractInsights('Operational Excellence', 'operational-insights');
      extractInsights('Security', 'security-insights');
      extractInsights('Reliability', 'reliability-insights');
      extractInsights('Performance Efficiency', 'performance-insights');
      extractInsights('Cost Optimization', 'cost-insights');
      extractInsights('Sustainability', 'sustainability-insights');
    };
    
    const populateServicesTable = () => {
      const tableBody = document.querySelector('.service-table-body');
      if (!tableBody || !architectureData.nodes) return;
      
      // Clear existing content
      tableBody.innerHTML = '';
      
      // Add a row for each service
      architectureData.nodes.forEach(node => {
        const row = document.createElement('tr');
        
        // Service column
        const serviceCell = document.createElement('td');
        serviceCell.className = 'px-3 py-2 whitespace-nowrap';
        
        const serviceDiv = document.createElement('div');
        serviceDiv.className = 'flex items-center';
        
        const serviceLabel = document.createElement('div');
        serviceLabel.className = 'ml-2';
        
        const serviceName = document.createElement('div');
        serviceName.className = 'text-sm font-medium text-gray-900';
        serviceName.textContent = node.data.service || 'Unknown Service';
        
        serviceLabel.appendChild(serviceName);
        serviceDiv.appendChild(serviceLabel);
        serviceCell.appendChild(serviceDiv);
        
        // Purpose column
        const purposeCell = document.createElement('td');
        purposeCell.className = 'px-3 py-2';
        
        const purposeText = document.createElement('div');
        purposeText.className = 'text-sm text-gray-500';
        purposeText.textContent = node.data.description || 'No description available';
        
        purposeCell.appendChild(purposeText);
        
        // Cost column
        const costCell = document.createElement('td');
        costCell.className = 'px-3 py-2';
        
        const costText = document.createElement('div');
        costText.className = 'text-sm text-gray-500';
        costText.textContent = node.data.estCost || 'N/A';
        
        costCell.appendChild(costText);
        
        // Fault Tolerance column
        const ftCell = document.createElement('td');
        ftCell.className = 'px-3 py-2';
        
        const ftText = document.createElement('div');
        ftText.className = 'text-sm text-gray-500';
        ftText.textContent = node.data.faultTolerance || 'N/A';
        
        ftCell.appendChild(ftText);
        
        // Add all cells to the row
        row.appendChild(serviceCell);
        row.appendChild(purposeCell);
        row.appendChild(costCell);
        row.appendChild(ftCell);
        
        // Add the row to the table
        tableBody.appendChild(row);
      });
    };
    
    const extractDesignDecisions = () => {
      const decisionContainer = document.querySelector('.decision-points');
      if (!decisionContainer || !architectureData.metadata?.rationale) return;
      
      // Clear existing content
      decisionContainer.innerHTML = '';
      
      // Look for key phrases that indicate design decisions
      const rationale = architectureData.metadata.rationale;
      const decisionPhrases = [
        "decided to", "chosen to", "opted for", "selected", 
        "implemented", "designed", "architecture uses", "architecture includes",
        "key decision"
      ];
      
      let decisions: string[] = [];
      
      // Extract sentences that contain decision phrases
      decisionPhrases.forEach(phrase => {
        const regex = new RegExp(`[^.!?]*(?:${phrase})[^.!?]*[.!?]`, 'gi');
        const matches = [...rationale.matchAll(regex)].map(m => m[0].trim());
        decisions = [...decisions, ...matches];
      });
      
      // Remove duplicates and limit to reasonable number
      decisions = [...new Set(decisions)].slice(0, 5);
      
      if (decisions.length > 0) {
        // Create decision points
        decisions.forEach((decision, index) => {
          const decisionEl = document.createElement('div');
          decisionEl.className = 'mb-4 pb-4 border-b border-gray-100 last:border-0 last:mb-0 last:pb-0';
          
          const decisionNumber = document.createElement('div');
          decisionNumber.className = 'flex items-center mb-2';
          
          const numberBadge = document.createElement('span');
          numberBadge.className = 'flex items-center justify-center bg-blue-100 text-blue-800 text-xs font-medium rounded-full h-5 w-5 mr-2';
          numberBadge.textContent = (index + 1).toString();
          
          const decisionTitle = document.createElement('span');
          decisionTitle.className = 'text-sm font-medium text-gray-700';
          decisionTitle.textContent = `Design Decision`;
          
          decisionNumber.appendChild(numberBadge);
          decisionNumber.appendChild(decisionTitle);
          
          const decisionText = document.createElement('p');
          decisionText.className = 'text-sm text-gray-600 ml-7';
          decisionText.textContent = decision;
          
          decisionEl.appendChild(decisionNumber);
          decisionEl.appendChild(decisionText);
          
          decisionContainer.appendChild(decisionEl);
        });
      } else {
        // If no decisions found, add a placeholder
        const placeholderEl = document.createElement('p');
        placeholderEl.className = 'text-sm text-gray-500 italic';
        placeholderEl.textContent = 'Review the detailed rationale for key design decisions.';
        decisionContainer.appendChild(placeholderEl);
      }
    };
    
    // Call the functions to populate the UI
    setTimeout(() => {
      populateWellArchitectedFramework();
      populateServicesTable();
      extractDesignDecisions();
    }, 100); // Small delay to ensure DOM elements are available
    
  }, [architectureData, activeTab]);

  const renderContent = () => {
    if (isLoading) {
        return (
          <div className="p-4 w-full h-full flex items-center justify-center">
              Loading architecture diagram...
          </div>
        );
    }

    if (error) {
        return (
          <div className="p-4 text-center text-red-600">Error: {error}</div>
        );
    }

    if (!architectureData) {
       return <div className="p-4 text-center">No architecture data found.</div>;
    }

    return (
      <div className="w-full h-full p-4 flex flex-col relative">
        {/* Mobile menu button */}
        <button 
          onClick={toggleMenu}
          className="md:hidden absolute top-4 right-4 z-50 p-2 rounded-full bg-white shadow-md"
          aria-label="Menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Slide-out menu overlay */}
        {menuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setMenuOpen(false)}
          />
        )}

        {/* Mobile slide-out menu */}
        <div className={`fixed top-0 right-0 h-full bg-white shadow-lg z-50 transition-transform duration-300 ease-in-out w-64 transform ${menuOpen ? 'translate-x-0' : 'translate-x-full'} md:hidden`}>
          <div className="p-6 pt-16">
            <h3 className="text-xl font-semibold mb-6">Actions</h3>
            <div className="flex flex-col space-y-4">
              {!architectureData.metadata?.cdkCode ? (
                <button 
                  onClick={handleGenerateCdk} 
                  className="cdk-generate-button flex items-center"
                  disabled={isGeneratingCdk}
                >
                  <span className="button-content">
                    {isGeneratingCdk ? (
                      <>
                        <div className="circular-loader black mr-2" style={{ width: '16px', height: '16px', border: '1.5px solid rgba(0,0,0,0.1)', borderTopColor: 'rgba(0,0,0,0.6)' }}>
                          <div className="circular-loader-dot"></div>
                        </div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileJson className="mr-2 h-4 w-4" />
                        Generate CDK
                      </>
                    )}
                  </span>
                </button>
              ) : (
                <button 
                  onClick={handleDownloadCdk} 
                  className="cdk-generate-button flex items-center"
                >
                  <span className="button-content">
                    <Download className="mr-2 h-4 w-4" />
                    Download CDK
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Header with title and desktop buttons */}
        <div className="mb-4 flex justify-between items-center relative">
          <div>
            <div className="flex items-center">
              <img src="/logo.png" alt="JWS Logo" className="h-12 w-auto mb-2" />
            </div>
            <p className="text-sm text-gray-500 pr-8 md:pr-0">
              Based on: {architectureData.metadata?.prompt?.substring(0, 80)}
              {architectureData.metadata?.prompt && architectureData.metadata.prompt.length > 80 ? "..." : ""}
            </p>
          </div>
          <div className="hidden md:flex absolute" style={{ top: '15px', right: '15px' }}>
            {!architectureData.metadata?.cdkCode ? (
              <button 
                onClick={handleGenerateCdk} 
                className="cdk-generate-button flex items-center"
                disabled={isGeneratingCdk}
              >
                <span className="button-content">
                  {isGeneratingCdk ? (
                    <>
                      <div className="circular-loader black mr-2" style={{ width: '16px', height: '16px', border: '1.5px solid rgba(0,0,0,0.1)', borderTopColor: 'rgba(0,0,0,0.6)' }}>
                        <div className="circular-loader-dot"></div>
                      </div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileJson className="mr-2 h-4 w-4" />
                      Generate CDK
                    </>
                  )}
                </span>
              </button>
            ) : (
              <button 
                onClick={handleDownloadCdk} 
                className="cdk-generate-button flex items-center"
              >
                <span className="button-content">
                  <Download className="mr-2 h-4 w-4" />
                  Download CDK
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Tabs with swipe support */}
        <div ref={tabsRef} className="flex-grow flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col">
            <TabsList className="relative overflow-auto flex justify-start md:justify-center px-1 mb-1">
              <TabsTrigger value="diagram" className="flex-1 md:flex-none">
                Architecture Diagram
              </TabsTrigger>
              <TabsTrigger value="rationale" className="flex-1 md:flex-none">
                Rationale & Docs
              </TabsTrigger>
              <TabsTrigger value="jarvis" className="flex-1 md:flex-none">
                <div className="flex items-center">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  <span>Design with Jarvis</span>
                </div>
              </TabsTrigger>
              {architectureData.metadata?.cdkCode && (
                <TabsTrigger value="cdk" className="flex-1 md:flex-none">
                  CDK Code
                </TabsTrigger>
              )}

              {/* Swipe indicator on mobile */}
              <div className="md:hidden absolute bottom-0 left-0 right-0 flex justify-center pb-1">
                <div className="flex space-x-1">
                  {['diagram', 'rationale', 'jarvis', ...(architectureData.metadata?.cdkCode ? ['cdk'] : [])].map((tab) => (
                    <div 
                      key={tab} 
                      className={`h-1 rounded-full ${activeTab === tab ? 'w-4 bg-blue-500' : 'w-1 bg-gray-200'}`}
                    />
                  ))}
                </div>
              </div>
            </TabsList>
            
            <TabsContent value="diagram" className="flex-grow overflow-auto border rounded-md">
              <div className="h-full overflow-auto">
                <ReactFlowProvider>
                  <ArchitectureDiagram
                    initialNodes={architectureData.nodes ?? []}
                    initialEdges={architectureData.edges ?? []}
                  />
                </ReactFlowProvider>
              </div>
            </TabsContent>
            
            <TabsContent value="rationale" className="flex-grow overflow-auto border rounded-md">
              <div className="h-full overflow-y-auto p-4 md:p-6">
                <div className="max-w-5xl mx-auto">
                  {/* Architecture Summary Panel */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-5 mb-6 border border-blue-100 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-800 mb-3 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                      </svg>
                      Architecture Rationale
                    </h2>
                    <div className="prose max-w-none mb-4">
                      <p className="text-sm text-gray-600 italic border-l-4 border-blue-200 pl-3 py-2 bg-blue-50 rounded-r-md">
                        {architectureData.metadata?.prompt || "Architecture generated with AWS best practices"}
                      </p>
                    </div>
                  </div>

                  {/* Well-Architected Framework Insights */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
                    {/* Operational Excellence */}
                    <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center mb-3">
                        <div className="bg-orange-100 rounded-full p-2 mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-800">Operational Excellence</h3>
                      </div>
                      <div className="pl-10">
                        <div className="text-sm text-gray-600 space-y-2 operational-insights" />
                      </div>
                    </div>

                    {/* Security */}
                    <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center mb-3">
                        <div className="bg-blue-100 rounded-full p-2 mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-800">Security</h3>
                      </div>
                      <div className="pl-10">
                        <div className="text-sm text-gray-600 space-y-2 security-insights" />
                      </div>
                    </div>

                    {/* Reliability */}
                    <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center mb-3">
                        <div className="bg-green-100 rounded-full p-2 mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-800">Reliability</h3>
                      </div>
                      <div className="pl-10">
                        <div className="text-sm text-gray-600 space-y-2 reliability-insights" />
                      </div>
                    </div>

                    {/* Performance Efficiency */}
                    <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center mb-3">
                        <div className="bg-indigo-100 rounded-full p-2 mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-800">Performance Efficiency</h3>
                      </div>
                      <div className="pl-10">
                        <div className="text-sm text-gray-600 space-y-2 performance-insights" />
                      </div>
                    </div>

                    {/* Cost Optimization */}
                    <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center mb-3">
                        <div className="bg-yellow-100 rounded-full p-2 mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 5a1 1 0 012 0v5.17a3.001 3.001 0 101.784 0V5a1 1 0 112 0v5.17a5 5 0 11-5.784 0V5z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-800">Cost Optimization</h3>
                      </div>
                      <div className="pl-10">
                        <div className="text-sm text-gray-600 space-y-2 cost-insights" />
                      </div>
                    </div>

                    {/* Sustainability */}
                    <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center mb-3">
                        <div className="bg-teal-100 rounded-full p-2 mr-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-teal-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1 1h-2a1 1 0 01-1-1v-2a1 1 0 00-1-1H7a1 1 0 00-1 1v2a1 1 0 01-1 1H3a1 1 0 01-1-1V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-medium text-gray-800">Sustainability</h3>
                      </div>
                      <div className="pl-10">
                        <div className="text-sm text-gray-600 space-y-2 sustainability-insights" />
                      </div>
                    </div>
                  </div>

                  {/* Services Overview */}
                  <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 mb-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                      </svg>
                      Services Summary
                    </h3>
                    <div className="services-summary overflow-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Cost</th>
                            <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fault Tolerance</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 service-table-body" />
                      </table>
                    </div>
                  </div>

                  {/* Detailed Rationale Section */}
                  <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 mb-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Detailed Rationale
                    </h3>
                    <div className="prose prose-sm max-w-none detailed-rationale-content">
                      <div dangerouslySetInnerHTML={{ 
                        __html: architectureData.metadata?.rationale 
                          ? enhancedMarkdownToHtml(architectureData.metadata.rationale)
                          : '<p>No detailed rationale provided</p>'
                      }} />
                    </div>
                  </div>

                  {/* Design Decisions */}
                  <div className="bg-white rounded-lg p-5 shadow-sm border border-gray-200 mb-6">
                    <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                      </svg>
                      Key Architecture Decisions
                    </h3>
                    <div className="decision-points" />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="jarvis" className="flex-grow overflow-auto border rounded-md">
              <div className="h-full flex items-center justify-center p-0 md:p-4 overflow-auto">
                <JarvisChat 
                  architectureId={id} 
                  onArchitectureUpdate={refreshArchitecture} 
                />
              </div>
            </TabsContent>
            
            {architectureData.metadata?.cdkCode && (
              <TabsContent value="cdk" className="flex-grow overflow-auto border rounded-md">
                <div className="relative h-full overflow-auto">
                  <CdkEditor
                    code={architectureData.metadata.cdkCode}
                    architectureId={id}
                    language={cdkLanguage || architectureData.metadata.cdkLanguage || 'typescript'}
                    onLanguageChange={handleCdkLanguageChange}
                    onSave={handleSaveCdkChanges}
                  />
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-white overflow-auto">
      <main className="flex-1 overflow-auto">
        {renderContent()}
        
        {/* Language Selection Modal */}
        <LanguageSelectModal
          isOpen={languageSelectOpen}
          onClose={() => setLanguageSelectOpen(false)}
          onSelect={handleCdkLanguageSelect}
        />
      </main>
    </div>
  );
}

// Enhanced markdown to HTML with improved styling and AWS service recognition
function enhancedMarkdownToHtml(markdown: string): string {
  // First, convert special AWS service patterns to temporary placeholders to preserve them
  const awsServicePlaceholders: {[key: string]: string} = {};
  let placeholderIndex = 0;
  
  // Pre-process: Find AWS service patterns and convert to placeholders
  const awsServiceRegex = /\*\*(AWS|Amazon|Lambda|S3|EC2|ECS|EKS|DynamoDB|RDS|CloudFront|API Gateway|VPC|IAM|SNS|SQS|ELB|ALB|NLB|CloudWatch|CloudTrail|Route 53|Aurora|ElastiCache|Kinesis|Fargate|EFS|CodePipeline|CodeBuild|CodeDeploy|CloudFormation|Step Functions|AppSync|Cognito|WAF|[A-Za-z0-9\s]+)\*\*\s*:/g;
  
  const preprocessedMarkdown = markdown.replace(awsServiceRegex, (match) => {
    // Extract service name without asterisks
    let serviceName = match.replace(/\*\*/g, '').replace(/:$/, '').trim();
    const placeholder = `__AWS_SERVICE_${placeholderIndex}__`;
    awsServicePlaceholders[placeholder] = serviceName;
    placeholderIndex++;
    return placeholder + ':';
  });
  
  // Process the markdown with the original converter
  let html = markdownToHtml(preprocessedMarkdown);
  
  // Post-process: Replace placeholders with styled service badges
  Object.keys(awsServicePlaceholders).forEach(placeholder => {
    const serviceName = awsServicePlaceholders[placeholder];
    
    // Choose color for badge based on service type
    let color = 'blue';
    let iconPath = '';
    
    // Determine color based on service category
    if (/S3|EFS|Storage|Backup/.test(serviceName)) {
      color = 'green';
      iconPath = '<path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />';
    } else if (/EC2|Lambda|ECS|EKS|Compute|Fargate/.test(serviceName)) {
      color = 'orange';
      iconPath = '<path d="M5.5 9.75a2.5 2.5 0 10-5 0 2.5 2.5 0 005 0zM11 9.75a2.5 2.5 0 10-5 0 2.5 2.5 0 005 0zM14.25 12a.75.75 0 01.75-.75h4a.75.75 0 01.75.75v4a.75.75 0 01-.75.75h-4a.75.75 0 01-.75-.75v-4zM3.5 16.75a.75.75 0 01-.75-.75v-4a.75.75 0 01.75-.75h4a.75.75 0 01.75.75v4a.75.75 0 01-.75.75h-4zM9 16.75a.75.75 0 01-.75-.75v-4a.75.75 0 01.75-.75h4a.75.75 0 01.75.75v4a.75.75 0 01-.75.75h-4zM3.5 10.75a.75.75 0 01-.75-.75V6a.75.75 0 01.75-.75h4a.75.75 0 01.75.75v4a.75.75 0 01-.75.75h-4z" />';
    } else if (/DynamoDB|RDS|Aurora|Database|ElastiCache/.test(serviceName)) {
      color = 'purple';
      iconPath = '<path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" /><path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" /><path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />';
    } else if (/API Gateway|Route 53|Networking|VPC|ALB|NLB|ELB/.test(serviceName)) {
      color = 'indigo';
      iconPath = '<path d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />';
    } else if (/SNS|SQS|Kinesis|Messaging/.test(serviceName)) {
      color = 'yellow';
      iconPath = '<path fill-rule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clip-rule="evenodd" />';
    } else if (/CloudWatch|CloudTrail|Monitoring|Logging/.test(serviceName)) {
      color = 'teal';
      iconPath = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />';
    } else if (/IAM|Cognito|Security|Authentication|WAF/.test(serviceName)) {
      color = 'red';
      iconPath = '<path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />';
    } else if (/CloudFormation|CodePipeline|CodeBuild|CodeDeploy|DevOps/.test(serviceName)) {
      color = 'gray';
      iconPath = '<path fill-rule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clip-rule="evenodd" />';
    }
    
    // Create a badge with the service name
    const badge = `<div class="inline-flex items-center bg-${color}-50 text-${color}-800 rounded-lg px-3 py-1.5 my-1 mr-2">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-${color}-600" viewBox="0 0 20 20" fill="currentColor">
        ${iconPath}
      </svg>
      <span class="font-medium">${serviceName}</span>:
    </div>`;

    html = html.replace(placeholder + ':', badge);
  });
  
  // Enhance main section headings
  html = html.replace(/<h2>(.*?)<\/h2>/g, (match, title) => {
    return `<h2 class="text-xl font-semibold text-gray-800 mt-8 mb-4 pb-2 border-b border-gray-200">
      <div class="flex items-center">
        <span class="inline-block w-1.5 h-5 bg-blue-500 rounded-full mr-2"></span>
        ${title}
      </div>
    </h2>`;
  });
  
  // Enhance subheadings
  html = html.replace(/<h3>(.*?)<\/h3>/g, (match, title) => {
    // Convert "Scalability:" to a more visually appealing heading
    if (title.endsWith(':')) {
      const cleanTitle = title.substring(0, title.length - 1);
      let iconPath = '';
      let iconColor = 'blue';
      
      // Match icon to heading type
      if (/Scalability/i.test(cleanTitle)) {
        iconPath = '<path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />';
        iconColor = 'green';
      } else if (/Performance|Efficiency/i.test(cleanTitle)) {
        iconPath = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd" />';
        iconColor = 'indigo';
      } else if (/Reliability|Availability/i.test(cleanTitle)) {
        iconPath = '<path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />';
        iconColor = 'green';
      } else if (/Security|Protection|IAM/i.test(cleanTitle)) {
        iconPath = '<path fill-rule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />';
        iconColor = 'red';
      } else if (/Cost|Pricing|Budget/i.test(cleanTitle)) {
        iconPath = '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 5a1 1 0 012 0v5.17a3.001 3.001 0 101.784 0V5a1 1 0 112 0v5.17a5 5 0 11-5.784 0V5z" clip-rule="evenodd" />';
        iconColor = 'yellow';
      } else {
        iconPath = '<path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />';
      }
      
      return `<div class="bg-${iconColor}-50 px-4 py-3 rounded-lg my-5 shadow-sm">
        <h3 class="text-lg font-medium text-${iconColor}-800 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-${iconColor}-600" viewBox="0 0 20 20" fill="currentColor">
            ${iconPath}
          </svg>
          ${cleanTitle}
        </h3>
        <div class="mt-2 pl-7 category-content">`;
    } else {
      return `<h3 class="text-lg font-medium text-gray-700 mt-5 mb-2">${title}</h3>`;
    }
  });
  
  // Close the category content divs
  html = html.replace(/(<\/h3>[\s\S]*?)(?=<div class="bg-[a-z]+-50 px-4 py-3 rounded-lg|<h2|<\/div>$)/g, '$1</div>');
  
  // Add additional styling
  html = html
    // Enhance paragraphs
    .replace(/<p>/g, '<p class="mb-3 text-gray-600">')
    // Enhance code blocks
    .replace(/<pre><code>/g, '<pre class="bg-gray-50 rounded-md p-3 overflow-auto my-4 text-sm font-mono"><code>')
    // Enhance inline code
    .replace(/<code>/g, '<code class="bg-gray-100 text-gray-800 rounded px-1 py-0.5 text-sm font-mono">')
    // Enhance lists
    .replace(/<ul>/g, '<ul class="list-disc pl-5 mb-4 space-y-1 text-gray-600">')
    .replace(/<ol>/g, '<ol class="list-decimal pl-5 mb-4 space-y-1 text-gray-600">');
    
  return html;
}

// Original function remains unchanged
function markdownToHtml(markdown: string): string {
  return markdown
      // Convert headers
      .replace(/## (.*)/g, '<h2>$1</h2>')
      .replace(/### (.*)/g, '<h3>$1</h3>')
      .replace(/#### (.*)/g, '<h4>$1</h4>')
      // Convert lists
      .replace(/\n- (.*)/g, '\n<li>$1</li>')
      .replace(/(<li>.*<\/li>\n)+/g, '<ul>$&</ul>')
      // Convert paragraphs
      .replace(/([^\n]+)\n\n/g, '<p>$1</p>')
      // Convert code blocks
      .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')
      // Convert inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Convert emphasis
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Convert line breaks
      .replace(/\n/g, '<br>');
}
