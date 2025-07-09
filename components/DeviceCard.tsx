
import React from 'react';
import Icon from './Icon';

interface DeviceCardProps {
  name: string;
  isSelf: boolean;
  onClick?: () => void;
  status?: 'online' | 'connected' | 'connecting';
}

const DeviceCard: React.FC<DeviceCardProps> = ({ name, isSelf, onClick, status }) => {
  const getStatusClasses = () => {
    switch (status) {
      case 'connected':
        return 'border-green-500 bg-green-500/10';
      case 'connecting':
        return 'border-yellow-500 bg-yellow-500/10 animate-pulse';
      default:
        return 'border-gray-600 hover:border-blue-500 hover:bg-gray-700/50';
    }
  };

  return (
    <div
      className={`bg-gray-800 p-4 rounded-lg flex flex-col items-center justify-center text-center transition-all duration-300 border-2 ${getStatusClasses()} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="relative mb-3">
        <div className="bg-gray-700 rounded-full p-4">
            <Icon name={isSelf ? "smartphone" : "laptop"} className="text-gray-300" size={48} />
        </div>
        {status === 'connected' && (
            <span className="absolute bottom-0 right-0 block h-4 w-4 rounded-full bg-green-400 ring-2 ring-gray-800"></span>
        )}
      </div>
      <p className="font-semibold text-white truncate w-full">{name}</p>
      <p className="text-sm text-gray-400">{isSelf ? 'This is you' : status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Nearby'}</p>
    </div>
  );
};

export default DeviceCard;
