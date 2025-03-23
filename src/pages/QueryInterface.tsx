// src/pages/QueryInterface.tsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

const QueryInterface: React.FC = () => {
  const [searchParams] = useSearchParams();
  const resumeId = searchParams.get('resumeId');
  
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [context, setContext] = useState('');
  const [showContext, setShowContext] = useState(false);
  
  // Get all resumes for the dropdown
  const resumes = useQuery(api.resume.getResumes) || [];
  
  // Get specific resume details if resumeId is provided
  const selectedResume = resumeId 
    ? useQuery(api.resume.getResumeById, { id: resumeId as Id<"resumes"> })
    : null;
  
  // Get the process query action
  const processQuery = useAction(api.query.processQuery);
  
  // Set the selected resume in state when it changes from URL
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(resumeId);
  
  useEffect(() => {
    setSelectedResumeId(resumeId);
  }, [resumeId]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;
    
    setIsLoading(true);
    setResponse('');
    setContext('');
    
    try {
      const result = await processQuery({
        query: query.trim(),
        resumeId: selectedResumeId as Id<"resumes"> | undefined,
      });
      
      setResponse(result.response);
      setContext(result.context);
    } catch (error) {
      console.error('Error processing query:', error);
      setResponse('Sorry, there was an error processing your query. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Query Resumes</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="resumeSelect" className="block text-sm font-medium text-gray-700 mb-1">
              Select Resume (Optional)
            </label>
            <select
              id="resumeSelect"
              value={selectedResumeId || ''}
              onChange={(e) => setSelectedResumeId(e.target.value || null)}
              className="w-full p-2 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Resumes</option>
              {resumes.map((resume) => (
                <option key={resume.id} value={resume.id}>
                  {resume.filename}
                </option>
              ))}
            </select>
            {selectedResume && (
              <div className="mt-2 text-sm text-blue-600">
                <Link to={`/resume/${selectedResume._id}`}>
                  View selected resume
                </Link>
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="queryInput" className="block text-sm font-medium text-gray-700 mb-1">
              Your Question
            </label>
            <textarea
              id="queryInput"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a question about the resume(s)..."
              className="w-full p-3 border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 h-24"
              required
            />
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className={`px-4 py-2 rounded text-white ${
                isLoading || !query.trim()
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              } transition-colors`}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                'Submit'
              )}
            </button>
          </div>
        </form>
      </div>
      
      {response && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Response</h2>
          <div className="prose max-w-none text-gray-700">
            {response.split('\n').map((line, i) => (
              <p key={i}>{line}</p>
            ))}
          </div>
          
          {context && (
            <div className="mt-4">
              <button
                onClick={() => setShowContext(!showContext)}
                className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
              >
                <span>{showContext ? 'Hide' : 'Show'} context from resumes</span>
                <svg
                  className={`ml-1 h-4 w-4 transform ${showContext ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              
              {showContext && (
                <div className="mt-2 bg-gray-50 p-4 rounded border border-gray-200 max-h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-600">
                    {context}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QueryInterface;