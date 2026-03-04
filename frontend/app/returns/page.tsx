'use client';

import Link from 'next/link';
import { ArrowLeft, RotateCcw, Package, Clock, CheckCircle2, XCircle, AlertTriangle, Phone } from 'lucide-react';

export default function ReturnsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-slate-300 hover:text-white text-sm mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-amber-500 p-2.5 rounded-xl">
              <RotateCcw className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold">Return &amp; Refund Policy</h1>
          </div>
          <p className="text-slate-300 text-sm">
            Last updated: 1 March 2026 &middot; We want you to shop with confidence
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="prose prose-slate max-w-none space-y-8">

          {/* Quick Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 not-prose">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="font-bold text-green-800 text-lg">7 Days</p>
              <p className="text-green-600 text-sm">Return Window</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <Package className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <p className="font-bold text-blue-800 text-lg">Free Returns</p>
              <p className="text-blue-600 text-sm">On Defective Items</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <RotateCcw className="h-8 w-8 text-amber-600 mx-auto mb-2" />
              <p className="font-bold text-amber-800 text-lg">Full Refund</p>
              <p className="text-amber-600 text-sm">Via Original Method</p>
            </div>
          </div>

          <section>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              1. Eligible for Return
            </h2>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Item received is defective, damaged, or significantly different from the product description.</li>
              <li>Wrong item was delivered (different product, size, colour, or variant).</li>
              <li>Item is missing parts, accessories, or components listed in the description.</li>
              <li>Return request is initiated within <strong>7 days</strong> of delivery.</li>
              <li>Item is in its original condition and packaging (where applicable).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              2. Not Eligible for Return
            </h2>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Perishable goods (food, fresh produce, cooked meals).</li>
              <li>Personal hygiene products, undergarments, and cosmetics that have been opened.</li>
              <li>Customised or made-to-order items.</li>
              <li>Digital products and gift cards.</li>
              <li>Items damaged due to buyer misuse after delivery.</li>
              <li>Requests made after the 7-day return window.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">3. How to Request a Return</h2>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 not-prose">
              <div className="flex items-start gap-3">
                <span className="bg-blue-600 text-white text-sm font-bold rounded-full h-7 w-7 flex items-center justify-center shrink-0">1</span>
                <div>
                  <p className="font-semibold text-slate-800">Go to Your Orders</p>
                  <p className="text-slate-600 text-sm">Navigate to <strong>Account → Orders</strong> and find the order to return.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-blue-600 text-white text-sm font-bold rounded-full h-7 w-7 flex items-center justify-center shrink-0">2</span>
                <div>
                  <p className="font-semibold text-slate-800">Contact Customer Support</p>
                  <p className="text-slate-600 text-sm">Call or WhatsApp us with your order number and reason for return.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-blue-600 text-white text-sm font-bold rounded-full h-7 w-7 flex items-center justify-center shrink-0">3</span>
                <div>
                  <p className="font-semibold text-slate-800">Arrange Return Pickup or Drop-off</p>
                  <p className="text-slate-600 text-sm">We&apos;ll coordinate with the seller for collection or direct you to a drop-off point.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="bg-green-600 text-white text-sm font-bold rounded-full h-7 w-7 flex items-center justify-center shrink-0">✓</span>
                <div>
                  <p className="font-semibold text-slate-800">Receive Your Refund</p>
                  <p className="text-slate-600 text-sm">Refund is processed within 3–5 business days after inspection.</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">4. Refund Details</h2>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li><strong>Mobile Money payments:</strong> Refunded directly to the MoMo number used for payment (3–5 business days).</li>
              <li><strong>Card payments:</strong> Refunded to the original card via Paystack (5–10 business days depending on your bank).</li>
              <li><strong>Cash on Delivery:</strong> Refund sent to your registered Mobile Money number.</li>
              <li>Delivery fees are refundable only if the return is due to a seller error or defective product.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              5. Seller Responsibilities
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Sellers on GhanaMarket are required to honour all valid return requests. GhanaMarket may intervene
              if a seller refuses a legitimate return. Repeated violations of the return policy by sellers may
              result in account suspension or termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-600" />
              6. Need Help?
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 not-prose">
              <p className="text-blue-800 font-semibold mb-2">Contact Our Support Team</p>
              <div className="space-y-1 text-sm text-blue-700">
                <p>📧 Email: <a href="mailto:support@ghanamarket.com" className="underline">support@ghanamarket.com</a></p>
                <p>📱 WhatsApp: <a href="https://wa.me/233200000000" className="underline">+233 20 000 0000</a></p>
                <p>📞 Call: <a href="tel:+233200000000" className="underline">+233 20 000 0000</a></p>
                <p>🕒 Mon–Sat: 7:00 AM – 8:00 PM | Sun: 9:00 AM – 5:00 PM</p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
