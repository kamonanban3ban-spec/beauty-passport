import { useState, useEffect, useRef } from 'react'
import { INDUSTRIES } from '../industries'
import { getClientByQrId, subscribeRecords, addClientPhotos } from '../firebase/db'

const font    = "'DM Sans', 'Noto Sans JP', sans-serif"
const fontAlt = "'Playfair Display', 'Noto Serif JP', serif"
const initials = n => (n||'').replace(/\s/g,'').slice(0,2)

const Avatar = ({ name, color, size=44 }) => (
  <div style={{ width:size, height:size, borderRadius:'50%', background:`linear-gradient(135deg,${color},${color}aa)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:size*0.32, fontFamily:fontAlt, flexShrink:0 }}>
    {initials(name)}
  </div>
)

const MenuTag = ({ children, color }) => (
  <span style={{ background:color+'18', color, border:`1px solid ${color}44`, borderRadius:999, fontSize:11, fontWeight:600, padding:'3px 10px', fontFamily:font, whiteSpace:'nowrap' }}>{children}</span>
)

// ── ID入力画面（受付QR用）─────────────────────────────────────────────────────
function QrIdInput({ I, onFound }) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const search = async () => {
    const id = input.trim()
    if (!id) return
    setLoading(true)
    setError('')
    const client = await getClientByQrId(id)
    setLoading(false)
    if (client) {
      onFound(client)
    } else {
      setError('IDが見つかりません。スタッフに確認してください。')
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'52px 28px', justifyContent:'center', minHeight:'80vh' }}>
      <div style={{ fontSize:24, fontWeight:700, color:'#2d2028', marginBottom:8, fontFamily:fontAlt, textAlign:'center' }}>{I.name}</div>
      <div style={{ fontSize:13, color:'#b89ca4', marginBottom:36, fontFamily:font, textAlign:'center', lineHeight:1.8 }}>
        スタッフから受け取った<br/>マイIDを入力してください
      </div>

      <div style={{ width:'100%', marginBottom:12 }}>
        <input
          placeholder="例：hair_abc12345"
          value={input}
          onChange={e=>{ setInput(e.target.value); setError('') }}
          onKeyDown={e=>e.key==='Enter'&&search()}
          style={{ width:'100%', background:'#fff', border:`1.5px solid ${I.colorBorder}`, borderRadius:14, color:'#2d2028', fontSize:15, padding:'13px 16px', fontFamily:font, outline:'none', boxSizing:'border-box' }}
        />
      </div>

      {error && <div style={{ fontSize:13, color:'#e06060', fontFamily:font, marginBottom:14, textAlign:'center' }}>{error}</div>}

      <button onClick={search} disabled={!input.trim()||loading} style={{ width:'100%', background:input.trim()?`linear-gradient(135deg,${I.color},${I.colorDeep})`:'#ddd', color:'#fff', border:'none', borderRadius:999, padding:'14px', fontSize:15, fontWeight:700, cursor:input.trim()?'pointer':'default', fontFamily:font, boxShadow:input.trim()?`0 4px 16px ${I.color}44`:'none', marginBottom:20 }}>
        {loading ? '検索中...' : 'カルテを開く'}
      </button>

      <div style={{ background:I.colorPale, border:`1px solid ${I.colorBorder}`, borderRadius:14, padding:'14px 16px', width:'100%', fontSize:12, color:'#7a5f66', fontFamily:font, lineHeight:1.8 }}>
        💡 マイIDはスタッフから施術後に<br/>お渡しするカードに記載されています
      </div>
    </div>
  )
}

// ── Passcode Gate ──────────────────────────────────────────────────────────────
function PasscodeGate({ client, I, onSuccess }) {
  const [input, setInput] = useState('')
  const [shake, setShake] = useState(false)
  const [ok, setOk]       = useState(false)
  const tryCode = code => {
    if (code===client.passcode) { setOk(true); setTimeout(onSuccess,400) }
    else if (code.length===4)  { setShake(true); setTimeout(()=>{setShake(false);setInput('')},550) }
  }
  const press = d => { const n=input+d; setInput(n); if(n.length===4) tryCode(n) }
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'52px 28px', justifyContent:'center', minHeight:'80vh' }}>
      <Avatar name={client.name} color={I.color} size={72} />
      <div style={{ fontSize:22, fontWeight:700, color:'#2d2028', marginTop:18, marginBottom:4, fontFamily:fontAlt }}>{client.name}</div>
      <div style={{ fontSize:13, color:'#b89ca4', marginBottom:44, fontFamily:font }}>パスコードを入力してください</div>
      <div style={{ display:'flex', gap:16, marginBottom:48, animation:shake?'shake 0.5s':'none' }}>
        {[0,1,2,3].map(i=>(
          <div key={i} style={{ width:18, height:18, borderRadius:'50%', background:i<input.length?(ok?'#7bbf9a':I.color):'transparent', border:`2px solid ${i<input.length?(ok?'#7bbf9a':I.color):'#edd8de'}`, transition:'all 0.15s' }} />
        ))}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,72px)', gap:14, marginBottom:28 }}>
        {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((d,i)=>(
          <button key={i} onClick={()=>d==='⌫'?setInput(p=>p.slice(0,-1)):d!==''&&press(String(d))}
            style={{ width:72, height:72, borderRadius:'50%', fontSize:d==='⌫'?22:24, background:d===''?'transparent':I.colorLight, border:d===''?'none':`1.5px solid ${I.colorBorder}`, color:'#2d2028', cursor:d===''?'default':'pointer', fontFamily:font, fontWeight:500 }}>
            {d}
          </button>
        ))}
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-7px)}40%,80%{transform:translateX(7px)}}`}</style>
    </div>
  )
}

