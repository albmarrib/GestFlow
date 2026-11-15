import { doc, updateDoc } from 'firebase/firestore';

export function normalizeChatEmail(email = '') {
  return String(email || '').toLowerCase().trim();
}

export function emailToChatKey(email = '') {
  const norm = normalizeChatEmail(email);
  if (!norm) return '';
  return encodeURIComponent(norm).replace(/\./g, '_dot_');
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
  if (!norm || !task?.lastMessageAt) return false;

  const author = normalizeChatEmail(task.lastMessageAuthor);
  if (!author || author === norm) return false;

  if (!isTaskChatParticipant(task, norm)) return false;

  const key = emailToChatKey(norm);
  const lastReadAt = task?.chatLastRead?.[key];
  if (!lastReadAt) return true;

  return String(task.lastMessageAt) > String(lastReadAt);
}

export function getUnreadChatTasks(tasks = [], userEmail = '') {
  if (!userEmail || !Array.isArray(tasks)) return [];
  return tasks
    .filter(t => hasUnreadChatMessage(t, userEmail))
    .sort((a, b) => String(b.lastMessageAt || '').localeCompare(String(a.lastMessageAt || '')));
}

export async function markTaskChatAsRead(db, task, userEmail) {
  const norm = normalizeChatEmail(userEmail);
  if (!db || !task?.id || !norm) return;
  if (!hasUnreadChatMessage(task, norm)) return;

  const key = emailToChatKey(norm);
  if (!key) return;

  const readStamp = new Date(
    Math.max(Date.now(), task.lastMessageAt ? new Date(task.lastMessageAt).getTime() + 1000 : 0)
  ).toISOString();

  const payload = {
    [`chatLastRead.${key}`]: readStamp
  };

  await updateDoc(doc(db, 'expedientes', task.id), payload).catch(async () => {
    await updateDoc(doc(db, 'tasks', task.id), payload).catch(() => {});
  });
}
