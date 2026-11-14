import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Phone,
  MessageCircle,
  Mail,
  CheckCircle2,
  Camera,
  Paperclip,
  Mic,
  MicOff,
  Send,
  Trash2,
  ExternalLink,
  Check,
  Plus,
  Loader2,
  Zap,
  FileText,
  Save,
  Building2,
  Calendar
} from 'lucide-react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { findClientForTask } from '../utils/billingUtils';
import { translateClassificationName } from '../utils/classificationI18n';
import { buildTelHref, buildWhatsAppHref } from '../utils/contactUtils';
import ExpedienteChatTab from './ExpedienteChatTab';

async function compressImageIfNeeded(file) {
  if (!file || !file.type || !file.type.startsWith('image/')) return file;
  if (file.size <= 1200 * 1024) return file;

  return new Promise((resolve) => {
    try {
      const img = new Image();
      const objUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objUrl);
        const maxDim = 1800;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const baseName = (file.name || 'foto_document').replace(/\.[^.]+$/, '');
            const compressed = new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
            resolve(compressed);
          },
          'image/jpeg',
          0.84
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objUrl);
        resolve(file);
      };
      img.src = objUrl;
    } catch {
      resolve(file);
    }
  });
}

export default function MobileExpedienteDetail({
  task,
  onClose,
  clientes = [],
  areas = [],
  tramos = [],
  usersList = [],
  currentUser,
  logAction,
  lang = 'ca',
  initialTab = 'resum',
  focusedStepId = null
}) {
  const isCa = lang === 'ca';
  const [activeTab, setActiveTab] = useState(initialTab); // 'resum' | 'bitacora' | 'gtd' | 'adjunts'

  // Campos editables básicos
  const [title, setTitle] = useState(task?.title || '');
  const [status, setStatus] = useState(task?.status || 'Abierto');
  const [dueDate, setDueDate] = useState(task?.dueDate || '');
  const [department, setDepartment] = useState(task?.department || '');
  const [type, setType] = useState(task?.type || '');
  const [description, setDescription] = useState(task?.description || '');
  const [feeAmount, setFeeAmount] = useState(
    task?.feeAmount !== undefined && task?.feeAmount !== null ? String(task.feeAmount) : ''
  );
  const [isSavingSummary, setIsSavingSummary] = useState(false);
  const [saveToast, setSaveToast] = useState('');

  // Bitácora + dictado por voz
  const [noteText, setNoteText] = useState('');
  const [isSendingNote, setIsSendingNote] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechError, setSpeechError] = useState('');
  const recognitionRef = useRef(null);

  // Pasos GTD rápidos
  const [newStepText, setNewStepText] = useState('');
  const [newStepAssignee, setNewStepAssignee] = useState(currentUser?.email || '');

  // Adjuntos y cámara
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Limpiar reconocimiento de voz al cerrar o desmontar
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const matchedClient = useMemo(() => findClientForTask(task, clientes), [task, clientes]);
  const clientPhone = (matchedClient?.telefono || task?.clientPhone || '').trim();
  const clientEmail = (matchedClient?.email || task?.clientEmail || '').trim();
  const telHref = buildTelHref(clientPhone);
  const waHref = buildWhatsAppHref(clientPhone);

  const isVariable = task?.recordType === 'variable';
  const updatesList = Array.isArray(task?.updates) ? task.updates : [];
  const attachmentsList = Array.isArray(task?.attachments) ? task.attachments : [];
  const actionsList = Array.isArray(task?.actions) ? task.actions : [];

  const fileAttachments = attachmentsList.filter(a => a?.type !== 'link');
  const linkAttachments = attachmentsList.filter(a => a?.type === 'link');

  const showQuickToast = (msg) => {
    setSaveToast(msg);
    setTimeout(() => {
      setSaveToast(prev => (prev === msg ? '' : prev));
    }, 2500);
  };

  const persistToTaskDoc = async (payload) => {
    if (!task?.id) return;
    const finalPayload = {
      ...payload,
      updatedBy: currentUser?.email || 'movil',
      lastUpdated: serverTimestamp()
    };
    await updateDoc(doc(db, 'expedientes', task.id), finalPayload).catch(async () => {
      await updateDoc(doc(db, 'tasks', task.id), finalPayload);
    });
  };

  // Guardar cambios de resumen
  const handleSaveSummary = async () => {
    if (!title.trim()) {
      alert(isCa ? 'El títol és obligatori.' : 'El título es obligatorio.');
      return;
    }
    setIsSavingSummary(true);
    try {
      const payload = {
        title: title.trim(),
        status,
        dueDate,
        department,
        area: department,
        type,
        tramo: type,
        description: description.trim()
      };
      if (isVariable) {
        payload.feeAmount = Number(feeAmount) || 0;
        payload.precioHonorarios = Number(feeAmount) || 0;
      }
      await persistToTaskDoc(payload);
      if (logAction) {
        logAction('Actualizado desde Móvil', `${title.trim()} (${status})`);
      }
      showQuickToast(isCa ? 'Canvis desats' : 'Cambios guardados');
    } catch (err) {
      alert((isCa ? 'Error en desar: ' : 'Error al guardar: ') + err.message);
    } finally {
      setIsSavingSummary(false);
    }
  };

  // Toggle paso GTD
  const handleToggleStep = async (stepId) => {
    const updatedActions = actionsList.map(a =>
      a.id === stepId
        ? { ...a, isCompleted: !a.isCompleted, completedAt: !a.isCompleted ? new Date().toISOString() : null }
        : a
    );
    const payload = { actions: updatedActions };
    if (isVariable && updatedActions[0]) {
      const nextStatus = updatedActions[0].isCompleted ? 'Cerrado' : 'Abierto';
      payload.status = nextStatus;
      setStatus(nextStatus);
    }
    try {
      await persistToTaskDoc(payload);
    } catch (err) {
      alert((isCa ? 'Error actualitzant pas GTD: ' : 'Error actualizando paso GTD: ') + err.message);
    }
  };

  const handleAddStep = async (e) => {
    e.preventDefault();
    const txt = newStepText.trim();
    if (!txt) return;
    const newStep = {
      id: `step_${Date.now()}`,
      text: txt,
      assignee: newStepAssignee || currentUser?.email || '',
      isCompleted: false,
      completedAt: null
    };
    try {
      await persistToTaskDoc({ actions: [...actionsList, newStep] });
      setNewStepText('');
    } catch (err) {
      alert((isCa ? 'Error afegint pas: ' : 'Error añadiendo paso: ') + err.message);
    }
  };

  // Añadir nota a Bitácora
  const handleAddNote = async () => {
    const combined = `${noteText}${interimTranscript ? (noteText ? ' ' : '') + interimTranscript : ''}`.trim();
    if (!combined) return;
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }
    setIsSendingNote(true);
    try {
      const newEntry = {
        text: combined,
        author: currentUser?.email || 'movil',
        date: new Date().toISOString()
      };
      await persistToTaskDoc({ updates: [newEntry, ...updatesList] });
      setNoteText('');
      setInterimTranscript('');
      if (logAction) {
        logAction('Nota en Bitácora (Móvil)', `${task.title}: ${combined.slice(0, 80)}`);
      }
      showQuickToast(isCa ? 'Nota afegida a la bitàcola' : 'Nota añadida a bitácora');
    } catch (err) {
      alert((isCa ? 'Error en desar la nota: ' : 'Error al guardar nota: ') + err.message);
    } finally {
      setIsSendingNote(false);
    }
  };

  // Dictado por voz (Web Speech API)
  const toggleVoiceDictation = () => {
    setSpeechError('');
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError(
        isCa
          ? 'Aquest navegador no suporta dictat directe. Pots usar el micròfon del teclat del mòbil.'
          : 'Este navegador no soporta dictado directo. Puedes usar el micrófono del teclado del móvil.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = isCa ? 'ca-ES' : 'es-ES';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event) => {
        let finalChunk = '';
        let interimChunk = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) {
            finalChunk += transcript + ' ';
          } else {
            interimChunk += transcript;
          }
        }
        if (finalChunk.trim()) {
          setNoteText(prev => {
            const prefix = prev && !prev.endsWith(' ') ? `${prev} ` : prev;
            return `${prefix}${finalChunk.trim()} `;
          });
        }
        setInterimTranscript(interimChunk);
      };

      recognition.onerror = (ev) => {
        if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
          setSpeechError(
            isCa
              ? 'Permís de micròfon denegat. Activa el micròfon al navegador.'
              : 'Permiso de micrófono denegado. Activa el micrófono en el navegador.'
          );
        } else if (ev.error !== 'aborted' && ev.error !== 'no-speech') {
          setSpeechError((isCa ? 'Error de dictat: ' : 'Error de dictado: ') + ev.error);
        }
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (err) {
      setSpeechError((isCa ? 'No s\'ha pogut iniciar el dictat: ' : 'No se pudo iniciar el dictado: ') + err.message);
      setIsListening(false);
    }
  };

  // Subida desde Cámara o Archivo a Firebase Storage + Firestore
  const handleFileUpload = async (file, isCameraCapture = false) => {
    if (!file || !task?.id) return;
    setIsUploadingFile(true);
    try {
      const preparedFile = await compressImageIfNeeded(file);
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
      const displayName = isCameraCapture
        ? `Foto_${stamp}.jpg`
        : (preparedFile.name || `Adjunt_${stamp}`);
      const cleanName = displayName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storageRef = ref(storage, `expedientes/${task.id}/${Date.now()}_${cleanName}`);
      await uploadBytes(storageRef, preparedFile);
      const downloadURL = await getDownloadURL(storageRef);

      const newAttachment = {
        name: displayName,
        url: downloadURL,
        path: storageRef.fullPath,
        size: preparedFile.size,
        type: preparedFile.type || 'image/jpeg',
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser?.email || 'movil'
      };

      const updatedAttachments = [...attachmentsList, newAttachment];
      await persistToTaskDoc({ attachments: updatedAttachments });
      if (logAction) {
        logAction('Adjunto Subido (Móvil)', `${displayName} en ${task.title}`);
      }
      showQuickToast(isCa ? 'Document pujat correctament' : 'Documento subido correctamente');
    } catch (err) {
      alert((isCa ? 'Error en pujar el document: ' : 'Error al subir el documento: ') + err.message);
    } finally {
      setIsUploadingFile(false);
    }
  };

  const handleDeleteAttachment = async (attachment) => {
    if (!attachment) return;
    const msg = isCa ? `Eliminar "${attachment.name}"?` : `¿Eliminar "${attachment.name}"?`;
    if (!window.confirm(msg)) return;
    try {
      if (attachment.path) {
        await deleteObject(ref(storage, attachment.path)).catch(() => {});
      }
      const updated = attachmentsList.filter(a => a.url !== attachment.url);
      await persistToTaskDoc({ attachments: updated });
    } catch (err) {
      alert((isCa ? 'Error en eliminar adjunt: ' : 'Error al eliminar adjunto: ') + err.message);
    }
  };

  const statusOptions = [
    { value: 'Abierto', label: isCa ? 'Obert' : 'Abierto', activeCls: 'bg-emerald-600 text-white border-emerald-600' },
    { value: 'En Riesgo', label: isCa ? 'En Risc' : 'En Riesgo', activeCls: 'bg-amber-500 text-white border-amber-500' },
    { value: 'Con Retraso', label: isCa ? 'Amb Retard' : 'Con Retraso', activeCls: 'bg-rose-600 text-white border-rose-600' },
    { value: 'Cerrado', label: isCa ? 'Tancat' : 'Cerrado', activeCls: 'bg-blue-600 text-white border-blue-600' }
  ];

  const isImageFile = (att) => {
    const typeStr = (att?.type || '').toLowerCase();
    const nameStr = (att?.name || '').toLowerCase();
    return typeStr.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|heic)$/i.test(nameStr);
  };

  return (
    <div
      className="fixed inset-x-0 top-0 z-40 bg-slate-50 flex flex-col overflow-hidden w-full max-w-full"
      style={{ bottom: 'calc(44px + max(6px, env(safe-area-inset-bottom, 0px)))' }}
    >
      {/* Cabecera móvil del expediente con safe-area superior para PWA */}
      <div
        className="bg-[#152427] text-white px-3 pb-2.5 shadow-sm shrink-0"
        style={{ paddingTop: 'max(0.625rem, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/15 active:bg-white/25 text-white text-xs font-extrabold shrink-0 cursor-pointer"
            title={isCa ? 'Tornar' : 'Volver'}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isCa ? 'Tornar' : 'Volver'}</span>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {isVariable && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-200 border border-teal-400/30 text-[9px] font-extrabold uppercase shrink-0">
                  <Zap className="w-2.5 h-2.5" />
                  Var
                </span>
              )}
              <h2 className="text-sm font-extrabold truncate">{task?.title}</h2>
            </div>
            <p className="text-[11px] text-slate-300 truncate flex items-center gap-1 mt-0.5">
              <Building2 className="w-3 h-3 text-teal-300 shrink-0" />
              <span className="truncate">{matchedClient?.razonSocial || task?.client || (isCa ? 'Sense client' : 'Sin cliente')}</span>
            </p>
          </div>
        </div>

        {/* Barra de contacto directo con el cliente: solo iconos para dejar espacio completo al teléfono */}
        <div className="mt-2 bg-[#0f1b1d] border border-white/10 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block leading-none mb-0.5">
              {isCa ? 'Client' : 'Cliente'}
            </span>
            <span className="text-xs font-bold text-slate-100 truncate block">
              {clientPhone || clientEmail || (isCa ? 'Sense dades' : 'Sin datos')}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {telHref ? (
              <a
                href={telHref}
                className="w-9 h-9 flex items-center justify-center bg-emerald-600 active:bg-emerald-700 text-white rounded-xl shadow-xs"
                title={isCa ? `Trucar a ${clientPhone}` : `Llamar a ${clientPhone}`}
                aria-label={isCa ? 'Trucar' : 'Llamar'}
              >
                <Phone className="w-4 h-4" />
              </a>
            ) : (
              <span className="w-9 h-9 flex items-center justify-center bg-white/5 text-slate-500 rounded-xl">
                <Phone className="w-4 h-4" />
              </span>
            )}

            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center bg-[#25D366] active:bg-[#1fb858] text-slate-950 rounded-xl shadow-xs"
                title={`WhatsApp (${clientPhone})`}
                aria-label="WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            ) : (
              <span className="w-9 h-9 flex items-center justify-center bg-white/5 text-slate-500 rounded-xl">
                <MessageCircle className="w-4 h-4" />
              </span>
            )}

            {clientEmail ? (
              <a
                href={`mailto:${encodeURIComponent(clientEmail)}?subject=${encodeURIComponent(task?.title || '')}`}
                className="w-9 h-9 flex items-center justify-center bg-blue-600 active:bg-blue-700 text-white rounded-xl shadow-xs"
                title={clientEmail}
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
            ) : (
              <span className="w-9 h-9 flex items-center justify-center bg-white/5 text-slate-500 rounded-xl">
                <Mail className="w-4 h-4" />
              </span>
            )}
          </div>
        </div>

        {/* Sub-pestañas táctiles: Resum, Bitàcola, GTD, Adjunts, Xat */}
        <div className="grid grid-cols-5 gap-1 mt-2 bg-[#0f1b1d] p-1 rounded-xl border border-white/10 text-[10.5px]">
          <button
            type="button"
            onClick={() => setActiveTab('resum')}
            className={`py-1.5 px-1 rounded-lg font-bold transition-colors cursor-pointer truncate ${
              activeTab === 'resum' ? 'bg-indigo-600 text-white' : 'text-slate-300'
            }`}
          >
            {isCa ? 'Resum' : 'Resumen'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bitacora')}
            className={`py-1.5 px-1 rounded-lg font-bold transition-colors cursor-pointer truncate ${
              activeTab === 'bitacora' ? 'bg-indigo-600 text-white' : 'text-slate-300'
            }`}
          >
            {isCa ? 'Bitàcola' : 'Bitácora'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gtd')}
            className={`py-1.5 px-1 rounded-lg font-bold transition-colors cursor-pointer truncate ${
              activeTab === 'gtd' ? 'bg-indigo-600 text-white' : 'text-slate-300'
            }`}
          >
            GTD
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('adjunts')}
            className={`py-1.5 px-1 rounded-lg font-bold transition-colors cursor-pointer truncate ${
              activeTab === 'adjunts' ? 'bg-indigo-600 text-white' : 'text-slate-300'
            }`}
          >
            {isCa ? 'Adjunts' : 'Adjuntos'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`py-1.5 px-1 rounded-lg font-bold transition-colors cursor-pointer truncate ${
              activeTab === 'chat' ? 'bg-indigo-600 text-white' : 'text-slate-300'
            }`}
          >
            {isCa ? 'Xat' : 'Chat'}
          </button>
        </div>
      </div>

      {saveToast && (
        <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 text-center flex items-center justify-center gap-1.5 shrink-0">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Cuerpo: Chat usa flex-1 interno; el resto hace scroll completo */}
      {activeTab === 'chat' ? (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <ExpedienteChatTab
            task={task}
            currentUser={currentUser}
            logAction={logAction}
          />
        </div>
      ) : (
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 pb-6">
        {activeTab === 'resum' && (
          <div className="space-y-3">
            {focusedStepId && (() => {
              const focusedStep = actionsList.find(a => a.id === focusedStepId);
              if (!focusedStep) return null;
              return (
                <div
                  onClick={() => handleToggleStep(focusedStep.id)}
                  className={`p-3 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all ${
                    focusedStep.isCompleted
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-indigo-50 border-indigo-200 shadow-2xs'
                  }`}
                >
                  <div
                    className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 ${
                      focusedStep.isCompleted
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-indigo-400 text-transparent'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 block">
                      {isCa ? 'Acció GTD seleccionada' : 'Acción GTD seleccionada'}
                    </span>
                    <p className={`text-xs font-bold leading-snug mt-0.5 ${
                      focusedStep.isCompleted ? 'line-through text-slate-400' : 'text-slate-900'
                    }`}>
                      {focusedStep.text}
                    </p>
                  </div>
                </div>
              );
            })()}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  {isCa ? 'Títol / Concepte' : 'Título / Concepto'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1.5">
                  {isCa ? 'Estat' : 'Estado'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {statusOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        status === opt.value
                          ? opt.activeCls
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={`grid gap-2 ${isVariable ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-indigo-500" />
                    <span>{isCa ? 'Data Venciment' : 'Fecha Vencimiento'}</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>
                {isVariable && (
                  <div>
                    <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                      {isCa ? 'Preu (€)' : 'Precio (€)'}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={feeAmount}
                      onChange={(e) => setFeeAmount(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    {isCa ? 'Àrea' : 'Área'}
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white text-slate-800 outline-none"
                  >
                    {department && !areas.some(a => (a.nombre || a.name) === department) && (
                      <option value={department}>{translateClassificationName(department, lang)}</option>
                    )}
                    {areas.map(a => {
                      const val = a.nombre || a.name;
                      return (
                        <option key={a.id || val} value={val}>
                          {translateClassificationName(val, lang)}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                    {isCa ? 'Tràmit' : 'Trámite'}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold bg-white text-slate-800 outline-none"
                  >
                    {type && !tramos.some(tr => (tr.nombre || tr.name) === type) && (
                      <option value={type}>{translateClassificationName(type, lang)}</option>
                    )}
                    {tramos.map(tr => {
                      const val = tr.nombre || tr.name;
                      return (
                        <option key={tr.id || val} value={val}>
                          {translateClassificationName(val, lang)}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-500 block mb-1">
                  {isCa ? 'Descripció / Notes' : 'Descripción / Notas'}
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="button"
                disabled={isSavingSummary}
                onClick={handleSaveSummary}
                className="w-full py-3 rounded-xl bg-indigo-600 active:bg-indigo-700 disabled:bg-slate-400 text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                {isSavingSummary ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{isCa ? 'Desar Canvis' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'gtd' && (
          <div className="space-y-3">
            <form onSubmit={handleAddStep} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStepText}
                  onChange={(e) => setNewStepText(e.target.value)}
                  placeholder={isCa ? '+ Afegir pas o gestió...' : '+ Añadir paso o gestión...'}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-800 outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl bg-[#152427] text-white text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <select
                value={newStepAssignee}
                onChange={(e) => setNewStepAssignee(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-700 outline-none"
              >
                {usersList.map(u => {
                  const em = u.email || u.id;
                  return (
                    <option key={em} value={em}>
                      {u.name ? `${u.name} (${em})` : em}
                    </option>
                  );
                })}
              </select>
            </form>

            <div className="space-y-2">
              {actionsList.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                  {isCa ? 'No hi ha passos GTD en aquest expedient.' : 'No hay pasos GTD en este expediente.'}
                </div>
              ) : (
                actionsList.map(step => (
                  <div
                    key={step.id}
                    onClick={() => handleToggleStep(step.id)}
                    className={`p-3 rounded-2xl border flex items-start gap-3 transition-all cursor-pointer ${
                      step.isCompleted
                        ? 'bg-slate-100/80 border-slate-200 opacity-75'
                        : 'bg-white border-slate-200 shadow-2xs active:bg-indigo-50/40'
                    }`}
                  >
                    <div
                      className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 ${
                        step.isCompleted
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'bg-white border-slate-300 text-transparent'
                      }`}
                    >
                      <Check className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold leading-snug ${step.isCompleted ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                        {step.text}
                      </p>
                      {step.assignee && (
                        <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {step.assignee}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'bitacora' && (
          <div className="space-y-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-slate-600">
                  {isCa ? 'Nova nota a la bitàcola' : 'Nueva nota en bitácora'}
                </span>
                <button
                  type="button"
                  onClick={toggleVoiceDictation}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse shadow-sm'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200 active:bg-indigo-100'
                  }`}
                >
                  {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>
                    {isListening
                      ? (isCa ? 'Aturar dictat' : 'Detener dictado')
                      : (isCa ? 'Dictar veu' : 'Dictar voz')}
                  </span>
                </button>
              </div>

              <textarea
                rows={3}
                value={`${noteText}${interimTranscript ? (noteText && !noteText.endsWith(' ') ? ' ' : '') + interimTranscript : ''}`}
                onChange={(e) => {
                  setNoteText(e.target.value);
                  setInterimTranscript('');
                }}
                placeholder={
                  isListening
                    ? (isCa ? 'Escoltant... parla clarament...' : 'Escuchando... habla claramente...')
                    : (isCa ? 'Escriu o prem "Dictar veu" per transcriure...' : 'Escribe o pulsa "Dictar voz" para transcribir...')
                }
                className={`w-full px-3 py-2 border rounded-xl text-xs text-slate-800 outline-none ${
                  isListening ? 'border-rose-400 bg-rose-50/30 ring-1 ring-rose-300' : 'border-slate-300 focus:border-indigo-500'
                }`}
              />

              {speechError && (
                <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                  {speechError}
                </p>
              )}

              <button
                type="button"
                disabled={isSendingNote || (!noteText.trim() && !interimTranscript.trim())}
                onClick={handleAddNote}
                className="w-full py-2.5 rounded-xl bg-blue-600 active:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isSendingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>{isCa ? 'Afegir a Bitàcola' : 'Añadir a Bitácora'}</span>
              </button>
            </div>

            <div className="space-y-2">
              {updatesList.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                  {isCa ? 'Encara no hi ha notes registrades.' : 'Aún no hay notas registradas.'}
                </div>
              ) : (
                updatesList.map((upd, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-1">
                    <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">{upd.text}</p>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                      <span className="font-semibold truncate max-w-[60%]">{upd.author}</span>
                      <span>
                        {upd.date ? new Date(upd.date).toLocaleString(isCa ? 'ca-ES' : 'es-ES', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'adjunts' && (
          <div className="space-y-3">
            {/* Botones de Cámara y Subida de Archivo */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={isUploadingFile}
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded-2xl bg-[#152427] active:bg-[#1e3539] disabled:bg-slate-400 text-white font-extrabold text-xs shadow-sm cursor-pointer"
              >
                {isUploadingFile ? <Loader2 className="w-6 h-6 animate-spin text-teal-300" /> : <Camera className="w-6 h-6 text-teal-300" />}
                <span>{isCa ? 'Fer Foto Document' : 'Hacer Foto Documento'}</span>
              </button>

              <button
                type="button"
                disabled={isUploadingFile}
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-1.5 py-4 px-3 rounded-2xl bg-white border border-slate-300 active:bg-slate-100 disabled:opacity-50 text-slate-800 font-extrabold text-xs shadow-2xs cursor-pointer"
              >
                <Paperclip className="w-6 h-6 text-indigo-600" />
                <span>{isCa ? 'Pujar Arxiu / PDF' : 'Subir Archivo / PDF'}</span>
              </button>
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, true);
                e.target.value = '';
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, false);
                e.target.value = '';
              }}
            />

            {isUploadingFile && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs font-bold text-indigo-800 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isCa ? 'Pujant document al núvol...' : 'Subiendo documento a la nube...'}</span>
              </div>
            )}

            {/* Lista de adjuntos */}
            {fileAttachments.length === 0 && linkAttachments.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                {isCa ? 'Encara no hi ha adjunts en aquest expedient.' : 'Aún no hay adjuntos en este expediente.'}
              </div>
            ) : (
              <div className="space-y-2">
                {fileAttachments.map((att, idx) => (
                  <div key={`file_${idx}`} className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-2.5">
                    {isImageFile(att) ? (
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                        <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                      </a>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <a
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold text-slate-800 hover:text-indigo-600 truncate block"
                      >
                        {att.name}
                      </a>
                      <span className="text-[10px] text-slate-400">
                        {att.uploadedAt ? new Date(att.uploadedAt).toLocaleDateString(isCa ? 'ca-ES' : 'es-ES') : ''}
                      </span>
                    </div>

                    <a
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-400 hover:text-indigo-600 shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleDeleteAttachment(att)}
                      className="p-2 text-slate-400 hover:text-rose-600 shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {linkAttachments.map((lnk, idx) => (
                  <div key={`lnk_${idx}`} className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between gap-2">
                    <a
                      href={lnk.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-blue-700 truncate flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{lnk.name}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDeleteAttachment(lnk)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
