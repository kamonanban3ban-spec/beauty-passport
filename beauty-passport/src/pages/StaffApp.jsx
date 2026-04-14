import { useState, useEffect, useRef } from 'react'
import { INDUSTRIES } from '../industries'
import {
  subscribeClients, subscribeRecords,
  addClient, addRecord, updateRecord, deleteRecord,
  addStaffPhotos,
} from '../firebase/db'

const font    = "'DM Sans', 'Noto Sans JP', sans-serif"
const fontAlt = "'Playfair Display', 'Noto Serif JP', serif"
const initials = n => (n || '').replace(/\s/g, '').slice(0, 2)

// ── Shared UI ──────────────────────────────────────────────────────────────────
const Btn = ({ children, variant='fill', color, onClick, style={}, small=false }) => (
  <button onClick={onClick} style={{
    background: variant==='fill' ? color : '#fff',
    color:      variant==='fill' ? '#fff' : color,
    border:     `1.5px solid ${color}`,
    borderRadius: 999, padding: small ? '7px 16px' : '12px 24px',
    fontSize: small ? 12 : 14, fontWeight: 600, cursor: 'pointer',
    fontFamily: font, transition: 'all 0.18s',
    width: variant==='fill' && !small ? '100%' : 'auto',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    boxShadow: variant==='fill' ? `0 3px 10px ${color}33` : 'none', ...style,
  }}>{children}</button>
)

const Avatar = ({ name, color, size=44 }) => (
  <div style={{ width:size, height:size, borderRadius:'50%', background:`linear-gradient(135deg,${color},${color}aa)`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:size*0.32, fontFamily:fontAlt, flexShrink:0 }}>
    {initials(name)}
  </div>
)

const SLabel = ({ children }) => (
  <div style={{ fontSize:11, fontWeight:600, color:'#b89ca4', letterSpacing:'0.09em', textTransform:'uppercase', marginBottom:6, fontFamily:font }}>{children}</div>
)

const Badge = ({ children, color }) => (
  <span style={{ background:color+'20', color, border:`1px solid ${color}55`, borderRadius:999, fontSize:11, fontWeight:600, padding:'3px 9px', fontFamily:font, whiteSpace:'nowrap', display:'inline-flex', alignItems:'center' }}>{children}</span>
)

// ── Photo uploader ─────────────────────────────────────────────────────────────
function PhotoUploader({ onChange, color }) {
  const ref = useRef()
  return (
    <div>
      <div onClick={() => ref.current?.click()} style={{ border:`2px dashed ${color}`, borderRadius:14, padding:'20px', textAlign:'center', cursor:'pointer', background:color+'10', color, fontFamily:font, fontSize:13 }}>
        <div style={{ fontSize:28, marginBottom:6 }}>📷</div>
        タップして写真を選ぶ
      </div>
      <input ref={ref} type="file" accept="image/*" multiple style={{ display:'none' }}
        onChange={e => onChange(Array.from(e.target.files))} />
    </div>
  )
}

// ── QR Modal ───────────────────────────────────────────────────────────────────
function QRModal({ record, client, I, onClose }) {
  const url = `${window.location.origin}/client?salon=${I.id}&qr=${client.qrId}`
  const [copied, setCopied] = useState(false)
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.3)', backdropFilter:'blur(5px)', zIndex:200, display:'flex', alignItems:'flex-end', justifyContent:'center' }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'#fff', borderRadius:'24px 24px 0 0', padding:'24px 22px 48px', width:'100%', maxWidth:420 }}>
        <div style={{ width:38, height:4, background:'#edd8de', borderRadius:2, margin:'0 auto 20px' }} />
        <div style={{ fontSize:16, fontWeight:700, color:'#2d2028', fontFamily:fontAlt, marginBottom:4 }}>{client.name}</div>
        <div style={{ fontSize:12, color:'#b89ca4', fontFamily:font, marginBottom:18 }}>施術記録をQRで共有</div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', background:I.colorPale, borderRadius:20, padding:'24px', marginBottom:16 }}>
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(url)}&bgcolor=${I.colorPale.replace('#','')}&color=${I.colorDeep.replace('#','')}&margin=8`} alt="QR" style={{ borderRadius:12, width:180, height:180 }} />
          <div style={{ fontSize:11, color:'#b89ca4', fontFamily:font, marginTop:12, textAlign:'center' }}>お客様にスキャンしてもらってください</div>
        </div>
        <div style={{ display:'flex', gap:10, marginBottom:12 }}>
          <Btn variant={copied?'fill':'outline'} color={I.color} onClick={()=>{navigator.clipboard.writeText(url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000)})}} style={{ flex:1 }}>
            {copied ? '✓ コピーしました' : 'URLをコピー'}
          </Btn>
          <a href={`https://line.me/R/msg/text/?${encodeURIComponent(`【${I.name}】${client.name}さんの施術記録です✨\n${url}`)}`} target="_blank" rel="noreferrer"
            style={{ flex:1, background:'#06C755', color:'#fff', border:'none', borderRadius:999, padding:'12px 0', fontSize:14, fontFamily:font, fontWeight:600, textAlign:'center', textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
            LINEで送る
          </a>
        </div>
        <Btn variant="outline" color="#b89ca4" onClick={onClose}>閉じる</Btn>
      </div>
    </div>
  )
}

