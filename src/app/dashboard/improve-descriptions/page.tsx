'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Stats = {
  processedToday: number
  totalImproved: number
  dailyLimit: number
  remainingToday: number
  pendingProducts: number
  emptyDescriptions: number
  thinDescriptions: number
  batchSize: number
}

type ResultItem = {
  id: number
  name: string
  status: 'improved' | 'failed'
  reason?: string
}

export default function ImproveDescriptionsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<ResultItem[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/improve-descriptions')
      if (res.ok) setStats(await res.json())
    } catch {}
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  async function runBatch() {
    setRunning(true)
    setError('')
    setMessage('')
    setResults([])

    try {
      const res = await fetch('/api/admin/improve-descriptions', { method: 'POST' })
      const data = await res.json()

      if (res.status === 429) {
        setError(data.error)
      } else if (data.message) {
        setMessage(data.message)
      } else if (data.error) {
        setError(`Grok API error: ${data.error}`)
        setResults(data.results ?? [])
      } else {
        setResults(data.results ?? [])
        await fetchStats()
      }
    } catch {
      setError('Network error. Try again.')
    } finally {
      setRunning(false)
    }
  }

  const improved = results.filter(r => r.status === 'improved').length
  const failed = results.filter(r => r.status === 'failed').length
  const limitReached = stats ? stats.remainingToday === 0 : false

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: 24 }}>
        <Link href="/dashboard" style={{ color: '#6366f1', textDecoration: 'none', fontSize: 14 }}>
          ← Dashboard
        </Link>
      </div>

      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Improve Product Descriptions</h1>
      <p style={{ color: '#6b7280', marginBottom: 32, fontSize: 14 }}>
        Uses Grok AI to generate 150–200 word descriptions for products with missing or thin content.
        Click once per day — stops automatically when the daily limit is reached.
      </p>

      {/* Stats cards */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 12,
            marginBottom: 32,
          }}
        >
          <StatCard label="Pending" value={stats.pendingProducts.toLocaleString()} sub={`${stats.emptyDescriptions} empty · ${stats.thinDescriptions} thin`} />
          <StatCard label="Today's Used" value={`${stats.processedToday} / ${stats.dailyLimit}`} color={limitReached ? '#ef4444' : undefined} />
          <StatCard label="Remaining Today" value={stats.remainingToday} color={limitReached ? '#ef4444' : '#10b981'} />
          <StatCard label="All-Time Improved" value={stats.totalImproved.toLocaleString()} color="#6366f1" />
        </div>
      )}

      {/* Run button */}
      <button
        onClick={runBatch}
        disabled={running || limitReached}
        style={{
          padding: '14px 32px',
          fontSize: 16,
          fontWeight: 600,
          borderRadius: 8,
          border: 'none',
          cursor: running || limitReached ? 'not-allowed' : 'pointer',
          background: limitReached ? '#d1d5db' : running ? '#a5b4fc' : '#6366f1',
          color: limitReached ? '#6b7280' : 'white',
          transition: 'background 0.2s',
          marginBottom: 24,
        }}
      >
        {running
          ? `Running… (${stats?.batchSize ?? 20} products)`
          : limitReached
          ? 'Daily limit reached — come back tomorrow'
          : `Run Batch (${stats?.batchSize ?? 20} products)`}
      </button>

      {/* Messages */}
      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: '#fef2f2',
            border: '1px solid #fca5a5',
            borderRadius: 8,
            color: '#b91c1c',
            marginBottom: 16,
          }}
        >
          {error}
        </div>
      )}
      {message && (
        <div
          style={{
            padding: '12px 16px',
            background: '#f0fdf4',
            border: '1px solid #86efac',
            borderRadius: 8,
            color: '#15803d',
            marginBottom: 16,
          }}
        >
          {message}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div>
          <div style={{ marginBottom: 12, fontSize: 14, color: '#374151', fontWeight: 600 }}>
            Batch complete: {improved} improved · {failed} failed
          </div>
          <div
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              overflow: 'hidden',
              fontSize: 13,
            }}
          >
            {results.map((r, i) => (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 14px',
                  background: i % 2 === 0 ? '#fff' : '#f9fafb',
                  borderBottom: i < results.length - 1 ? '1px solid #f3f4f6' : undefined,
                }}
              >
                <span
                  style={{
                    width: 72,
                    flexShrink: 0,
                    fontWeight: 600,
                    color: r.status === 'improved' ? '#10b981' : '#ef4444',
                  }}
                >
                  {r.status === 'improved' ? '✓ Done' : '✗ Failed'}
                </span>
                <span style={{ color: '#111827', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.name}
                </span>
                <span style={{ color: '#9ca3af', flexShrink: 0 }}>#{r.id}</span>
                {r.reason && (
                  <span style={{ color: '#ef4444', fontSize: 11, flexShrink: 0 }}>{r.reason}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div
      style={{
        background: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        padding: '14px 16px',
      }}
    >
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color ?? '#111827' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
