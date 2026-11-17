import { ref, getBlob } from 'firebase/storage';
import { storage } from '../firebase';

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'svg']);
const EXCEL_EXTS = new Set(['xlsx', 'xls', 'xlsm', 'ods', 'csv']);
const TEXT_EXTS = new Set(['txt', 'md', 'json', 'xml', 'log', 'ini', 'yaml', 'yml']);

export function withTimeout(promise, ms, timeoutMessage = 'Tiempo de espera agotado.') {
  let timerId;
  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => reject(new Error(timeoutMessage)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timerId));
}

export function extractAttachmentExtension(attachment) {
  const candidates = [attachment?.name, attachment?.path];
  if (attachment?.url) {
    try {
      const parsed = new URL(attachment.url);
      candidates.push(decodeURIComponent(parsed.pathname));
    } catch {
      candidates.push(attachment.url);
    }
  }
  for (const raw of candidates) {
    if (!raw || typeof raw !== 'string') continue;
    const clean = raw.split('?')[0].split('#')[0].trim();
    const match = clean.match(/\.([a-zA-Z0-9]{1,8})$/);
    if (match) return match[1].toLowerCase();
  }
  return '';
}

export function getAttachmentKind(attachment) {
  const ext = extractAttachmentExtension(attachment);
  const mime = (attachment?.type || '').toLowerCase();

  if (IMAGE_EXTS.has(ext) || mime.startsWith('image/')) return 'image';
  if (ext === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (
    ext === 'docx' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'docx';
  }
  if (ext === 'doc' || mime === 'application/msword') return 'doc-legacy';
  if (
    EXCEL_EXTS.has(ext) ||
    mime.includes('spreadsheetml') ||
    mime.includes('ms-excel') ||
    mime === 'text/csv'
  ) {
    return 'spreadsheet';
  }
  if (TEXT_EXTS.has(ext) || mime.startsWith('text/')) return 'text';
  return 'other';
}

export async function fetchAttachmentBlob(attachment) {
  let fetchError = null;
  let storageError = null;

  // 1. Intentar primero descarga directa por URL firmada
  if (attachment?.url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const res = await fetch(attachment.url, { signal: controller.signal });
      if (res.ok) {
        return await res.blob();
      }
      fetchError = new Error(`HTTP ${res.status}`);
    } catch (err) {
      fetchError = err;
    } finally {
      clearTimeout(timer);
    }
  }

  // 2. Respaldo mediante Firebase Storage SDK (espera corta para no colgar la interfaz)
  if (attachment?.path && storage) {
    try {
      return await withTimeout(
        getBlob(ref(storage, attachment.path)),
        4500,
        'CORS/Storage bloqueado al leer archivo.'
      );
    } catch (err) {
      storageError = err;
    }
  }

  const finalErr = new Error(
    `fetch: ${fetchError?.message || 'n/a'} | storage: ${storageError?.message || 'n/a'}`
  );
  if (fetchError?.name === 'TypeError' || String(fetchError?.message).includes('Failed to fetch')) {
    finalErr.isCors = true;
  }
  throw finalErr;
}

/**
 * Fuerza la descarga real del archivo al equipo sin abrirlo en una pestaña nueva.
 */
export async function downloadAttachment(attachment) {
  if (!attachment?.url && !attachment?.path) return;
  const fileName = (attachment.name || 'archivo').trim();

  try {
    const blob = await fetchAttachmentBlob(attachment);
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 15000);
  } catch {
    if (!attachment?.url) return;
    const link = document.createElement('a');
    link.href = attachment.url;
    link.download = fileName;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}
