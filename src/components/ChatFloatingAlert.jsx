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
      {/* GLOBO FLOTANTE ARRIBA A LA IZQUIERDA (POR ENCIMA DE TODO) */}
      <button
        type="button"
        onClick={() => setShowModal(true)}
        style={
          isMobile
            ? { top: 'calc(54px + env(safe-area-inset-top, 0px))' }
            : undefined
        }
        className={`fixed z-[80] left-3 ${
          isMobile ? '' : 'top-16 sm:left-4'
        } group flex items-center gap-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white pl-3 pr-3.5 py-2.5 rounded-2xl shadow-2xl border-2 border-white/95 cursor-pointer transition-all`}
        title={isCa ? 'Tens missatges nous al Xat' : 'Tienes mensajes nuevos en el Chat'}
      >
        <span className="relative flex items-center justify-center">
          <span className="absolute inline-flex h-full w-full rounded-full bg-white/60 animate-ping opacity-75"></span>
          <MessageSquare className="w-5 h-5 relative z-10 shrink-0" />
        </span>

        <div className="text-left leading-tight">
          <span className="text-xs font-extrabold tracking-tight block">
            {isCa
              ? `Xat nou (${unreadChatTasks.length})`
              : `Chat nuevo (${unreadChatTasks.length})`}
          </span>
          {currentHasUnread ? (
            <span className="text-[10px] font-bold text-amber-200 block">
              {isCa ? 'En aquest expedient!' : '¡En este expediente!'}
            </span>
          ) : (
            <span className="text-[10px] font-medium text-rose-100 block max-w-[140px] truncate">
              {unreadChatTasks[0]?.title}
            </span>
          )}
        </div>
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
                        <span className="text-xs font-extrabold text-slate-900 truncate">
                          {task.title}
                        </span>
                        {isCurrentOpen && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 text-[9px] font-extrabold uppercase shrink-0">
                            {isCa ? 'Obert ara' : 'Abierto'}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] font-semibold text-indigo-700 flex items-center gap-1 truncate">
                        <Building2 className="w-3 h-3 shrink-0 text-indigo-500" />
                        <span className="truncate">{task.client || '—'}</span>
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
