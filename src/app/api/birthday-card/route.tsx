import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'

// Node.js runtime so we can read the template file from disk
export const runtime = 'nodejs'

const size = {
  width: 768,
  height: 768,
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const name = searchParams.get('name')?.trim() || 'Partner'
  const imageUrl = searchParams.get('image')?.trim() || ''
  const download = searchParams.get('download') === '1'

  // Read the template PNG from the public folder and convert to a base64 data URL.
  // This is the only reliable way to embed a local image in next/og — the Edge
  // runtime cannot fetch assets from the same server, which is why the template
  // was previously missing while only the external partner image appeared.
  const templatePath = path.join(process.cwd(), 'public', 'birthday template.png')
  const templateBuffer = fs.readFileSync(templatePath)
  const templateDataUrl = `data:image/png;base64,${templateBuffer.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          display: 'flex',
          backgroundColor: '#ffffff',
        }}
      >
        {/* Background template */}
        <img
          src={templateDataUrl}
          width={size.width}
          height={size.height}
          style={{ position: 'absolute', inset: 0 }}
        />

        {/* Partner photo */}
        <div
          style={{
            position: 'absolute',
            left: 86,
            top: 270,
            width: 220,
            height: 220,
            borderRadius: 8,
            overflow: 'hidden',
            backgroundColor: '#e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '4px solid #ffffff',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              width={220}
              height={220}
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <span
              style={{
                fontSize: 28,
                color: '#6b7280',
                fontWeight: 700,
              }}
            >
              {name.slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>

        {/* Partner name */}
        <div
          style={{
            position: 'absolute',
            left: 60,
            top: 520,
            width: 300,
            textAlign: 'center',
            fontSize: 28,
            fontWeight: 700,
            color: '#2f8f6b',
            fontFamily: 'Arial, sans-serif',
            lineHeight: 1.2,
            padding: '0 8px',
            textShadow: '0 1px 0 rgba(255,255,255,0.6)',
          }}
        >
          {name}
        </div>
      </div>
    ),
    {
      ...size,
      headers: download
        ? {
            'Content-Disposition': 'attachment; filename="birthday-card.png"',
          }
        : undefined,
    }
  )
}
