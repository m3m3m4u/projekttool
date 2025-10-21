'use client';

import { useEffect, useRef, useState } from 'react';

interface SimplePDFMultiThumbnailProps {
  fileUrl: string;
  fileName: string;
  onClick: () => void;
  maxPages?: number;
  onDelete?: () => void;
  showDeleteButton?: boolean;
}

declare global {
  interface Window {
    pdfjsLib: any;
    pdfRenderQueue?: Promise<void>;
  }
}

// Global render queue to prevent concurrent rendering across all PDF components
if (typeof window !== 'undefined' && !window.pdfRenderQueue) {
  window.pdfRenderQueue = Promise.resolve();
}

const queueRender = async (renderFn: () => Promise<void>) => {
  if (typeof window === 'undefined') return;

  const currentQueue = window.pdfRenderQueue || Promise.resolve();
  let resolver: () => void;
  window.pdfRenderQueue = new Promise<void>(resolve => {
    resolver = resolve;
  });

  try {
    await currentQueue;
    await renderFn();
  } finally {
    resolver!();
  }
};

export default function SimplePDFMultiThumbnail({ fileUrl, fileName, onClick, maxPages = 5, onDelete, showDeleteButton = false }: SimplePDFMultiThumbnailProps) {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [pdfJsReady, setPdfJsReady] = useState(false);
  const [numPages, setNumPages] = useState(0);

  const generateThumbnails = async () => {
    if (!window.pdfjsLib) {
      console.log('PDF.js not ready');
      return;
    }

    // Use global render queue to prevent concurrent rendering
    await queueRender(async () => {
      try {
        setLoading(true);
        setError(false);
        console.log('Generating thumbnails for:', fileUrl);

        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();

        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        const totalPages = Math.min(pdf.numPages, maxPages);
        setNumPages(totalPages);
        console.log(`Generating ${totalPages} thumbnails...`);

        const generatedThumbnails: string[] = [];

        // Render pages sequentially to avoid cancellation errors
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          try {
            console.log(`Generating thumbnail for page ${pageNum}...`);
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 1.5 });

            // Create a temporary canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!context) {
              throw new Error('Could not get canvas context');
            }

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const renderContext = {
              canvasContext: context,
              viewport: viewport,
            };

            await page.render(renderContext).promise;

            // Convert to data URL
            const dataUrl = canvas.toDataURL('image/png');
            generatedThumbnails.push(dataUrl);
            console.log(`Thumbnail ${pageNum} generated successfully`);
          } catch (err) {
            console.error(`Error generating thumbnail ${pageNum}:`, err);
            // Continue with next page instead of stopping
          }
        }

        setThumbnails(generatedThumbnails);
        setLoading(false);
        console.log(`Generated ${generatedThumbnails.length} thumbnails successfully`);
      } catch (err) {
        console.error('Thumbnail generation error:', err);
        setError(true);
        setLoading(false);
      }
    });
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

  // Generate thumbnails when PDF.js is ready
  useEffect(() => {
    if (pdfJsReady && fileUrl) {
      console.log('PDF.js ready, generating thumbnails');
      generateThumbnails();
    }
  }, [pdfJsReady, fileUrl]);

  return (
    <div className="relative max-w-fit">
      <div
        onClick={onClick}
        className="cursor-pointer border rounded-lg p-2 hover:shadow-lg transition-shadow bg-gray-50"
      >
        <div className="flex flex-wrap gap-1 items-start justify-center">
          {loading && (
            <div className="w-32 h-40 bg-white border rounded flex items-center justify-center">
              <div className="text-xs text-gray-400">Wird geladen...</div>
            </div>
          )}
          {error && (
            <div className="w-32 h-40 bg-white border rounded flex items-center justify-center">
              <div className="text-center p-2">
                <div className="text-4xl mb-2">📄</div>
                <div className="text-xs text-gray-500">Vorschau nicht verfügbar</div>
              </div>
            </div>
          )}
          {!loading && !error && thumbnails.length > 0 && thumbnails.map((thumbnail, i) => (
            <div key={i} className="relative">
              <img
                src={thumbnail}
                alt={`Seite ${i + 1}`}
                className="border rounded shadow-md bg-white hover:shadow-lg hover:border-blue-400 transition-all duration-200"
                style={{ width: '90px', height: 'auto' }}
              />
              <div className="absolute bottom-1 right-1 bg-blue-600 bg-opacity-90 text-white text-xs px-2 py-1 rounded font-medium">
                {i + 1}
              </div>
            </div>
          ))}
          {!loading && !error && thumbnails.length === 0 && (
            <div className="w-32 h-40 bg-white border rounded flex items-center justify-center">
              <div className="text-center p-2">
                <div className="text-4xl mb-2">📄</div>
                <div className="text-xs text-gray-500">Keine Vorschau verfügbar</div>
              </div>
            </div>
          )}
        </div>
        <div className="mt-2 text-sm font-medium text-gray-700 truncate">
          {fileName}
        </div>
      </div>

      {/* Delete button */}
      {showDeleteButton && onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 z-10 flex items-center justify-center"
        >
          ×
        </button>
      )}
    </div>
  );
}