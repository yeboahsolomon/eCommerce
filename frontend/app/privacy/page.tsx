'use client';

import Link from 'next/link';
import { ArrowLeft, Shield, Eye, Database, Lock, UserCheck, Bell } from 'lucide-react';

export default function PrivacyPage() {
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
            <div className="bg-green-600 p-2.5 rounded-xl">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
          </div>
          <p className="text-slate-300 text-sm">
            Last updated: 1 March 2026 &middot; Your privacy matters to us
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="prose prose-slate max-w-none space-y-8">

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <p className="text-blue-800 text-sm leading-relaxed">
              <strong>Summary:</strong> We collect only the data necessary to process your orders, verify
              sellers, and improve your shopping experience. We never sell your personal data to third parties.
            </p>
          </div>

          <section>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              1. Information We Collect
            </h2>
            <h3 className="text-lg font-semibold text-slate-800 mt-4">Account Information</h3>
            <ul className="list-disc pl-6 text-slate-600 space-y-1">
              <li>Full name, email address, phone number</li>
              <li>Shipping addresses (region, city, street, Ghana GPS address)</li>
              <li>Password (stored securely using bcrypt hashing — we never see your plain password)</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-800 mt-4">Seller Information</h3>
            <ul className="list-disc pl-6 text-slate-600 space-y-1">
              <li>Business name and registration details</li>
              <li>Ghana Card number and images (for identity verification)</li>
              <li>Mobile Money number and provider</li>
              <li>Business address and Ghana region</li>
            </ul>

            <h3 className="text-lg font-semibold text-slate-800 mt-4">Order &amp; Payment Information</h3>
            <ul className="list-disc pl-6 text-slate-600 space-y-1">
              <li>Order history, delivery addresses, and payment methods used</li>
              <li>Card last-4 digits and brand (we do not store full card numbers — Paystack handles this)</li>
              <li>Mobile Money transaction references</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              2. How We Use Your Information
            </h2>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li><strong>Order Processing:</strong> To create, deliver, and manage your orders.</li>
              <li><strong>Seller Verification:</strong> To verify seller identity and prevent fraud.</li>
              <li><strong>Communication:</strong> To send order confirmations, shipping updates, and account notifications via email and SMS.</li>
              <li><strong>Platform Improvement:</strong> Aggregated, anonymised data helps us improve the shopping experience.</li>
              <li><strong>Security:</strong> To detect and prevent fraudulent transactions and account misuse.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Lock className="h-5 w-5 text-green-600" />
              3. Data Security
            </h2>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li>All data is transmitted over HTTPS (TLS encryption).</li>
              <li>Passwords are hashed with bcrypt and never stored in plain text.</li>
              <li>Payment processing is handled by PCI-DSS compliant providers (Paystack, MTN MoMo).</li>
              <li>Access to personal data is restricted to authorised personnel only.</li>
              <li>JWT-based authentication with secure httpOnly cookies protects your sessions.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              4. Data Sharing
            </h2>
            <p className="text-slate-600 leading-relaxed mb-3">
              We share personal data only in these limited circumstances:
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li><strong>Sellers:</strong> Receive your name, shipping address, and phone number to fulfil orders.</li>
              <li><strong>Payment Providers:</strong> Paystack and MoMo providers process payment data under their own privacy policies.</li>
              <li><strong>Legal Requirements:</strong> We may disclose data if required by Ghanaian law or a valid court order.</li>
            </ul>
            <p className="text-slate-600 leading-relaxed mt-3 font-medium">
              We never sell, rent, or trade your personal information to marketers or advertisers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              5. Your Rights
            </h2>
            <ul className="list-disc pl-6 text-slate-600 space-y-2">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information via your account settings.</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated data by contacting support.</li>
              <li><strong>Opt-out:</strong> Unsubscribe from marketing emails at any time.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">6. Cookies &amp; Local Storage</h2>
            <p className="text-slate-600 leading-relaxed">
              We use essential cookies for authentication (httpOnly secure cookies for JWT tokens) and
              local storage for cart data. We do not use third-party tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">7. Contact Us</h2>
            <p className="text-slate-600 leading-relaxed">
              For privacy-related inquiries, email us at{' '}
              <a href="mailto:privacy@ghanamarket.com" className="text-blue-600 hover:underline">
                privacy@ghanamarket.com
              </a>{' '}
              or write to: GhanaMarket, Drobo Main Market Road, Jaman South, Bono Region, Ghana.
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
