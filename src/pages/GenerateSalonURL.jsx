import { useState } from 'react'
import { addDoc, collection } from 'firebase/firestore'
import { db } from '../firebase/config'

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
  const [input, setInput] = useState('')
  const [salonId, setSalonId] = useState('')
  const [password, setPassword] = useState('')
  const [copied, setCopied] = useState(false)
  const [copiedPw, setCopiedPw] = useState(false)
  const [salonName, setSalonName] = useState('')

  const handleLogin = () => {
    if (input === ADMIN_PASSWORD) {
      setAuthed(true)
    } else {
      alert('パスワードが違います')
    }
  }

  const url = salonId ? `${window.location.origin}/staff?salon=${salonId}` : ''

  const handleGenerate = async () => {
    if (!salonName.trim()) { alert('サロン名を入力してください'); return }
    const newSalonId = generateSalonId()
    const newPassword = generatePassword()
    await addDoc(collection(db, 'salons'), {
      salonId: newSalonId,
      password: newPassword,
      salonName: salonName.trim(),
      createdAt: new Date(),
    })
    setSalonId(newSalonId)
    setPassword(newPassword)
    setCopied(false)
    setCopiedPw(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleCopyPw = () => {
    navigator.clipboard.writeText(password).then(() => {
      setCopiedPw(true)
      setTimeout(() => setCopiedPw(false), 2000)
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
      <button onClick={handleLogin} style={{ width: '100%', background: '#c97d8e', color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
        ログイン
      </button>
    </div>
  )

  return (
    <div style={{ padding: 16, maxWidth: 480, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: 16 }}>サロンURL発行</h2>

      <input
        type="text"
        value={salonName}
        onChange={e => setSalonName(e.target.value)}
        placeholder="サロン名を入力"
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', marginBottom: 12 }}
      />
      <button onClick={handleGenerate} style={{ background: '#c97d8e', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}>
        🔗 サロンURLを発行する
      </button>

      {url && (
        <div>
          <div style={{ background: '#f9f0f3', border: '1px solid #ddd', borderRadius: 8, padding: 12, fontSize: 13, wordBreak: 'break-all', marginBottom: 8 }}>
            {url}
          </div>
          <button onClick={handleCopy} style={{ background: copied ? '#7bbf9a' : '#fff', color: copied ? '#fff' : '#c97d8e', border: '1px solid #c97d8e', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}>
            {copied ? '✓ コピーしました' : 'URLをコピー'}
          </button>

          <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 8, padding: 12, marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#f57c00', marginBottom: 4 }}>パスワード（再表示不可）</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 2, color: '#2d2028' }}>{password}</div>
          </div>
          <button onClick={handleCopyPw} style={{ background: copiedPw ? '#7bbf9a' : '#fff', color: copiedPw ? '#fff' : '#c97d8e', border: '1px solid #c97d8e', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 16 }}>
            {copiedPw ? '✓ コピーしました' : 'パスワードをコピー'}
          </button>

          <div style={{ background: '#fdecea', borderRadius: 8, padding: 10, fontSize: 12, color: '#c62828' }}>
            ⚠️ このパスワードは再表示できません。必ずコピーして保管してください。
          </div>
        </div>
      )}
    </div>
  )
}
