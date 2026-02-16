"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Truck, ShieldCheck, Phone, CheckCircle } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { cn } from '@/lib/utils'; // Assuming utils exists, if not I will fix it next

const badges = [
  {
    icon: Truck,
    text: "Free Delivery in Jaman South",
    subtext: "Orders over GH₵50",
    color: "text-blue-600 bg-blue-50 border-blue-100"
  },
  {
    icon: ShieldCheck, 
    text: "MoMo Payment Accepted",
    subtext: "Pay on Delivery Available",
    color: "text-yellow-600 bg-yellow-50 border-yellow-100"
  },
  {
    icon: CheckCircle,
    text: "100% Genuine Products",
    subtext: "Verified Sellers Only",
    color: "text-green-600 bg-green-50 border-green-100"
  },
  {
    icon: Phone,
    text: "Support in Twi & English",
    subtext: "055 123 4567",
    color: "text-purple-600 bg-purple-50 border-purple-100"
  }
];

export default function TrustBadges() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ 
    loop: true, 
    align: 'start',
    breakpoints: {
      '(min-width: 640px)': { active: false }
    }
  }, [
    Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true })
  ]);

  const [selectedIndex, setSelectedIndex] = useState(0);

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

  const scrollTo = useCallback((index: number) => {
    if (emblaApi) emblaApi.scrollTo(index);
  }, [emblaApi]);

  return (
    <div className="w-full py-2">
      {/* Mobile: Carousel | Desktop: Grid */}
      <div className="overflow-hidden sm:overflow-visible" ref={emblaRef}>
        <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-0 sm:gap-4 touch-pan-y">
          {badges.map((badge, index) => (
            <div 
              key={index} 
              className="flex-[0_0_85%] min-w-0 sm:flex-none pl-4 sm:pl-0 first:pl-4 sm:first:pl-0 last:pr-4 sm:last:pr-0"
            >
              <div className={`h-full flex items-center gap-3 p-3 rounded-xl border ${badge.color} transition-transform hover:scale-[1.02]`}>
                <div className={`p-2 rounded-lg bg-white/60 shrink-0`}>
                  <badge.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-slate-800 leading-tight truncate">{badge.text}</span>
                  <span className="text-xs text-slate-500 font-medium truncate">{badge.subtext}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Dots (Mobile Only) */}
      <div className="flex justify-center gap-1.5 mt-3 sm:hidden">
        {badges.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollTo(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === selectedIndex ? 'w-6 bg-slate-800' : 'w-1.5 bg-slate-200'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
