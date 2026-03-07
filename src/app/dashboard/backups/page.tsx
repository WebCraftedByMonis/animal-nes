'use client';

import { useRef, useState } from 'react';
import { useCountry } from '@/contexts/CountryContext';
import axios from 'axios';
import * as XLSX from 'xlsx';

type BackupType = 'products' | 'companies' | 'partners';

interface UploadResult {
  imported: number;
  failed: number;
  errors: string[];
}

interface UploadProgress {
  current: number;
  total: number;
}

const BATCH_SIZE = 50;

const backupItems: { type: BackupType; label: string; description: string }[] = [
  { type: 'products',  label: 'Products',  description: 'All products with company and partner references.' },
  { type: 'companies', label: 'Companies', description: 'All companies and contact details.' },
  { type: 'partners',  label: 'Partners',  description: 'All partners and profile details.' },
];

export default function BackupsPage() {
  const { country } = useCountry();

  // ── Download state ────────────────────────────────────────────
  const [downloading, setDownloading] = useState<BackupType | null>(null);

  // ── Upload state ──────────────────────────────────────────────
  const [uploading, setUploading]       = useState<BackupType | null>(null);
  const [uploadResult, setUploadResult] = useState<Record<BackupType, UploadResult | null>>({
    products: null, companies: null, partners: null,
  });
  const [uploadProgress, setUploadProgress] = useState<Record<BackupType, UploadProgress>>({
    products:  { current: 0, total: 0 },
    companies: { current: 0, total: 0 },
    partners:  { current: 0, total: 0 },
  });

  const fileRefs = {
    products:  useRef<HTMLInputElement>(null),
    companies: useRef<HTMLInputElement>(null),
    partners:  useRef<HTMLInputElement>(null),
  };

  const handleDownload = (type: BackupType) => {
    setDownloading(type);
    window.open(`/api/admin/backups?type=${type}&country=${country}`, '_blank', 'noopener,noreferrer');
    setTimeout(() => setDownloading(null), 800);
  };

  const handleUpload = async (type: BackupType) => {
    const input = fileRefs[type].current;
    if (!input?.files?.[0]) return;

    const file = input.files[0];
    if (!file.name.endsWith('.xlsx')) {
      alert('Please select an .xlsx file.');
      return;
    }

    // Read and parse the file client-side
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const allRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(firstSheet, { defval: null });

    // Filter by country for non-products
    const rows = type === 'products'
      ? allRows
      : allRows.filter((r: any) => !r.country || r.country === country);

    if (rows.length === 0) {
      setUploadResult(prev => ({ ...prev, [type]: { imported: 0, failed: 0, errors: ['File was empty or no matching rows found.'] } }));
      if (input) input.value = '';
      return;
    }

    // Split into batches
    const batches: Record<string, unknown>[][] = [];
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      batches.push(rows.slice(i, i + BATCH_SIZE));
    }

    setUploading(type);
    setUploadResult(prev => ({ ...prev, [type]: null }));
    setUploadProgress(prev => ({ ...prev, [type]: { current: 0, total: batches.length } }));

    let totalImported = 0;
    let totalFailed = 0;
    const totalErrors: string[] = [];

    for (let i = 0; i < batches.length; i++) {
      try {
        const { data } = await axios.post('/api/admin/backups/batch', {
          type,
          country,
          rows: batches[i],
        });
        totalImported += data.imported ?? 0;
        totalFailed   += data.failed   ?? 0;
        if (Array.isArray(data.errors)) totalErrors.push(...data.errors);
      } catch (err: any) {
        totalFailed += batches[i].length;
        totalErrors.push(err.response?.data?.error || `Batch ${i + 1} failed`);
      }
      setUploadProgress(prev => ({ ...prev, [type]: { current: i + 1, total: batches.length } }));
    }

    setUploadResult(prev => ({
      ...prev,
      [type]: { imported: totalImported, failed: totalFailed, errors: totalErrors.slice(0, 20) },
    }));
    setUploading(null);
    if (input) input.value = '';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">

        {/* ── Download section ── */}
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
            {backupItems.map((item) => (
              <div
                key={item.type}
                className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-md border border-gray-200 p-4"
              >
                <div>
                  <div className="text-base font-semibold text-gray-900">{item.label} Backup</div>
                  <div className="text-sm text-gray-600">{item.description}</div>
                </div>
                <button
                  onClick={() => handleDownload(item.type)}
                  disabled={downloading === item.type}
                  className="inline-flex items-center justify-center rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {downloading === item.type ? 'Preparing…' : '⬇ Download'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Upload / Restore section ── */}
        <div className="bg-white shadow-xl rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">Upload &amp; Restore</h2>
            <p className="mt-1 text-sm text-gray-600">
              Upload an Excel backup file to restore or update records. Existing rows are updated
              by ID; new rows are inserted.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <p className="text-sm font-medium text-emerald-700 bg-emerald-50 inline-block px-3 py-1 rounded-full">
                Restoring data for: {country}
              </p>
              <p className="text-sm font-medium text-amber-700 bg-amber-50 inline-block px-3 py-1 rounded-full">
                Rows from other countries are skipped automatically.
              </p>
            </div>
          </div>

          <div className="px-6 py-6 space-y-4">
            {backupItems.map((item) => {
              const result     = uploadResult[item.type];
              const isUploading = uploading === item.type;
              const progress   = uploadProgress[item.type];
              const pct        = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

              return (
                <div
                  key={item.type}
                  className="rounded-md border border-gray-200 p-4 space-y-3"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-base font-semibold text-gray-900">{item.label} Restore</div>
                      <div className="text-sm text-gray-600">{item.description}</div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <input
                        ref={fileRefs[item.type]}
                        type="file"
                        accept=".xlsx"
                        className="hidden"
                        onChange={() => handleUpload(item.type)}
                      />
                      <button
                        onClick={() => fileRefs[item.type].current?.click()}
                        disabled={isUploading}
                        className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isUploading ? 'Uploading…' : '⬆ Upload .xlsx'}
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {isUploading && progress.total > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Batch {progress.current} of {progress.total}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Result banner */}
                  {result && (
                    <div
                      className={`rounded-md px-4 py-3 text-sm space-y-1 ${
                        result.failed === 0
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                          : result.imported === 0
                          ? 'bg-red-50 border border-red-200 text-red-800'
                          : 'bg-amber-50 border border-amber-200 text-amber-800'
                      }`}
                    >
                      <div className="font-semibold">
                        {result.imported === 0 && result.failed === 0
                          ? 'File was empty — no rows found.'
                          : `${result.imported} record${result.imported !== 1 ? 's' : ''} imported / updated`}
                        {result.failed > 0 && ` · ${result.failed} failed`}
                      </div>
                      {result.errors.length > 0 && (
                        <ul className="list-disc list-inside space-y-0.5 text-xs opacity-80 max-h-32 overflow-y-auto">
                          {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
