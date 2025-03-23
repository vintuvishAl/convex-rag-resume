// src/pages/ResumeDetail.tsx
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

const ResumeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Get resume details
  const resume = useQuery(api.resume.getResumeById, { id: id! });
  
  // Delete resume mutation
  const deleteResume = useMutation(api.resume.deleteResume);
  
  // Handle deleting a resume
  const handleDelete = async () => {
    if (!id) return;
    
    try {
      await deleteResume({ id });
      // Navigate back to dashboard after successful deletion
      window.location.href = '/';
    } catch (error) {
      console.error('Error deleting resume:', error);
    }
  };
  
  if (!resume) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">{resume.filename}</h1>
        
        <div className="flex space-x-3">
          <Link 
            to={`/query?resumeId=${id}`}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Ask Questions
          </Link>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Resume Details</h2>
          <p><span className="font-medium">Uploaded:</span> {new Date(resume.uploadedAt).toLocaleString()}</p>
          <p><span className="font-medium">File Type:</span> {resume.contentType}</p>
        </div>
        
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Resume Content</h2>
          <div className="mt-2 bg-gray-50 p-4 rounded border border-gray-200 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800">
              {resume.content}
            </pre>
          </div>
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Delete Resume</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this resume? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResumeDetail;