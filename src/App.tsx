// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ConvexProvider, ConvexReactClient } from "convex/react";
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import ResumeUpload from './pages/ResumeUpload';
import ResumeDetail from './pages/ResumeDetail';
import QueryInterface from './pages/QueryInterface';

// Initialize the Convex client
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

function App() {
  return (
    <ConvexProvider client={convex}>
      <Router>
        <div className="min-h-screen bg-gray-100">
          <Header />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/upload" element={<ResumeUpload />} />
              <Route path="/resume/:id" element={<ResumeDetail />} />
              <Route path="/query" element={<QueryInterface />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ConvexProvider>
  );
}

export default App;