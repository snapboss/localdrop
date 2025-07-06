
import React from 'react';

interface ProgressBarProps {
  progress: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  const safeProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="w-full bg-gray-700 rounded-full h-2.5 mt-2 overflow-hidden">
      <div
        className="bg-green-500 h-2.5 rounded-full transition-all duration-300 ease-out"
        style={{ width: `${safeProgress}%` }}
      ></div>
    </div>
  );
};
