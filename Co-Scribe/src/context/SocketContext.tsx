import React, { createContext, useContext, ReactNode } from 'react';
import { Socket } from 'socket.io-client';

// Create a new context for the Socket object
const SocketContext = createContext<Socket | null>(null);

// Custom hook to use the SocketContext
export const useSocket = () => useContext(SocketContext);

// Define the props for SocketProvider including the 'children' prop
interface SocketProviderProps {
  socket: Socket;
  children: ReactNode; // This specifies that the 'children' prop can be React components
}

// Provider component that will wrap your app to provide the socket
export const SocketProvider: React.FC<SocketProviderProps> = ({ socket, children }) => (
  <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
);
