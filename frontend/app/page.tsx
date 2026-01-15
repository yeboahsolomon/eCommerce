import ProductCard from "@/components/ui/ProductCard";
import { Product } from "@/types";

// Dummy Data
const PRODUCTS: Product[] = [
  {
    id: "1",
    name: "GTP Nustyle Fabric - Traditional Print (6 Yards)",
    price: 350,
    originalPrice: 400,
    image: "https://images.unsplash.com/photo-1616682760884-21915db74026?q=80&w=800&auto=format&fit=crop",
    category: "Fashion",
    rating: 4.8,
    inStock: true,
  },
  {
    id: "2",
    name: "Samsung Galaxy A14 (64GB) - Black",
    price: 1850,
    image: "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?q=80&w=800&auto=format&fit=crop",
    category: "Electronics",
    rating: 4.5,
    inStock: true,
  },
  {
    id: "3",
    name: "Fresh Pona Yams (Medium Size) - Set of 3",
    price: 45,
    image: "https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?q=80&w=800&auto=format&fit=crop",
    category: "Groceries",
    rating: 4.9,
    inStock: true,
  },
  {
    id: "4",
    name: "Binatone Blender with Grinder - 1.5L",
    price: 420,
    originalPrice: 500,
    image: "https://images.unsplash.com/photo-1570222094114-28a9d88a2b64?q=80&w=800&auto=format&fit=crop",
    category: "Home & Kitchen",
    rating: 4.2,
    inStock: true,
  },
];

export default function Home() {
  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="bg-blue-600 rounded-3xl p-8 text-white sm:p-12 overflow-hidden relative">
        <div className="relative z-10 max-w-lg">
          <h1 className="text-4xl font-bold mb-4">Best Deals in Drobo</h1>
          <p className="mb-6 text-blue-100 text-lg">
            Shop local favorites and international brands. Fast delivery to your doorstep.
          </p>
          <button className="bg-white text-blue-600 px-8 py-3 rounded-full font-bold hover:bg-blue-50 transition shadow-lg">
            Shop Now
          </button>
        </div>
        {/* Abstract Circle Decoration */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500 opacity-50 blur-3xl"></div>
      </section>

      {/* Featured Products Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Weekly Best Sellers</h2>
          <a href="/products" className="text-sm font-medium text-blue-600 hover:underline">
            View All
          </a>
        </div>
        
        {/* THE GRID: 2 columns on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {PRODUCTS.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
