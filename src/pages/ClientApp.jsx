import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { INDUSTRIES } from '../industries'
import { getClientByQrId, subscribeRecords, addClientPhotos, deleteClientPhoto } from '../firebase/db'

const font    = "'DM Sans', 'Noto Sans JP', sans-serif"
const fontAlt = "'Playfair Display', 'Noto Serif JP', serif"
const initials = n => (n||'').replace(/\s/g,'').slice(0,2)

const Avatar = ({ name, color, size=44 }) => (
  <div style={{ width:size, height:size, borderRadius:'50%', background:`linear-gradient(135deg,${color},${color}aa)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:size*0.32, fontFamily:fontAlt, flexShrink:0 }}>
    {initials(name)}
  </div>
)

const MenuTag = ({ children, color }) => (
  <span style={{ background:color+'18', color, border:`1px solid ${color}44`, borderRadius:999, fontSize:12, fontWeight:600, padding:'4px 12px', fontFamily:font, whiteSpace:'nowrap' }}>{children}</span>
)

// ── 写真追加モーダル ────────────────────────────────────────────────────────────
function AddPhotoModal({ record, clientId, I, onDone, onClose }) {
  const ref = useRef()
  const [files, setFiles]     = useState([])
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
            {previews.map((src,i) => (
              <img key={i} src={src} alt="" style={{ width:84, height:84, objectFit:'cover', borderRadius:12, border:`1.5px solid ${I.colorBorder}` }} />
            ))}
          </div>
        ) : (
          <div onClick={()=>ref.current?.click()} style={{ border:`2px dashed ${I.color}`, borderRadius:14, padding:'24px', textAlign:'center', cursor:'pointer', background:I.colorPale, color:I.color, fontFamily:font, fontSize:13, marginBottom:16 }}>
            <div style={{ fontSize:28, marginBottom:6 }}>📷</div>
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

// ── メイン ─────────────────────────────────────────────────────────────────────
export default function ClientApp() {
  const params  = new URLSearchParams(window.location.search)
  const salonId = params.get('salon') || 'hair'
  const urlQrId = params.get('qr')
  const I       = INDUSTRIES[salonId] || INDUSTRIES.hair

  const [client, setClient]       = useState(null)
  const [records, setRecords]     = useState([])
  const [loading, setLoading]     = useState(!!urlQrId)
  const [view, setView]           = useState('feed')
  const [selRecord, setSelRecord] = useState(null)
  const [addPhoto, setAddPhoto]   = useState(null)
  const [showQR, setShowQR] = useState(false)
  const [photoViewer, setPhotoViewer] = useState(null)

  // qrIdからお客様情報を取得
  useEffect(() => {
    if (!urlQrId) { setLoading(false); return }
    getClientByQrId(urlQrId).then(c => {
      setClient(c)
      setLoading(false)
    })
  }, [urlQrId])

  // 施術記録をリアルタイム取得
  useEffect(() => {
    if (!client) return
    const unsub = subscribeRecords(client.id, recs => {
      setRecords(recs.filter(r => r.shared))
    })
    return unsub
  }, [client])

  const qrUrl = `${window.location.origin}/client?salon=${salonId}&qr=${urlQrId}`

  const sharedRecs    = records
  const allGridPhotos = sharedRecs.flatMap(r =>
    [...(r.photos||[]),...(r.clientPhotos||[])].map(p => ({ photo:p, record:r }))
  )

  // ローディング中
  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', fontFamily:font, color:'#b89ca4' }}>読み込み中...</div>
  )

  // qrIdなし or お客様が見つからない
  if (!urlQrId || !client) return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', padding:32, fontFamily:font, textAlign:'center' }}>
      <img src="/logo.svg" alt="logo" style={{ width:80, height:80, borderRadius:16, marginBottom:24 }} />
      <div style={{ fontSize:18, fontWeight:700, color:'#2d2028', fontFamily:fontAlt, marginBottom:8 }}>リンクが正しくありません</div>
      <div style={{ fontSize:13, color:'#b89ca4' }}>スタッフから受け取ったリンクを開いてください</div>
    </div>
  )

  // 詳細ビュー
  const renderDetail = () => {
    if (!selRecord) return null
    const allPhotos = [...(selRecord.photos||[]),...(selRecord.clientPhotos||[])]
    return (
      <div style={{ paddingBottom:80 }}>
        {allPhotos.length > 0 ? (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2 }}>
            {allPhotos.map((src,i) => (
              <div key={i} onClick={()=>setPhotoViewer({photos:allPhotos,idx:i})} style={{ paddingTop:'100%', position:'relative', cursor:'pointer', background:I.colorPale }}>
                <div style={{ position:'absolute', inset:0 }}><img src={src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /></div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ width:'100%', paddingTop:'50%', position:'relative', background:I.colorPale }}>
            <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:I.color, fontFamily:font, fontSize:13 }}>
              <span style={{ fontSize:32, marginBottom:6 }}>📷</span>写真なし
            </div>
          </div>
        )}
        <div style={{ padding:'16px 18px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
            <button onClick={()=>setView('feed')} style={{ background:'none', border:'1.5px solid #edd8de', borderRadius:999, padding:'7px 16px', fontSize:12, fontWeight:600, color:'#b89ca4', cursor:'pointer', fontFamily:font }}>← 戻る</button>
            <button onClick={()=>setAddPhoto(selRecord)} style={{ background:`linear-gradient(135deg,${I.color},${I.colorDeep})`, border:'none', borderRadius:999, padding:'8px 18px', fontSize:12, fontWeight:700, color:'#fff', cursor:'pointer', fontFamily:font, display:'flex', alignItems:'center', gap:5, boxShadow:`0 3px 10px ${I.color}44` }}>
              📷 写真を追加
            </button>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
            <Avatar name={client.name} color={I.color} size={38} />
            <div>
              <div style={{ fontSize:15, fontWeight:700, color:'#2d2028', fontFamily:fontAlt }}>{client.name}</div>
              <div style={{ fontSize:12, color:'#b89ca4', fontFamily:font }}>📅 {selRecord.date}</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
            {(selRecord.menu||[]).map(m => <MenuTag key={m} color={I.colorDeep}>{m}</MenuTag>)}
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

  // フィードビュー
  const renderFeed = () => (
    <div style={{ paddingBottom:80 }}>
      <div style={{ background:'#fff', borderBottom:'1px solid #edd8de', padding:'16px 18px 14px' }}>
        <div style={{ display:'flex', gap:18, alignItems:'center' }}>
          <Avatar name={client.name} color={I.color} size={68} />
          <div>
            <div style={{ fontSize:22, fontWeight:700, color:'#2d2028', fontFamily:fontAlt }}>{client.name}</div>
            <div style={{ display:'flex', gap:18, marginTop:10 }}>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:18, fontWeight:700, fontFamily:fontAlt }}>{sharedRecs.length}</div>
                <div style={{ fontSize:11, color:'#b89ca4', fontFamily:font }}>施術</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <div style={{ fontSize:18, fontWeight:700, fontFamily:fontAlt }}>{allGridPhotos.length}</div>
                <div style={{ fontSize:11, color:'#b89ca4', fontFamily:font }}>写真</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {allGridPhotos.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2, marginBottom:2 }}>
          {allGridPhotos.map(({photo,record},i) => (
            <div key={i} onClick={()=>{setSelRecord(record);setView('detail')}} style={{ paddingTop:'100%', position:'relative', cursor:'pointer', background:I.colorPale }}>
              <div style={{ position:'absolute', inset:0 }}><img src={photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /></div>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: allGridPhotos.length>0?`2px solid #edd8de`:'none' }}>
        <div style={{ margin: '16px 0', textAlign: 'center' }}>
          <button onClick={() => setShowQR(v => !v)} style={{ background: '#c97d8e', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {showQR ? 'QRを閉じる' : '次回サロンで見せるQR'}
          </button>
          {showQR && (
            <div style={{ marginTop: 16, padding: 20, background: '#f9f0f3', borderRadius: 12 }}>
              <QRCodeSVG value={qrUrl} size={200} />
              <div style={{ fontSize: 12, color: '#999', marginTop: 12 }}>次回サロン来店時にこのQRをスタイリストへ見せてください</div>
              <div style={{ fontSize: 11, color: '#bbb', marginTop: 8, wordBreak: 'break-all' }}>{qrUrl}</div>
            </div>
          )}
        </div>
        {sharedRecs.length===0 && (
          <div style={{ textAlign:'center', color:'#b89ca4', padding:'80px 0', fontFamily:font }}>
            <div style={{ fontSize:40, marginBottom:10 }}>📷</div>
            まだ施術記録がありません
          </div>
        )}
        {sharedRecs.map(r => {
          const photos = [...(r.photos||[]),...(r.clientPhotos||[])]
          return (
            <div key={r.id} style={{ background:'#fff', borderBottom:'1px solid #f5e6ea' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px 10px' }}>
                <Avatar name={client.name} color={I.color} size={34} />
                <div style={{ flex:1, cursor:'pointer' }} onClick={()=>{setSelRecord(r);setView('detail')}}>
                  <div style={{ fontSize:14, fontWeight:600, color:'#2d2028', fontFamily:fontAlt }}>{client.name}</div>
                  <div style={{ fontSize:11, color:'#b89ca4', fontFamily:font }}>{r.salonName}　{r.date}</div>
                </div>
                <div style={{ display:'flex', gap:4 }}>
                  {(r.menu||[]).slice(0,2).map(m => <MenuTag key={m} color={I.colorDeep}>{m}</MenuTag>)}
                </div>
              </div>
              {photos.length>0 ? (
                <div style={{ width:'100%', paddingTop:'100%', position:'relative', cursor:'pointer' }} onClick={()=>{setSelRecord(r);setView('detail')}}>
                  <div style={{ position:'absolute', inset:0 }}><img src={photos[0]} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /></div>
                  {photos.length>1 && <div style={{ position:'absolute', top:10, right:10, background:'rgba(0,0,0,0.45)', color:'#fff', borderRadius:999, fontSize:11, fontFamily:font, padding:'3px 8px' }}>1/{photos.length}</div>}
                </div>
              ) : (
                <div style={{ width:'100%', paddingTop:'50%', position:'relative', background:I.colorPale, cursor:'pointer' }} onClick={()=>{setSelRecord(r);setView('detail')}}>
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', color:I.color, fontFamily:font, fontSize:13, flexDirection:'column' }}>
                    <span style={{ fontSize:24, marginBottom:4 }}>📷</span>写真なし
                  </div>
                </div>
              )}
              <div style={{ padding:'10px 14px 14px', cursor:'pointer' }} onClick={()=>{setSelRecord(r);setView('detail')}}>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
                  {(r.menu||[]).map(m => <MenuTag key={m} color={I.colorDeep}>{m}</MenuTag>)}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&family=Noto+Sans+JP:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`*{box-sizing:border-box;}body{margin:0;background:${I.bg};}button{-webkit-tap-highlight-color:transparent;}`}</style>

      <div style={{ fontFamily:font, background:I.bg, minHeight:'100vh', maxWidth:420, margin:'0 auto' }}>
        <div style={{ background:'#fff', borderBottom:'1px solid #edd8de', padding:'13px 18px 11px', position:'sticky', top:0, zIndex:100, boxShadow:`0 1px 10px ${I.color}12`, display:'flex', alignItems:'center' }}>
          <div style={{ fontSize:18, fontWeight:700, color:'#2d2028', fontFamily:fontAlt }}>{I.name}</div>
        </div>

        {view==='detail' ? renderDetail() : renderFeed()}
      </div>

      {addPhoto && (
        <AddPhotoModal record={addPhoto} clientId={client.id} I={I}
          onDone={()=>setAddPhoto(null)} onClose={()=>setAddPhoto(null)} />
      )}

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
