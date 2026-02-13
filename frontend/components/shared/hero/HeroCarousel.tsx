"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

const slides = [
  {
    id: 1,
    image: "https://placehold.co/1200x600/e65100/ffffff?text=Fashion+%26+Style",
    subhead: "Latest Trends in Drobo",
    title: "Look Good, Feel Good",
    desc: "Authentic Ghanaian wear and modern styles delivered to you.",
    cta: "Shop Fashion",
    link: "/products?category=fashion",
    bg: "from-orange-900/80 to-transparent"
  },
  {
    id: 2,
    image: "https://placehold.co/1200x600/1e88e5/ffffff?text=Home+Essentials",
    subhead: "Upgrade Your Home",
    title: "Everything You Need",
    desc: "Quality cookware, appliances, and decor for your family.",
    cta: "Shop Home",
    link: "/products?category=home-kitchen",
    bg: "from-blue-900/80 to-transparent"
  },
  {
    id: 3,
    image: "https://placehold.co/1200x600/2e7d32/ffffff?text=Farm+Supplies",
    subhead: "Grow Your Harvest",
    title: "Farmers' Choice",
    desc: "Seeds, tools, and fertilizers at the best market prices.",
    cta: "Shop Farm Tools",
    link: "/products?category=agriculture",
    bg: "from-green-900/80 to-transparent"
  },
  {
    id: 4,
    image: "https://placehold.co/1200x600/455a64/ffffff?text=Electronics",
    subhead: "Stay Connected",
    title: "Smart Tech Deals",
    desc: "Phones, laptops, and accessories for work and study.",
    cta: "Shop Gadgets",
    link: "/products?category=electronics",
    bg: "from-slate-900/80 to-transparent"
  }
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrent(current === slides.length - 1 ? 0 : current + 1);
  }, [current]);

  const prevSlide = () => {
    setCurrent(current === 0 ? slides.length - 1 : current - 1);
  };

  useEffect(() => {
    if (!isPaused) {
      const interval = setInterval(() => {
        nextSlide();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isPaused, nextSlide]);

  return (
    <div 
      className="relative w-full h-[400px] sm:h-[450px] md:h-[500px] bg-slate-900 rounded-3xl overflow-hidden group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {slides.map((slide, index) => (
        <div 
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${index === current ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
        >
          {/* Image */}
          <div className="absolute inset-0">
             <Image 
               src={slide.image} 
               alt={slide.title}
               fill
               priority={index === 0}
               className="object-cover"
               sizes="(max-width: 768px) 100vw, (max-width: 1200px) 100vw, 1200px"
             />
             {/* Gradient Overlay */}
             <div className={`absolute inset-0 bg-gradient-to-r ${slide.bg} sm:via-transparent sm:to-transparent`}></div>
             <div className="absolute inset-0 bg-black/20 sm:bg-transparent"></div>
          </div>

          {/* Content */}
          <div className="absolute inset-0 flex items-center p-6 sm:p-12 lg:p-16">
            <div className="max-w-xl text-white">
              <span className="inline-block px-3 py-1 mb-4 text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm rounded-full border border-white/20">
                {slide.subhead}
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-4 leading-tight shadow-black/50 drop-shadow-lg">
                {slide.title}
              </h1>
              <p className="text-lg sm:text-xl mb-8 text-slate-100 max-w-sm drop-shadow-md">
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

      {/* Controls */}
      <button 
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/30 backdrop-blur-md text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-6 w-6" />
      </button>

      <button 
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/10 hover:bg-white/30 backdrop-blur-md text-white p-3 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="Next slide"
      >
        <ChevronRight className="h-6 w-6" />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrent(idx)}
            className={`w-2.5 h-2.5 rounded-full transition-all ${idx === current ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/80'}`}
            aria-label={`Go to slide ${idx + 1}`}
          ></button>
        ))}
      </div>
    </div>
  );
}
