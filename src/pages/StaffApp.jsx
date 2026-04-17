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

  // ✅ 修正①: I をここで定義
  const I = INDUSTRIES[salon] || Object.values(INDUSTRIES)[0]

  const [clients, setClients]         = useState([])
  const [records, setRecords]         = useState([])
  const [view, setView]               = useState('list')
  const [selClient, setSelClient]     = useState(null)
  const [selRecord, setSelRecord]     = useState(null)
  const [loading, setLoading]         = useState(false)
  const [qrTarget, setQrTarget]       = useState(null)
  const [photoViewer, setPhotoViewer] = useState(null)

  const [nc, setNc] = useState({ name:'', kana:'', phone:'', note:'' })
  const [nr, setNr] = useState({ date:new Date().toISOString().slice(0,10), menu:[], salonName:'', memo:'', shared:false })
  const [qrInput, setQrInput] = useState('')
  const [searchText, setSearchText] = useState('')
  const [ec, setEc] = useState({ name:'', kana:'', phone:'', note:'' })
  const [newPhotos, setNewPhotos] = useState([])

  const filteredClients = clients.filter((c) => {
    const q = searchText.toLowerCase()
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.kana || '').toLowerCase().includes(q)
    )
  })

  useEffect(() => {
    const unsub = subscribeClients(salon, setClients)
    setView('list')
    setSelClient(null)
    setSelRecord(null)
    return () => unsub?.()
  }, [])

  useEffect(() => {
    if (!selClient) return
    const unsub = subscribeRecords(selClient.id, setRecords)
    return unsub
  }, [selClient])

  const handleAddClient = async () => {
    if (!nc.name) return
    setLoading(true)
    await addClient({ ...nc })
    setNc({ name:'', kana:'', phone:'', note:'' })
    setLoading(false)
    setView('list')
  }

  function handleQrSearch() {
    const found = clients.find(c => c.qrId === qrInput)
    if (!found) { alert('お客様が見つかりません'); return }
    setSelClient(found)
    setView('clientDetail')
  }

  const handleAddRecord = async () => {
    if (!nr.menu.length || !selClient) return
    setLoading(true)
    const docRef = await addRecord(selClient.id, { ...nr, photos:[] })
    if (newPhotos.length > 0) await addStaffPhotos(selClient.id, docRef.id, newPhotos)
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
        <div style={{ fontSize:20, fontWeight:700, color:'#2d2028', marginBottom:20, fontFamily:fontAlt }}>新規お客様登録</div>
        {[['お名前','name','田中 さくら'],['ふりがな','kana','タナカ サクラ'],['電話番号','phone','090-0000-0000']].map(([label,key,ph])=>(
          <div key={key} style={{ marginBottom:14 }}>
            <SLabel>{label}</SLabel>
            <input placeholder={ph} value={nc[key]} onChange={e=>setNc(p=>({...p,[key]:e.target.value}))}
              style={{ width:'100%', background:'#fff', border:'1.5px solid #edd8de', borderRadius:12, color:'#2d2028', fontSize:15, padding:'11px 14px', fontFamily:font, outline:'none', boxSizing:'border-box' }} />
          </div>
        ))}
        <div style={{ marginBottom:20 }}>
          <SLabel>特記事項</SLabel>
          <textarea placeholder="アレルギー・頭皮状態など" value={nc.note} onChange={e=>setNc(p=>({...p,note:e.target.value}))}
            style={{ width:'100%', background:'#fff', border:'1.5px solid #edd8de', borderRadius:12, color:'#2d2028', fontSize:14, padding:'11px 14px', fontFamily:font, outline:'none', boxSizing:'border-box', resize:'vertical', minHeight:80 }} />
        </div>
        <Btn color={I.color} onClick={handleAddClient}>{loading ? '登録中...' : '登録する'}</Btn>
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

    // ✅ 修正②: clientDetail — } が正しく閉じている
    if (view === 'clientDetail' && selClient) {
      return (
        <div style={{ padding:'16px 18px 100px' }}>
          <Btn variant="outline" color="#b89ca4" small onClick={() => setView('list')} style={{ marginBottom:16 }}>← 戻る</Btn>
          <div style={{ display:'flex', gap:14, alignItems:'center', marginBottom:16 }}>
            <Avatar name={selClient.name} color={I.color} size={56} />
            <div>
              <div style={{ fontSize:20, fontWeight:700, color:'#2d2028', fontFamily:fontAlt }}>{selClient.name}</div>
              <div style={{ fontSize:12, color:'#b89ca4', fontFamily:font }}>{selClient.kana}</div>
              <div style={{ fontSize:12, color:'#b89ca4', fontFamily:font }}>{selClient.phone}</div>
            </div>
          </div>
          {selClient.note && (
            <div style={{ background:I.colorPale, borderRadius:12, padding:'10px 13px', fontSize:13, color:'#7a5f66', fontFamily:font, marginBottom:16 }}>
              {selClient.note}
            </div>
          )}
          <button
            onClick={() => {
              setEc({ name:selClient.name||'', kana:selClient.kana||'', phone:selClient.phone||'', note:selClient.note||'' })
              setView('editClient')
            }}
            style={{ marginBottom:20, background:'#fff', border:'1px solid #d9b8c3', borderRadius:10, padding:'10px 14px', cursor:'pointer', fontFamily:font }}
          >
            編集
          </button>
          <div style={{ fontSize:13, fontWeight:700, color:'#2d2028', fontFamily:fontAlt, marginBottom:10 }}>施術履歴</div>
          {records.length === 0 ? (
            <div style={{ textAlign:'center', color:'#b89ca4', padding:'40px 0', fontFamily:font }}>履歴なし</div>
          ) : (
            records.map(r => (
              <div key={r.id} style={{ background:'#fff', border:'1px solid #edd8de', borderRadius:12, padding:12, marginBottom:8 }}>
                <div style={{ fontSize:12, color:'#b89ca4', fontFamily:font, marginBottom:4 }}>{r.date}</div>
                <div style={{ fontSize:14, color:'#2d2028', fontFamily:font }}>{Array.isArray(r.menu) ? r.menu.join(' / ') : r.menu}</div>
                {r.memo && <div style={{ fontSize:12, color:'#7a5f66', fontFamily:font, marginTop:4 }}>{r.memo}</div>}
              </div>
            ))
          )}
        </div>
      )
    } // ✅ ここで正しく閉じている

    if (view === 'scanQr') {
      return (
        <div style={{ padding:'16px 18px 100px' }}>
          <Btn variant="outline" color="#b89ca4" small onClick={() => setView('list')} style={{ marginBottom:16 }}>← 戻る</Btn>
          <div style={{ background:'#fff', border:'1px solid #edd8de', borderRadius:14, padding:16 }}>
            <div style={{ fontSize:18, fontWeight:700, marginBottom:8, fontFamily:fontAlt }}>QRを読み取る</div>
            <input
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              placeholder="QRコードを入力"
              style={{ padding:8, width:'100%', marginTop:10, boxSizing:'border-box', border:'1px solid #edd8de', borderRadius:8, fontFamily:font }}
            />
            <div style={{ marginTop:10 }}>
              <Btn color={I.color} onClick={handleQrSearch}>お客様を開く</Btn>
            </div>
          </div>
        </div>
      )
    }

    // list
    return (
      <div style={{ padding:'16px 18px 100px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div style={{ fontSize:12, fontWeight:600, color:'#b89ca4', letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:font }}>
            お客様
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Btn color={I.color} small onClick={() => setView('addClient')}>作成</Btn>
            <Btn color={I.color} small onClick={() => setView('scanQr')}>QR</Btn>
          </div>
        </div>
        {clients.length === 0 ? (
          <div style={{ textAlign:'center', color:'#b89ca4', padding:'60px 0', fontFamily:font }}>
            お客様が見つかりません
          </div>
        ) : (
          clients.map((c) => (
            <div
              key={c.id}
              onClick={() => { setSelClient(c); setView('clientDetail') }}
              style={{ background:'#fff', border:'1px solid #edd8de', borderRadius:12, padding:12, marginBottom:8, display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}
            >
              <Avatar name={c.name} color={I.color} size={44} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:16, fontWeight:600, color:'#2d2028', fontFamily:fontAlt }}>{c.name}</div>
                <div style={{ fontSize:12, color:'#b89ca4', fontFamily:font }}>{c.kana}</div>
              </div>
              <Badge color={I.color}>{c.recordCount || 0}件</Badge>
            </div>
          ))
        )}
      </div>
    )
  }

  return (
    <div style={{ fontFamily:font, background:'#fdf6f8', minHeight:'100vh' }}>
      {renderContent()}
      {qrTarget && (
        <QRModal
          record={qrTarget.record}
          client={qrTarget.client}
          I={I}
          onClose={() => setQrTarget(null)}
        />
      )}
    </div>
  )
}
