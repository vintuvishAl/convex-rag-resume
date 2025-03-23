// src/utils/fileExtraction.ts
import * as pdfjs from 'pdfjs-dist';
import * as mammoth from 'mammoth';

// Initialize PDF.js worker
// You'll need to provide the worker via import
// import { PDFWorker } from 'pdfjs-dist/build/pdf.worker.entry';
// pdfjs.GlobalWorkerOptions.workerSrc = PDFWorker;

/**
 * Extract text from a PDF file
 * @param file PDF file to extract text from
 * @returns Promise with extracted text
 */
export async function extractPdfText(file: File): Promise<string> {
  try {
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Load PDF document
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    // Extract text from each page
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Join all the text items
      const pageText = textContent.items
        .map((item: pdfjs.TextItem) => item.str)
        .join(' ');
      
      fullText += pageText + '\n\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract text from a DOCX file
 * @param file DOCX file to extract text from
 * @returns Promise with extracted text
 */
export async function extractDocxText(file: File): Promise<string> {
  try {
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Extract text using mammoth
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    return result.value.trim();
  } catch (error) {
    console.error('Error extracting DOCX text:', error);
    throw new Error('Failed to extract text from DOCX');
  }
}

/**
 * Extract text from a plain text file
 * @param file TXT file to extract text from
 * @returns Promise with extracted text
 */
export async function extractTxtText(file: File): Promise<string> {
  try {
    // Read file as text
    const text = await file.text();
    return text.trim();
  } catch (error) {
    console.error('Error reading text file:', error);
    throw new Error('Failed to read text file');
  }
}

/**
 * Extract text from a file based on its type
 * @param file File to extract text from
 * @returns Promise with extracted text
 */
export async function extractTextFromFile(file: File): Promise<string> {
  try {
    if (file.type === 'application/pdf') {
      return await extractPdfText(file);
    } else if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.endsWith('.docx')
    ) {
      return await extractDocxText(file);
    } else if (
      file.type === 'text/plain' ||
      file.name.endsWith('.txt')
    ) {
      return await extractTxtText(file);
    } else {
      throw new Error(`Unsupported file type: ${file.type}`);
    }
  } catch (error) {
    console.error('Error extracting text:', error);
    throw error;
  }
}