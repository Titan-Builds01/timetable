'use client';

import Sidebar from './Sidebar';
import Header from './Header';

export default function DashboardWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const year = new Date().getFullYear();
  // Allow public access - no authentication required
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        <footer className="border-t border-gray-200 dark:border-gray-800 px-6 py-3 text-right text-xs text-gray-500 dark:text-gray-500">
          © {year} Sulva Solutions. All rights reserved.
        </footer>
      </div>
    </div>
  );
}

