import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { WebsocketProvider } from 'y-websocket';

interface WebSocketContextType {
  provider: WebsocketProvider | null;
  setProvider: (provider: WebsocketProvider | null) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [provider, setProvider] = React.useState<WebsocketProvider | null>(null);

  return (
    <WebSocketContext.Provider value={{ provider, setProvider }}>
      {children}
    </WebSocketContext.Provider>
  );
}; 