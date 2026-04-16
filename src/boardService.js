import { db } from './firebase';
import {
  collection, addDoc, getDocs, writeBatch, doc, deleteDoc,
  serverTimestamp, query, orderBy,
} from 'firebase/firestore';

const BOARD_W = 1200;
const BOARD_H = BOARD_W * 3;
const TAPE_COLORS = ['#ffffffcc', '#ffd700cc', '#ff69b4cc', '#87ceebcc', '#98fb98cc'];

function compressImage(dataUrl, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('compressImage timed out')), 10000);
    const img = new Image();
    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d').drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load image for compression'));
    };
    img.src = dataUrl;
  });
}

// Create a local item immediately (no Firestore yet).
// localId is a stable key that survives the pending → Firestore ID swap.
export function makePendingItem(src) {
  const localId = `local-${Date.now()}`;
  return {
    id: localId,
    localId,
    src,
    x: 100 + Math.random() * (BOARD_W - 300),
    y: 50 + Math.random() * (BOARD_H - 500),
    rotation: (Math.random() - 0.5) * 15,
    tape: TAPE_COLORS[Math.floor(Math.random() * TAPE_COLORS.length)],
  };
}

// Persist a pending item to Firestore; returns item with real Firestore id
// but keeps localId so PhotoBoard can match it to the existing local entry.
export async function persistItem(item) {
  const src = await compressImage(item.src);
  const docRef = await addDoc(collection(db, 'board_items'), {
    src,
    x: item.x,
    y: item.y,
    rotation: item.rotation,
    tape: item.tape,
    createdAt: serverTimestamp(),
  });
  return { ...item, id: docRef.id, localId: item.localId, src };
}

export async function loadBoardItems() {
  const q = query(collection(db, 'board_items'), orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({
    id: d.id,
    localId: d.id,
    src: d.data().src,
    x: d.data().x,
    y: d.data().y,
    rotation: d.data().rotation,
    tape: d.data().tape,
  }));
}

export async function deleteItem(id) {
  if (id.startsWith('local-')) return; // not yet persisted, nothing to delete in Firestore
  await deleteDoc(doc(db, 'board_items', id));
}

// Batch-save positions/rotations for all persisted items (have a real Firestore id)
export async function saveBoardLayout(items) {
  const persisted = items.filter(i => !i.id.startsWith('local-'));
  if (persisted.length === 0) return;
  const batch = writeBatch(db);
  persisted.forEach(item => {
    batch.update(doc(db, 'board_items', item.id), {
      x: item.x,
      y: item.y,
      rotation: item.rotation,
    });
  });
  await batch.commit();
}
