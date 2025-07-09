
import React, { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import Icon from './Icon';

// This is a type definition for the global QRCode object injected by the script.
declare global {
  interface Window {
    QRCode: {
      toCanvas: (canvas: HTMLCanvasElement, text: string, options: object, callback: (error: Error | null) => void) => void;
    };
  }
}

interface RoomCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
}

const RoomCodeModal: React.FC<RoomCodeModalProps> = ({ isOpen, onClose, roomCode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/#${roomCode}`;

  useEffect(() => {
    if (isOpen && roomCode && canvasRef.current) {
      window.QRCode.toCanvas(canvasRef.current, shareUrl, { width: 220, margin: 2, color: { dark: '#FFFFFF', light: '#374151' } }, (error) => {
        if (error) console.error('QRCode generation failed:', error);
      });
    }
  }, [isOpen, roomCode, shareUrl]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Share This Room">
      <div className="flex flex-col items-center space-y-4 text-center">
        <p className="text-gray-300">Ask the other person to enter this code or scan the QR code to connect.</p>
        
        <div className="bg-gray-700 p-2 rounded-lg">
          <canvas ref={canvasRef} />
        </div>

        <div className="bg-gray-900 p-3 rounded-lg w-full flex items-center justify-between">
            <span className="text-3xl font-bold tracking-widest text-white">{roomCode}</span>
            <button
              onClick={() => copyToClipboard(roomCode)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Icon name={copied ? 'check' : 'copy'} size={18} />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
        </div>
        
        <p className="text-gray-400 text-sm">Waiting for peer to connect...</p>
      </div>
    </Modal>
  );
};

export default RoomCodeModal;
