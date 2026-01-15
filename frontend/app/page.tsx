export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="bg-blue-600 rounded-2xl p-8 text-white text-center sm:text-left sm:p-12">
        <h1 className="text-3xl font-bold mb-4">Quality Goods, Delivered Fast.</h1>
        <p className="mb-6 text-blue-100">From Drobo to Accra, we have you covered.</p>
        <button className="bg-white text-blue-600 px-6 py-2 rounded-full font-semibold hover:bg-blue-50 transition">
          Shop Now
        </button>
      </section>

      {/* Grid */}
      <section>
        <h2 className="text-xl font-bold mb-4">Featured Products</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-64 flex items-center justify-center">
              Product Card {i}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
