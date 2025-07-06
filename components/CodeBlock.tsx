
import React, { useState } from 'react';
import { CopyIcon, CheckIcon } from './icons';

interface CodeBlockProps {
  text: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative bg-gray-900 rounded-md">
      <pre className="p-4 pr-12 overflow-auto text-xs text-gray-300 font-mono">
        <code>{text}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300 hover:text-white transition-colors"
        aria-label="Copy code"
      >
        {copied ? <CheckIcon className="text-green-400" /> : <CopyIcon />}
      </button>
    </div>
  );
};
