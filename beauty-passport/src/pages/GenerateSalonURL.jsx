import { useState } from 'react'
import { createSalon } from '../firebase/db'

const ADMIN_PASSWORD = 'beauty2026'

function generateSalonId() {
  const random = Math.random().toString(36).slice(2, 8)
  return `salon-${random}`
}

function generatePassword() {
  return Math.random().toString(36).slice(2, 10)
}

export default function GenerateSalonURL() {
  const [authed, setAuthed] = useState(false)
  const [adminInput, setAdminInput] = useState('')
  const [password, setPassword] = useState('')
  const [url, setUrl] = useState('')
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedPw, setCopiedPw] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleLogin = () => {
    if (adminInput === ADMIN_PASSWORD) {
      setAuthed(true)
    } else {
      alert('パスワードが違います')
    }
  }

  const handleGenerate = async () => {
    const newSalonId = generateSalonId()
    const newPassword = generatePassword()
    const newUrl = `${window.location.origin}/staff?salon=${newSalonId}`

    setSaving(true)
    try {
      await createSalon(newSalonId, newPassword)
      setPassword(newPassword)
      setUrl(newUrl)
      setCopiedUrl(false)
      setCopiedPw(false)
    } catch (e) {
      alert('保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const copy = (text, setCopied) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!authed) return (
    <div style={{ padding: 32, maxWidth: 320, margin: '80px auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: 16 }}>管理者ページ</h2>
      <input
        type="password"
        value={adminInput}
        onChange={e => setAdminInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleLogin()}
        placeholder="管理者パスワードを入力"
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
        disabled={saving}
        style={{ background: '#c97d8e', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 20 }}
      >
        {saving ? '発行中...' : '🔗 サロンURLを発行する'}
      </button>

      {url && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#999', marginBottom: 4 }}>サロン専用URL</div>
            <div style={{ background: '#f9f0f3', border: '1px solid #ddd', borderRadius: 8, padding: 12, fontSize: 13, wordBreak: 'break-all', marginBottom: 8 }}>
              {url}
            </div>
            <button
              onClick={() => copy(url, setCopiedUrl)}
              style={{ background: copiedUrl ? '#7bbf9a' : '#fff', color: copiedUrl ? '#fff' : '#c97d8e', border: '1px solid #c97d8e', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              {copiedUrl ? '✓ コピーしました' : 'URLをコピー'}
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#999', marginBottom: 4 }}>サロン専用パスワード</div>
            <div style={{ background: '#f9f0f3', border: '1px solid #ddd', borderRadius: 8, padding: 12, fontSize: 16, fontWeight: 700, letterSpacing: '0.1em', marginBottom: 8 }}>
              {password}
            </div>
            <button
              onClick={() => copy(password, setCopiedPw)}
              style={{ background: copiedPw ? '#7bbf9a' : '#fff', color: copiedPw ? '#fff' : '#c97d8e', border: '1px solid #c97d8e', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              {copiedPw ? '✓ コピーしました' : 'パスワードをコピー'}
            </button>
          </div>

          <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#7a6000' }}>
            ⚠️ この画面を閉じる前に、URLとパスワードを必ず控えてください。
          </div>
        </div>
      )}
    </div>
  )
}