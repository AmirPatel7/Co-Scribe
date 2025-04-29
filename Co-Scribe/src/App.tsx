import React from "react";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './components/Login';
import SignUp from './components/SignUp';
import Dashboard from './components/Dashboard';
import Account from './components/Account';
import Project from './components/Project';
import ForgotPassword from './components/ForgotPassword';
import { SocketProvider } from './context/SocketContext';
import { io } from "socket.io-client";

// const socket = io('http://159.203.189.208:3000');
const BASE_URL="http://159.203.189.208"
const socket = io(`${BASE_URL}:3001`, {
  transports: ["websocket"],  // Use WebSocket only, avoid polling
});

const MainLayout: React.FC = () => {

  return (
    <SocketProvider socket={socket}>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/dashboard/all" element={<Dashboard />} />
      <Route path="/account" element={<Account />} />
      <Route path="/project" element={<Project />} />
      <Route path="/ForgotPassword" element={<ForgotPassword />} /> 
    </Routes>
    </SocketProvider>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <MainLayout />
    </Router>
  );
};

export default App;