// ── Add Photo Modal ─────────────────────────────────────────────────────────────
function AddPhotoModal({ record, clientId, I, onDone, onClose }) {
  const ref = useRef()
  const [files, setFiles]       = useState([])
  const [previews, setPreviews] = useState([])
  const [loading, setLoading]   = useState(false)

  const handleFile = e => {
    const fs = Array.from(e.target.files)
    setFiles(fs)
    setPreviews(fs.map(f => URL.createObjectURL(f)))
  }

  const upload = async () => {
    if (!files.length) return
    setLoading(true)
    await addClientPhotos(clientId, record.id, files)
    setLoading(false)
    onDone()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', backdropFilter:'blur(5px)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:'28px 28px 0 0', padding:'24px 22px 48px', width:'100%', maxWidth:420, maxHeight:'85vh', overflowY:'auto' }}>
        <div style={{ width:40, height:5, background:'#edd8de', borderRadius:3, margin:'0 auto 20px' }} />
        <div style={{ fontSize:18, fontWeight:700, color:'#2d2028', marginBottom:4, fontFamily:fontAlt }}>写真を追加</div>
        <div style={{ fontSize:12, color:'#b89ca4', fontFamily:font, marginBottom:20 }}>{record.date}　{(record.menu||[]).join('・')}</div>
        <div style={{ background:I.colorPale, border:`1px solid ${I.colorBorder}`, borderRadius:12, padding:'11px 14px', marginBottom:18, fontSize:12, color:I.colorDeep, fontFamily:font }}>
          📌 追加した写真はスタッフと共有されます
        </div>
        {previews.length > 0 ? (
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:16 }}>
            {previews.map((src,i)=>(
              <img key={i} src={src} alt="" style={{ width:84, height:84, objectFit:'cover', borderRadius:12, border:`1.5px solid ${I.colorBorder}` }} />
            ))}
          </div>
        ) : (
          <div onClick={()=>ref.current?.click()} style={{ border:`2px dashed ${I.color}`, borderRadius:14, padding:'24px', textAlign:'center', cursor:'pointer', background:I.colorPale, color:I.color, fontFamily:font, fontSize:13, marginBottom:16 }}>
            <div style={{ fontSize:28, marginBottom:6 }}>＋</div>
            タップして写真を選ぶ
          </div>
        )}
        <input ref={ref} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handleFile} />
        {previews.length > 0 && (
          <button onClick={()=>ref.current?.click()} style={{ background:'none', border:`1.5px solid ${I.colorBorder}`, borderRadius:999, padding:'8px 16px', fontSize:12, color:'#b89ca4', cursor:'pointer', fontFamily:font, marginBottom:16, width:'100%' }}>
            別の写真を選び直す
          </button>
        )}
        <button onClick={upload} disabled={!files.length||loading} style={{ width:'100%', background:files.length?`linear-gradient(135deg,${I.color},${I.colorDeep})`:'#ddd', color:'#fff', border:'none', borderRadius:999, padding:'13px', fontSize:15, fontWeight:700, cursor:files.length?'pointer':'default', fontFamily:font, marginBottom:10 }}>
          {loading ? 'アップロード中...' : 'アップロードする'}
        </button>
        <button onClick={onClose} style={{ width:'100%', background:'none', border:'1.5px solid #edd8de', borderRadius:999, padding:'11px', fontSize:14, color:'#b89ca4', cursor:'pointer', fontFamily:font, fontWeight:600 }}>キャンセル</button>
      </div>
    </div>
  )
}

