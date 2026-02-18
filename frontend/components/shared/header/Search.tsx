"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon, X, Clock, TrendingUp, History, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useDebounce } from "use-debounce";

interface SearchProps {
  className?: string;
}

// Mock data for suggestions (replace with API calls later)
const MOCK_TRENDING = [
  "Wireless Earbuds",
  "Smart Watches",
  "Running Shoes",
  "Gaming Laptops"
];

const MOCK_CATEGORIES = [
  { id: '1', name: 'Electronics', slug: 'electronics' },
  { id: '2', name: 'Fashion', slug: 'fashion' },
  { id: '3', name: 'Home & Garden', slug: 'home-garden' },
];

export default function Search({ className }: SearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Debounce the query for potential API calls or expensive filtering
  const [debouncedQuery] = useDebounce(query, 300);

  // Load recent searches from local storage
  useEffect(() => {
    const saved = localStorage.getItem("recent_searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch (e) {
        console.error("Failed to parse recent searches", e);
      }
    }
  }, []);

  // Handle click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Save to recent searches
      const newRecent = [query.trim(), ...recentSearches.filter(s => s !== query.trim())].slice(0, 5);
      setRecentSearches(newRecent);
      localStorage.setItem("recent_searches", JSON.stringify(newRecent));
      
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setIsFocused(false);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setIsFocused(true);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full max-w-2xl", className)}>
      <form onSubmit={handleSearch} className={cn(
        "relative flex items-center w-full transition-all duration-300",
        isFocused ? "scale-[1.01]" : ""
      )}>
        <div className="relative w-full group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            placeholder="Search for products, brands, or vendors..."
            className="w-full h-11 pl-12 pr-10 border border-slate-300 rounded-full bg-slate-50 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-400 group-hover:bg-white group-hover:border-slate-400"
          />
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          
          {query && (
            <button 
              type="button" 
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>

      {/* Autocomplete / Suggestions Dropdown */}
      {isFocused && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
          
          {/* Recent Searches */}
          {!query && recentSearches.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <History className="h-3 w-3" /> Recent Searches
              </div>
              <ul className="space-y-1">
                {recentSearches.map((term, idx) => (
                  <li key={idx}>
                    <button 
                      onClick={() => {
                        setQuery(term);
                        router.push(`/search?q=${encodeURIComponent(term)}`);
                        setIsFocused(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-blue-600 rounded-lg flex items-center justify-between group transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Clock className="h-3 w-3 text-slate-400 group-hover:text-blue-400" />
                        {term}
                      </span>
                      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Trending */}
          {!query && (
            <div className={`p-2 ${recentSearches.length > 0 ? 'border-t border-slate-100' : ''}`}>
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-3 w-3" /> Trending Now
              </div>
              <div className="flex flex-wrap gap-2 px-3 pb-2">
                {MOCK_TRENDING.map((term, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuery(term);
                      router.push(`/search?q=${encodeURIComponent(term)}`);
                      setIsFocused(false);
                    }}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category Suggestions (when typing) using DEBOUNCED query */}
          {query && (
            <div className="p-2">
               <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Suggestions
              </div>
              <ul>
                 {/* Mock suggestion logic using debouncedQuery (simulating API delay/opt) */}
                 {MOCK_CATEGORIES.filter(c => c.name.toLowerCase().includes(debouncedQuery.toLowerCase())).map(cat => (
                   <li key={cat.id}>
                     <Link 
                        href={`/categories/${cat.slug}`}
                        onClick={() => setIsFocused(false)}
                        className="flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg hover:text-blue-600 transition-colors"
                     >
                       <div className="h-8 w-8 rounded-md bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                          {cat.name.slice(0, 2).toUpperCase()}
                       </div>
                       <div>
                          <p className="font-medium">{cat.name}</p>
                          <p className="text-xs text-slate-400">Category</p>
                       </div>
                     </Link>
                   </li>
                 ))}
                 {/* Also show "Searching for X" if different */}
                 {debouncedQuery !== query && (
                    <li className="px-3 py-2 text-sm text-slate-400 italic">
                        Typing...
                    </li>
                 )}
                 <li className="px-3 py-2 text-sm text-slate-500 italic">
                    Press enter to search for &quot;{query}&quot;
                 </li>
              </ul>
            </div>
          )}
          
        </div>
      )}
    </div>
  );
}
