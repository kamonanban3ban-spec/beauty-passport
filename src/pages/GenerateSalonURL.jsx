import { useState } from 'react'

function generateSalonId() {
  const random = Math.random().toString(36).slice(2, 8)
  return `salon-${random}`
}

export default function GenerateSalonURL() {
  const [salonId, setSalonId] = useState('')
  const [copied, setCopied] = useState(false)

  const url = salonId
    ? `${window.location.origin}/staff?salon=${salonId}`
    : ''

  const handleGenerate = () => {
    setSalonId(generateSalonId())
    setCopied(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{
      padding: 16,
      maxWidth: 480,
      margin: '0 auto',
      fontFamily: 'sans-serif',
    }}>
      <h2 style={{ marginBottom: 16 }}>サロンURL発行</h2>

      <button
        onClick={handleGenerate}
        style={{
          background: '#c97d8e',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '12px 20px',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 16,
        }}
      >
        🔗 サロンURLを発行する
      </button>

      {url && (
        <div>
          <div style={{
            background: '#f9f0f3',
            border: '1px solid #ddd',
            borderRadius: 8,
            padding: 12,
            fontSize: 13,
            wordBreak: 'break-all',
            marginBottom: 10,
          }}>
            {url}
          </div>

          <button
            onClick={handleCopy}
            style={{
              background: copied ? '#7bbf9a' : '#fff',
              color: copied ? '#fff' : '#c97d8e',
              border: '1px solid #c97d8e',
              borderRadius: 8,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {copied ? '✓ コピーしました' : 'URLをコピー'}
          </button>
        </div>
      )}
    </div>
  )
}
