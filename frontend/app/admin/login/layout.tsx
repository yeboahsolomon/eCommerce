import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Portal Login | GhanaMarket',
  description: 'Restricted area. Authorized personnel only.',
};

export default function AdminLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      {children}
    </div>
  );
}
