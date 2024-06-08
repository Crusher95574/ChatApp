// App.js
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { SocketProvider } from './context/SocketContext';

function App() {
  return (
    <>
      <Toaster />
      <SocketProvider>
        <main>
          <Outlet />
        </main>
      </SocketProvider>
    </>
  );
}

export default App;
