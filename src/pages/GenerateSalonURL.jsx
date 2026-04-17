import { useState } from 'react'

const ADMIN_PASSWORD = 'beauty2026'

function generateSalonId() {
  const random = Math.random().toString(36).slice(2, 8)
  return `salon-${random}`
}

export default function GenerateSalonURL() {
  const [authed, setAuthed] = useState(false)
  const [input, setInput] = useState('')
  const [salonId, setSalonId] = useState('')
  const [copied, setCopied] = useState(false)

  const handleLogin = () => {
    if (input === ADMIN_PASSWORD) {
      setAuthed(true)
    } else {
      alert('パスワードが違います')
    }
  }

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

  if (!authed) return (
    <div style={{ padding: 32, maxWidth: 320, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: 16 }}>管理者ページ</h2>
      <input
        type="password"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleLogin()}
        placeholder="パスワードを入力"
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', marginBottom: 12 }}
      />
      <button
        onClick={handleLogin}
        style={{ width: '100%', background: '#c97d8e', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
      >
        ログイン
      </button>
    </div>
  )

  return (
    <div style={{ padding: 16, maxWidth: 480, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: 16 }}>サロンURL発行</h2>

      <button
        onClick={handleGenerate}
        style={{ background: '#c97d8e', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}
      >
        🔗 サロンURLを発行する
      </button>

      {url && (
        <div>
          <div style={{ background: '#f9f0f3', border: '1px solid #ddd', borderRadius: 8, padding: 12, fontSize: 13, wordBreak: 'break-all', marginBottom: 10 }}>
            {url}
          </div>
          <button
            onClick={handleCopy}
            style={{ background: copied ? '#7bbf9a' : '#fff', color: copied ? '#fff' : '#c97d8e', border: '1px solid #c97d8e', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            {copied ? '✓ コピーしました' : 'URLをコピー'}
          </button>
        </div>
      )}
    </div>
  )
}
