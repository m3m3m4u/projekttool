'use client';

import { useEffect, useRef, useState } from 'react';

interface SimplePDFViewerProps {
  fileUrl: string;
  fileName: string;
  onClose: () => void;
}

declare global {
  interface Window {
    pdfjsLib: any;
    pdfRenderQueue?: Promise<void>;
  }
}

// Use the same global render queue as thumbnails
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

export default function SimplePDFViewer({ fileUrl, fileName, onClose }: SimplePDFViewerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfJsReady, setPdfJsReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1.8);
  const pdfDocRef = useRef<any>(null);
  const renderTasksRef = useRef<any[]>([]);

  const loadPDF = async () => {
    try {
      setLoading(true);
      console.log('Loading PDF from:', fileUrl);
      
      // Fetch the PDF as blob first to avoid CORS issues
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      
      const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      pdfDocRef.current = pdf;
      setNumPages(pdf.numPages);
      console.log('PDF loaded, pages:', pdf.numPages);
      setLoading(false);
      
      // Don't render here, let the useEffect handle it
    } catch (err) {
      console.error('PDF load error:', err);
      setError('Fehler beim Laden der PDF: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler'));
      setLoading(false);
    }
  };

  const renderAllPages = async () => {
    if (!pdfDocRef.current) return;

    // Use global render queue to prevent conflicts with thumbnails
    await queueRender(async () => {
      // Cancel any existing render tasks
      renderTasksRef.current.forEach(task => {
        try {
          if (task && task.cancel) {
            task.cancel();
          }
        } catch (err) {
          // Ignore cancellation errors
        }
      });
      renderTasksRef.current = [];

      try {
        console.log('Rendering all pages...');
      
      // Wait a bit for canvas elements to be ready
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Render each page sequentially
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const canvas = canvasRefs.current[pageNum - 1];
        if (!canvas) {
          console.log(`Canvas ${pageNum} not ready, skipping`);
          continue;
        }

        const page = await pdfDocRef.current.getPage(pageNum);
        
        // Calculate optimal scale based on container width
        const containerWidth = scrollContainerRef.current?.clientWidth || 1000;
        const maxWidth = containerWidth - 80; // Leave some padding
        
        // Get page dimensions at scale 1
        const baseViewport = page.getViewport({ scale: 1 });
        const isLandscape = baseViewport.width > baseViewport.height;
        
        // Calculate scale to use most of the width for landscape, or use set scale for portrait
        let finalScale = scale;
        if (isLandscape) {
          finalScale = Math.min(maxWidth / baseViewport.width, scale * 1.5);
        }
        
        const viewport = page.getViewport({ scale: finalScale });
        const context = canvas.getContext('2d');

        if (!context) {
          console.log(`Context ${pageNum} not available, skipping`);
          continue;
        }

        // Clear canvas first
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Set canvas size
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        console.log(`Rendering page ${pageNum} with size ${viewport.width}x${viewport.height}`);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        // Render and wait for completion
        const renderTask = page.render(renderContext);
        renderTasksRef.current.push(renderTask);
        await renderTask.promise;
        console.log(`Page ${pageNum} rendered successfully with content`);
      }
      
        setLoading(false);
      } catch (err) {
        console.error('Render error:', err);
        setError('Fehler beim Rendern: ' + (err instanceof Error ? err.message : 'Unbekannter Fehler'));
        setLoading(false);
      }
    });
  };

  // Handle scroll to update current page indicator
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    
    const container = scrollContainerRef.current;
    
    // Find which page is most visible
    let mostVisiblePage = 1;
    let maxVisibleArea = 0;
    
    canvasRefs.current.forEach((canvas, index) => {
      if (!canvas) return;
      
      const rect = canvas.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      
      // Calculate visible area of this page
      const visibleTop = Math.max(rect.top, containerRect.top);
      const visibleBottom = Math.min(rect.bottom, containerRect.bottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const visibleArea = visibleHeight * rect.width;
      
      if (visibleArea > maxVisibleArea) {
        maxVisibleArea = visibleArea;
        mostVisiblePage = index + 1;
      }
    });
    
    setCurrentPage(mostVisiblePage);
  };

  useEffect(() => {
    // Check if PDF.js is already loaded
    if (window.pdfjsLib) {
      console.log('PDF.js already loaded');
      setPdfJsReady(true);
      return;
    }

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
      setError('Fehler beim Laden der PDF.js-Bibliothek');
      setLoading(false);
    };
    document.body.appendChild(script);
  }, []);

  // Load PDF when PDF.js is ready
  useEffect(() => {
    if (pdfJsReady && fileUrl) {
      // Wait a bit before loading to ensure DOM is ready
      setTimeout(() => {
        loadPDF();
      }, 200);
    }
    
    // Cleanup on unmount
    return () => {
      renderTasksRef.current.forEach(task => {
        try {
          if (task && task.cancel) {
            task.cancel();
          }
        } catch (err) {
          // Ignore cancellation errors
        }
      });
      renderTasksRef.current = [];
    };
  }, [pdfJsReady, fileUrl]);

  // Re-render all pages when scale changes
  useEffect(() => {
    if (pdfDocRef.current && numPages > 0 && !loading) {
      console.log('Scale changed, re-rendering pages');
      renderAllPages();
    }
  }, [scale]);

  // Ensure rendering happens after DOM is ready
  useEffect(() => {
    if (numPages > 0 && pdfDocRef.current && !loading) {
      console.log('DOM ready, starting render');
      setTimeout(() => {
        renderAllPages();
      }, 300);
    }
  }, [numPages]);

  const goToPage = (pageNum: number) => {
    const canvas = canvasRefs.current[pageNum - 1];
    if (canvas && scrollContainerRef.current) {
      canvas.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) goToPage(currentPage - 1);
  };

  const goToNextPage = () => {
    if (currentPage < numPages) goToPage(currentPage + 1);
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 4));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 1.0));
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  // Handle wheel scroll for zooming when Ctrl is pressed
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      if (e.deltaY > 0) {
        zoomOut();
      } else {
        zoomIn();
      }
    }
    // Normal scrolling is handled by the browser for the scroll container
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        e.preventDefault();
        goToPrevPage();
        break;
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
      case ' ': // Space bar
        e.preventDefault();
        goToNextPage();
        break;
      case 'Home':
        e.preventDefault();
        goToPage(1);
        break;
      case 'End':
        e.preventDefault();
        goToPage(numPages);
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  };

  // Add keyboard event listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentPage, numPages]);



  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
      <div className={`bg-white rounded-lg flex flex-col ${isFullscreen ? 'w-full h-full' : 'max-w-6xl w-full max-h-[95vh] m-4'}`}>
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h3 className="text-lg font-semibold truncate flex-1 mr-4">{fileName}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={zoomOut}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
              title="Verkleinern"
            >
              −
            </button>
            <span className="text-sm min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
            <button
              onClick={zoomIn}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
              title="Vergrößern"
            >
              +
            </button>
            <button
              onClick={toggleFullscreen}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
              title={isFullscreen ? "Vollbild verlassen" : "Vollbild"}
            >
              {isFullscreen ? "⤓" : "⤢"}
            </button>
            <button 
              onClick={onClose} 
              className="text-2xl font-bold hover:text-red-500 ml-2"
              title="Schließen"
            >
              ×
            </button>
          </div>
        </div>

        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          onWheel={handleWheel}
          className="flex-1 overflow-auto p-4 bg-gray-100 relative"
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <div>PDF wird geladen...</div>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 z-10">
              <div className="text-center text-red-500 p-4">
                <div className="text-4xl mb-2">⚠️</div>
                <div>{error}</div>
              </div>
            </div>
          )}
          
          <div className="w-full flex flex-col items-center gap-8 py-4">
            {numPages > 0 && Array.from({ length: numPages }, (_, i) => (
              <div key={i} className="relative">
                <canvas 
                  ref={el => { 
                    canvasRefs.current[i] = el;
                    if (el) {
                      console.log(`Canvas ${i + 1} ref set`);
                    }
                  }}
                  className="shadow-xl border border-gray-400 bg-white block"
                />
                <div className="absolute top-3 left-3 bg-blue-600 bg-opacity-90 text-white text-sm font-medium px-3 py-1 rounded">
                  Seite {i + 1}
                </div>
              </div>
            ))}
          </div>
          
          {/* Navigation hints */}
          {numPages > 1 && !loading && (
            <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
              Kontinuierliches Scrollen | Strg+Scrollen: Zoomen
            </div>
          )}
        </div>

        {numPages > 0 && (
          <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrevPage}
                disabled={currentPage <= 1}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600"
              >
                ← Zurück
              </button>
              <button
                onClick={goToNextPage}
                disabled={currentPage >= numPages}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-600"
              >
                Weiter →
              </button>
            </div>
            <span className="text-sm font-medium">
              Seite {currentPage} von {numPages}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max={numPages}
                value={currentPage}
                onChange={(e) => {
                  const page = parseInt(e.target.value);
                  if (page >= 1 && page <= numPages) {
                    goToPage(page);
                  }
                }}
                className="w-16 px-2 py-1 border rounded text-center text-sm"
                title="Zur Seite springen"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
