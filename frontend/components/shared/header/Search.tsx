"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search as SearchIcon, X, Clock, TrendingUp, History, ArrowRight, Package, Grid3X3 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useDebounce } from "use-debounce";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { SearchSuggestion } from "@/types";

interface SearchProps {
  className?: string;
}

export default function Search({ className }: SearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [debouncedQuery] = useDebounce(query, 300);

  // Fetch popular searches from API
  const { data: popularData } = useQuery({
    queryKey: ['search-popular'],
    queryFn: () => api.getPopularSearches(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    enabled: isFocused && !query,
  });
  const popularSearches = popularData?.data?.popular || [];

  // Fetch live suggestions from API (debounced)
  const { data: suggestionsData, isFetching: isFetchingSuggestions } = useQuery({
    queryKey: ['search-suggestions', debouncedQuery],
    queryFn: () => api.getSearchSuggestions(debouncedQuery),
    enabled: debouncedQuery.length >= 2 && isFocused,
    staleTime: 30 * 1000, // Cache for 30s
  });
  const suggestions: SearchSuggestion[] = suggestionsData?.data?.suggestions || [];

  // Load recent searches from local storage
  useEffect(() => {
    const saved = localStorage.getItem("recent_searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch {
        // Ignore malformed data
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
      saveRecentSearch(query.trim());
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setIsFocused(false);
    }
  };

  const saveRecentSearch = (term: string) => {
    const newRecent = [term, ...recentSearches.filter(s => s !== term)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem("recent_searches", JSON.stringify(newRecent));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("recent_searches");
  };

  const clearSearch = () => {
    setQuery("");
    setIsFocused(true);
  };

  /** Highlight matching text in a suggestion label */
  const highlightMatch = (text: string, match: string) => {
    if (!match) return text;
    const idx = text.toLowerCase().indexOf(match.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="text-blue-600 font-semibold">{text.slice(idx, idx + match.length)}</span>
        {text.slice(idx + match.length)}
      </>
    );
  };

  const showDropdown = isFocused;
  const hasQuery = query.length > 0;
  const hasSuggestions = suggestions.length > 0;

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
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50 max-h-[70vh] overflow-y-auto">
          
          {/* Recent Searches (shown when no query) */}
          {!hasQuery && recentSearches.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <History className="h-3 w-3" /> Recent Searches
                </span>
                <button
                  onClick={clearRecentSearches}
                  className="text-[10px] text-slate-400 hover:text-red-500 font-medium normal-case tracking-normal transition-colors"
                >
                  Clear
                </button>
              </div>
              <ul className="space-y-0.5">
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
                        <Clock className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-400" />
                        {term}
                      </span>
                      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Trending / Popular (shown when no query) */}
          {!hasQuery && (
            <div className={`p-2 ${recentSearches.length > 0 ? 'border-t border-slate-100' : ''}`}>
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-3 w-3" /> Trending Now
              </div>
              {popularSearches.length > 0 ? (
                <div className="flex flex-wrap gap-2 px-3 pb-2">
                  {popularSearches.map((item: { text: string; slug: string }, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setQuery(item.text);
                        saveRecentSearch(item.text);
                        router.push(`/search?q=${encodeURIComponent(item.text)}`);
                        setIsFocused(false);
                      }}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      {item.text}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="px-3 pb-2 text-xs text-slate-400 italic">Loading trends...</p>
              )}
            </div>
          )}

          {/* Live Suggestions (shown when typing) */}
          {hasQuery && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Suggestions
              </div>

              {isFetchingSuggestions && debouncedQuery !== query ? (
                <div className="px-3 py-3 text-sm text-slate-400 flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                  Searching...
                </div>
              ) : hasSuggestions ? (
                <ul className="space-y-0.5">
                  {suggestions.map((suggestion) => (
                    <li key={`${suggestion.type}-${suggestion.id}`}>
                      <Link
                        href={suggestion.type === 'product' ? `/product/${suggestion.slug}` : `/category/${suggestion.slug}`}
                        onClick={() => {
                          saveRecentSearch(suggestion.text);
                          setIsFocused(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-lg hover:text-blue-600 transition-colors group"
                      >
                        <div className={cn(
                          "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                          suggestion.type === 'product' ? "bg-blue-50 text-blue-500" : "bg-purple-50 text-purple-500"
                        )}>
                          {suggestion.type === 'product' ? (
                            <Package className="h-4 w-4" />
                          ) : (
                            <Grid3X3 className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {highlightMatch(suggestion.text, debouncedQuery)}
                          </p>
                          <p className="text-[11px] text-slate-400 capitalize">{suggestion.type}</p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : debouncedQuery.length >= 2 ? (
                <p className="px-3 py-2 text-sm text-slate-400 italic">
                  No suggestions found for &quot;{debouncedQuery}&quot;
                </p>
              ) : null}

              {/* "Press enter to search" prompt */}
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={() => {
                    saveRecentSearch(query.trim());
                    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
                    setIsFocused(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 rounded-lg flex items-center gap-2 group transition-colors"
                >
                  <SearchIcon className="h-3.5 w-3.5 text-slate-400" />
                  Search for &quot;{query}&quot;
                  <kbd className="ml-auto text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded font-mono group-hover:bg-blue-50 group-hover:text-blue-500">Enter</kbd>
                </button>
              </div>
            </div>
          )}
          
        </div>
      )}
    </div>
  );
}
