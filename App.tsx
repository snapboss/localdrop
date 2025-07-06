
import React, { useState } from 'react';
import { SenderView } from './components/SenderView';
import { ReceiverView } from './components/ReceiverView';
import { LogoIcon } from './components/icons';
import { ViewMode } from './types';

const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.SENDER);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-start p-4 sm:p-6 lg:p-8 font-sans">
      <header className="w-full max-w-5xl mb-8">
        <div className="flex items-center space-x-3">
          <LogoIcon />
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100 tracking-tight">
            LocalDrop
          </h1>
        </div>
        <p className="text-gray-400 mt-1">P2P file sharing on your local network.</p>
      </header>

      <main className="w-full max-w-5xl">
        <div className="mb-6 border-b border-gray-700">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button
              onClick={() => setViewMode(ViewMode.SENDER)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                viewMode === ViewMode.SENDER
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              Send File
            </button>
            <button
              onClick={() => setViewMode(ViewMode.RECEIVER)}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                viewMode === ViewMode.RECEIVER
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              Receive File
            </button>
          </nav>
        </div>

        <div className="bg-gray-800/50 rounded-lg shadow-xl p-6 sm:p-8">
          {viewMode === ViewMode.SENDER ? <SenderView /> : <ReceiverView />}
        </div>
      </main>
      <footer className="w-full max-w-5xl mt-8 text-center text-gray-500 text-xs">
          <p>&copy; {new Date().getFullYear()} LocalDrop. No server, no installation. Just pure peer-to-peer transfer.</p>
      </footer>
    </div>
  );
};

export default App;