// ── 施術選択モーダル ────────────────────────────────────────────────────────────
function PostSelectModal({ records, I, onSelect, onClose }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(6px)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:'28px 28px 0 0', padding:'24px 0 48px', width:'100%', maxWidth:420, maxHeight:'70vh', overflowY:'auto' }}>
        <div style={{ width:40, height:5, background:'#edd8de', borderRadius:3, margin:'0 auto 20px' }} />
        <div style={{ fontSize:16, fontWeight:700, color:'#2d2028', fontFamily:fontAlt, padding:'0 20px 16px' }}>どの施術に写真を追加しますか？</div>
        {records.map(r => (
          <div key={r.id} onClick={()=>onSelect(r)} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 20px', borderTop:'1px solid #f5e6ea', cursor:'pointer' }}>
            {(r.photos||[])[0] ? (
              <img src={(r.photos||[])[0]} alt="" style={{ width:52, height:52, objectFit:'cover', borderRadius:10, border:`1.5px solid ${I.colorBorder}`, flexShrink:0 }} />
            ) : (
              <div style={{ width:52, height:52, borderRadius:10, background:I.colorPale, border:`1.5px solid ${I.colorBorder}`, display:'flex', alignItems:'center', justifyContent:'center', color:I.color, fontSize:22, flexShrink:0 }}>＋</div>
            )}
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'#2d2028', fontFamily:fontAlt }}>{r.date}</div>
              <div style={{ fontSize:11, color:'#b89ca4', fontFamily:font, marginTop:2 }}>{r.salonName}　{(r.menu||[]).join('・')}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Client App ─────────────────────────────────────────────────────────────────
export default function ClientApp() {
  const params  = new URLSearchParams(window.location.search)
  const salonId = params.get('salon') || 'hair'
  const urlQrId = params.get('qr')
  const I       = INDUSTRIES[salonId] || INDUSTRIES.hair

  const [client, setClient]           = useState(null)
  const [qrId, setQrId]               = useState(urlQrId)
  const [records, setRecords]         = useState([])
  const [loggedIn, setLoggedIn]       = useState(false)
  const [loading, setLoading]         = useState(!!urlQrId)
  const [view, setView]               = useState('feed')
  const [selRecord, setSelRecord]     = useState(null)
  const [addPhoto, setAddPhoto]       = useState(null)
  const [photoViewer, setPhotoViewer] = useState(null)
  const [postSelect, setPostSelect]   = useState(false)

  useEffect(() => {
    if (!urlQrId) return
    getClientByQrId(urlQrId).then(c => {
      setClient(c)
      setLoading(false)
    })
  }, [urlQrId])

  useEffect(() => {
    if (!loggedIn || !client) return
    const unsub = subscribeRecords(client.id, recs => {
      setRecords(recs.filter(r => r.shared))
    })
    return unsub
  }, [loggedIn, client])

  const allGridPhotos = records.flatMap(r=>[...(r.photos||[]),...(r.clientPhotos||[])].map(p=>({photo:p,record:r})))

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', fontFamily:font, color:'#b89ca4' }}>読み込み中...</div>
  )

  const renderContent = () => {
    if (!client) return (
      <QrIdInput I={I} onFound={c => { setClient(c); setQrId(c.qrId) }} />
    )

    if (!loggedIn) return (
      <PasscodeGate client={client} I={I} onSuccess={()=>{ setLoggedIn(true); setView('feed') }} />
    )

    // 詳細画面
    if (view==='detail' && selRecord) {
      const allPhotos = [...(selRecord.photos||[]),...(selRecord.clientPhotos||[])]
      return (
        <div style={{ paddingBottom:80 }}>
          {/* ヘッダー */}
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderBottom:'1px solid #f5e6ea', background:'#fff', position:'sticky', top:56, zIndex:90 }}>
            <button onClick={()=>setView('feed')} style={{ background:'none', border:'none', fontSize:22, cursor:'pointer', color:'#2d2028', padding:0 }}>←</button>
            <Avatar name={client.name} color={I.color} size={32} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:700, color:'#2d2028', fontFamily:fontAlt }}>{client.name}</div>
              <div style={{ fontSize:11, color:'#b89ca4', fontFamily:font }}>{selRecord.salonName}　{selRecord.date}</div>
            </div>
            <button onClick={()=>setAddPhoto(selRecord)} style={{ background:`linear-gradient(135deg,${I.color},${I.colorDeep})`, border:'none', borderRadius:999, padding:'7px 14px', fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer', fontFamily:font }}>
              ＋ 写真
            </button>
          </div>

          {/* 写真グリッド */}
          {allPhotos.length > 0 ? (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2 }}>
              {allPhotos.map((src,i)=>(
                <div key={i} onClick={()=>setPhotoViewer({photos:allPhotos,idx:i})} style={{ paddingTop:'100%', position:'relative', cursor:'pointer', background:I.colorPale }}>
                  <div style={{ position:'absolute', inset:0 }}><img src={src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /></div>
                </div>
              ))}
            </div>
          ) : (
            <div onClick={()=>setAddPhoto(selRecord)} style={{ margin:20, border:`2px dashed ${I.color}`, borderRadius:16, padding:'40px 20px', textAlign:'center', cursor:'pointer', background:I.colorPale, color:I.color, fontFamily:font }}>
              <div style={{ fontSize:32, marginBottom:8 }}>＋</div>
              <div style={{ fontSize:14, fontWeight:600 }}>写真を追加する</div>
            </div>
          )}

          {/* 施術情報 */}
          <div style={{ padding:'18px 16px' }}>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
              {(selRecord.menu||[]).map(m=><MenuTag key={m} color={I.colorDeep}>{m}</MenuTag>)}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <div style={{ background:I.colorPale, border:`1px solid ${I.colorBorder}`, borderRadius:14, padding:'11px 13px' }}>
                <div style={{ fontSize:10, fontWeight:600, color:I.color, letterSpacing:'0.07em', marginBottom:3, fontFamily:font }}>日付</div>
                <div style={{ fontSize:14, color:'#2d2028', fontFamily:font, fontWeight:600 }}>{selRecord.date}</div>
              </div>
              <div style={{ background:I.colorPale, border:`1px solid ${I.colorBorder}`, borderRadius:14, padding:'11px 13px' }}>
                <div style={{ fontSize:10, fontWeight:600, color:I.color, letterSpacing:'0.07em', marginBottom:3, fontFamily:font }}>サロン</div>
                <div style={{ fontSize:13, color:'#2d2028', fontFamily:font, fontWeight:600 }}>{selRecord.salonName||'—'}</div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    // フィード（インスタ風）
    return (
      <div style={{ paddingBottom:100 }}>
        {/* プロフィールヘッダー */}
        <div style={{ background:'#fff', borderBottom:'1px solid #edd8de', padding:'20px 18px 18px' }}>
          <div style={{ display:'flex', gap:24, alignItems:'center' }}>
            <Avatar name={client.name} color={I.color} size={76} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:20, fontWeight:700, color:'#2d2028', fontFamily:fontAlt, marginBottom:10 }}>{client.name}</div>
              <div style={{ display:'flex', gap:28 }}>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:20, fontWeight:700, fontFamily:fontAlt, color:'#2d2028' }}>{records.length}</div>
                  <div style={{ fontSize:11, color:'#b89ca4', fontFamily:font }}>施術</div>
                </div>
                <div style={{ textAlign:'center' }}>
                  <div style={{ fontSize:20, fontWeight:700, fontFamily:fontAlt, color:'#2d2028' }}>{allGridPhotos.length}</div>
                  <div style={{ fontSize:11, color:'#b89ca4', fontFamily:font }}>写真</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 写真グリッド */}
        {allGridPhotos.length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2, marginBottom:2 }}>
            {allGridPhotos.map(({photo,record},i)=>(
              <div key={i} onClick={()=>{setSelRecord(record);setView('detail')}} style={{ paddingTop:'100%', position:'relative', cursor:'pointer', background:I.colorPale }}>
                <div style={{ position:'absolute', inset:0 }}><img src={photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /></div>
              </div>
            ))}
          </div>
        )}

        {/* 施術カードリスト（インスタ投稿風） */}
        <div style={{ borderTop: allGridPhotos.length>0 ? `2px solid #edd8de` : 'none' }}>
          {records.length===0 && (
            <div style={{ textAlign:'center', color:'#b89ca4', padding:'80px 0', fontFamily:font }}>
              <div style={{ fontSize:36, marginBottom:10 }}>✦</div>
              まだ施術記録がありません
            </div>
          )}
          {records.map(r => {
            const photos = [...(r.photos||[]),...(r.clientPhotos||[])]
            return (
              <div key={r.id} style={{ background:'#fff', borderBottom:'1px solid #f5e6ea' }}>
                {/* 投稿ヘッダー */}
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px 10px' }}>
                  <Avatar name={client.name} color={I.color} size={34} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:700, color:'#2d2028', fontFamily:fontAlt }}>{client.name}</div>
                    <div style={{ fontSize:11, color:'#b89ca4', fontFamily:font }}>{r.salonName}　{r.date}</div>
                  </div>
                </div>

                {/* メイン写真 */}
                {photos.length > 0 ? (
                  <div onClick={()=>{setSelRecord(r);setView('detail')}} style={{ width:'100%', paddingTop:'100%', position:'relative', cursor:'pointer' }}>
                    <div style={{ position:'absolute', inset:0 }}>
                      <img src={photos[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    </div>
                    {photos.length > 1 && (
                      <div style={{ position:'absolute', top:10, right:10, background:'rgba(0,0,0,0.5)', color:'#fff', borderRadius:999, fontSize:11, fontFamily:font, padding:'3px 8px' }}>
                        1/{photos.length}
                      </div>
                    )}
                  </div>
                ) : (
                  <div onClick={()=>{setSelRecord(r);setView('detail')}} style={{ width:'100%', paddingTop:'75%', position:'relative', background:I.colorPale, cursor:'pointer' }}>
                    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:I.color, fontFamily:font, fontSize:13, flexDirection:'column', gap:6 }}>
                      <div style={{ fontSize:28 }}>＋</div>写真なし
                    </div>
                  </div>
                )}

                {/* 写真追加ボタン */}
                <div style={{ padding:'10px 14px 6px', display:'flex', justifyContent:'flex-end' }}>
                  <button onClick={()=>setAddPhoto(r)} style={{ background:`linear-gradient(135deg,${I.color},${I.colorDeep})`, border:'none', borderRadius:999, padding:'7px 16px', fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer', fontFamily:font, boxShadow:`0 2px 8px ${I.color}33` }}>
                    ＋ 写真を追加
                  </button>
                </div>

                {/* メニュー・日付・サロン名 */}
                <div style={{ padding:'4px 14px 16px', cursor:'pointer' }} onClick={()=>{setSelRecord(r);setView('detail')}}>
                  <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:8 }}>
                    {(r.menu||[]).map(m=><MenuTag key={m} color={I.colorDeep}>{m}</MenuTag>)}
                  </div>
                  <div style={{ fontSize:11, color:'#b89ca4', fontFamily:font }}>
                    {r.date} · {r.salonName}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&family=Noto+Sans+JP:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`*{box-sizing:border-box;}body{margin:0;background:${I.bg};}button{-webkit-tap-highlight-color:transparent;}`}</style>

      <div style={{ fontFamily:font, background:I.bg, minHeight:'100vh', maxWidth:420, margin:'0 auto' }}>
        {/* ナビゲーションバー */}
        <div style={{ background:'#fff', borderBottom:'1px solid #edd8de', padding:'13px 18px 11px', position:'sticky', top:0, zIndex:100, boxShadow:`0 1px 10px ${I.color}12`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontSize:18, fontWeight:700, color:'#2d2028', fontFamily:fontAlt }}>{I.name}</div>
          {loggedIn && (
            <button onClick={()=>{setLoggedIn(false);setClient(null);setQrId(null);setRecords([]);setView('feed')}} style={{ background:'none', border:'1.5px solid #edd8de', borderRadius:999, padding:'6px 14px', fontSize:12, color:'#b89ca4', cursor:'pointer', fontFamily:font, fontWeight:600 }}>ロック</button>
          )}
        </div>

        {renderContent()}

        {/* 写真投稿FABボタン */}
        {loggedIn && view==='feed' && records.length > 0 && (
          <button
            onClick={()=>setPostSelect(true)}
            style={{
              position:'fixed', bottom:28, left:'50%', transform:'translateX(-50%)',
              background:`linear-gradient(135deg,${I.color},${I.colorDeep})`,
              color:'#fff', border:'none', borderRadius:999,
              padding:'14px 28px', fontSize:15, fontWeight:700,
              cursor:'pointer', fontFamily:font,
              boxShadow:`0 4px 20px ${I.color}66`,
              zIndex:50, whiteSpace:'nowrap'
            }}
          >
            ＋ 写真を投稿
          </button>
        )}
      </div>

      {/* 施術選択モーダル */}
      {postSelect && (
        <PostSelectModal
          records={records}
          I={I}
          onSelect={r=>{ setAddPhoto(r); setPostSelect(false) }}
          onClose={()=>setPostSelect(false)}
        />
      )}

      {/* 写真追加モーダル */}
      {addPhoto && (
        <AddPhotoModal record={addPhoto} clientId={client.id} I={I}
          onDone={()=>setAddPhoto(null)} onClose={()=>setAddPhoto(null)} />
      )}

      {/* 写真ビューワー */}
      {photoViewer && (
        <div style={{ position:'fixed', inset:0, background:'#000', zIndex:300, display:'flex', flexDirection:'column' }}>
          <button onClick={()=>setPhotoViewer(null)} style={{ position:'absolute', top:16, right:20, background:'none', border:'none', color:'#fff', fontSize:30, cursor:'pointer', zIndex:10 }}>×</button>
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <img src={photoViewer.photos[photoViewer.idx]} alt="" style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }} />
          </div>
        </div>
      )}
    </>
  )
}
