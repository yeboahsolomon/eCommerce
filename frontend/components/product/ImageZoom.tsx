'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, X, Maximize2 } from 'lucide-react';

interface ImageZoomProps {
  images: { url: string; alt?: string }[];
  productName: string;
}

type SlideDirection = 'left' | 'right' | 'none';

export default function ImageZoom({ images, productName }: ImageZoomProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const [showGallery, setShowGallery] = useState(false);
  const [slideDirection, setSlideDirection] = useState<SlideDirection>('none');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [modalImageLoaded, setModalImageLoaded] = useState(false);

  // Pinch-to-zoom state
  const [pinchScale, setPinchScale] = useState(1);
  const [pinchOrigin, setPinchOrigin] = useState({ x: 50, y: 50 });
  const pinchStartDistance = useRef(0);
  const pinchStartScale = useRef(1);

  // Touch/swipe refs
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchDeltaX = useRef(0);
  const isSwiping = useRef(false);

  const imageRef = useRef<HTMLDivElement>(null);
  const modalImageRef = useRef<HTMLDivElement>(null);

  const activeImage = images[activeIndex]?.url || '';

  // --- Image preloading ---
  useEffect(() => {
    if (images.length <= 1) return;
    const preloadIndexes = [
      (activeIndex + 1) % images.length,
      (activeIndex - 1 + images.length) % images.length,
    ];
    preloadIndexes.forEach((idx) => {
      const img = new Image();
      img.src = images[idx]?.url || '';
    });
  }, [activeIndex, images]);

  // --- Navigation helpers ---
  const goToImage = useCallback((index: number, direction: SlideDirection) => {
    setSlideDirection(direction);
    setImageLoaded(false);
    setModalImageLoaded(false);
    setPinchScale(1);
    setActiveIndex(index);
  }, []);

  const prevImage = useCallback(() => {
    goToImage(activeIndex === 0 ? images.length - 1 : activeIndex - 1, 'right');
  }, [activeIndex, images.length, goToImage]);

  const nextImage = useCallback(() => {
    goToImage(activeIndex === images.length - 1 ? 0 : activeIndex + 1, 'left');
  }, [activeIndex, images.length, goToImage]);

  // --- Mouse zoom (desktop) ---
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  }, []);

  const handleMouseEnter = () => setIsZoomed(true);
  const handleMouseLeave = () => setIsZoomed(false);

  // --- Touch swipe handlers ---
  const getTouchDistance = (touches: React.TouchList | TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      // Pinch start
      pinchStartDistance.current = getTouchDistance(e.touches);
      pinchStartScale.current = pinchScale;
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const midX = ((e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left) / rect.width * 100;
      const midY = ((e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top) / rect.height * 100;
      setPinchOrigin({ x: midX, y: midY });
      return;
    }
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDeltaX.current = 0;
    isSwiping.current = false;
  }, [pinchScale]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && showGallery) {
      // Pinch move
      const dist = getTouchDistance(e.touches);
      if (pinchStartDistance.current > 0) {
        const newScale = Math.min(Math.max(pinchStartScale.current * (dist / pinchStartDistance.current), 1), 4);
        setPinchScale(newScale);
      }
      e.preventDefault();
      return;
    }
    if (pinchScale > 1) return; // Don't swipe while zoomed

    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = e.touches[0].clientY - touchStartY.current;
    touchDeltaX.current = deltaX;

    // Only register as a horizontal swipe if the horizontal distance exceeds vertical
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
      isSwiping.current = true;
    }
  }, [showGallery, pinchScale]);

  const handleTouchEnd = useCallback(() => {
    // Reset pinch
    pinchStartDistance.current = 0;

    if (!isSwiping.current || pinchScale > 1) return;
    const threshold = 50;
    if (touchDeltaX.current < -threshold) {
      nextImage();
    } else if (touchDeltaX.current > threshold) {
      prevImage();
    }
    isSwiping.current = false;
    touchDeltaX.current = 0;
  }, [nextImage, prevImage, pinchScale]);

  // --- Keyboard nav & scroll lock ---
  useEffect(() => {
    if (!showGallery) {
      document.body.style.overflow = '';
      return;
    }
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prevImage();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'Escape') setShowGallery(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [showGallery, prevImage, nextImage]);

  // Reset pinch scale when closing modal or changing image
  useEffect(() => {
    if (!showGallery) setPinchScale(1);
  }, [showGallery]);

  // --- CSS Keyframes ---
  const cssAnimations = useMemo(() => `
    @keyframes subtleFade {
      from { opacity: 0.8; transform: scale(0.99); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes slideInLeft {
      from { opacity: 0; transform: translateX(40px) scale(0.97); }
      to { opacity: 1; transform: translateX(0) scale(1); }
    }
    @keyframes slideInRight {
      from { opacity: 0; transform: translateX(-40px) scale(0.97); }
      to { opacity: 1; transform: translateX(0) scale(1); }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .animate-subtle-fade {
      animation: subtleFade 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    .animate-slide-left {
      animation: slideInLeft 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    .animate-slide-right {
      animation: slideInRight 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    .img-skeleton {
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
    .img-skeleton-dark {
      background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
    }
  `, []);

  const getSlideClass = () => {
    if (slideDirection === 'left') return 'animate-slide-left';
    if (slideDirection === 'right') return 'animate-slide-right';
    return 'animate-subtle-fade';
  };

  if (images.length === 0) {
    return (
      <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center text-gray-300">
        <ZoomIn className="h-12 w-12" />
      </div>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: cssAnimations }} />

      <div className="space-y-0">
        {/* Main Image with Zoom */}
        <div
          ref={imageRef}
          className="relative aspect-square bg-slate-100 overflow-hidden cursor-zoom-in group transition-all"
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={() => setShowGallery(true)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Loading skeleton */}
          {!imageLoaded && (
            <div className="absolute inset-0 img-skeleton z-[1]" />
          )}

          <img
            key={`main-${activeIndex}`}
            src={activeImage}
            alt={images[activeIndex]?.alt || productName}
            className={`w-full h-full object-cover transition-opacity duration-300 ${getSlideClass()} ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            draggable={false}
            onLoad={() => setImageLoaded(true)}
          />

          {/* Zoom overlay (desktop only) */}
          {isZoomed && !showGallery && imageLoaded && (
            <div
              className="absolute inset-0 hidden md:block pointer-events-none bg-white z-10"
              style={{
                backgroundImage: `url(${activeImage})`,
                backgroundSize: '250%',
                backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                backgroundRepeat: 'no-repeat',
              }}
            />
          )}

          {/* Expand indicator overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 pointer-events-none" />
          
          {/* Image counter badge */}
          {images.length > 1 && (
            <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-medium z-20 pointer-events-none">
              {activeIndex + 1} / {images.length}
            </div>
          )}

          {/* Expand hint */}
          <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-full flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 pointer-events-none hidden md:flex font-medium z-20">
            <Maximize2 className="h-3.5 w-3.5" />
            Expand
          </div>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-700 rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 z-20"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-700 rounded-full p-2 shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 z-20"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}
        </div>

        {/* Mobile Dot Indicators */}
        {images.length > 1 && (
          <div className="flex justify-center gap-1.5 md:hidden py-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => goToImage(i, i > activeIndex ? 'left' : 'right')}
                className={`rounded-full transition-all duration-300 ${
                  i === activeIndex
                    ? 'w-6 h-2 bg-blue-600'
                    : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'
                }`}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Thumbnails (Desktop) */}
        {images.length > 1 && (
          <div className="hidden md:flex gap-2 overflow-x-auto no-scrollbar px-3 py-3 bg-white border-t border-slate-100">
            {images.map((img, i) => (
              <button
                key={i}
                onMouseEnter={() => goToImage(i, i > activeIndex ? 'left' : 'right')}
                onClick={() => goToImage(i, i > activeIndex ? 'left' : 'right')}
                className={`shrink-0 w-[72px] h-[72px] rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                  i === activeIndex
                    ? 'border-blue-600 ring-2 ring-blue-600/20 shadow-sm'
                    : 'border-slate-200 hover:border-blue-400 opacity-75 hover:opacity-100'
                }`}
              >
                <img
                  src={img.url}
                  alt={img.alt || `${productName} ${i + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ==================== Fullscreen Gallery Modal ==================== */}
      <div 
        className={`fixed inset-0 z-[100] flex flex-col items-center justify-center transition-all bg-black/95 backdrop-blur-md duration-300 ease-out ${
          showGallery ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'
        }`}
        onClick={(e) => {
          // Backdrop click-to-close
          if (e.target === e.currentTarget) setShowGallery(false);
        }}
      >
        <div 
          ref={modalImageRef}
          className={`flex-1 w-full max-w-6xl h-full flex flex-col items-center justify-center relative transition-transform duration-500 ease-out ${
            showGallery ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'
          }`}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={(e) => {
            // Close if clicking the empty space in the inner container
            if (e.target === e.currentTarget) setShowGallery(false);
          }}
        >
          {/* Top Bar Navigation */}
          <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-center z-[110] pointer-events-none">
            <div className="bg-black/50 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-sm font-medium tracking-wide pointer-events-auto">
              {activeIndex + 1} / {images.length}
            </div>
            <button 
              onClick={() => setShowGallery(false)}
              className="text-white bg-black/50 hover:bg-white hover:text-black backdrop-blur-md rounded-full p-2.5 transition-all transform hover:scale-110 pointer-events-auto"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          
          {/* Previous Arrow */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-white hover:text-black backdrop-blur-md rounded-full p-3 md:p-4 transition-all transform hover:scale-110 z-[110]"
            >
              <ChevronLeft className="h-6 w-6 md:h-8 md:w-8" />
            </button>
          )}
          
          {/* Main Display Image */}
          <div
            className="w-full h-[70vh] md:h-[80vh] flex items-center justify-center px-4 md:px-24"
            onClick={(e) => {
              // Backdrop click-to-close if clicking the padded area around the image
              if (e.target === e.currentTarget) setShowGallery(false);
            }}
          >
            {/* Modal loading skeleton */}
            {!modalImageLoaded && (
              <div className="absolute inset-0 m-auto w-[60%] h-[60%] max-w-lg max-h-lg img-skeleton-dark rounded-2xl" />
            )}

            <img
              key={`modal-${activeIndex}`}
              src={activeImage}
              alt={productName}
              className={`max-w-full max-h-full object-contain select-none drop-shadow-2xl transition-opacity duration-200 ${getSlideClass()} ${modalImageLoaded ? 'opacity-100' : 'opacity-0'}`}
              draggable={false}
              onLoad={() => setModalImageLoaded(true)}
              style={{
                transform: pinchScale > 1 ? `scale(${pinchScale})` : undefined,
                transformOrigin: pinchScale > 1 ? `${pinchOrigin.x}% ${pinchOrigin.y}%` : undefined,
                transition: pinchScale === 1 ? 'transform 0.3s ease-out' : 'none',
              }}
            />
          </div>
          
          {/* Next Arrow */}
          {images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-white hover:text-black backdrop-blur-md rounded-full p-3 md:p-4 transition-all transform hover:scale-110 z-[110]"
            >
              <ChevronRight className="h-6 w-6 md:h-8 md:w-8" />
            </button>
          )}

          {/* Modal Dot Indicators (Mobile) */}
          {images.length > 1 && (
            <div className="absolute bottom-20 left-0 right-0 z-[110] md:hidden">
              <div className="flex gap-2 justify-center">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      goToImage(i, i > activeIndex ? 'left' : 'right');
                    }}
                    className={`rounded-full transition-all duration-300 ${
                      i === activeIndex
                        ? 'w-7 h-2.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                        : 'w-2.5 h-2.5 bg-white/40 hover:bg-white/70'
                    }`}
                    aria-label={`Go to image ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* Modal Thumbnails Bottom (Desktop) */}
          {images.length > 1 && (
            <div className="absolute bottom-6 left-0 right-0 z-[110] hidden md:block">
              <div className="flex gap-3 overflow-x-auto justify-center max-w-full px-6 no-scrollbar pb-4 mx-auto w-max">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      goToImage(i, i > activeIndex ? 'left' : 'right');
                    }}
                    className={`shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden border-[3px] transition-all duration-300 ${
                      i === activeIndex
                        ? 'border-white shadow-[0_0_15px_rgba(255,255,255,0.4)] transform -translate-y-2'
                        : 'border-transparent opacity-50 hover:opacity-100 hover:-translate-y-1'
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={img.alt || `${productName} ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

