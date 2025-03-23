// src/pages/ResumeUpload.tsx
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { extractTextFromFile } from '../utils/fileExtraction';

const ResumeUpload: React.FC = () => {
  const navigate = useNavigate();
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  
  const uploadResume = useMutation(api.resume.uploadResume);

  const processFile = async (file: File) => {
    try {
      setUploadStatus('loading');
      setProcessingStatus('Reading file...');
      
      // Extract text from the file using our utility
      let extractedText = '';
      try {
        extractedText = await extractTextFromFile(file);
      } catch (error) {
        console.error('Error extracting text:', error);
        throw new Error(
          `Failed to extract text from ${file.name}. Please make sure it's a valid ${file.type} file.`
        );
      }
      
      setProcessingStatus('Processing text...');
      
      // If we succeeded but got no text, show an error
      if (!extractedText.trim()) {
        throw new Error('No text could be extracted from the file. The file might be empty or contain only images.');
      }
      
      setProcessingStatus('Uploading to database...');
      
      // Upload the resume to Convex
      const resumeId = await uploadResume({
        filename: file.name,
        contentType: file.type,
        content: extractedText,
      });
      
      setProcessingStatus('Generating embeddings...');
      setUploadStatus('success');
      
      // Navigate to the resume detail page
      setTimeout(() => {
        navigate(`/resume/${resumeId}`);
      }, 1500);
      
    } catch (error) {
      console.error('Error processing file:', error);
      setUploadStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  };
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      processFile(acceptedFiles[0]);
    }
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    },
    maxFiles: 1,
  });

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Upload Resume</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
          }`}
        >
          <input {...getInputProps()} />
          
          {uploadStatus === 'idle' && (
            <div>
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="mt-2 text-gray-600">
                {isDragActive
                  ? "Drop the resume file here..."
                  : "Drag and drop a resume file, or click to select a file"}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                PDF, DOCX, or TXT files only
              </p>
            </div>
          )}
          
          {uploadStatus === 'loading' && (
            <div>
              <svg
                className="animate-spin mx-auto h-10 w-10 text-blue-500"
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
              <p className="mt-2 text-blue-600">{processingStatus}</p>
              <p className="mt-1 text-sm text-blue-500">
                This may take a moment depending on the file size...
              </p>
            </div>
          )}
          
          {uploadStatus === 'success' && (
            <div>
              <svg
                className="mx-auto h-10 w-10 text-green-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="mt-2 text-green-600">
                Resume uploaded successfully! Redirecting...
              </p>
              <p className="mt-1 text-sm text-green-500">
                Embedding generation will continue in the background.
              </p>
            </div>
          )}
          
          {uploadStatus === 'error' && (
            <div>
              <svg
                className="mx-auto h-10 w-10 text-red-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <p className="mt-2 text-red-600">
                Error uploading resume
              </p>
              {errorMessage && (
                <p className="mt-1 text-sm text-red-500">{errorMessage}</p>
              )}
              <button
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                onClick={() => setUploadStatus('idle')}
              >
                Try Again
              </button>
            </div>
          )}
        </div>
        
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Supported File Types</h3>
          <ul className="list-disc pl-5 text-gray-600 space-y-1">
            <li>PDF documents (.pdf)</li>
            <li>Microsoft Word documents (.docx)</li>
            <li>Plain text files (.txt)</li>
          </ul>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <h4 className="text-md font-medium text-blue-800 mb-2">Tips for Best Results</h4>
            <ul className="list-disc pl-5 text-blue-700 space-y-1 text-sm">
              <li>Use machine-readable PDFs (not scanned images)</li>
              <li>Ensure the resume has clear headings and structure</li>
              <li>If using a DOCX file, avoid complex formatting or tables</li>
              <li>Larger files may take longer to process</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeUpload;