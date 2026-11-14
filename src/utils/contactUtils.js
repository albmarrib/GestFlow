export function buildTelHref(rawPhone = '') {
  const cleaned = String(rawPhone || '').replace(/[^\d+]/g, '');
  return cleaned ? `tel:${cleaned}` : '';
}

export function buildWhatsAppHref(rawPhone = '') {
  let digits = String(rawPhone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('00')) digits = digits.slice(2);
  // Prefijo +34 automático para números españoles de 9 dígitos
  if (digits.length === 9 && /^[6789]/.test(digits)) {
    digits = `34${digits}`;
  }
  return `https://wa.me/${digits}`;
}
