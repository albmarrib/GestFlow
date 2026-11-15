import { doc, updateDoc } from 'firebase/firestore';

export function normalizeChatEmail(email = '') {
  return String(email || '').toLowerCase().trim();
}

export function emailToChatKey(email = '') {
  const norm = normalizeChatEmail(email);
  if (!norm) return '';
  return norm
    .replace(/@/g, '_at_')
    .replace(/\./g, '_dot_')
    .replace(/[^a-z0-9_]/g, '_');
}

export function getTaskMessageTimestamp(task) {
  if (!task) return '';
  if (task.lastMessageAt) return String(task.lastMessageAt);

  // Retrocompatibilidad: si un cliente antiguo envió un mensaje sin lastMessageAt
  if (task.lastMessageAuthor && task.lastMessagePreview) {
    if (task.lastUpdated?.seconds) {
      return new Date(task.lastUpdated.seconds * 1000).toISOString();
    }
    if (typeof task.lastUpdated === 'string' && task.lastUpdated) {
      return task.lastUpdated;
    }
    return '2026-01-01T00:00:01.000Z';
  }
  return '';
}

export function isTaskChatParticipant(task, userEmail) {
  const norm = normalizeChatEmail(userEmail);
  if (!norm || !task) return false;

  if (normalizeChatEmail(task.assigneeEmail) === norm) return true;
  if (normalizeChatEmail(task.createdBy) === norm) return true;

  if (Array.isArray(task.assignees) && task.assignees.some(e => normalizeChatEmail(e) === norm)) {
    return true;
  }

  if (Array.isArray(task.actions) && task.actions.some(a => normalizeChatEmail(a?.assignee) === norm)) {
    return true;
  }

  if (Array.isArray(task.chatParticipants) && task.chatParticipants.some(e => normalizeChatEmail(e) === norm)) {
    return true;
  }

  return false;
}

export function hasUnreadChatMessage(task, userEmail) {
  const norm = normalizeChatEmail(userEmail);
  const msgTs = getTaskMessageTimestamp(task);
  if (!norm || !msgTs) return false;

  const author = normalizeChatEmail(task.lastMessageAuthor);
  if (!author || author === norm) return false;

  if (!isTaskChatParticipant(task, norm)) return false;

  const key = emailToChatKey(norm);
  const lastReadAt = task?.chatLastRead?.[key];
  if (!lastReadAt) return true;

  return String(msgTs) > String(lastReadAt);
}

export function getUnreadChatTasks(tasks = [], userEmail = '') {
  if (!userEmail || !Array.isArray(tasks)) return [];
  return tasks
    .filter(t => hasUnreadChatMessage(t, userEmail))
    .sort((a, b) => String(getTaskMessageTimestamp(b)).localeCompare(String(getTaskMessageTimestamp(a))));
}

export async function markTaskChatAsRead(db, task, userEmail) {
  const norm = normalizeChatEmail(userEmail);
  if (!db || !task?.id || !norm) return;
  if (!hasUnreadChatMessage(task, norm)) return;

  const key = emailToChatKey(norm);
  if (!key) return;

  const msgTs = getTaskMessageTimestamp(task);
  const parsedMsgTime = msgTs ? Date.parse(msgTs) : 0;
  const readStamp = new Date(
    Math.max(Date.now(), Number.isNaN(parsedMsgTime) ? 0 : parsedMsgTime + 1000)
  ).toISOString();

  const payload = {
    [`chatLastRead.${key}`]: readStamp
  };

  await updateDoc(doc(db, 'expedientes', task.id), payload).catch(async () => {
    await updateDoc(doc(db, 'tasks', task.id), payload).catch(() => {});
  });
}
