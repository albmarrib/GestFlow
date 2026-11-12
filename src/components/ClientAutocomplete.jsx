import React, { useState, useEffect, useRef } from 'react';
import { Search, Building2, Check, AlertCircle, X, ChevronDown, UserPlus, Clock } from 'lucide-react';
import { translations } from '../i18n/translations';

/**
 * Componente de Autocompletado Híbrido de Clientes
 * - Permite seleccionar clientes oficiales registrados con validación de NIF/CIF.
 * - Permite seleccionar o crear al vuelo "Clientes Provisionales" (no clientes)
 *   para agilizar la creación de expedientes sin bloquear al asesor.
 * - Muestra si el cliente provisional ya fue introducido en otros expedientes
 *   para prevenir duplicados.
 */
const ClientAutocomplete = ({ 
  clientes = [], 
  tasks = [],
  value = '', 
  selectedNif = '',
  isProvisional = false,
  onChange, 
  error = false,
  lang = 'ca'
}) => {
  const t = translations[lang] || translations.ca;
  const isCa = lang === 'ca';

  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Encontrar el cliente oficial seleccionado actual basado en NIF o en la cadena guardada
  const selectedOfficialClient = React.useMemo(() => {
    if (isProvisional) return null;
    if (!clientes || clientes.length === 0) return null;
    
    // 1. Si tenemos selectedNif explícito
    if (selectedNif) {
      const match = clientes.find(c => (c.nif || '').toUpperCase().trim() === selectedNif.toUpperCase().trim());
      if (match) return match;
    }

    // 2. Si no, intentar encontrarlo por coincidencia exacta con el valor guardado
    if (value) {
      const valLower = value.toLowerCase().trim();
      // Buscar si coincide con NIF
      let match = clientes.find(c => (c.nif || '').toLowerCase().trim() === valLower);
      if (match) return match;

      // Buscar si coincide con "RazonSocial (NIF)"
      match = clientes.find(c => {
        const full = `${c.razonSocial || ''} (${c.nif || ''})`.toLowerCase().trim();
        return full === valLower;
      });
      if (match) return match;

      // Buscar si el NIF está entre paréntesis en la cadena
      const nifMatch = value.match(/\(([^)]+)\)/);
      if (nifMatch && nifMatch[1]) {
        const extractedNif = nifMatch[1].trim().toLowerCase();
        match = clientes.find(c => (c.nif || '').toLowerCase().trim() === extractedNif);
        if (match) return match;
      }

      // Buscar si coincide con razonSocial exactamente
      match = clientes.find(c => (c.razonSocial || '').toLowerCase().trim() === valLower);
      if (match) return match;
    }

    return null;
  }, [clientes, selectedNif, value, isProvisional]);

  // Si está marcado como provisional o no se encontró en clientes pero tiene valor
  const isCurrentlyProvisional = Boolean(isProvisional || (value && !selectedOfficialClient));

  // Obtener clientes provisionales ya existentes en otros expedientes para sugerirlos
  const existingProvisionalClients = React.useMemo(() => {
    if (!tasks || tasks.length === 0) return [];
    const map = new Map();

    tasks.forEach(task => {
      if (!task.client) return;
      const cName = task.client.trim();
      
      // Comprobar si coincide con algún cliente oficial
      const isOfficial = (clientes || []).some(c => {
        const cNif = (c.nif || '').toLowerCase().trim();
        const cRazon = (c.razonSocial || '').toLowerCase().trim();
        const tClient = cName.toLowerCase();
        return (cNif && tClient.includes(cNif)) || (cRazon && tClient === cRazon) || `${cRazon} (${cNif})` === tClient;
      });

      if (!isOfficial || task.isProvisionalClient) {
        const key = cName.toLowerCase();
        if (map.has(key)) {
          map.get(key).count += 1;
        } else {
          map.set(key, { name: cName, count: 1 });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [tasks, clientes]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtrar clientes oficiales según búsqueda
  const filteredOfficialClients = React.useMemo(() => {
    if (!searchTerm.trim()) return clientes.slice(0, 15);
    const term = searchTerm.toLowerCase().trim();
    return clientes.filter(c => 
      (c.nif || '').toLowerCase().includes(term) ||
      (c.razonSocial || '').toLowerCase().includes(term) ||
      (c.nombreComercial || '').toLowerCase().includes(term)
    ).slice(0, 15);
  }, [clientes, searchTerm]);

  // Filtrar clientes provisionales existentes según búsqueda
  const filteredProvisionalClients = React.useMemo(() => {
    if (!searchTerm.trim()) return existingProvisionalClients.slice(0, 5);
    const term = searchTerm.toLowerCase().trim();
    return existingProvisionalClients.filter(p => 
      p.name.toLowerCase().includes(term)
    ).slice(0, 5);
  }, [existingProvisionalClients, searchTerm]);

  // Manejo de selección de un cliente oficial
  const handleSelectOfficial = (client) => {
    onChange({
      razonSocial: client.razonSocial,
      nif: client.nif,
      isProvisional: false
    });
    setSearchTerm('');
    setIsOpen(false);
  };

  // Manejo de selección de un cliente provisional
  const handleSelectProvisional = (provisionalName) => {
    onChange({
      razonSocial: provisionalName.trim(),
      nif: '',
      isProvisional: true
    });
    setSearchTerm('');
    setIsOpen(false);
  };

  // Limpiar selección actual
  const handleClear = () => {
    onChange(null);
    setSearchTerm('');
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 50);
  };

  return (
    <div className="relative" ref={containerRef}>
      {selectedOfficialClient ? (
        // Estado: Cliente Oficial Verificado (Verde)
        <div className="border border-emerald-300 bg-emerald-50/70 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 shadow-2xs transition-all">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="font-bold text-slate-900 text-xs truncate max-w-[220px]">
              {selectedOfficialClient.razonSocial}
            </span>
            <span className="text-[10px] font-mono font-bold bg-white text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded shrink-0 shadow-2xs">
              {selectedOfficialClient.nif}
            </span>
            {selectedOfficialClient.tipo && (
              <span className="text-[9px] text-slate-500 bg-emerald-100/50 px-1.5 py-0.2 rounded shrink-0 hidden sm:inline">
                {selectedOfficialClient.tipo}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
            title={isCa ? "Canviar client" : "Cambiar cliente"}
          >
            <X className="w-3 h-3" /> {isCa ? "Canviar" : "Cambiar"}
          </button>
        </div>
      ) : isCurrentlyProvisional && value ? (
        // Estado: Cliente Provisional Seleccionado (Ámbar)
        <div className="border border-amber-300 bg-amber-50/80 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 shadow-2xs transition-all">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
            <span className="font-bold text-slate-900 text-xs truncate max-w-[220px]">
              {value}
            </span>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.2 rounded shrink-0 shadow-2xs flex items-center gap-1">
              <Clock className="w-2.5 h-2.5" /> {t.provisionalClient.badge}
            </span>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
            title={isCa ? "Canviar client" : "Cambiar cliente"}
          >
            <X className="w-3 h-3" /> {isCa ? "Canviar" : "Cambiar"}
          </button>
        </div>
      ) : (
        // Estado: Búsqueda y Selección Híbrida
        <div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder={isCa ? "Cercar client oficial o escriure un de provisional..." : "Buscar cliente oficial o escribir uno provisional..."}
              className={`w-full pl-8 pr-8 py-1.5 border rounded-xl font-medium text-slate-800 text-xs outline-none transition-all ${
                error
                  ? 'border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-500'
                  : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white'
              }`}
            />
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Menú desplegable */}
          {isOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl max-h-72 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
              
              {/* Opción rápida: Crear como cliente provisional si hay texto escrito */}
              {searchTerm.trim().length > 0 && (
                <div 
                  onClick={() => handleSelectProvisional(searchTerm.trim())}
                  className="p-3 bg-amber-50/70 hover:bg-amber-100/70 cursor-pointer border-b border-amber-200 flex items-center justify-between text-xs transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <span className="font-bold text-amber-950 block">
                        {t.provisionalClient.useAsProvisional.replace('{name}', searchTerm.trim())}
                      </span>
                      <span className="text-[11px] text-amber-700">
                        {isCa ? 'Podràs formalitzar la fitxa fiscal o fusionar-lo més endavant.' : 'Podrás formalizar la ficha fiscal o fusionarlo más adelante.'}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full shrink-0">
                    {isCa ? 'Nou Provisional' : 'Nuevo Provisional'}
                  </span>
                </div>
              )}

              {/* Sección 1: Clientes provisionales existentes detectados en otros expedientes */}
              {filteredProvisionalClients.length > 0 && (
                <div>
                  <div className="p-2 bg-slate-50 text-[10px] font-bold text-amber-700 uppercase tracking-wider sticky top-0 flex justify-between items-center border-b border-slate-200">
                    <span>{isCa ? 'Clients provisores existents en tràmits' : 'Clientes provisionales existentes en trámites'}</span>
                    <span className="text-slate-400 font-normal">{filteredProvisionalClients.length}</span>
                  </div>
                  {filteredProvisionalClients.map(prov => (
                    <div
                      key={prov.name}
                      onClick={() => handleSelectProvisional(prov.name)}
                      className="p-2.5 hover:bg-amber-50/50 cursor-pointer flex items-center justify-between gap-2 text-xs transition-colors text-left"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="font-bold text-slate-800 truncate">{prov.name}</span>
                      </div>
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded-full shrink-0">
                        {t.provisionalClient.linkedExpedientes.replace('{count}', prov.count)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Sección 2: Clientes oficiales registrados */}
              {filteredOfficialClients.length > 0 && (
                <div>
                  <div className="p-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 flex justify-between items-center border-b border-slate-200">
                    <span>{isCa ? 'Clients oficials registrats' : 'Clientes oficiales registrados'} ({filteredOfficialClients.length})</span>
                  </div>
                  {filteredOfficialClients.map(c => (
                    <div
                      key={c.id || c.nif}
                      onClick={() => handleSelectOfficial(c)}
                      className="p-2.5 hover:bg-indigo-50/80 cursor-pointer transition-colors text-left flex items-start justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800">
                            {c.razonSocial}
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded">
                            {c.nif}
                          </span>
                        </div>
                        {c.nombreComercial && c.nombreComercial !== c.razonSocial && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {c.nombreComercial}
                          </div>
                        )}
                      </div>
                      {c.tipo && (
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium shrink-0">
                          {c.tipo}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {filteredOfficialClients.length === 0 && filteredProvisionalClients.length === 0 && !searchTerm.trim() && (
                <div className="p-4 text-center text-xs text-slate-400">
                  {isCa ? 'Comença a escriure el nom o NIF per cercar...' : 'Empieza a escribir el nombre o NIF para buscar...'}
                </div>
              )}

            </div>
          )}
        </div>
      )}

      {/* Alerta informativa cuando no hay nada seleccionado y se requiere */}
      {error && !value && (
        <div className="flex items-center gap-1.5 mt-1.5 text-rose-600 text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>
            {isCa 
              ? 'Indica un client oficial existent o escriu un nom per utilitzar-lo com a provisional.'
              : 'Indica un cliente oficial existente o escribe un nombre para utilizarlo como provisional.'}
          </span>
        </div>
      )}
    </div>
  );
};

export default ClientAutocomplete;
