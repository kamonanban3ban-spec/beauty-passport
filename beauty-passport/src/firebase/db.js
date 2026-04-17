import { collection, addDoc, getDocs, getDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from './config'

// ── お客様一覧を取得（リアルタイム）────────────────────────────────────
export function subscribeClients(salon, callback) {
  const q = query(collection(db, 'clients'), where('registeredSalon', '==', salon), orderBy('createdAt', 'desc'))
  return onSnapshot(q, snap => {
    const clients = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(clients)
  })
}

// ── お客様を登録 ────────────────────────────────────
export async function addClient(salon, data) {
  const qrId = `${salon}_${Math.random().toString(36).slice(2,10)}`
  return await addDoc(collection(db, 'clients'), {
    registeredSalon: salon,
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
  const d = snap.docs[0]
  return { id: d.id, ...d.data() }
}

// ── 施術記録を取得（リアルタイム）────────────────────────────────────
export function subscribeRecords(clientId, callback) {
  const q = query(collection(db, 'clients', clientId, 'records'), orderBy('createdAt', 'desc'))
  return onSnapshot(q, snap => {
    const records = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    callback(records)
  })
}

// ── 施術記録を追加 ────────────────────────────────────
export async function addRecord(clientId, data) {
  return await addDoc(collection(db, 'clients', clientId, 'records'), {
    ...data,
    createdAt: serverTimestamp(),
  })
}

// ── 施術記録を更新 ────────────────────────────────────
export async function updateRecord(clientId, recordId, data) {
  await updateDoc(doc(db, 'clients', clientId, 'records', recordId), data)
}

// ── 施術記録を削除 ────────────────────────────────────
export async function deleteRecord(clientId, recordId) {
  await deleteDoc(doc(db, 'clients', clientId, 'records', recordId))
}

// ── スタッフ写真を追加 ────────────────────────────────────
export async function addStaffPhotos(clientId, recordId, files) {
  const urls = await Promise.all(files.map(async file => {
    const r = ref(storage, `clients/${clientId}/records/${recordId}/${file.name}`)
    await uploadBytes(r, file)
    return getDownloadURL(r)
  }))
  await updateDoc(doc(db, 'clients', clientId, 'records', recordId), { photos: urls })
}

// ── お客様写真を追加 ────────────────────────────────────
export async function addClientPhotos(clientId, recordId, files) {
  const urls = await Promise.all(files.map(async file => {
    const r = ref(storage, `clients/${clientId}/records/${recordId}/client_${file.name}`)
    await uploadBytes(r, file)
    return getDownloadURL(r)
  }))
  const recordRef = doc(db, 'clients', clientId, 'records', recordId)
  const snap = await getDoc(recordRef)
  const existing = snap.data()?.clientPhotos || []
  await updateDoc(recordRef, { clientPhotos: [...existing, ...urls] })
}

// ── お客様写真を削除 ────────────────────────────────────
export async function deleteClientPhoto(clientId, recordId, url) {
  const recordRef = doc(db, 'clients', clientId, 'records', recordId)
  const snap = await getDoc(recordRef)
  const existing = snap.data()?.clientPhotos || []
  await updateDoc(recordRef, { clientPhotos: existing.filter(u => u !== url) })
}
// 写真をStorageにアップロードしてrecordのphotosに追加
export async function uploadPhotoToRecord(clientId, recordId, file) {
  const r = ref(storage, `clients/${clientId}/records/${recordId}/${Date.now()}_${file.name}`)
  await uploadBytes(r, file)
  const url = await getDownloadURL(r)
  const recordRef = doc(db, 'clients', clientId, 'records', recordId)
  const snap = await getDoc(recordRef)
  const existing = snap.data()?.photos || []
  await updateDoc(recordRef, { photos: [...existing, url] })
  return url
}