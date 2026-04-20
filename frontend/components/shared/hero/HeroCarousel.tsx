"use client";

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';

const slides = [
  {
    id: 1,
    /* Slide 1 — Fashion & Clothing */
    unsplashId: "photo-1483985988355-763728e1935b",
    fallbackColor: "#e65100",
    subhead: "Latest Trends in Drobo",
    title: "Look Good, Feel Good",
    desc: "Authentic Ghanaian wear and modern styles delivered to you.",
    cta: "Shop Fashion",
    link: "/products?category=fashion",
  },
  {
    id: 2,
    /* Slide 2 — Home & Kitchen */
    unsplashId: "photo-1556910103-1c02745aae4d",
    fallbackColor: "#1e88e5",
    subhead: "Upgrade Your Home",
    title: "Everything You Need",
    desc: "Quality cookware, appliances, and decor for your family.",
    cta: "Shop Home",
    link: "/products?category=home-kitchen",
  },
  {
    id: 3,
    /* Slide 3 — Agriculture & Farm */
    unsplashId: "photo-1625246333195-78d9c38ad449",
    fallbackColor: "#2e7d32",
    subhead: "Grow Your Harvest",
    title: "Farmers' Choice",
    desc: "Seeds, tools, and fertilizers at the best market prices.",
    cta: "Shop Farm Tools",
    link: "/products?category=agriculture",
  },
  {
    id: 4,
    /* Slide 4 — Tech & Electronics */
    unsplashId: "photo-1498050108023-c5249f4df085",
    fallbackColor: "#455a64",
    subhead: "Stay Connected",
    title: "Smart Tech Deals",
    desc: "Phones, laptops, and accessories for work and study.",
    cta: "Shop Gadgets",
    link: "/products?category=electronics",
  }
];

interface HeroCarouselProps {
  appendMobileSlide?: React.ReactNode;
}

export default function HeroCarousel({ appendMobileSlide }: HeroCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, dragFree: false }, [
    Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })
  ]);
  
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Check window size to dynamically inject the mobile slide without breaking desktop layout or Embla state
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    
    // Initial check
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((index: number) => emblaApi && emblaApi.scrollTo(index), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
  }, [emblaApi, onSelect]);

  // If appendMobileSlide changes due to window resize, we must force embla to reInit
  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
    }
  }, [isMobile, appendMobileSlide, emblaApi]);

  const showAppendedSlide = isMobile && appendMobileSlide;
  const totalSlides = slides.length + (showAppendedSlide ? 1 : 0);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden group shadow-sm bg-slate-900 isolation-auto">
      <div className="overflow-hidden h-full w-full" ref={emblaRef}>
        <div className="flex touch-pan-y h-full">
          {slides.map((slide, index) => (
            <div 
              key={slide.id}
              className={`relative flex-[0_0_100%] min-w-0 h-[450px] md:h-[500px] slide-bg-${slide.id}`}
            >
              <style dangerouslySetInnerHTML={{ __html: `
                .slide-bg-${slide.id} {
                  background-color: ${slide.fallbackColor};
                  background-image: linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.10) 100%), url('https://images.unsplash.com/${slide.unsplashId}?auto=format&fit=crop&q=80&w=800&h=1000');
                  background-size: cover;
                  background-position: center center;
                  background-attachment: scroll;
                }
                @media (min-width: 768px) {
                  .slide-bg-${slide.id} {
                    background-image: linear-gradient(to right, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.35) 60%, rgba(0,0,0,0.10) 100%), url('https://images.unsplash.com/${slide.unsplashId}?auto=format&fit=crop&q=80&w=1600&h=900');
                  }
                }
              `}} />

              <div className="absolute inset-0 flex items-center p-6 sm:p-12 lg:p-16">
                <div className="max-w-xl text-white">
                  <span className="inline-block px-3 py-1 mb-4 text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm rounded-full border border-white/20 shadow-sm">
                    {slide.subhead}
                  </span>
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight shadow-black/50 drop-shadow-lg text-balance">
                    {slide.title}
                  </h1>
                  <p className="text-lg sm:text-xl mb-8 text-slate-100 max-w-sm drop-shadow-md text-balance">
                    {slide.desc}
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <Link 
                      href={slide.link}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-3.5 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-orange-600/40 hover:-translate-y-1 active:scale-95 flex items-center gap-2"
                    >
                      {slide.cta} <ArrowRight className="h-5 w-5" />
                    </Link>
                    {index === 0 && (
                       <Link 
                       href="/seller/register"
                       className="bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white border border-white/30 px-6 py-3.5 rounded-xl font-bold text-lg transition-all active:scale-95 hidden sm:inline-flex"
                     >
                       Sell Now
                     </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Appended Slide (Mobile Only) */}
          {showAppendedSlide && (
            <div className="relative flex-[0_0_100%] min-w-0 h-[450px]">
              <div className="h-full w-full">
                {appendMobileSlide}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <button 
        onClick={scrollPrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/30 backdrop-blur-md text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 hidden sm:block"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button 
        onClick={scrollNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/30 backdrop-blur-md text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 hidden sm:block"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {Array.from({ length: totalSlides }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => scrollTo(idx)}
            className={`transition-all rounded-full ${
              idx === selectedIndex 
                ? 'bg-white w-6 h-2' 
                : 'bg-white/50 hover:bg-white/80 w-2 h-2'
            }`}
            aria-label={`Go to slide ${idx + 1}`}
          ></button>
        ))}
      </div>
    </div>
  );
}
