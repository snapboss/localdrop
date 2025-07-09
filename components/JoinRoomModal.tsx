
import React, { useState } from 'react';
import Modal from './Modal';
import Icon from './Icon';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (code: string) => void;
  error?: string;
}

const JoinRoomModal: React.FC<JoinRoomModalProps> = ({ isOpen, onClose, onJoin, error }) => {
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onJoin(code.trim());
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Join a Room">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-gray-300">Enter the 5-digit code from the other device.</p>
        <div>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            maxLength={5}
            className="w-full bg-gray-900 text-white text-center text-3xl font-bold p-3 rounded-lg border-2 border-gray-600 focus:border-blue-500 focus:ring-0 outline-none tracking-widest"
            placeholder="12345"
            autoFocus
          />
        </div>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <button
          type="submit"
          disabled={!code.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
        >
          <Icon name="arrow-right" size={20} />
          <span>Join Room</span>
        </button>
      </form>
    </Modal>
  );
};

export default JoinRoomModal;
