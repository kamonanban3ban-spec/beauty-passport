// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Firebase Firestore 操作まとめ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, getDoc, query, where, orderBy, onSnapshot, serverTimestamp,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from './config'

// ── データ構造 ────────────────────────────────────────
// Firestore:
//   /clients/{clientId}
//     salon:    "hair" | "nail" | "lash"
//     name:     "田中 さくら"
//     kana:     "タナカ サクラ"
//     phone:    "090-..."
//     note:     "頭皮敏感..."
//     passcode: "1234"
//     qrId:     "hp_sakura01"  (ユニークID)
//     createdAt: timestamp
//
//   /clients/{clientId}/records/{recordId}
//     date:     "2026-03-15"
//     menu:     ["ブリーチ", "カラー"]
//     salon:    "Hair Salon Mika"
//     memo:     "..."
//     photos:   ["https://storage.url/..."]  (Storage URL)
//     clientPhotos: ["https://..."]
//     shared:   true
//     createdAt: timestamp

// ── お客様一覧を取得（リアルタイム）─────────────────
export function subscribeClients(salon, callback) {
  const q = query(
    collection(db, 'clients'),
    where('salon', '==', salon),
    orderBy('createdAt', 'desc')
  )
  return onSnapshot(q, snap => {
    const clients = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(clients)
  })
}

// ── お客様を登録 ────────────────────────────────────
export async function addClient(salon, data) {
  const qrId = `${salon}_${Math.random().toString(36).slice(2, 10)}`
  return await addDoc(collection(db, 'clients'), {
    salon,
    ...data,
    qrId,
    createdAt: serverTimestamp(),
  })
}

// ── お客様をQRIDで取得 ───────────────────────────────
export async function getClientByQrId(qrId) {
  const q = query(collection(db, 'clients'), where('qrId', '==', qrId))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return { id: snap.docs[0].id, ...snap.docs[0].data() }
}

// ── 施術記録を取得（リアルタイム）───────────────────
export function subscribeRecords(clientId, callback) {
  const q = query(
    collection(db, 'clients', clientId, 'records'),
    orderBy('date', 'desc')
  )
  return onSnapshot(q, snap => {
    const records = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(records)
  })
}

// ── 施術記録を追加 ──────────────────────────────────
export async function addRecord(clientId, data) {
  return await addDoc(
    collection(db, 'clients', clientId, 'records'),
    { ...data, clientPhotos: [], createdAt: serverTimestamp() }
  )
}

// ── 施術記録を更新（共有切替など）──────────────────
export async function updateRecord(clientId, recordId, data) {
  const ref = doc(db, 'clients', clientId, 'records', recordId)
  return await updateDoc(ref, data)
}

// ── 施術記録を削除 ──────────────────────────────────
export async function deleteRecord(clientId, recordId) {
  const ref = doc(db, 'clients', clientId, 'records', recordId)
  return await deleteDoc(ref)
}

// ── 写真をStorageにアップロードしてURLを返す ────────
export async function uploadPhoto(file, path) {
  const storageRef = ref(storage, path)
  const snap = await uploadBytes(storageRef, file)
  return await getDownloadURL(snap.ref)
}

// ── スタッフが写真を追加（Storageにアップ → URLをFirestoreに保存）
export async function addStaffPhotos(clientId, recordId, files) {
  const urls = await Promise.all(
    files.map((file, i) =>
      uploadPhoto(file, `records/${clientId}/${recordId}/staff_${Date.now()}_${i}`)
    )
  )
  const recordRef = doc(db, 'clients', clientId, 'records', recordId)
  const snap = await getDoc(recordRef)
  const existing = snap.data().photos || []
  await updateDoc(recordRef, { photos: [...existing, ...urls] })
  return urls
}

// ── お客様が写真を追加
export async function addClientPhotos(clientId, recordId, files) {
  const urls = await Promise.all(
    files.map((file, i) =>
      uploadPhoto(file, `records/${clientId}/${recordId}/client_${Date.now()}_${i}`)
    )
  )
  const recordRef = doc(db, 'clients', clientId, 'records', recordId)
  const snap = await getDoc(recordRef)
  const existing = snap.data().clientPhotos || []
  await updateDoc(recordRef, { clientPhotos: [...existing, ...urls] })
  return urls
}
