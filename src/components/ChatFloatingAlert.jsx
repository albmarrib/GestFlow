import React, { useState } from 'react';
import { MessageSquare, X, ChevronRight, Building2 } from 'lucide-react';

export default function ChatFloatingAlert({
  unreadChatTasks = [],
  onOpenChatTask,
  currentTaskId = null,
  lang = 'ca',
  isMobile = false
}) {
  const [showModal, setShowModal] = useState(false);
  const isCa = lang === 'ca';

  if (!unreadChatTasks || unreadChatTasks.length === 0) {
    return null;
  }

  const currentHasUnread = Boolean(
    currentTaskId && unreadChatTasks.some(t => t.id === currentTaskId)
  );

  return (
    <>
      {/* GLOBO TIPO BOCADILLO ROJO GRANDE ABAJO A LA DERECHA (POR ENCIMA DE TODO) */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        style={
          isMobile
            ? { bottom: 'calc(74px + env(safe-area-inset-bottom, 0px))' }
            : undefined
        }
        className={`fixed z-[80] ${
          isMobile ? 'right-4 w-14 h-14' : 'bottom-6 right-6 w-16 h-16'
        } rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-2xl border-2 border-white/95 flex items-center justify-center cursor-pointer transition-all ${
          currentHasUnread ? 'ring-4 ring-amber-400/80' : ''
        }`}
        title={
          isCa
            ? `Tens ${unreadChatTasks.length} ${unreadChatTasks.length === 1 ? 'xat amb missatges nous' : 'xats amb missatges nous'}`
            : `Tienes ${unreadChatTasks.length} ${unreadChatTasks.length === 1 ? 'chat con mensajes nuevos' : 'chats con mensajes nuevos'}`
        }
        aria-label={isCa ? 'Missatges de Xat pendents' : 'Mensajes de Chat pendientes'}
      >
        <span className="absolute inset-0 rounded-full bg-rose-500/45 animate-ping pointer-events-none" />
        <MessageSquare
          className={`${isMobile ? 'w-7 h-7' : 'w-8 h-8'} relative z-10 shrink-0`}
          strokeWidth={2.2}
        />
        <span className="absolute -top-1 -right-1 z-20 min-w-[26px] h-[26px] px-1.5 rounded-full bg-white text-rose-700 border-2 border-rose-600 text-xs font-black flex items-center justify-center shadow-md">
          {unreadChatTasks.length > 9 ? '9+' : unreadChatTasks.length}
        </span>
      </button>

      {/* MODAL CON TODOS LOS MENSAJES PENDIENTES Y SUS EXPEDIENTES */}
      {showModal && (
        <div className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#152427] text-white px-4 py-3 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4 text-white" />
                </span>
                <div>
                  <h3 className="text-sm font-extrabold leading-tight">
                    {isCa ? 'Missatges de Xat pendents' : 'Mensajes de Chat pendientes'}
                  </h3>
                  <p className="text-[11px] text-slate-300">
                    {isCa
                      ? `${unreadChatTasks.length} ${unreadChatTasks.length === 1 ? 'expedient' : 'expedients'} amb missatges nous`
                      : `${unreadChatTasks.length} ${unreadChatTasks.length === 1 ? 'expediente' : 'expedientes'} con mensajes nuevos`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer"
                aria-label={isCa ? 'Tancar' : 'Cerrar'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 space-y-2 overflow-y-auto flex-1 bg-slate-50">
              {unreadChatTasks.map(task => {
                const isCurrentOpen = currentTaskId && task.id === currentTaskId;
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      onOpenChatTask?.(task);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer shadow-2xs ${
                      isCurrentOpen
                        ? 'bg-amber-50 border-amber-300 hover:bg-amber-100/70'
                        : 'bg-white border-rose-200 hover:border-rose-400 hover:bg-rose-50/40'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 shrink-0 text-indigo-600" />
                        <span className="text-xs font-extrabold text-slate-900 truncate">
                          {task.client || task.clientRazonSocial || '—'}
                        </span>
                        {isCurrentOpen && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 text-[9px] font-extrabold uppercase shrink-0">
                            {isCa ? 'Obert ara' : 'Abierto'}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] font-semibold text-indigo-700 truncate">
                        {task.title}
                      </p>

                      {task.lastMessagePreview && (
                        <p className="text-xs text-slate-600 line-clamp-2 pt-0.5">
                          <span className="font-bold text-rose-700">
                            {(task.lastMessageAuthor || '').split('@')[0]}:{' '}
                          </span>
                          {task.lastMessagePreview}
                        </p>
                      )}
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-600 text-white text-[11px] font-bold shrink-0">
                      <span>{isCa ? 'Obrir Xat' : 'Abrir Chat'}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
