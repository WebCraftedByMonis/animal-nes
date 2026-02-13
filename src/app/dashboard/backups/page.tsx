'use client';

import { useState } from 'react';
import { useCountry } from '@/contexts/CountryContext';

type BackupType = 'products' | 'companies' | 'partners';

const backupLinks: { type: BackupType; label: string; description: string }[] = [
  { type: 'products', label: 'Products Backup', description: 'All products with company and partner references.' },
  { type: 'companies', label: 'Companies Backup', description: 'All companies and contact details.' },
  { type: 'partners', label: 'Partners Backup', description: 'All partners and profile details.' },
];

export default function BackupsPage() {
  const [downloading, setDownloading] = useState<BackupType | null>(null);
  const { country } = useCountry();

  const handleDownload = (type: BackupType) => {
    setDownloading(type);
    window.open(`/api/admin/backups?type=${type}&country=${country}`, '_blank', 'noopener,noreferrer');
    setTimeout(() => setDownloading(null), 800);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-xl rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Download Backups</h1>
            <p className="mt-1 text-sm text-gray-600">
              Export database data as Excel files. Each download is separate.
            </p>
            <p className="mt-2 text-sm font-medium text-emerald-700 bg-emerald-50 inline-block px-3 py-1 rounded-full">
              Downloading data for: {country}
            </p>
          </div>

          <div className="px-6 py-6 space-y-4">
            {backupLinks.map((item) => (
              <div
                key={item.type}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-md border border-gray-200 p-4"
              >
                <div>
                  <div className="text-base font-semibold text-gray-900">{item.label}</div>
                  <div className="text-sm text-gray-600">{item.description}</div>
                </div>
                <button
                  onClick={() => handleDownload(item.type)}
                  className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={downloading === item.type}
                >
                  {downloading === item.type ? 'Preparing...' : 'Download'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
