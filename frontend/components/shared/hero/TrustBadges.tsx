"use client";

import React from 'react';
import { Truck, ShieldCheck, Phone, CheckCircle } from 'lucide-react';
import Image from 'next/image';

const badges = [
  {
    icon: Truck,
    text: "Free Delivery in Jaman South",
    subtext: "Orders over GH₵50",
    color: "text-blue-600 bg-blue-50 border-blue-100"
  },
  {
    // Using a generic icon for MoMo if specific logos aren't available yet, 
    // but plan implies using text/icon combo. 
    // For now, I'll use a wallet/phone icon representation or the provided assets if I had them.
    // I will use a text based approach or lucide icon for now to ensure it renders.
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
  return (
    <div className="w-full overflow-x-auto pb-4 pt-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible scrollbar-hide">
      <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 min-w-[max-content] sm:min-w-0">
        {badges.map((badge, index) => (
          <div 
            key={index} 
            className={`flex items-center gap-3 p-3 rounded-xl border ${badge.color} min-w-[240px] sm:min-w-0 transition-transform hover:scale-[1.02]`}
          >
            <div className={`p-2 rounded-lg bg-white/60`}>
              <badge.icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800 leading-tight">{badge.text}</span>
              <span className="text-xs text-slate-500 font-medium">{badge.subtext}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
