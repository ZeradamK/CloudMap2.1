import React from 'react';
import { Button } from "@/components/ui/button";
import { 
  X, 
  Code,
  FileCode,
  CheckCircle2
} from 'lucide-react';

interface LanguageOption {
  value: string;
  label: string;
  icon: JSX.Element;
  description: string;
}

interface LanguageSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (language: string) => void;
}

export default function LanguageSelectModal({ 
  isOpen, 
  onClose, 
  onSelect 
}: LanguageSelectModalProps) {
  if (!isOpen) return null;

  const languages: LanguageOption[] = [
    {
      value: 'typescript',
      label: 'TypeScript',
      icon: <FileCode className="h-6 w-6 text-blue-500" />,
      description: 'Strongly typed JavaScript with full AWS CDK support'
    },
    {
      value: 'javascript',
      label: 'JavaScript',
      icon: <FileCode className="h-6 w-6 text-yellow-500" />,
      description: 'Dynamic language with wide adoption and AWS CDK support'
    },
    {
      value: 'python',
      label: 'Python',
      icon: <FileCode className="h-6 w-6 text-green-600" />,
      description: 'Easy to read syntax with AWS CDK support'
    },
    {
      value: 'java',
      label: 'Java',
      icon: <FileCode className="h-6 w-6 text-red-500" />,
      description: 'Enterprise-grade language with AWS CDK support'
    },
    {
      value: 'csharp',
      label: 'C#',
      icon: <FileCode className="h-6 w-6 text-purple-600" />,
      description: '.NET language with strong AWS integration'
    }
  ];

  const handleLanguageSelect = (language: string) => {
    onSelect(language);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center space-x-2">
            <Code className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-medium">Select CDK Language</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            Choose the programming language for your AWS CDK code. Your architecture will be converted
            to infrastructure as code in your preferred language.
          </p>
          
          <div className="space-y-2">
            {languages.map((lang) => (
              <button
                key={lang.value}
                onClick={() => handleLanguageSelect(lang.value)}
                className="w-full text-left p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors group flex items-start space-x-3"
              >
                <div className="mt-0.5">{lang.icon}</div>
                <div className="flex-grow">
                  <div className="font-medium group-hover:text-blue-600">{lang.label}</div>
                  <div className="text-sm text-gray-500">{lang.description}</div>
                </div>
                <div className="opacity-0 group-hover:opacity-100">
                  <CheckCircle2 className="h-5 w-5 text-blue-500" />
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t p-4 bg-gray-50 flex justify-end">
          <Button variant="outline" onClick={onClose} className="mr-2">
            Cancel
          </Button>
          <Button variant="default" onClick={() => handleLanguageSelect('typescript')}>
            Use TypeScript (Default)
          </Button>
        </div>
      </div>
    </div>
  );
} 