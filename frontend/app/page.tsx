import ProductCard from "@/components/ui/ProductCard";
import { PRODUCTS } from "@/lib/dummy-data";

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
