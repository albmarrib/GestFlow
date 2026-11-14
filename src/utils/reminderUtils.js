// Utilidades puras para Recordatorios Personales estilo Outlook / To-Do

export const RECURRENCE_OPTIONS = [
  { value: 'none', labelCa: 'Sense repetició', labelEs: 'Sin repetición' },
  { value: 'daily', labelCa: 'Diària', labelEs: 'Diaria' },
  { value: 'weekly', labelCa: 'Setmanal', labelEs: 'Semanal' },
  { value: 'biweekly', labelCa: 'Quinzenal', labelEs: 'Quincenal' },
  { value: 'monthly', labelCa: 'Mensual', labelEs: 'Mensual' },
  { value: 'quarterly', labelCa: 'Trimestral', labelEs: 'Trimestral' },
  { value: 'yearly', labelCa: 'Anual', labelEs: 'Anual' },
  { value: 'custom_days', labelCa: 'Cada X dies', labelEs: 'Cada X días' }
];

export function toLocalDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getLocalTodayStr() {
  return toLocalDateStr(new Date());
}

export function parseLocalDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0, 0);
}

export function addDaysToDateStr(dateStr, days = 0) {
  const base = parseLocalDate(dateStr) || new Date();
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate() + Number(days || 0), 12, 0, 0, 0);
  return toLocalDateStr(next);
}

export function addMonthsToDateStr(dateStr, months = 0) {
  const base = parseLocalDate(dateStr) || new Date();
  const origDay = base.getDate();
  const target = new Date(base.getFullYear(), base.getMonth() + Number(months || 0), 1, 12, 0, 0, 0);
  const lastDayOfTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(origDay, lastDayOfTargetMonth));
  return toLocalDateStr(target);
}

export function diffDaysBetween(fromStr, toStr) {
  const from = parseLocalDate(fromStr);
  const to = parseLocalDate(toStr);
  if (!from || !to) return 0;
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
}

// Domingo de la semana ISO actual (lunes a domingo)
export function getEndOfCurrentWeekStr(todayStr = getLocalTodayStr()) {
  const today = parseLocalDate(todayStr) || new Date();
  const day = today.getDay(); // 0 = dom, 1 = lun ... 6 = sáb
  const daysUntilSunday = day === 0 ? 0 : 7 - day;
  return addDaysToDateStr(todayStr, daysUntilSunday);
}

export function getNextMondayStr(todayStr = getLocalTodayStr()) {
  const today = parseLocalDate(todayStr) || new Date();
  const day = today.getDay();
  const daysToAdd = day === 0 ? 1 : 8 - day;
  return addDaysToDateStr(todayStr, daysToAdd);
}

export function formatReminderDateShort(dateStr, lang = 'ca', todayStr = getLocalTodayStr()) {
  if (!dateStr) return '-';
  if (dateStr === todayStr) return lang === 'ca' ? 'Avui' : 'Hoy';
  if (dateStr === addDaysToDateStr(todayStr, 1)) return lang === 'ca' ? 'Demà' : 'Mañana';
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr;
  return d.toLocaleDateString(lang === 'es' ? 'es-ES' : 'ca-ES', {
    day: '2-digit',
    month: '2-digit'
  });
}

export function formatWeekdayAndDate(dateStr, lang = 'ca') {
  const d = parseLocalDate(dateStr);
  if (!d) return dateStr || '';
  return d.toLocaleDateString(lang === 'es' ? 'es-ES' : 'ca-ES', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit'
  });
}

/**
 * Clasifica un recordatorio según las reglas de visibilidad:
 * - isDone => 'done' (oculta de lista activa)
 * - endDate < today => 'active' + 'overdue' (rojo hasta marcar hecho)
 * - startDate <= today => 'active' + ('due_today' | 'in_progress')
 * - today < startDate <= endOfCurrentWeek => 'active' + 'this_week'
 * - startDate > endOfCurrentWeek => 'future' (no aparece hasta su semana)
 */
export function classifyReminder(reminder, todayStr = getLocalTodayStr(), endOfWeekStr = getEndOfCurrentWeekStr(todayStr)) {
  if (!reminder || reminder.isDone) {
    return { visibility: 'done', state: 'done', daysOverdue: 0, daysUntilStart: 0 };
  }

  const startDate = reminder.startDate || todayStr;
  const endDate = reminder.endDate || startDate;

  if (endDate < todayStr) {
    return {
      visibility: 'active',
      state: 'overdue',
      daysOverdue: Math.max(1, diffDaysBetween(endDate, todayStr)),
      daysUntilStart: 0
    };
  }

  if (startDate <= todayStr) {
    return {
      visibility: 'active',
      state: endDate === todayStr ? 'due_today' : 'in_progress',
      daysOverdue: 0,
      daysUntilStart: 0
    };
  }

  if (startDate <= endOfWeekStr) {
    return {
      visibility: 'active',
      state: 'this_week',
      daysOverdue: 0,
      daysUntilStart: diffDaysBetween(todayStr, startDate)
    };
  }

  return {
    visibility: 'future',
    state: 'scheduled',
    daysOverdue: 0,
    daysUntilStart: diffDaysBetween(todayStr, startDate)
  };
}

export function computeNextRecurrenceDates(reminder) {
  const recurrence = reminder?.recurrence || 'none';
  if (!recurrence || recurrence === 'none') return null;

  const baseStart = reminder.startDate || getLocalTodayStr();
  const baseEnd = reminder.endDate || baseStart;
  const durationDays = Math.max(0, diffDaysBetween(baseStart, baseEnd));
  const customDays = Math.max(1, parseInt(reminder.recurrenceDays || 7, 10) || 7);

  let nextStart = baseStart;
  switch (recurrence) {
    case 'daily':
      nextStart = addDaysToDateStr(baseStart, 1);
      break;
    case 'weekly':
      nextStart = addDaysToDateStr(baseStart, 7);
      break;
    case 'biweekly':
      nextStart = addDaysToDateStr(baseStart, 14);
      break;
    case 'monthly':
      nextStart = addMonthsToDateStr(baseStart, 1);
      break;
    case 'quarterly':
      nextStart = addMonthsToDateStr(baseStart, 3);
      break;
    case 'yearly':
      nextStart = addMonthsToDateStr(baseStart, 12);
      break;
    case 'custom_days':
      nextStart = addDaysToDateStr(baseStart, customDays);
      break;
    default:
      return null;
  }

  const nextEnd = addDaysToDateStr(nextStart, durationDays);
  return {
    startDate: nextStart,
    endDate: nextEnd
  };
}

export function getRecurrenceLabel(recurrence, recurrenceDays, lang = 'ca') {
  if (!recurrence || recurrence === 'none') return '';
  if (recurrence === 'custom_days') {
    const days = Math.max(1, parseInt(recurrenceDays || 7, 10) || 7);
    return lang === 'ca' ? `Cada ${days}d` : `Cada ${days}d`;
  }
  const found = RECURRENCE_OPTIONS.find(opt => opt.value === recurrence);
  if (!found) return '';
  return lang === 'ca' ? found.labelCa : found.labelEs;
}