// ── Staff App ──────────────────────────────────────────────────────────────────
export default function StaffApp() {
  const urlSalon = new URLSearchParams(window.location.search).get('salon') || 'hair'
  const [salon, setSalon]             = useState(urlSalon)
  const [clients, setClients]         = useState([])
  const [records, setRecords]         = useState([])
  const [view, setView]               = useState('list')
  const [selClient, setSelClient]     = useState(null)
  const [selRecord, setSelRecord]     = useState(null)
  const [loading, setLoading]         = useState(false)
  const [qrTarget, setQrTarget]       = useState(null)
  const [photoViewer, setPhotoViewer] = useState(null)

  // forms
  const [nc, setNc] = useState({ name:'', kana:'', phone:'', note:'' })
  const [nr, setNr] = useState({ date:new Date().toISOString().slice(0,10), menu:[], salonName:'', memo:'', shared:false })
  const [newPhotos, setNewPhotos] = useState([])

  const I = INDUSTRIES[salon]

  // リアルタイムでお客様一覧を取得
  useEffect(() => {
    const unsub = subscribeClients(salon, setClients)
    setView('list'); setSelClient(null); setSelRecord(null)
    return unsub
  }, [salon])

  // 選択中のお客様の施術記録を取得
  useEffect(() => {
    if (!selClient) return
    const unsub = subscribeRecords(selClient.id, setRecords)
    return unsub
  }, [selClient])

  const handleAddClient = async () => {
    if (!nc.name) return
    setLoading(true)
    const docRef = await addClient(salon, { ...nc })
    setNc({ name:'', kana:'', phone:'', note:'' })
    setLoading(false)
    setView('list')
  }

  const handleAddRecord = async () => {
    if (!nr.menu.length || !selClient) return
    setLoading(true)
    const docRef = await addRecord(selClient.id, { ...nr, photos:[] })
    if (newPhotos.length > 0) {
      await addStaffPhotos(selClient.id, docRef.id, newPhotos)
    }
    setNr({ date:new Date().toISOString().slice(0,10), menu:[], salonName:'', memo:'', shared:false })
    setNewPhotos([])
    setView('profile')
    setLoading(false)
  }

  const handleToggleShare = async (recordId, current) => {
    await updateRecord(selClient.id, recordId, { shared: !current })
  }

  const handleDeleteRecord = async (recordId) => {
    if (!window.confirm('削除しますか？')) return
    await deleteRecord(selClient.id, recordId)
    setView('profile')
  }

  const renderContent = () => {
    if (view === 'addClient') return (
      <div style={{ padding:'16px 18px 100px' }}>
        <Btn variant="outline" color="#b89ca4" small onClick={()=>setView('list')} style={{ marginBottom:22 }}>← キャンセル</Btn>
              <Btn color={I.color} onClick={handleAddClient}>{loading ? '登録中...' : '登録する'}</Btn>
        <div style={{ fontSize:20, fontWeight:700, color:'#2d2028', marginBottom:20, fontFamily:fontAlt }}>新規お客様登録</div>
        {[['お名前','name','田中 さくら'],['ふりがな','kana','タナカ サクラ'],['電話番号','phone','090-0000-0000']].map(([label,key,ph])=>(
          <div key={key} style={{ marginBottom:14 }}>
            <SLabel>{label}</SLabel>
            <input placeholder={ph} value={nc[key]} onChange={e=>setNc(p=>({...p,[key]:e.target.value}))}
              style={{ width:'100%', background:'#fff', border:'1.5px solid #edd8de', borderRadius:12, color:'#2d2028', fontSize:15, padding:'11px 14px', fontFamily:font, outline:'none', boxSizing:'border-box' }} />
          </div>
        ))}
        <div style={{ marginBottom:14 }}>
          <SLabel>特記事項</SLabel>
          <textarea placeholder="アレルギー・頭皮状態など" value={nc.note} onChange={e=>setNc(p=>({...p,note:e.target.value}))}
            style={{ width:'100%', background:'#fff', border:'1.5px solid #edd8de', borderRadius:12, color:'#2d2028', fontSize:14, padding:'11px 14px', fontFamily:font, outline:'none', boxSizing:'border-box', resize:'vertical', minHeight:80, marginBottom:0 }} />
        </div>

        <div style={{ marginBottom:14 }}>
          <SLabel>🏪 {I.salonLabel}</SLabel>
          <input placeholder="例：Hair Salon Mika" value={nr.salonName} onChange={e=>setNr(p=>({...p,salonName:e.target.value}))}
            style={{ width:'100%', background:'#fff', border:'1.5px solid #edd8de', borderRadius:12, color:'#2d2028', fontSize:15, padding:'11px 14px', fontFamily:font, outline:'none', boxSizing:'border-box' }} />
        </div>

        <div style={{ marginBottom:14 }}>
          
                <div style={{ marginBottom:14 }}>
                  <SLabel>メニュー（複数選択可）</SLabel>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:6 }}>
                    {['カット','カラー','パーマ','縮毛矯正','ブリーチ1回','ブリーチ2回','ブリーチ3回','ハイライト','ローライト','トーンダウン'].map(m => {
                      const selected = (nr.menu||[]).includes(m)
                      return (
                        <button key={m} onClick={()=>setNr(p=>({ ...p, menu: selected ? p.menu.filter(x=>x!==m) : [...(p.menu||[]),m] }))}
                          style={{ padding:'8px 14px', borderRadius:999, fontSize:13, fontWeight:600, cursor:'pointer',
                            background: selected ? I.color : '#fff',
                            color: selected ? '#fff' : '#b89ca4',
                            border: selected ? '1.5px solid ' + I.color : '1.5px solid #edd8de' }}>
                          {m}
                        </button>
                      )
                    })}
                  </div>
                </div>
<SLabel>📝 メモ</SLabel>
          <textarea placeholder={I.memoPlaceholder} value={nr.memo} onChange={e=>setNr(p=>({...p,memo:e.target.value}))}
            style={{ width:'100%', background:'#fff', border:'1.5px solid #edd8de', borderRadius:12, color:'#2d2028', fontSize:14, padding:'11px 14px', fontFamily:font, outline:'none', boxSizing:'border-box', resize:'vertical', minHeight:84 }} />
        </div>

        <SLabel>🔓 お客様への共有</SLabel>
        <div style={{ display:'flex', gap:10, marginBottom:24 }}>
          {[true,false].map(v=>(
            <button key={String(v)} onClick={()=>setNr(p=>({...p,shared:v}))} style={{ flex:1, padding:'11px 0', borderRadius:12, cursor:'pointer', background:nr.shared===v?(v?'#7bbf9a':I.color):'#fff', color:nr.shared===v?'#fff':'#b89ca4', border:`1.5px solid ${nr.shared===v?(v?'#7bbf9a':I.color):'#edd8de'}`, fontFamily:font, fontSize:13, fontWeight:600 }}>
              {v ? '公開する' : '非公開'}
            </button>
          ))}
        </div>
        <Btn color={I.color} onClick={handleAddRecord}>{loading ? '保存中...' : '保存する'}</Btn>
      </div>
    )

    if (view === 'profile' && selClient) {
      const allPhotos = records.flatMap(r=>[...(r.photos||[]),...(r.clientPhotos||[])].map(p=>({photo:p,record:r})))
      return (
        <div style={{ paddingBottom:90 }}>
          <div style={{ background:'#fff', borderBottom:'1px solid #edd8de', padding:'16px 18px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
              <Btn variant="outline" color="#b89ca4" small onClick={()=>{setSelClient(null);setView('list')}}>← 戻る</Btn>
              <div style={{ display:'flex', gap:8 }}>
                <Btn variant="outline" color={I.colorDeep} small onClick={()=>setQrTarget({record:records[0],client:selClient})}>QR共有</Btn>
                <Btn color={I.color} small onClick={()=>setView('addRecord')}>+ 追加</Btn>
              </div>
            </div>
            <div style={{ display:'flex', gap:18, alignItems:'center' }}>
              <Avatar name={selClient.name} color={I.color} size={68} />
              <div>
                <div style={{ fontSize:22, fontWeight:700, color:'#2d2028', fontFamily:fontAlt }}>{selClient.name}</div>
                <div style={{ fontSize:12, color:'#b89ca4', fontFamily:font, marginTop:2 }}>{selClient.kana}　{selClient.phone}</div>
                <div style={{ display:'flex', gap:18, marginTop:10 }}>
                  <div style={{ textAlign:'center' }}><div style={{ fontSize:18, fontWeight:700, fontFamily:fontAlt }}>{records.length}</div><div style={{ fontSize:11, color:'#b89ca4', fontFamily:font }}>施術</div></div>
                  <div style={{ textAlign:'center' }}><div style={{ fontSize:18, fontWeight:700, fontFamily:fontAlt }}>{allPhotos.length}</div><div style={{ fontSize:11, color:'#b89ca4', fontFamily:font }}>写真</div></div>
                </div>
              </div>
            </div>
            {selClient.note && <div style={{ marginTop:12, background:I.colorPale, borderRadius:12, padding:'10px 13px', fontSize:13, color:'#7a5f66', fontFamily:font }}>{selClient.note}</div>}
          </div>

          {allPhotos.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2 }}>
              {allPhotos.map(({photo},i) => (
                <div key={i} onClick={()=>setPhotoViewer({photos:allPhotos.map(p=>p.photo),idx:i})} style={{ paddingTop:'100%', position:'relative', cursor:'pointer', background:I.colorPale }}>
                  <div style={{ position:'absolute', inset:0 }}>
                    <img src={photo} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ borderTop:'1px solid #f5e6ea', marginTop:2 }}>
            {records.map(r => (
              <div key={r.id} style={{ background:'#fff', borderBottom:'1px solid #f5e6ea', padding:'14px 18px', cursor:'pointer' }} onClick={()=>{setSelRecord(r);setView('detail')}}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <div style={{ fontSize:12, color:'#b89ca4', fontFamily:font }}>{r.date}</div>
                  <Badge color={r.shared?'#7bbf9a':'#b89ca4'}>{r.shared?'公開中':'非公開'}</Badge>
                </div>
                <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginBottom:6 }}>
                  {(r.menu||[]).map(m=><Badge key={m} color={I.colorDeep}>{m}</Badge>)}
                </div>
                <div style={{ fontSize:12, color:'#b89ca4', fontFamily:font }}>🏪 {r.salonName}</div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (view === 'detail' && selRecord) return (
      <div style={{ paddingBottom:90 }}>
        {(selRecord.photos||[]).length > 0 && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2 }}>
            {selRecord.photos.map((src,i)=>(
              <div key={i} onClick={()=>setPhotoViewer({photos:selRecord.photos,idx:i})} style={{ paddingTop:'100%', position:'relative', cursor:'pointer' }}>
                <div style={{ position:'absolute', inset:0 }}><img src={src} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} /></div>
              </div>
            ))}
          </div>
        )}
        <div style={{ padding:'16px 18px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16 }}>
            <Btn variant="outline" color="#b89ca4" small onClick={()=>setView('profile')}>← 戻る</Btn>
            <div style={{ display:'flex', gap:8 }}>
              <Btn variant="outline" color={selRecord.shared?'#7bbf9a':I.color} small onClick={()=>handleToggleShare(selRecord.id,selRecord.shared)}>
                {selRecord.shared?'非公開にする':'お客様に公開'}
              </Btn>
              <Btn variant="outline" color="#e06060" small onClick={()=>handleDeleteRecord(selRecord.id)}>削除</Btn>
            </div>
          </div>
          <div style={{ fontSize:13, color:'#b89ca4', fontFamily:font, marginBottom:10 }}>{selRecord.date}</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
            {(selRecord.menu||[]).map(m=><Badge key={m} color={I.colorDeep}>{m}</Badge>)}
          </div>
          <div style={{ background:I.colorPale, border:`1px solid ${I.colorBorder}`, borderRadius:14, padding:'12px 14px', marginBottom:10 }}>
            <div style={{ fontSize:10, fontWeight:600, color:I.color, letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:4, fontFamily:font }}>🏪 {I.salonLabel}</div>
            <div style={{ fontSize:14, color:'#2d2028', fontFamily:font }}>{selRecord.salonName||'—'}</div>
          </div>
          {selRecord.memo && (
            <div style={{ background:'#f0f2f4', borderRadius:14, padding:'12px 14px' }}>
              <div style={{ fontSize:10, fontWeight:600, color:'#9aa0a6', letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:4, fontFamily:font }}>📝 メモ</div>
              <div style={{ fontSize:14, color:'#2d2028', fontFamily:font, lineHeight:1.8 }}>{selRecord.memo}</div>
            </div>
          )}
        </div>
      </div>
    )

    // list
    return (
      <div style={{ padding:'16px 18px 100px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'#b89ca4', letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:font }}>お客様一覧 · {clients.length}名</div>
          <Btn color={I.color} small onClick={()=>setView('addClient')}>+ 新規登録</Btn>
        </div>
        {clients.length===0 && <div style={{ textAlign:'center', color:'#b89ca4', padding:'60px 0', fontFamily:font }}>お客様を登録してください</div>}
        {clients.map(c=>(
          <div key={c.id} onClick={()=>{setSelClient(c);setView('profile')}} style={{ background:'#fff', border:'1px solid #edd8de', borderRadius:18, marginBottom:10, padding:'14px 18px', cursor:'pointer', display:'flex', gap:14, alignItems:'center', boxShadow:`0 1px 8px ${I.color}10` }}>
            <Avatar name={c.name} color={I.color} size={44} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16, fontWeight:600, color:'#2d2028', fontFamily:fontAlt }}>{c.name}</div>
              <div style={{ fontSize:12, color:'#b89ca4', fontFamily:font }}>{c.kana}</div>
            </div>
            <Badge color={I.color}>{c.recordCount||0}件</Badge>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@600;700&family=Noto+Sans+JP:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`*{box-sizing:border-box;}body{margin:0;background:${I.bg};}button,input,textarea{-webkit-tap-highlight-color:transparent;}input:focus,textarea:focus{border-color:${I.color}!important;outline:none;}input[type=date]::-webkit-calendar-picker-indicator{opacity:0.5;}`}</style>

      <div style={{ fontFamily:font, background:I.bg, minHeight:'100vh', maxWidth:420, margin:'0 auto' }}>
        {/* Header */}
        <div style={{ background:'#fff', borderBottom:'1px solid #edd8de', padding:'13px 18px 11px', position:'sticky', top:0, zIndex:100, boxShadow:`0 1px 10px ${I.color}12` }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ fontSize:18, fontWeight:700, color:'#2d2028', fontFamily:fontAlt }}>{I.name}</div>
            </div>
            {/* 業種表示 */}
            <div style={{ display:'flex', gap:4 }}>
              {Object.values(INDUSTRIES).map(ind=>(
                <button key={ind.id} onClick={() => setSalon(ind.id)} style={{ ... }}>
                  {ind.id==='hair'?'Hair':ind.id==='nail'?'Nail':'Lash'}
                </button>
              ))}
            </div>

          </div>
        </div>

        {renderContent()}

        {/* Bottom Nav */}
        <div style={{ background:'#fff', borderTop:'1px solid #edd8de', position:'fixed', bottom:0, width:'100%', maxWidth:420, zIndex:100, padding:'8px 18px 20px', display:'flex', justifyContent:'center' }}>
          <div style={{ fontSize:11, color:'#b89ca4', fontFamily:font, fontWeight:600 }}>スタッフモード</div>
        </div>
      </div>

      {/* QR Modal */}
      {qrTarget && <QRModal record={qrTarget.record} client={qrTarget.client} I={I} onClose={()=>setQrTarget(null)} />}

      {/* Photo Viewer */}
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
// force redeploy 2026年 4月13日 月曜日 22時38分26秒 JST
