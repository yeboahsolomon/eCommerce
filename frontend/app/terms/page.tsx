'use client';

import Link from 'next/link';
import { ArrowLeft, FileText, ShieldCheck, AlertTriangle, Scale } from 'lucide-react';

export default function TermsPage() {
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
            <div className="bg-blue-600 p-2.5 rounded-xl">
              <Scale className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold">Terms &amp; Conditions</h1>
          </div>
          <p className="text-slate-300 text-sm">
            Last updated: 1 March 2026 &middot; Effective for all users on GhanaMarket
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="prose prose-slate max-w-none space-y-8">

          <section>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              1. Acceptance of Terms
            </h2>
            <p className="text-slate-600 leading-relaxed">
              By accessing or using GhanaMarket (the &quot;Platform&quot;), you agree to be bound by these Terms &amp; Conditions.
              If you do not agree with any part of these terms, you should not use the Platform. GhanaMarket is operated
              within the Republic of Ghana and is subject to Ghanaian law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">2. User Accounts</h2>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>You must be at least 18 years of age to create an account.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>One person may not maintain more than one buyer account.</li>
              <li>GhanaMarket reserves the right to suspend or terminate accounts that violate these terms.</li>
              <li>Providing false identity information is grounds for permanent ban.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">3. Buying on GhanaMarket</h2>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>All prices are listed in Ghana Cedis (GH₵) and are inclusive of any applicable taxes unless otherwise stated.</li>
              <li>Placing an order constitutes a binding offer to purchase. Orders are confirmed once payment is verified.</li>
              <li>Delivery timelines vary by location. Estimated delivery dates are provided but not guaranteed.</li>
              <li>You must inspect items upon delivery and report defects within 48 hours.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">4. Selling on GhanaMarket</h2>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Sellers must complete the verification process, including a valid Ghana Card, before listing products.</li>
              <li>Sellers are responsible for the accuracy of product descriptions, images, and pricing.</li>
              <li>GhanaMarket charges a platform commission (currently 5%) on each successful sale.</li>
              <li>Seller payouts are processed to the registered Mobile Money number after order delivery confirmation.</li>
              <li>Selling counterfeit, illegal, or prohibited items is strictly forbidden and will result in account termination.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">5. Payments</h2>
            <p className="text-slate-600 leading-relaxed">
              Payments are processed through trusted gateways including Paystack, MTN Mobile Money, Telecel Cash,
              AirtelTigo Money, and Cash on Delivery where available. GhanaMarket does not store card details directly.
              All electronic transactions are secured with industry-standard encryption.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              6. Prohibited Activities
            </h2>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>Creating fake reviews or manipulating product ratings.</li>
              <li>Submitting fraudulent orders or payment information.</li>
              <li>Harassment, hate speech, or threatening behaviour toward other users.</li>
              <li>Scraping, data mining, or automated access to the Platform without written permission.</li>
              <li>Selling items that are illegal under the laws of Ghana.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">7. Limitation of Liability</h2>
            <p className="text-slate-600 leading-relaxed">
              GhanaMarket acts as a marketplace connecting buyers and sellers. We do not manufacture, store, or ship
              products ourselves (unless sold by &quot;GhanaMarket Official&quot;). To the maximum extent permitted by law,
              GhanaMarket is not liable for indirect, incidental, or consequential damages arising from the use of
              the Platform or any transaction conducted through it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-green-600" />
              8. Dispute Resolution
            </h2>
            <p className="text-slate-600 leading-relaxed">
              Any disputes between buyers and sellers shall first be mediated by GhanaMarket&apos;s support team. If a
              resolution cannot be reached, the matter shall be governed by the laws of the Republic of Ghana and
              subject to the jurisdiction of the courts of Ghana.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">9. Changes to Terms</h2>
            <p className="text-slate-600 leading-relaxed">
              GhanaMarket reserves the right to modify these terms at any time. Changes become effective upon posting
              to the Platform. Continued use of GhanaMarket after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">10. Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              For questions regarding these Terms &amp; Conditions, please contact us at{' '}
              <a href="mailto:support@ghanamarket.com" className="text-blue-600 hover:underline">
                support@ghanamarket.com
              </a>
              .
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
