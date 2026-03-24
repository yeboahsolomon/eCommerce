"use client";

import React, { useEffect, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import ProductCard from "./ProductCard";
import { Product } from "@/types";

interface VirtualProductGridProps {
  products: Product[];
}

export default function VirtualProductGrid({ products }: VirtualProductGridProps) {
  const [columns, setColumns] = useState(2); // default mobile

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1280) setColumns(5); // xl
      else if (width >= 1024) setColumns(4); // lg
      else if (width >= 768) setColumns(3); // md
      else setColumns(2); // sm and block
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const numRows = Math.ceil(products.length / columns);

  const virtualizer = useWindowVirtualizer({
    count: numRows,
    estimateSize: () => 400, // Estimated card height
    overscan: 3,
  });

  if (products.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500">
        No products found.
      </div>
    );
  }

  return (
    <div
      style={{
        height: `${virtualizer.getTotalSize()}px`,
        width: "100%",
        position: "relative",
      }}
    >
      {virtualizer.getVirtualItems().map((virtualRow) => {
        const startIdx = virtualRow.index * columns;
        const rowProducts = products.slice(startIdx, startIdx + columns);

        return (
          <div
            key={virtualRow.key}
            ref={virtualizer.measureElement}
            data-index={virtualRow.index}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start}px)`,
            }}
            className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 pb-4 sm:pb-6"
          >
            {rowProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
