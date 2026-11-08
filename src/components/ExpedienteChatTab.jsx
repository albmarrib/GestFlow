import React, { useState, useEffect, useRef } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Send, 
  MessageSquare, 
  User, 
  Link as LinkIcon, 
  CheckCheck, 
  Clock,
  Sparkles,
  ExternalLink
} from 'lucide-react';

// Formateador de texto con enlaces interactivos
function TextWithLinks({ text = '' }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <>
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-indigo-200 hover:text-white font-medium break-all inline-flex items-center gap-0.5"
            >
              {part} <ExternalLink className="w-2.5 h-2.5 inline" />
            </a>
          );
        }
        return part;
      })}
    </>
  );
}

export default function ExpedienteChatTab({ 
  task, 
  currentUser, 
  logAction 
}) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  const taskId = task?.id;
  const myEmail = (currentUser?.email || '').toLowerCase().trim();

  // Escuchar subcolección de mensajes en tiempo real
  useEffect(() => {
    if (!taskId) return;

    const messagesCol = collection(db, 'expedientes', taskId, 'messages');
    const q = query(messagesCol, orderBy('createdAt', 'asc'));

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setMessages(msgs);
    }, (err) => {
      console.warn("Aviso cargando chat de expedientes, probando fallback tasks:", err);
      const fallbackCol = collection(db, 'tasks', taskId, 'messages');
      const qFallback = query(fallbackCol, orderBy('createdAt', 'asc'));
      return onSnapshot(qFallback, (snap) => {
        setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    });

    return () => unsub();
  }, [taskId]);

  // Auto-scroll al final al recibir o enviar mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Enviar mensaje
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText || isSending || !taskId) return;

    setIsSending(true);
    try {
      const messagePayload = {
        text: cleanText,
        senderEmail: myEmail,
        senderName: currentUser?.displayName || myEmail.split('@')[0],
        createdAt: serverTimestamp()
      };

      // Guardar en subcolección messages
      await addDoc(collection(db, 'expedientes', taskId, 'messages'), messagePayload).catch(async () => {
        await addDoc(collection(db, 'tasks', taskId, 'messages'), messagePayload);
      });

      // Actualizar timestamp en el expediente padre para disparar alertas
      const updatePayload = {
        lastUpdated: serverTimestamp(),
        lastMessagePreview: cleanText.slice(0, 100),
        lastMessageAuthor: myEmail
      };
      await updateDoc(doc(db, 'expedientes', taskId), updatePayload).catch(async () => {
        await updateDoc(doc(db, 'tasks', taskId), updatePayload);
      });

      if (logAction) {
        logAction('Enviado Mensaje Chat', `Expediente: ${task.title || taskId}`);
      }

      setInputText('');
    } catch (err) {
      alert("Error al enviar mensaje: " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handlePasteLink = () => {
    const url = window.prompt("Introduce o pega la URL del enlace a compartir:");
    if (url && url.trim()) {
      setInputText(prev => prev ? `${prev} ${url.trim()}` : url.trim());
    }
  };

  // Formato legible de hora
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Ahora';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return timeStr;
    return `${date.getDate()}/${date.getMonth() + 1} ${timeStr}`;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100/60 overflow-hidden">
      
      {/* CABECERA DEL CHAT */}
      <div className="bg-white px-4 py-2.5 border-b border-slate-200/80 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <MessageSquare className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">
              Canal de Comunicación Interno
            </h4>
            <p className="text-[10px] text-slate-500">
              Mensajes en directo entre asesores asignados a este expediente
            </p>
          </div>
        </div>
        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold border border-slate-200">
          {messages.length} {messages.length === 1 ? 'mensaje' : 'mensajes'}
        </span>
      </div>

      {/* ÁREA DE MENSAJES (GLOBOS DE CONVERSACIÓN TIPO WHATSAPP / SLACK) */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-400 flex items-center justify-center mx-auto mb-2">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h5 className="text-xs font-bold text-slate-700">No hay mensajes aún</h5>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
              Utiliza este chat para coordinar incidencias, dudas o notas rápidas sobre este expediente con tus compañeros de despacho.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = (msg.senderEmail || '').toLowerCase().trim() === myEmail;
            
            return (
              <div 
                key={msg.id}
                className={`flex gap-2 items-end ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {/* Avatar del otro interlocutor */}
                {!isMe && (
                  <div 
                    className="w-6 h-6 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-[10px] font-bold uppercase shrink-0 shadow-2xs"
                    title={msg.senderEmail}
                  >
                    {msg.senderName ? msg.senderName.charAt(0) : 'G'}
                  </div>
                )}

                {/* Globo de Conversación */}
                <div 
                  className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-2xs text-xs relative ${
                    isMe 
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-br-xs' 
                      : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-xs'
                  }`}
                >
                  {/* Nombre del remitente si no soy yo */}
                  {!isMe && (
                    <div className="font-bold text-[10px] text-indigo-600 mb-0.5 flex items-center gap-1">
                      <span>{msg.senderName || msg.senderEmail}</span>
                    </div>
                  )}

                  {/* Cuerpo del Mensaje */}
                  <div className="leading-relaxed whitespace-pre-wrap break-words">
                    {isMe ? (
                      <TextWithLinks text={msg.text} />
                    ) : (
                      <TextWithLinks text={msg.text} />
                    )}
                  </div>

                  {/* Hora y Visto */}
                  <div className={`flex items-center justify-end gap-1 text-[9px] mt-1 ${
                    isMe ? 'text-indigo-200' : 'text-slate-400'
                  }`}>
                    <span>{formatTime(msg.createdAt)}</span>
                    {isMe && <CheckCheck className="w-3 h-3 text-indigo-200" />}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* BARRA INFERIOR DE ENTRADA DE MENSAJES */}
      <div className="p-3 bg-white border-t border-slate-200">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 relative">
          <button
            type="button"
            onClick={handlePasteLink}
            className="text-slate-400 hover:text-indigo-600 p-2 rounded-xl hover:bg-slate-100 transition-colors shrink-0"
            title="Compartir enlace URL"
          >
            <LinkIcon className="w-4 h-4" />
          </button>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje interno... (Enter para enviar)"
            rows="1"
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none max-h-24 transition-all"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white p-2 rounded-xl transition-all shadow-xs flex items-center justify-center shrink-0"
            title="Enviar mensaje"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

    </div>
  );
}
