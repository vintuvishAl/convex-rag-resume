// src/components/Header.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const Header: React.FC = () => {
  return (
    <header className="bg-blue-600 text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">Resume Analyzer</Link>
        <nav>
          <ul className="flex space-x-6">
            <li>
              <Link to="/" className="hover:text-blue-200 transition-colors">
                Dashboard
              </Link>
            </li>
            <li>
              <Link to="/upload" className="hover:text-blue-200 transition-colors">
                Upload Resume
              </Link>
            </li>
            <li>
              <Link to="/query" className="hover:text-blue-200 transition-colors">
                Query Resumes
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;