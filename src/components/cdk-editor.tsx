import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Download, 
  Copy, 
  Check, 
  Code, 
  Save, 
  RefreshCw
} from 'lucide-react';
import Editor from '@monaco-editor/react';

interface CdkEditorProps {
  code: string;
  architectureId: string;
  language: string;
  onLanguageChange: (language: string) => void;
  onSave?: (newCode: string) => Promise<void>;
}

export default function CdkEditor({ 
  code, 
  architectureId, 
  language, 
  onLanguageChange,
  onSave
}: CdkEditorProps) {
  const [editorCode, setEditorCode] = useState(code);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const editorRef = useRef<any>(null);

  // Update local code when prop changes
  useEffect(() => {
    setEditorCode(code);
    setIsDirty(false);
  }, [code]);

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (isCopied) {
      const timeout = setTimeout(() => {
        setIsCopied(false);
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isCopied]);

  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
    // Focus editor when mounted in edit mode
    if (isEditing) {
      editor.focus();
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(editorCode);
    setIsCopied(true);
  };

  const handleDownloadCode = () => {
    // Create file extension based on language
    const extension = language === 'typescript' ? 'ts' : 
                      language === 'python' ? 'py' : 
                      language === 'java' ? 'java' : 
                      language === 'csharp' ? 'cs' : 'js';
    
    const blob = new Blob([editorCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `architecture-${architectureId}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveCode = async () => {
    if (!onSave || !isDirty) return;
    
    setIsSaving(true);
    try {
      await onSave(editorCode);
      setIsDirty(false);
    } catch (error) {
      console.error('Error saving CDK code:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
    // Focus the editor when switching to edit mode
    if (!isEditing && editorRef.current) {
      setTimeout(() => editorRef.current.focus(), 100);
    }
  };

  // Available programming languages
  const languages = [
    { value: 'typescript', label: 'TypeScript' },
    { value: 'javascript', label: 'JavaScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'csharp', label: 'C#' }
  ];

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
        <div className="flex items-center space-x-2">
          <Code className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium">CDK Code</span>
          
          {/* Language selector */}
          <select 
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="ml-4 text-xs bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {languages.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center space-x-2">
          {isDirty && (
            <span className="text-xs text-amber-600 mr-2">
              • Unsaved changes
            </span>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleEditMode}
            className="h-7 text-xs"
          >
            {isEditing ? 'View Mode' : 'Edit Mode'}
          </Button>
          
          {isEditing && onSave && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleSaveCode}
              disabled={!isDirty || isSaving}
              className="h-7 text-xs"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-3 w-3 mr-1" />
                  Save
                </>
              )}
            </Button>
          )}
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCopyCode}
            className="h-7 w-7 p-0"
          >
            {isCopied ? (
              <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDownloadCode}
            className="h-7 w-7 p-0"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      {/* Editor */}
      <div className="flex-grow overflow-hidden">
        <Editor
          height="100%"
          defaultLanguage={language}
          language={language}
          value={editorCode}
          onChange={(value) => {
            setEditorCode(value || '');
            setIsDirty(value !== code);
          }}
          onMount={handleEditorDidMount}
          options={{
            readOnly: !isEditing,
            minimap: { enabled: true },
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto'
            },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, 'Courier New', monospace",
            cursorBlinking: 'smooth',
            lineNumbers: 'on',
            renderLineHighlight: 'all',
            roundedSelection: true,
            selectOnLineNumbers: true,
            quickSuggestions: true,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            colorDecorators: true,
            linkedEditing: true,
            bracketPairColorization: { enabled: true }
          }}
          theme="light"
        />
      </div>
    </div>
  );
} 