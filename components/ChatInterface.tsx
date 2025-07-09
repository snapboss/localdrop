
import React, { useState, useRef, useEffect } from 'react';
import { Peer, DisplayMessage, FileTransfer } from '../types';
import { formatFileSize } from '../utils/helpers';
import Icon from './Icon';

interface ChatInterfaceProps {
  self: Peer;
  peer: Peer;
  messages: DisplayMessage[];
  onSendMessage: (text: string) => void;
  onSendFiles: (files: FileList) => void;
  onDisconnect: () => void;
  fileTransfer: FileTransfer | null;
  onCancelTransfer: () => void;
}

const ChatBubble: React.FC<{ message: DisplayMessage }> = ({ message }) => {
  const isMe = message.sender === 'me';
  
  if (message.type === 'status') {
    return (
      <div className="text-center my-2">
        <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded-full">{message.content}</span>
      </div>
    );
  }

  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-lg my-1 ${isMe ? 'bg-blue-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'}`}>
        {message.type === 'file' ? (
          <div className="flex items-center space-x-3">
            <Icon name="file" className="text-gray-200" size={32} />
            <div>
              <p className="font-semibold break-all">{message.fileName}</p>
              <p className="text-sm text-gray-300">{formatFileSize(message.fileSize ?? 0)}</p>
            </div>
          </div>
        ) : (
          <p className="text-white break-words">{message.content}</p>
        )}
      </div>
    </div>
  );
};

const FileDropzone: React.FC<{ onDrop: (files: FileList) => void }> = ({ onDrop }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onDrop(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`absolute inset-0 bg-gray-900 bg-opacity-90 flex items-center justify-center transition-opacity duration-300 z-10 ${isDragging ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      <div className="text-center p-8 border-4 border-dashed border-blue-500 rounded-xl">
        <Icon name="download-cloud" size={64} className="text-blue-400 mx-auto" />
        <p className="text-2xl font-bold mt-4">Drop files to send</p>
      </div>
    </div>
  );
};


const ChatInterface: React.FC<ChatInterfaceProps> = ({ self, peer, messages, onSendMessage, onSendFiles, onDisconnect, fileTransfer, onCancelTransfer }) => {
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (text.trim()) {
      onSendMessage(text.trim());
      setText('');
    }
  };
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
        onSendFiles(e.target.files);
    }
  };
  
  return (
    <div className="h-screen w-full flex flex-col bg-gray-800 animate-fade-in-up">
      <header className="bg-gray-900 p-4 flex justify-between items-center shadow-md z-20">
        <div className="flex items-center space-x-3">
            <Icon name="laptop" size={32} className="text-green-400" />
            <div>
                <h2 className="font-bold text-white text-lg">{peer.name}</h2>
                <p className="text-sm text-green-400">Connected</p>
            </div>
        </div>
        <button onClick={onDisconnect} className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-700">
            <Icon name="x" size={24} />
        </button>
      </header>

      <main className="flex-1 p-4 overflow-y-auto relative">
        <FileDropzone onDrop={onSendFiles} />
        <div className="space-y-2">
            {messages.map((msg) => (
                <ChatBubble key={msg.id} message={msg} />
            ))}
        </div>
        <div ref={messagesEndRef} />
      </main>
      
      {fileTransfer && fileTransfer.status !== 'complete' && fileTransfer.status !== 'cancelled' && (
        <div className="p-4 bg-gray-900">
            <div className="bg-gray-700 p-3 rounded-lg">
                <div className="flex justify-between items-center mb-1">
                    <p className="text-sm font-semibold truncate max-w-xs">{fileTransfer.name}</p>
                    <p className="text-sm text-gray-400">{fileTransfer.isSender ? 'Sending...' : 'Receiving...'}</p>
                </div>
                <div className="w-full bg-gray-600 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${fileTransfer.progress}%` }}></div>
                </div>
                <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-400">{formatFileSize(fileTransfer.size)}</p>
                    <button onClick={onCancelTransfer} className="text-xs text-red-400 hover:text-red-300">Cancel</button>
                </div>
            </div>
        </div>
      )}

      <footer className="bg-gray-900 p-4 shadow-inner">
        <div className="flex items-center space-x-3">
          <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-gray-700 rounded-full text-gray-300 hover:bg-gray-600 transition-colors" disabled={!!fileTransfer && fileTransfer.status !== 'complete'}>
            <Icon name="paperclip" size={24} />
          </button>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-gray-700 rounded-full py-3 px-5 text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!!fileTransfer && fileTransfer.status !== 'complete'}
          />
          <button onClick={handleSend} className="p-3 bg-blue-600 rounded-full text-white hover:bg-blue-700 transition-colors disabled:bg-gray-600" disabled={!text.trim() || (!!fileTransfer && fileTransfer.status !== 'complete')}>
            <Icon name="send" size={24} />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default ChatInterface;

