// src/pages/Dashboard.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

const Dashboard: React.FC = () => {
  const resumes = useQuery(api.resume.getResumes) || [];
  const recentQueries = useQuery(api.query.getRecentQueries, { limit: 5 }) || [];

  return (
    <div className="space-y-8">
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Recent Resumes</h2>
          <Link 
            to="/upload" 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Upload New Resume
          </Link>
        </div>
        
        {resumes.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <p className="text-gray-500">No resumes uploaded yet.</p>
            <Link 
              to="/upload"
              className="inline-block mt-4 text-blue-600 hover:underline"
            >
              Upload your first resume
            </Link>
          </div>
        ) : (
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Filename
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {resumes.map((resume) => (
                  <tr key={resume.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {resume.filename}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(resume.uploadedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <Link 
                        to={`/resume/${resume.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        View
                      </Link>
                      <Link 
                        to={`/query?resumeId=${resume.id}`}
                        className="text-green-600 hover:text-green-900"
                      >
                        Query
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Recent Queries</h2>
        
        {recentQueries.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <p className="text-gray-500">No queries made yet.</p>
            <Link 
              to="/query"
              className="inline-block mt-4 text-blue-600 hover:underline"
            >
              Start asking questions
            </Link>
          </div>
        ) : (
          <div className="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200">
            {recentQueries.map((q) => (
              <div key={q._id} className="p-4">
                <p className="text-sm font-semibold text-gray-700">Q: {q.query}</p>
                <p className="text-sm text-gray-600 mt-1">A: {q.response.substring(0, 150)}...</p>
                <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
                  <span>{new Date(q.createdAt).toLocaleString()}</span>
                  {q.resumeId && (
                    <Link 
                      to={`/resume/${q.resumeId}`}
                      className="text-blue-600 hover:underline"
                    >
                      View Resume
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;