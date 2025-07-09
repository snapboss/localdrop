
import React from 'react';
import Modal from './Modal';
import Icon from './Icon';

interface ConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onDecline: () => void;
  title: string;
  message: string;
  confirmText?: string;
  declineText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onConfirm, onDecline, title, message, confirmText = "Accept", declineText = "Decline" }) => {
  return (
    <Modal isOpen={isOpen} onClose={onDecline} title={title}>
      <div className="space-y-6">
        <p className="text-gray-300 text-center">{message}</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onDecline}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
          >
            <Icon name="x" size={20} />
            <span>{declineText}</span>
          </button>
          <button
            onClick={onConfirm}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center space-x-2 transition-colors"
          >
            <Icon name="check" size={20} />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
