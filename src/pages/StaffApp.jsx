import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { subscribeClients, subscribeRecords, addClient, addRecord, addStaffPhotos, getSalonById, getClientByQrId } from '../firebase/db'

const MENUS = ['カット','カラー','パーマ','縮毛矯正','ブリーチ1回','ブリーチ2回','ブリーチ3回','ハイライト','ローライト','トーンダウン']

export default function StaffApp() {
  const salon = new URLSearchParams(window.location.search).get('salon') || 'hair'
  const urlQrId = new URLSearchParams(window.location.search).get('qr')
  const [authed, setAuthed] = useState(false)
  const [salonData, setSalonData] = useState(null)
  const [pwInput, setPwInput] = useState('')
  const [pwError, setPwError] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  const [view, setView] = useState('list')
  const [clients, setClients] = useState([])
  const [selClient, setSelClient] = useState(null)
  const [records, setRecords] = useState([])
  const [selRecord, setSelRecord] = useState(null)
  const [loadingClients, setLoadingClients] = useState(true)
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [uploading, setUploading] = useState(false)

  const fileInputRef = useRef()
  const [form, setForm] = useState({ name: '', kana: '', phone: '', note: '', menu: [] })
  const [showAddRecord, setShowAddRecord] = useState(false)
  const [newRecord, setNewRecord] = useState({ date: new Date().toISOString().slice(0,10), menu: [], memo: '' })
  const [savingRecord, setSavingRecord] = useState(false)


  useEffect(() => {
    getSalonById(salon).then(data => {
      setSalonData(data); console.log("salonData loaded:", data)
      setCheckingAuth(false)
    })
  }, [salon])

  const handleLogin = () => {
    if (!salonData) { setPwError(true); return }
    if (pwInput === salonData.password) {
      setAuthed(true)
      setPwError(false)
    } else {
      setPwError(true)
    }
  }

  useEffect(() => {
    setLoadingClients(true)
    const unsub = subscribeClients(salon, (data) => {
      setClients(data)
      setLoadingClients(false)
    })
    return () => unsub?.()
  }, [salon])

  useEffect(() => {
    if (!selClient) return
    setLoadingRecords(true)
    const unsub = subscribeRecords(selClient.id, (data) => {
      setRecords(data)
      setLoadingRecords(false)
      // 選択中のrecordを最新データで更新
      if (selRecord) {
        const updated = data.find(r => r.id === selRecord.id)
        if (updated) setSelRecord(updated)
      }
    })
    return () => unsub?.()
  }, [selClient?.id])

  useEffect(() => {
    if (!authed || !urlQrId) return
    getClientByQrId(urlQrId).then(client => {
      if (client) {
        setSelClient(client)
        setView('detail')
      }
    })
  }, [authed, urlQrId])

  const openDetail = (client) => {
    if (selClient?.id !== client.id) {
      setRecords([])
      setSelClient(client)
    }
    setShowQR(false)
    setView('detail')
  }

  const openRecord = (record) => {
    setSelRecord(record)
    setView('record')
  }

  const toggleMenu = (m) => {
    setForm(f => ({
      ...f,
      menu: f.menu.includes(m) ? f.menu.filter(x => x !== m) : [...f.menu, m]
    }))
  }
  const handleAddRecord = async () => {
    if (!newRecord.menu.length || !selClient) return
    setSavingRecord(true)
    try {
      await addRecord(selClient.id, {
        date: newRecord.date,
        menu: newRecord.menu,
        memo: newRecord.memo,
        photos: [],
        shared: true,
        salonId: salon,
        salonName: salonData?.salonName || '',
      })
      setNewRecord({ date: new Date().toISOString().slice(0,10), menu: [], memo: '' })
      setShowAddRecord(false)
    } catch (e) {
      alert('保存に失敗しました')
    } finally {
      setSavingRecord(false)
    }
  }


  const handleCreate = async () => {
    if (!form.name) { alert('お名前を入力してください'); return }
    setSaving(true)
    try {
      const docRef = await addClient(salon, {
        name: form.name,
        kana: form.kana,
        phone: form.phone,
        note: form.note,
      })
      if (form.menu.length > 0) {
        await addRecord(docRef.id, {
          date: new Date().toISOString().slice(0, 10),
          menu: form.menu,
          memo: '',
          photos: [],
          shared: true,
        })
      }
      setForm({ name: '', kana: '', phone: '', note: '', menu: [] })
      setView('list')
    } catch (e) {
      console.error('登録エラー:', e)
      alert('登録に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selClient || !selRecord) return
    setUploading(true)
    try {
      await addStaffPhotos(selClient.id, selRecord.id, [file])
    } catch (e) {
      console.error('アップロードエラー:', e)
      alert('アップロードに失敗しました')
    } finally {
      setUploading(false)
    }
  }

  const qrUrl = `${window.location.origin}/client?salon=${salon}&qr=${selClient?.qrId}`

  // 一覧画面
  if (checkingAuth) return <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>読み込み中...</div>

  if (!authed) return (
    <div style={{ padding: 32, maxWidth: 320, margin: "80px auto", fontFamily: "sans-serif" }}>
      <h2 style={{ marginBottom: 16 }}>スタッフログイン</h2>
      <input
        type="password"
        value={pwInput}
        onChange={e => setPwInput(e.target.value)}
        onKeyDown={e => e.key === "Enter" && handleLogin()}
        placeholder="パスワードを入力"
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box", marginBottom: 8 }}
      />
      {pwError && <div style={{ color: "#c97d8e", fontSize: 13, marginBottom: 8 }}>パスワードが違います</div>}
      <button onClick={handleLogin} style={{ width: "100%", background: "#c97d8e", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>ログイン</button>
    </div>
  )

  if (view === 'list') return (
    <div style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>お客様一覧</h2>
        <button onClick={() => setView('addClient')} style={primaryBtn}>＋ お客様を登録</button>
      </div>

      {loadingClients && <div style={{ color: '#999' }}>読み込み中...</div>}

      {!loadingClients && clients.length === 0 && (
        <div style={{ color: '#999' }}>お客様が見つかりません</div>
      )}

      {clients.map(c => (
        <div
          key={c.id}
          onClick={() => openDetail(c)}
          style={{ border: '1px solid #ddd', borderRadius: 10, padding: 14, marginBottom: 10, cursor: 'pointer', background: '#fff' }}
        >
          <div style={{ fontWeight: 700, fontSize: 16 }}>{c.name}</div>
          <div style={{ color: '#999', fontSize: 13 }}>{c.kana}</div>
          <div style={{ color: '#999', fontSize: 13 }}>{c.phone}</div>
        </div>
      ))}
    </div>
  )

  // お客様登録画面
  if (view === 'addClient') return (
    <div style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      <button onClick={() => setView('list')} style={backBtn}>← キャンセル</button>
      <h2 style={{ margin: '16px 0 20px' }}>お客様を登録</h2>

      {[['お名前 *', 'name', '田中 さくら'], ['ふりがな', 'kana', 'たなか さくら'], ['電話番号', 'phone', '090-0000-0000']].map(([label, key, ph]) => (
        <div key={key} style={{ marginBottom: 14 }}>
          <div style={labelStyle}>{label}</div>
          <input
            value={form[key]}
            onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            placeholder={ph}
            style={inputStyle}
          />
        </div>
      ))}

      <div style={{ marginBottom: 14 }}>
        <div style={labelStyle}>特記事項</div>
        <textarea
          value={form.note}
          onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
          placeholder="アレルギー・頭皮状態など"
          style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
        />
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={labelStyle}>メニュー（複数選択可）</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
          {MENUS.map(m => {
            const selected = form.menu.includes(m)
            return (
              <button
                key={m}
                onClick={() => toggleMenu(m)}
                style={{
                  padding: '8px 14px', borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  background: selected ? '#c97d8e' : '#fff',
                  color: selected ? '#fff' : '#999',
                  border: selected ? '1.5px solid #c97d8e' : '1.5px solid #ddd',
                }}
              >
                {m}
              </button>
            )
          })}
        </div>
      </div>

      <button onClick={handleCreate} disabled={saving} style={primaryBtn}>
        {saving ? '登録中...' : '登録する'}
      </button>
    </div>
  )

  // お客様詳細画面
  if (view === 'detail') return (
    <div style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      <button onClick={() => setView('list')} style={backBtn}>← 一覧に戻る</button>

      <h2 style={{ margin: '16px 0 4px' }}>{selClient?.name}</h2>
      <div style={{ color: '#999', fontSize: 13, marginBottom: 4 }}>{selClient?.kana}</div>
      <div style={{ color: '#999', fontSize: 13, marginBottom: 4 }}>{selClient?.phone}</div>
      {selClient?.note && (
        <div style={{ background: '#f9f0f3', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>
          {selClient.note}
        </div>
      )}

      <button onClick={() => setShowQR(v => !v)} style={{ ...backBtn, marginBottom: 16 }}>
        {showQR ? 'QRを閉じる' : '📷 QRで共有'}
      </button>

      {showQR && (
        <div style={{ textAlign: 'center', background: '#f9f0f3', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#999', marginBottom: 12 }}>お客様にスキャンしてもらってください</div>
          <QRCodeSVG value={qrUrl} size={200} />
          <div style={{ fontSize: 11, color: '#bbb', marginTop: 12, wordBreak: 'break-all' }}>{qrUrl}</div>
        </div>
      )}

      <h3 style={{ marginBottom: 10 }}>施術履歴</h3>

      <button onClick={() => setShowAddRecord(v => !v)} style={{ ...primaryBtn, marginBottom: 16, fontSize: 13 }}>
        {showAddRecord ? 'キャンセル' : '＋ 施術記録を追加'}
      </button>

      {showAddRecord && (
        <div style={{ background: '#f9f0f3', borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <div style={{ marginBottom: 10 }}>
            <div style={labelStyle}>日付</div>
            <input type="date" value={newRecord.date} onChange={e => setNewRecord(r => ({ ...r, date: e.target.value }))} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={labelStyle}>メニュー（複数選択可）</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
              {MENUS.map(m => {
                const selected = newRecord.menu.includes(m)
                return (
                  <button key={m} onClick={() => setNewRecord(r => ({ ...r, menu: selected ? r.menu.filter(x => x !== m) : [...r.menu, m] }))}
                    style={{ padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: selected ? '#c97d8e' : '#fff', color: selected ? '#fff' : '#999',
                      border: selected ? '1.5px solid #c97d8e' : '1.5px solid #ddd' }}>
                    {m}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={labelStyle}>メモ</div>
            <textarea value={newRecord.memo} onChange={e => setNewRecord(r => ({ ...r, memo: e.target.value }))} placeholder="施術メモ" style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={labelStyle}>写真</div>
            <input type="file" accept="image/*" multiple onChange={e => setNewRecord(r => ({ ...r, photoFiles: Array.from(e.target.files) }))} style={{ fontSize: 13, marginTop: 6 }} />
            {newRecord.photoFiles?.length > 0 && <div style={{ fontSize: 12, color: '#c97d8e', marginTop: 4 }}>{newRecord.photoFiles.length}枚選択中</div>}
          </div>
          <button onClick={handleAddRecord} disabled={savingRecord} style={primaryBtn}>
            {savingRecord ? '保存中...' : '保存する'}
          </button>
        </div>
      )}
      {loadingRecords && <div style={{ color: '#999' }}>読み込み中...</div>}

      {!loadingRecords && records.length === 0 && (
        <div style={{ color: '#999' }}>履歴がありません</div>
      )}

      {records.map(r => (
        <div
          key={r.id}
          onClick={() => openRecord(r)}
          style={{ border: '1px solid #ddd', borderRadius: 10, padding: 14, marginBottom: 10, cursor: 'pointer', background: '#fff' }}
        >
          <div style={{ fontSize: 13, color: '#999', marginBottom: 4 }}>{r.date}</div>
          <div style={{ fontWeight: 600 }}>
            {Array.isArray(r.menu) ? r.menu.join(' / ') : (r.menu || '—')}
          </div>
        </div>
      ))}
    </div>
  )

  // 履歴詳細画面
  if (view === 'record') return (
    <div style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>
      <button onClick={() => setView('detail')} style={backBtn}>← 詳細に戻る</button>

      <h2 style={{ margin: '16px 0 8px' }}>施術記録</h2>
      <div style={{ color: '#999', fontSize: 13, marginBottom: 8 }}>{selRecord?.date}</div>

      <div style={{ marginBottom: 12 }}>
        <div style={labelStyle}>メニュー</div>
        <div>{Array.isArray(selRecord?.menu) ? selRecord.menu.join(' / ') : (selRecord?.menu || '—')}</div>
      </div>

      {selRecord?.memo && (
        <div style={{ marginBottom: 12 }}>
          <div style={labelStyle}>メモ</div>
          <div style={{ lineHeight: 1.7 }}>{selRecord.memo}</div>
        </div>
      )}

      {/* 写真エリア */}
      <div style={{ marginBottom: 12 }}>
        <div style={labelStyle}>写真</div>

        {Array.isArray(selRecord?.photos) && selRecord.photos.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, marginBottom: 10 }}>
            {selRecord.photos.map((url, i) => (
              <img key={i} src={url} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 6 }} />
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handlePhotoUpload}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={backBtn}
        >
          {uploading ? 'アップロード中...' : '📷 写真を追加'}
        </button>
      </div>
    </div>
  )

  return null
}

const backBtn = {
  background: '#fff', border: '1px solid #ccc', borderRadius: 8,
  padding: '8px 14px', cursor: 'pointer', fontSize: 14,
}

const primaryBtn = {
  background: '#c97d8e', color: '#fff', border: 'none', borderRadius: 8,
  padding: '12px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
}

const labelStyle = {
  fontSize: 11, fontWeight: 600, color: '#999',
  textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.05em',
}

const inputStyle = {
  width: '100%', border: '1px solid #ddd', borderRadius: 8,
  padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
