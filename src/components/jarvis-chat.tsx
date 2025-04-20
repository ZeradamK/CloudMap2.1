"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, RotateCcw, Lightbulb, Copy, Check, Code, Terminal } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface JarvisChatProps {
  architectureId: string;
  onArchitectureUpdate: () => void;
}

export default function JarvisChat({ architectureId, onArchitectureUpdate }: JarvisChatProps) {
  // Instead of initializing with a default welcome message, we'll initialize from localStorage if available
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showExamples, setShowExamples] = useState(true);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Load messages from localStorage when component mounts
  useEffect(() => {
    const loadMessages = () => {
      try {
        // Use architectureId in the key to keep separate chat histories for different architectures
        const savedMessages = localStorage.getItem(`jarvis-chat-${architectureId}`);
        
        if (savedMessages) {
          // Parse the saved JSON string and fix the date objects
          const parsedMessages = JSON.parse(savedMessages, (key, value) => {
            // Convert timestamp strings back to Date objects
            if (key === 'timestamp') return new Date(value);
            return value;
          });
          
          setMessages(parsedMessages);
          // Only show examples if there are no messages
          setShowExamples(parsedMessages.length <= 1);
          return;
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
      }
      
      // If no saved messages or error, initialize with welcome message
      setMessages([{
        id: '1',
        role: 'assistant' as const,
        content: "Hey there! I'm your cloud architecture assistant. I can help design, explain, or modify your AWS architecture. Just let me know what you're working on.",
        timestamp: new Date()
      }]);
    };
    
    loadMessages();
  }, [architectureId]);
  
  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(`jarvis-chat-${architectureId}`, JSON.stringify(messages));
      } catch (error) {
        console.error('Error saving chat history:', error);
      }
    }
  }, [messages, architectureId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Reset copied snippet after 2 seconds
  useEffect(() => {
    if (copiedSnippet) {
      const timer = setTimeout(() => {
        setCopiedSnippet(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedSnippet]);

  // Example prompts to help users
  const examplePrompts = [
    "Add a cache layer to improve performance",
    "Can you explain the security benefits of this architecture?",
    "Add multi-AZ support for high availability",
    "What's the typical cost range for this setup?",
    "How would I implement this S3 bucket with AWS CDK?"
  ];

  const handleExampleClick = (example: string) => {
    setInputValue(example);
    setShowExamples(false);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSnippet(code);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    // Add a placeholder for the assistant response that will show loading state
    const assistantPlaceholder: Message = {
      id: Date.now().toString() + '-placeholder',
      role: 'assistant',
      content: "",
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, assistantPlaceholder]);
    
    try {
      // Send message to backend
      const response = await fetch('/api/jarvis-assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: inputValue,
          architectureId: architectureId,
          messageHistory: messages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response from Jarvis');
      }
      
      const data = await response.json();
      
      // Replace the placeholder with the actual response
      setMessages(prev => {
        // Remove the placeholder message
        const withoutPlaceholder = prev.filter(msg => msg.id !== assistantPlaceholder.id);
        
        // Add the real response
        return [...withoutPlaceholder, {
          id: Date.now().toString() + '-response',
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        }];
      });
      
      // If architecture was updated
      if (data.architectureUpdated) {
        onArchitectureUpdate();
      }
    } catch (error) {
      console.error('Error communicating with Jarvis:', error);
      
      // Replace placeholder with error message
      setMessages(prev => {
        // Remove the placeholder message
        const withoutPlaceholder = prev.filter(msg => msg.id !== assistantPlaceholder.id);
        
        // Add the error message
        return [...withoutPlaceholder, {
          id: Date.now().toString() + '-error',
          role: 'assistant',
          content: 'Sorry, I ran into a problem with that request. Let\'s try a different approach.',
          timestamp: new Date()
        }];
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const clearConversation = () => {
    const newMessages = [{
      id: 'reset',
      role: 'assistant' as const,
      content: "Let's start fresh! What part of the cloud architecture can I help with?",
      timestamp: new Date()
    }];
    
    setMessages(newMessages);
    setShowExamples(true);
    
    // Update localStorage with cleared conversation
    localStorage.setItem(`jarvis-chat-${architectureId}`, JSON.stringify(newMessages));
  };

  // Custom renderer for code blocks in markdown
  const CodeBlock = ({ node, inline, className, children, ...props }: any) => {
    const match = /language-(\w+)/.exec(className || '');
    const code = String(children).replace(/\n$/, '');
    
    if (!inline && match) {
      return (
        <div className="relative rounded-md my-3 bg-gray-50 group overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-50 text-xs text-gray-700 rounded-t-md border-b border-gray-200">
            <div className="flex items-center">
              <Code className="w-3.5 h-3.5 mr-2 text-blue-500" />
              <span className="font-medium">{match[1].toUpperCase()}</span>
            </div>
            <button
              onClick={() => handleCopyCode(code)}
              className="text-gray-500 hover:text-blue-600 transition-colors p-1 rounded hover:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-200"
              aria-label="Copy code"
            >
              {copiedSnippet === code ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <SyntaxHighlighter
            style={oneLight}
            language={match[1]}
            {...props}
            customStyle={{
              margin: 0,
              padding: '12px 16px',
              borderRadius: '0 0 6px 6px',
              background: '#f9fafb',
              fontSize: '0.85rem',
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      );
    }

    return inline ? (
      <code className="px-1 py-0.5 bg-gray-100 rounded text-[0.85em] font-mono text-blue-600" {...props}>
        {children}
      </code>
    ) : (
      <div className="relative rounded-md my-3 bg-gray-50 group overflow-hidden shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-50 text-xs text-gray-700 rounded-t-md border-b border-gray-200">
          <div className="flex items-center">
            <Terminal className="w-3.5 h-3.5 mr-2 text-gray-500" />
            <span className="font-medium">Code</span>
          </div>
          <button
            onClick={() => handleCopyCode(code)}
            className="text-gray-500 hover:text-blue-600 transition-colors p-1 rounded hover:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-200"
            aria-label="Copy code"
          >
            {copiedSnippet === code ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        <div className="p-4 overflow-auto font-mono text-sm bg-gray-50 border-t border-gray-100">
          {code}
        </div>
      </div>
    );
  };
  
  return (
    <div className="flex flex-col h-full jarvis-chat-container w-full mx-auto shadow-sm border rounded-lg overflow-hidden max-w-[1200px]" style={{ maxHeight: 'calc(100vh - 60px)' }}>
      {/* Header with subtle gradient background */}
      <div className="border-b pb-2 px-3 pt-2 flex justify-between items-center bg-gradient-to-r from-gray-50 to-blue-50 flex-shrink-0">
        <div className="flex items-center">
          <div className="flex items-center justify-center h-7 w-7 rounded-full bg-blue-500 bg-opacity-10 mr-2">
            <Sparkles className="text-blue-500 h-3.5 w-3.5" />
          </div>
          <h3 className="font-medium text-sm text-gray-700">Jarvis<span className="text-blue-500">.</span></h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">AI Assistant</span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearConversation}
            className="h-7 w-7 p-0 transition-all flex items-center justify-center"
          >
            <RotateCcw 
              className="h-3 w-3 text-gray-500 metallic-blue-icon transition-all duration-300 hover:-rotate-45 transform" 
            />
          </Button>
        </div>
      </div>
      
      {/* Messages area with custom scrollbar */}
      <div className="flex-grow overflow-y-auto px-4 py-4 chat-messages-container bg-gradient-to-b from-white to-gray-50" style={{ minHeight: '300px', height: 'calc(100% - 130px)' }}>
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`mb-6 last:mb-2 ${message.role === 'user' ? 'flex justify-end' : ''}`}
          >
            {message.role === 'assistant' && (
              <div className="flex mb-2 ml-1">
                <div className={`h-6 w-6 rounded-full bg-white flex items-center justify-center text-black text-xs font-medium transition-all ${
                  isLoading && message.content === "" ? 'j-profile-loader shadow-md' : 'border border-gray-200 hover:border-blue-300'
                }`}>
                  {!(isLoading && message.content === "") && 'J'}
                </div>
                <span className="text-xs text-gray-500 ml-2 self-end mb-0.5">Jarvis</span>
              </div>
            )}
            
            <div className={`max-w-[85%] shadow-sm transition-all ${
              message.role === 'user' 
                ? 'bg-white text-gray-800 rounded-2xl rounded-tr-sm px-4 py-2 border border-gray-200 hover:shadow-md' 
                : 'bg-white rounded-2xl rounded-tl-sm px-1 py-1'
            }`} style={message.role === 'user' ? {borderWidth: '0.1px'} : {}}>
              {message.role === 'user' ? (
                <p className="text-sm">{message.content}</p>
              ) : message.content ? (
                <div className="jarvis-markdown text-sm px-3 py-1.5 text-gray-800">
                  <ReactMarkdown
                    components={{
                      code: CodeBlock,
                      h1: ({node, ...props}) => <h1 className="text-lg font-semibold mt-3 mb-2 text-gray-900 border-b border-gray-200 pb-1" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-base font-semibold mt-3 mb-2 text-gray-800" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-sm font-semibold mt-2 mb-1 text-gray-700" {...props} />,
                      p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1" {...props} />,
                      li: ({node, ...props}) => <li className="text-sm" {...props} />,
                      a: ({node, ...props}) => <a className="text-blue-600 hover:underline hover:text-blue-700 transition-colors" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-blue-300 pl-4 italic my-2 text-gray-600 bg-blue-50 bg-opacity-30 py-1 rounded-sm" {...props} />,
                      table: ({node, ...props}) => <div className="overflow-x-auto my-3 rounded border border-gray-200"><table className="min-w-full divide-y divide-gray-200" {...props} /></div>,
                      thead: ({node, ...props}) => <thead className="bg-gray-100" {...props} />,
                      tbody: ({node, ...props}) => <tbody className="divide-y divide-gray-200" {...props} />,
                      th: ({node, ...props}) => <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider" {...props} />,
                      td: ({node, ...props}) => <td className="px-3 py-2 text-sm border-r last:border-r-0 border-gray-200" {...props} />,
                      tr: ({node, ...props}) => <tr className="hover:bg-gray-50 transition-colors" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-gray-800" {...props} />,
                      em: ({node, ...props}) => <em className="italic text-gray-700" {...props} />,
                      hr: ({node, ...props}) => <hr className="my-3 border-t border-gray-200" {...props} />,
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="px-3 py-3 text-gray-500 text-sm flex items-center">
                  <span>Thinking...</span>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {/* Example prompts with enhanced styling */}
        {showExamples && messages.length < 2 && (
          <div className="mt-4 mb-2">
            <div className="flex items-center mb-3">
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 mr-2">
                <Lightbulb className="text-amber-500 h-3.5 w-3.5" />
              </div>
              <p className="text-sm font-medium text-gray-700">Try asking about:</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {examplePrompts.map((example, index) => (
                <button
                  key={index}
                  className="jarvis-suggestion-card text-left text-sm bg-white rounded-xl px-4 py-3 hover:bg-blue-50 transition-all border border-gray-200 shadow-sm hover:shadow hover:border-blue-200"
                  onClick={() => handleExampleClick(example)}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area with improved styling */}
      <div className="mt-auto px-4 pb-4 pt-2 flex-shrink-0" style={{ maxHeight: '220px' }}>
        <div className="relative border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow transition-shadow">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about AWS architecture or how to implement services..."
            className="w-full resize-none rounded-xl pt-3 pb-9 px-4 min-h-[70px] max-h-40 text-sm focus:outline-none"

            disabled={isLoading}
          />
          <div className="absolute bottom-2 right-2">
            <Button
              className={`rounded-full h-8 w-8 flex items-center justify-center transition-all ${
                !inputValue.trim() || isLoading 
                  ? 'opacity-50 bg-gray-400' 
                  : 'bg-blue-100 hover:bg-blue-200 shadow-sm hover:shadow'
              }`}
              disabled={!inputValue.trim() || isLoading}
              onClick={handleSendMessage}
              variant="default"
            >
              {isLoading ? (
                <div className="j-profile-loader" style={{ 
                  width: '16px', 
                  height: '16px', 
                  borderTopColor: 'white',
                  borderRightColor: 'rgba(255, 255, 255, 0.3)',
                  borderBottomColor: 'rgba(255, 255, 255, 0.3)',
                  borderLeftColor: 'rgba(255, 255, 255, 0.3)'
                }}></div>
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 