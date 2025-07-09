
import React, { useEffect } from 'react';

// This is a type definition for the global lucide object injected by the script.
declare global {
  interface Window {
    lucide: {
      createIcons: () => void;
    };
  }
}

interface IconProps {
  name: string;
  className?: string;
  size?: number;
}

const Icon: React.FC<IconProps> = ({ name, className, size = 24 }) => {
  useEffect(() => {
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }, []);

  // Using React.createElement to avoid TypeScript errors with non-standard `width` and `height` attributes on an `<i>` tag.
  // The lucide.js script expects these attributes to properly size the generated SVG icon.
  return React.createElement('i', {
    'data-lucide': name,
    className,
    width: size,
    height: size,
  });
};

export default Icon;
