import React, { useState, useEffect, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import { 
  Building2, Plus, Search, Filter, Download, Upload, Trash2, 
  Pencil, AlertTriangle, AlertCircle, CheckCircle2, XCircle, FileSpreadsheet, 
  Mail, Phone, MapPin, Tag, Briefcase, RefreshCw, Layers, ExternalLink, ArrowLeft,
  Clock, UserPlus, GitMerge
} from 'lucide-react';
import { 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  writeBatch, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../firebase';
import ClienteModal, { CLIENT_TYPES_CA, CLIENT_TYPES_ES } from './ClienteModal';
import MergeClientModal from './MergeClientModal';

const EXACT_HEADERS = ['nif', 'razonSocial', 'nombreComercial', 'email', 'telefono', 'direccion', 'tipo'];

const ClientesView = ({ 
  clientes = [], 
  tasks = [], 
  currentUser, 
  logAction,
  onBackToAdmin,
  onNavigateToClientExpedientes,
  formalizeData = null,
  onClearFormalizeData,
  isAdmin = true,
  lang = 'ca'
}) => {
  const isCa = lang === 'ca';
  const clientTypesList = isCa ? CLIENT_TYPES_CA : CLIENT_TYPES_ES;
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState(null);
  const [isProcessingCsv, setIsProcessingCsv] = useState(false);
  const [csvResultModal, setCsvResultModal] = useState(null);
  const fileInputRef = useRef(null);
  const [clientSubTab, setClientSubTab] = useState('official'); // 'official' | 'provisional'
  const [mergeModalTarget, setMergeModalTarget] = useState(null);

  // Escuchar si viene una petición directa de formalización desde otra vista
  useEffect(() => {
    if (formalizeData) {
      setEditingCliente(formalizeData);
      setIsModalOpen(true);
      if (onClearFormalizeData) onClearFormalizeData();
    }
  }, [formalizeData]);

  // Set de NIFs existentes normalizados en mayúsculas
  const existingNifs = useMemo(() => {
    return new Set(clientes.map(c => (c.nif || '').toUpperCase().trim()).filter(Boolean));
  }, [clientes]);

  // Contar expedientes asociados a cada cliente (excluyendo cerrados)
  const clientTaskCounts = useMemo(() => {
    const counts = {};
    tasks.forEach(t => {
      const status = (t.status || '').trim();
      if (status === 'Cerrado' || status === 'Closed') return;

      const clientStr = (t.client || '').toLowerCase().trim();
      const nifStr = (t.clientNif || '').toUpperCase().trim();
      
      clientes.forEach(c => {
        const cNif = (c.nif || '').toUpperCase().trim();
        const cRazon = (c.razonSocial || '').toLowerCase().trim();
        
        let match = false;
        if (nifStr && nifStr === cNif) {
          match = true;
        } else if (clientStr) {
          if (clientStr.includes(cNif.toLowerCase()) || clientStr.includes(cRazon)) {
            match = true;
          }
        }
        
        if (match) {
          counts[c.id || c.nif] = (counts[c.id || c.nif] || 0) + 1;
        }
      });
    });
    return counts;
  }, [tasks, clientes]);

  // Lista de clientes provisionales deducida de los expedientes en tiempo real
  const provisionalClientsList = useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    const map = new Map();
    tasks.forEach(task => {
      if (!task.client) return;
      const cName = task.client.trim();
      const isOfficial = clientes.some(c => {
        const cNif = (c.nif || '').toLowerCase().trim();
        const cRazon = (c.razonSocial || '').toLowerCase().trim();
        const tClient = cName.toLowerCase();
        return (cNif && tClient.includes(cNif)) || (cRazon && tClient === cRazon) || `${cRazon} (${cNif})` === tClient;
      });

      if (!isOfficial || task.isProvisionalClient) {
        const key = cName.toLowerCase();
        if (map.has(key)) {
          const existing = map.get(key);
          existing.count += 1;
          existing.taskIds.push(task.id);
        } else {
          map.set(key, {
            name: cName,
            count: 1,
            taskIds: [task.id],
            firstCreated: task.createdAt || task.lastUpdated || null
          });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [tasks, clientes]);

  // Filtrado de clientes por texto y tipo
  const filteredClientes = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return clientes.filter(c => {
      if (selectedTypeFilter && c.tipo !== selectedTypeFilter) return false;
      if (!term) return true;
      return (
        (c.nif || '').toLowerCase().includes(term) ||
        (c.razonSocial || '').toLowerCase().includes(term) ||
        (c.nombreComercial || '').toLowerCase().includes(term) ||
        (c.email || '').toLowerCase().includes(term) ||
        (c.telefono || '').toLowerCase().includes(term) ||
        (c.direccion || '').toLowerCase().includes(term)
      );
    });
  }, [clientes, searchTerm, selectedTypeFilter]);

  // Descargar plantilla CSV vacía con las 7 cabeceras exactas
  const handleDownloadTemplate = () => {
    // Añadimos BOM UTF-8 (\uFEFF) para que Excel lo abra con la codificación correcta
    const csvContent = '\uFEFF' + EXACT_HEADERS.join(',') + '\r\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'plantilla_clientes_gestflow.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (logAction) logAction('Descarga Plantilla CSV', 'Plantilla vacía de clientes');
  };

  // Subir y procesar CSV completo con PapaParse y Batch Write
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingCsv(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      complete: async (results) => {
        try {
          const rows = results.data;
          
          if (!rows || rows.length === 0) {
            alert('El archivo CSV está vacío.');
            setIsProcessingCsv(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
          }

          // Verificar si las cabeceras requeridas están presentes
          const firstRow = rows[0];
          const hasRequiredHeaders = 'nif' in firstRow && 'razonSocial' in firstRow;
          
          if (!hasRequiredHeaders) {
            // Intentar mapeo insensible a mayúsculas
            const keys = Object.keys(firstRow).map(k => k.toLowerCase());
            const hasLoose = keys.includes('nif') && (keys.includes('razonsocial') || keys.includes('razón social') || keys.includes('razon_social'));
            if (!hasLoose) {
              alert('El CSV debe contener al menos las cabeceras exactas: nif, razonSocial');
              setIsProcessingCsv(false);
              if (fileInputRef.current) fileInputRef.current.value = '';
              return;
            }
          }

          let importedCount = 0;
          let skippedExistingCount = 0;
          let skippedInvalidCount = 0;
          const skippedNifs = [];
          const newClientsToSave = [];
          const seenInThisCsv = new Set();

          rows.forEach((row) => {
            // Extraer valores tolerando mayúsculas/minúsculas en nombres de columna
            const nif = (row.nif || row.NIF || row.Nif || '').toString().trim().toUpperCase();
            const razonSocial = (row.razonSocial || row.RazonSocial || row['razón social'] || row['Razón Social'] || row.razon_social || '').toString().trim();
            const nombreComercial = (row.nombreComercial || row.NombreComercial || row.nombre_comercial || '').toString().trim();
            const email = (row.email || row.Email || row.correo || '').toString().trim();
            const telefono = (row.telefono || row.Telefono || row.tel || '').toString().trim();
            const direccion = (row.direccion || row.Direccion || row['dirección'] || '').toString().trim();
            const tipo = (row.tipo || row.Tipo || '').toString().trim();

            // Validación de obligatoriedad
            if (!nif || !razonSocial) {
              skippedInvalidCount++;
              return;
            }

            // Omitir si ya existe en Firestore
            if (existingNifs.has(nif)) {
              skippedExistingCount++;
              skippedNifs.push({ nif, razonSocial, motivo: 'Ya existe en base de datos' });
              return;
            }

            // Omitir duplicados dentro del mismo CSV
            if (seenInThisCsv.has(nif)) {
              skippedExistingCount++;
              skippedNifs.push({ nif, razonSocial, motivo: 'Duplicado dentro del CSV' });
              return;
            }

            seenInThisCsv.add(nif);
            newClientsToSave.push({
              nif,
              razonSocial,
              nombreComercial,
              email,
              telefono,
              direccion,
              tipo: tipo || 'Sociedad Limitada (S.L.)'
            });
          });

          // Escritura por lotes (Batch Write en Firestore)
          // Límite de Firestore: 500 operaciones por lote. Usamos bloques de 400.
          if (newClientsToSave.length > 0) {
            const BATCH_SIZE = 400;
            for (let i = 0; i < newClientsToSave.length; i += BATCH_SIZE) {
              const chunk = newClientsToSave.slice(i, i + BATCH_SIZE);
              const batch = writeBatch(db);

              chunk.forEach((client) => {
                const docRef = doc(db, 'clientes', client.nif);
                batch.set(docRef, {
                  ...client,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                  createdBy: currentUser?.email || 'import_csv'
                });
              });

              await batch.commit();
            }
            importedCount = newClientsToSave.length;
          }

          if (logAction) {
            logAction(
              'Importación Lote Clientes', 
              `Importados: ${importedCount}, Omitidos por existir: ${skippedExistingCount}, Inválidos: ${skippedInvalidCount}`
            );
          }

          // Mostrar resumen al usuario
          setCsvResultModal({
            totalRows: rows.length,
            importedCount,
            skippedExistingCount,
            skippedInvalidCount,
            skippedNifs: skippedNifs.slice(0, 50)
          });

        } catch (error) {
          console.error('Error procesando CSV:', error);
          alert('Hubo un error al procesar el archivo CSV: ' + error.message);
        } finally {
          setIsProcessingCsv(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (err) => {
        console.error('PapaParse error:', err);
        alert('Error al leer el archivo CSV: ' + err.message);
        setIsProcessingCsv(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  // Crear o actualizar un cliente individualmente
  const handleSaveCliente = async (clientData, existingCliente) => {
    const normalizedNif = clientData.nif.toUpperCase().trim();

    if (existingCliente) {
      const oldNif = (existingCliente.nif || '').toUpperCase().trim();
      
      // Si el NIF cambió, transferir datos al nuevo doc y eliminar el anterior
      if (oldNif && oldNif !== normalizedNif) {
        const batch = writeBatch(db);
        const newDocRef = doc(db, 'clientes', normalizedNif);
        const oldDocRef = doc(db, 'clientes', oldNif);
        
        batch.set(newDocRef, {
          ...clientData,
          createdAt: existingCliente.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
          updatedBy: currentUser?.email || 'admin'
        });
        batch.delete(oldDocRef);
        await batch.commit();

        if (logAction) {
          logAction('Modificado NIF Cliente', `De ${oldNif} a ${normalizedNif} (${clientData.razonSocial})`);
        }
      } else {
        const docRef = doc(db, 'clientes', normalizedNif);
        await updateDoc(docRef, {
          ...clientData,
          updatedAt: serverTimestamp(),
          updatedBy: currentUser?.email || 'admin'
        });
        if (logAction) {
          logAction('Actualizado Cliente', `${clientData.razonSocial} (${normalizedNif})`);
        }
      }
    } else {
      // Alta de nuevo cliente
      const docRef = doc(db, 'clientes', normalizedNif);
      await setDoc(docRef, {
        ...clientData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentUser?.email || 'admin'
      });
      if (logAction) {
        logAction('Creado Cliente', `${clientData.razonSocial} (${normalizedNif})`);
      }

      // Si se está formalizando un cliente provisional, actualizar todos sus expedientes vinculados
      if (existingCliente?.fromProvisionalName) {
        const provName = existingCliente.fromProvisionalName.trim().toLowerCase();
        const linked = tasks.filter(t => {
          if (!t.client) return false;
          const clean = t.client.trim().toLowerCase();
          return clean === provName || clean === `${provName} (provisional)`;
        });

        if (linked.length > 0) {
          const taskBatch = writeBatch(db);
          const targetLabel = `${clientData.razonSocial} (${normalizedNif})`;

          linked.forEach(t => {
            taskBatch.update(doc(db, 'expedientes', t.id), {
              client: targetLabel,
              clientNif: normalizedNif,
              isProvisionalClient: false,
              lastUpdated: serverTimestamp(),
              updatedBy: currentUser?.email || 'admin'
            });
            taskBatch.update(doc(db, 'tasks', t.id), {
              client: targetLabel,
              clientNif: normalizedNif,
              isProvisionalClient: false,
              lastUpdated: serverTimestamp(),
              updatedBy: currentUser?.email || 'admin'
            }).catch(() => {});
          });

          await taskBatch.commit();
          if (logAction) {
            logAction(
              isCa ? 'Formalitzat Client Provisional' : 'Formalizado Cliente Provisional',
              `"${existingCliente.fromProvisionalName}" -> "${targetLabel}" (${linked.length} expedients)`
            );
          }
        }
      }
    }
  };

  // Eliminar cliente con confirmación y chequeo de expedientes
  const handleDeleteCliente = async (cliente) => {
    const taskCount = clientTaskCounts[cliente.id || cliente.nif] || 0;
    let message = isCa ? `Eliminar permanentment el client "${cliente.razonSocial}" (${cliente.nif})?` : `¿Eliminar permanentemente al cliente "${cliente.razonSocial}" (${cliente.nif})?`;
    if (taskCount > 0) {
      message = isCa ? `⚠️ ATENCIÓ: Aquest client té ${taskCount} expedient(s) associat(s).\n\nSegur que voleu eliminar "${cliente.razonSocial}" (${cliente.nif}) de la base de dades?` : `⚠️ ATENCIÓN: Este cliente tiene ${taskCount} expediente(s) asociado(s).\n\n¿Estás seguro de que deseas eliminar a "${cliente.razonSocial}" (${cliente.nif}) de la base de datos?`;
    }

    if (!window.confirm(message)) return;

    try {
      const docId = cliente.id || cliente.nif;
      await deleteDoc(doc(db, 'clientes', docId));
      if (logAction) {
        logAction('Eliminado Cliente', `${cliente.razonSocial} (${cliente.nif})`);
      }
    } catch (err) {
      console.error(err);
      alert('Error al eliminar cliente: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* TARJETA SUPERIOR: CABECERA Y ACCIONES CSV */}
      <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl border border-slate-200/80 shadow-premium">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-glow-indigo">
                <Building2 className="w-5 h-5 drop-shadow-xs" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  {isCa ? 'Mòdul de Clients i Empreses' : 'Módulo de Clientes y Empresas'}
                </h2>
                <p className="text-xs text-slate-500">
                  {isCa ? 'Base de dades oficial de clients de GestFlow amb vinculació relacional a expedients.' : 'Base de datos oficial de clientes de GestFlow con vinculación relacional a expedientes.'}
                </p>
              </div>
            </div>
          </div>

          {/* Botones de acción: Descarga Plantilla, Subida CSV y Nuevo Cliente */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {onBackToAdmin && (
              <button
                onClick={onBackToAdmin}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
                title={isAdmin ? "Volver a la vista de Administración" : "Volver a Expedientes"}
              >
                <ArrowLeft className="w-4 h-4 text-slate-500" />
                <span>{isAdmin ? (isCa ? "Tornar a Admin" : "Volver a Admin") : (isCa ? "Tornar a Expedients" : "Volver a Expedientes")}</span>
              </button>
            )}

            {/* Input oculto para subida de CSV */}
            <input 
              type="file" 
              ref={fileInputRef} 
              accept=".csv,text/csv" 
              onChange={handleFileUpload} 
              className="hidden" 
            />

            {/* Botón 1: Descargar Plantilla Vacía */}
            <button
              onClick={handleDownloadTemplate}
              className="bg-white hover:bg-slate-50/80 text-slate-700 border border-slate-200/80 hover:border-slate-300 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all"
              title="Descargar archivo CSV vacío con las 7 cabeceras oficiales"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span>{isCa ? "Plantilla CSV" : "Plantilla CSV"}</span>
            </button>

            {/* Botón 2: Subir CSV Completo */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessingCsv}
              className="bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-all disabled:opacity-50"
              title="Importar archivo CSV completo y escribir por lotes en Firestore"
            >
              {isProcessingCsv ? (
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              ) : (
                <Upload className="w-4 h-4 text-emerald-400" />
              )}
              <span>{isProcessingCsv ? (isCa ? 'Important...' : 'Importando...') : (isCa ? 'Importar CSV' : 'Importar CSV')}</span>
            </button>

            {/* Botón 3: Nuevo Cliente Manual */}
            <button
              onClick={() => {
                setEditingCliente(null);
                setIsModalOpen(true);
              }}
              className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs hover:shadow-premium-hover flex items-center gap-1.5 transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{isCa ? "Nou Client" : "Nuevo Cliente"}</span>
            </button>
          </div>
        </div>

        {/* CONTADORES RESUMEN */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div 
            onClick={() => setClientSubTab('official')}
            className={`p-3.5 rounded-xl border shadow-2xs cursor-pointer transition-all ${clientSubTab === 'official' ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20' : 'bg-slate-50/80 border-slate-200/60 hover:bg-slate-100'}`}
          >
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{isCa ? 'Total Oficials' : 'Total Oficiales'}</div>
            <div className="text-2xl font-extrabold text-slate-900 mt-0.5">{clientes.length}</div>
          </div>
          <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100/70 shadow-2xs">
            <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">{isCa ? 'Societats (S.L./S.A.)' : 'Sociedades (S.L./S.A.)'}</div>
            <div className="text-2xl font-extrabold text-indigo-900 mt-0.5">
              {clientes.filter(c => (c.tipo || '').includes('Sociedad')).length}
            </div>
          </div>
          <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100/70 shadow-2xs">
            <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{isCa ? 'Autònoms' : 'Autónomos'}</div>
            <div className="text-2xl font-extrabold text-emerald-900 mt-0.5">
              {clientes.filter(c => (c.tipo || '').includes('Autónomo') || (c.tipo || '').includes('Particular')).length}
            </div>
          </div>
          <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100/70 shadow-2xs">
            <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{isCa ? 'Amb Tràmits Actius' : 'Con Trámites Activos'}</div>
            <div className="text-2xl font-extrabold text-blue-900 mt-0.5">
              {Object.keys(clientTaskCounts).length}
            </div>
          </div>
          <div 
            onClick={() => setClientSubTab('provisional')}
            className={`p-3.5 rounded-xl border shadow-2xs cursor-pointer transition-all ${clientSubTab === 'provisional' ? 'bg-amber-100/80 border-amber-400 ring-2 ring-amber-500/20' : 'bg-amber-50/60 border-amber-200/80 hover:bg-amber-100/50'}`}
          >
            <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider flex items-center justify-between">
              <span>{isCa ? 'Provisores Pendents' : 'Provisionales Pendientes'}</span>
              <Clock className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-amber-900 mt-0.5">
              {provisionalClientsList.length}
            </div>
          </div>
        </div>
      </div>

      {/* SELECTOR DE SUBPESTAÑA: OFICIALES VS PROVISIONALES */}
      <div className="flex items-center gap-2 p-1 bg-slate-200/60 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setClientSubTab('official')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            clientSubTab === 'official' ? 'bg-white text-indigo-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>{isCa ? 'Clients Oficials Registrats' : 'Clientes Oficiales Registrados'} ({clientes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setClientSubTab('provisional')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            clientSubTab === 'provisional' 
              ? 'bg-amber-500 text-white shadow-2xs' 
              : 'text-amber-800 hover:bg-amber-100/60'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>{isCa ? 'Pendents d\'Alta / Provisores' : 'Pendientes de Alta / Provisionales'} ({provisionalClientsList.length})</span>
        </button>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTRADO */}
      <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-premium flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={isCa ? "Cercar per NIF, Raó Social, Marca comercial, Email, Telèfon o Adreça..." : "Buscar por NIF, Razón Social, Marca comercial, Email, Teléfono o Dirección..."}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedTypeFilter}
              onChange={e => setSelectedTypeFilter(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-700 outline-none cursor-pointer"
            >
              <option value="">{isCa ? 'Tots els tipus' : 'Todos los tipos'}</option>
              {clientTypesList.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          {selectedTypeFilter && (
            <button 
              onClick={() => setSelectedTypeFilter('')}
              className="text-xs text-rose-600 font-bold hover:underline"
            >
              {isCa ? 'Netejar' : 'Limpiar'}
            </button>
          )}
        </div>
      </div>

      {/* VISTA CONDICIONAL: TABLA DE PROVISIONALES O TABLA OFICIAL */}
      {clientSubTab === 'provisional' ? (
        <div className="bg-white/95 backdrop-blur-xs rounded-2xl border border-amber-200/80 shadow-xs overflow-hidden space-y-0">
          <div className="p-4 bg-amber-50/60 border-b border-amber-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>{isCa ? 'Clients Provisores Detectats en Expedients' : 'Clientes Provisionales Detectados en Expedientes'}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isCa 
                  ? 'Aquestes persones o empreses han tingut expedients sense estar donats d\'alta formalment. Formalitza la seva fitxa fiscal o fusiona\'ls amb un client existent.'
                  : 'Estas personas o empresas han tenido expedientes sin estar dados de alta formalmente. Formaliza su ficha fiscal o fusiónalos con un cliente existente.'}
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-amber-200/80 text-amber-900 rounded-full shrink-0">
              {provisionalClientsList.length} {isCa ? 'provisores pendents' : 'provisionales pendientes'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="p-4">{isCa ? 'Nom del Client Provisional' : 'Nombre del Cliente Provisional'}</th>
                  <th className="p-4 text-center">{isCa ? 'Expedients Associats' : 'Expedientes Asociados'}</th>
                  <th className="p-4">{isCa ? 'Estat de Formalització' : 'Estado de Formalización'}</th>
                  <th className="p-4 text-right pr-6">{isCa ? 'Accions Recomanades' : 'Acciones Recomendadas'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {provisionalClientsList.map((prov) => (
                  <tr key={prov.name} className="hover:bg-amber-50/40 transition-colors">
                    <td className="p-4 font-bold text-slate-900 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                        <span>{prov.name}</span>
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={() => onNavigateToClientExpedientes && onNavigateToClientExpedientes(prov.name)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
                        title={isCa ? "Veure expedients vinculats" : "Ver expedientes vinculados"}
                      >
                        <span>{prov.count} {prov.count === 1 ? (isCa ? 'expedient' : 'expediente') : (isCa ? 'expedients' : 'expedientes')}</span>
                        <ExternalLink className="w-3 h-3 text-amber-700" />
                      </button>
                    </td>

                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        <span>{isCa ? 'Pendent de Fitxa Fiscal' : 'Pendiente de Ficha Fiscal'}</span>
                      </span>
                    </td>

                    <td className="p-4 text-right pr-6 whitespace-nowrap">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCliente({
                              razonSocial: prov.name,
                              fromProvisionalName: prov.name,
                              linkedTasksCount: prov.count
                            });
                            setIsModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          title={isCa ? "Formalitzar com a client oficial" : "Formalizar como cliente oficial"}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{isCa ? 'Formalitzar Fitxa' : 'Formalizar Ficha'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setMergeModalTarget(prov.name)}
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          title={isCa ? "Fusionar amb un client oficial existent" : "Fusionar con un cliente oficial existente"}
                        >
                          <GitMerge className="w-3.5 h-3.5 text-amber-600" />
                          <span>{isCa ? 'Fusionar' : 'Fusionar'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {provisionalClientsList.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-12 text-center text-slate-400">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm">
                        {isCa ? 'Cap client provisional pendent' : 'Ningún cliente provisional pendiente'}
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        {isCa 
                          ? 'Tots els expedients de la gestoria estan degudament associats a clients oficials registrats.' 
                          : 'Todos los expedientes de la gestoría están debidamente asociados a clientes oficiales registrados.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
      /* TABLA PRINCIPAL DE CLIENTES OFICIALES */
      <div className="bg-white/95 backdrop-blur-xs rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200/80 text-slate-500 font-bold uppercase text-[11px] tracking-wider">
                <th className="p-4">NIF / CIF</th>
                <th className="p-4">{isCa ? 'Raó Social i Comercial' : 'Razón Social y Comercial'}</th>
                <th className="p-4">{isCa ? 'Tipus' : 'Tipo'}</th>
                <th className="p-4">{isCa ? 'Contacte' : 'Contacto'}</th>
                <th className="p-4">{isCa ? 'Adreça' : 'Dirección'}</th>
                <th className="p-4 text-center">{isCa ? 'Expedients Actius' : 'Expedientes Activos'}</th>
                <th className="p-4 text-right">{isCa ? 'Accions' : 'Acciones'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredClientes.map((c) => {
                const taskCount = clientTaskCounts[c.id || c.nif] || 0;
                return (
                  <tr key={c.id || c.nif} className="hover:bg-slate-50/70 transition-colors">
                    
                    {/* NIF */}
                    <td className="p-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-1 rounded-md border border-slate-200">
                        {c.nif}
                      </span>
                    </td>

                    {/* Razón Social y Nombre Comercial */}
                    <td className="p-4">
                      <div className="font-bold text-slate-900 leading-snug">
                        {c.razonSocial}
                      </div>
                      {c.nombreComercial && c.nombreComercial !== c.razonSocial && (
                        <div className="text-xs text-indigo-600 font-medium mt-0.5">
                          {c.nombreComercial}
                        </div>
                      )}
                    </td>

                    {/* Tipo de cliente */}
                    <td className="p-4 whitespace-nowrap">
                      {c.tipo ? (
                        <span className="text-[11px] font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100/80">
                          {c.tipo}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>

                    {/* Contacto: Email y Teléfono */}
                    <td className="p-4">
                      <div className="space-y-1">
                        {c.email ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <a href={`mailto:${c.email}`} className="hover:text-indigo-600 truncate max-w-[180px]">
                              {c.email}
                            </a>
                          </div>
                        ) : null}
                        {c.telefono ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{c.telefono}</span>
                          </div>
                        ) : null}
                        {!c.email && !c.telefono && (
                          <span className="text-xs text-slate-400 italic">Sin datos</span>
                        )}
                      </div>
                    </td>

                    {/* Dirección */}
                    <td className="p-4 text-xs text-slate-600 max-w-xs truncate" title={c.direccion}>
                      {c.direccion ? (
                        <div className="flex items-center gap-1 text-slate-600">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{c.direccion}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">-</span>
                      )}
                    </td>

                    {/* Conteo de expedientes vinculados */}
                    <td className="p-4 text-center whitespace-nowrap">
                      {onNavigateToClientExpedientes && taskCount > 0 ? (
                        <button
                          type="button"
                          onClick={() => onNavigateToClientExpedientes(c.nif || c.razonSocial)}
                          className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                          title={isCa ? "Veure expedients d'aquest client" : "Ver expedientes de este cliente"}
                        >
                          {taskCount} {taskCount === 1 ? (isCa ? 'actiu' : 'activo') : (isCa ? 'actius' : 'activos')}
                          <ExternalLink className="w-3 h-3 text-emerald-600" />
                        </button>
                      ) : (
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          taskCount > 0 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {taskCount} {taskCount === 1 ? (isCa ? 'actiu' : 'activo') : (isCa ? 'actius' : 'activos')}
                        </span>
                      )}
                    </td>

                    {/* Botones de acción (Editar y Eliminar) */}
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingCliente(c);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title={isCa ? "Editar client" : "Editar cliente"}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCliente(c)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title={isCa ? "Eliminar client" : "Eliminar cliente"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Estado vacío si no hay clientes */}
              {filteredClientes.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div className="text-slate-700 font-bold text-sm">
                      {isCa 
                        ? (searchTerm || selectedTypeFilter ? "No s'han trobat clients amb els filtres aplicats" : "Encara no hi ha clients registrats") 
                        : (searchTerm || selectedTypeFilter ? "No se encontraron clientes con los filtros aplicados" : "Aún no hay clientes registrados")}
                    </div>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {searchTerm || selectedTypeFilter 
                        ? 'Prueba a cambiar los términos de búsqueda o limpiar los filtros.' 
                        : 'Puedes dar de alta clientes manualmente o importar un archivo CSV mediante los botones superiores.'}
                    </p>
                    {!searchTerm && !selectedTypeFilter && (
                      <div className="mt-4 flex justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingCliente(null);
                            setIsModalOpen(true);
                          }}
                          className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          {isCa ? '+ Alta de Client' : '+ Alta de Cliente'}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pie de tabla con resumen */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center flex-wrap gap-2">
          <span>{isCa ? `Mostrant ${filteredClientes.length} de ${clientes.length} clients registrats` : `Mostrando ${filteredClientes.length} de ${clientes.length} clientes registrados`}</span>
          <span className="text-[11px] text-slate-400">{isCa ? 'NIFs únics indexats com a clau primària a Firestore' : 'NIFs únicos indexados como clave primaria en Firestore'}</span>
        </div>
      </div>
      )}

      {/* MODAL DE FUSIÓN DE CLIENTE PROVISIONAL */}
      <MergeClientModal
        show={Boolean(mergeModalTarget)}
        onClose={() => setMergeModalTarget(null)}
        provisionalClientName={mergeModalTarget}
        tasks={tasks}
        clientes={clientes}
        currentUser={currentUser}
        logAction={logAction}
        onOpenCreateOfficialClient={(prefilled) => {
          setEditingCliente(prefilled);
          setIsModalOpen(true);
        }}
        onSuccess={(msg) => alert(msg)}
        lang={lang}
      />

      {/* MODAL PARA CREACIÓN / EDICIÓN */}
      <ClienteModal
        show={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCliente(null);
        }}
        cliente={editingCliente}
        existingNifs={existingNifs}
        onSave={handleSaveCliente}
        lang={lang}
      />

      {/* MODAL DE RESUMEN TRAS IMPORTACIÓN CSV */}
      {csvResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">{isCa ? "Resultat d'Importació CSV" : "Resultado de Importación CSV"}</h3>
                  <p className="text-xs text-slate-500">{isCa ? "Escriptura per lots (Batch Write) finalitzada" : "Escritura por lotes (Batch Write) finalizada"}</p>
                </div>
              </div>
              <button 
                onClick={() => setCsvResultModal(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                  <div className="text-xl font-bold text-emerald-700">{csvResultModal.importedCount}</div>
                  <div className="text-[10px] font-bold text-emerald-800 uppercase mt-0.5">{isCa ? 'Importats' : 'Importados'}</div>
                </div>
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                  <div className="text-xl font-bold text-amber-700">{csvResultModal.skippedExistingCount}</div>
                  <div className="text-[10px] font-bold text-amber-800 uppercase mt-0.5">{isCa ? 'NIFs Omesos' : 'NIFs Omitidos'}</div>
                </div>
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                  <div className="text-xl font-bold text-rose-700">{csvResultModal.skippedInvalidCount}</div>
                  <div className="text-[10px] font-bold text-rose-800 uppercase mt-0.5">{isCa ? 'Dades Incompletes' : 'Datos Incompletos'}</div>
                </div>
              </div>

              {csvResultModal.skippedNifs.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wide block mb-1.5">
                    Detalle de NIFs omitidos (ya existían en el sistema):
                  </label>
                  <div className="max-h-40 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-2.5 space-y-1.5 text-xs">
                    {csvResultModal.skippedNifs.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-slate-700">
                        <span className="font-mono font-semibold text-slate-800">{item.nif}</span>
                        <span className="text-slate-500 truncate max-w-[180px]">{item.razonSocial}</span>
                        <span className="text-[10px] text-amber-600 font-medium">{item.motivo}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                ℹ️ Los clientes importados ya están disponibles en tiempo real para ser seleccionados al crear expedientes.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setCsvResultModal(null)}
                className="bg-indigo-600 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
              >
                {isCa ? 'Entès' : 'Entendido'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ClientesView;
