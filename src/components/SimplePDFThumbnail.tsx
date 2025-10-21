'use client';

import { useEffect, useRef, useState } from 'react';

interface SimplePDFThumbnailProps {
  fileUrl: string;
  fileName: string;
  onClick: () => void;
}

declare global {
  interface Window {
    pdfjsLib: any;
  }
}

export default function SimplePDFThumbnail({ fileUrl, fileName, onClick }: SimplePDFThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pdfJsReady, setPdfJsReady] = useState(false);
  const retryCountRef = useRef(0);

  const loadThumbnail = async () => {
    if (!window.pdfjsLib) {
      console.log('Cannot load thumbnail: pdfjsLib not ready');
      return;
    }
    
    if (!canvasRef.current) {
      if (retryCountRef.current < 50) { // Max 50 retries (5 seconds)
        retryCountRef.current++;
        setTimeout(loadThumbnail, 100);
        return;
      }
      console.log('Cannot load thumbnail: canvas not ready after retries');
      setError(true);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Loading PDF thumbnail from:', fileUrl);
      
      // Fetch the PDF as blob first to avoid CORS issues
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      
      const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      const page = await pdf.getPage(1);
      
      const viewport = page.getViewport({ scale: 0.3 });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Could not get canvas context');
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
      console.log('Thumbnail rendered successfully');
      setLoading(false);
    } catch (err) {
      console.error('Thumbnail error:', err);
      setError(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check if PDF.js is already loaded
    if (window.pdfjsLib) {
      console.log('PDF.js already loaded');
      setPdfJsReady(true);
    } else {
      // Check if script is already being loaded
      const existingScript = document.querySelector('script[src*="pdf.min.js"]');
      if (existingScript) {
        console.log('PDF.js script already loading, waiting...');
        const checkInterval = setInterval(() => {
          if (window.pdfjsLib) {
            console.log('PDF.js now available');
            clearInterval(checkInterval);
            setPdfJsReady(true);
          }
        }, 100);
        return () => clearInterval(checkInterval);
      }
      
      // Load PDF.js from CDN
      console.log('Loading PDF.js from CDN');
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.async = true;
      script.onload = () => {
        console.log('PDF.js script loaded');
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          setPdfJsReady(true);
        }
      };
      script.onerror = (err) => {
        console.error('Failed to load PDF.js:', err);
        setError(true);
        setLoading(false);
      };
      document.body.appendChild(script);
    }
  }, []);

  // Separate effect: trigger loadThumbnail when both canvas and PDF.js are ready
  useEffect(() => {
    if (pdfJsReady && canvasRef.current) {
      console.log('Canvas and PDF.js ready, loading thumbnail');
      retryCountRef.current = 0; // Reset retry count
      loadThumbnail();
    }
  }, [pdfJsReady, fileUrl]);

  return (
    <div 
      onClick={onClick}
      className="cursor-pointer border rounded-lg p-2 hover:shadow-lg transition-shadow bg-gray-50"
    >
      <div className="w-32 h-40 bg-white border rounded flex items-center justify-center overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="text-xs text-gray-400">Wird geladen...</div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="text-center p-2">
              <div className="text-4xl mb-2">📄</div>
              <div className="text-xs text-gray-500">Vorschau nicht verfügbar</div>
            </div>
          </div>
        )}
        <canvas ref={canvasRef} className="max-w-full max-h-full" />
      </div>
      <div className="mt-2 text-xs truncate text-center" title={fileName}>
        {fileName}
      </div>
    </div>
  );
}
