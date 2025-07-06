
import React, { useCallback, useRef } from 'react';
import { UploadIcon } from './icons';

interface FileSelectorProps {
  onFileSelect: (file: File) => void;
}

export const FileSelector: React.FC<FileSelectorProps> = ({ onFileSelect }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('border-indigo-500', 'bg-gray-700/50');
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('border-indigo-500', 'bg-gray-700/50');
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('border-indigo-500', 'bg-gray-700/50');
    const file = event.dataTransfer.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex justify-center items-center w-full px-6 py-12 border-2 border-gray-600 border-dashed rounded-md cursor-pointer hover:border-gray-500 transition-colors duration-200"
    >
      <div className="text-center">
        <UploadIcon className="mx-auto text-gray-500" />
        <p className="mt-4 text-lg font-semibold text-gray-300">
          Drop a file or <span className="text-indigo-400">click to browse</span>
        </p>
        <p className="mt-1 text-sm text-gray-500">
          Your file will be sent directly to the other peer.
        </p>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};
