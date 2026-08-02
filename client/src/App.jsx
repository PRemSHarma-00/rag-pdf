import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import { Sun, Moon } from 'lucide-react';

function App() {
  const [documents, setDocuments] = useState([]);
  const [theme, setTheme] = useState('light');
  
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  useEffect(() => {
    fetchDocuments();
    // set initial theme
    document.documentElement.setAttribute('data-theme', theme);
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/documents`);
      const data = await response.json();
      if (data.documents) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <div className="app">
      <Sidebar documents={documents} onRefresh={fetchDocuments} apiUrl={apiUrl} />
      
      <main className="chat-main">
        <header className="topbar">
          <h1>RAG PDF Engine</h1>
          <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </header>
        <ChatInterface apiUrl={apiUrl} />
      </main>
    </div>
  );
}

export default App;
