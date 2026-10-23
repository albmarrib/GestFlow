import React, { useState, useEffect, useRef } from 'react';
import { Search, Building2, Check, AlertCircle, X, ChevronDown } from 'lucide-react';

/**
 * Componente de Autocompletado para selección obligatoria de Clientes registrados
 * Reemplaza el campo de texto libre para garantizar que ningún expediente se cree
 * sin un cliente existente en la colección 'clientes'.
 */
const ClientAutocomplete = ({ 
  clientes = [], 
  value = '', 
  selectedNif = '',
  onChange, 
  error = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Encontrar el cliente seleccionado actual basado en NIF o en la cadena guardada
  const selectedClient = React.useMemo(() => {
    if (!clientes || clientes.length === 0) return null;
    
    // 1. Si tenemos selectedNif explícito
    if (selectedNif) {
      const match = clientes.find(c => (c.nif || '').toUpperCase() === selectedNif.toUpperCase());
      if (match) return match;
    }

    // 2. Si no, intentar encontrarlo por coincidencia exacta con el valor guardado
    if (value) {
      const valLower = value.toLowerCase().trim();
      // Buscar si coincide con NIF
      let match = clientes.find(c => (c.nif || '').toLowerCase() === valLower);
      if (match) return match;

      // Buscar si coincide con "RazonSocial (NIF)"
      match = clientes.find(c => {
        const full = `${c.razonSocial || ''} (${c.nif || ''})`.toLowerCase();
        return full === valLower;
      });
      if (match) return match;

      // Buscar si el NIF está entre paréntesis en la cadena
      const nifMatch = value.match(/\(([^)]+)\)/);
      if (nifMatch && nifMatch[1]) {
        const extractedNif = nifMatch[1].trim().toLowerCase();
        match = clientes.find(c => (c.nif || '').toLowerCase() === extractedNif);
        if (match) return match;
      }

      // Buscar si coincide con razonSocial exactamente
      match = clientes.find(c => (c.razonSocial || '').toLowerCase() === valLower);
      if (match) return match;
    }

    return null;
  }, [clientes, selectedNif, value]);

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

  // Filtrar clientes según búsqueda
  const filteredClientes = React.useMemo(() => {
    if (!searchTerm.trim()) return clientes.slice(0, 30);
    const term = searchTerm.toLowerCase().trim();
    return clientes.filter(c => 
      (c.nif || '').toLowerCase().includes(term) ||
      (c.razonSocial || '').toLowerCase().includes(term) ||
      (c.nombreComercial || '').toLowerCase().includes(term) ||
      (c.email || '').toLowerCase().includes(term)
    ).slice(0, 30);
  }, [clientes, searchTerm]);

  // Manejo de selección de un cliente
  const handleSelect = (client) => {
    onChange(client);
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

  // Navegación por teclado
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredClientes.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredClientes[highlightedIndex]) {
        handleSelect(filteredClientes[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {selectedClient ? (
        // Estado: Cliente Seleccionado y Verificado (Ultra-compacto)
        <div className="border border-emerald-300 bg-emerald-50/70 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 shadow-2xs transition-all">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span className="font-bold text-slate-900 text-xs truncate max-w-[220px]">
              {selectedClient.razonSocial}
            </span>
            <span className="text-[10px] font-mono font-bold bg-white text-emerald-800 border border-emerald-200 px-1.5 py-0.2 rounded shrink-0 shadow-2xs">
              {selectedClient.nif}
            </span>
            {selectedClient.tipo && (
              <span className="text-[9px] text-slate-500 bg-emerald-100/50 px-1.5 py-0.2 rounded shrink-0 hidden sm:inline">
                {selectedClient.tipo}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-2 py-0.5 rounded-lg flex items-center gap-1 shrink-0 transition-colors"
            title="Cambiar cliente"
          >
            <X className="w-3 h-3" /> Cambiar
          </button>
        </div>
      ) : (
        // Estado: Búsqueda y Autocompletado de Clientes
        <div>
          <div className="relative">
            <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsOpen(true);
                setHighlightedIndex(0);
              }}
              onFocus={() => setIsOpen(true)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar cliente por NIF, Razón Social o Comercial..."
              className={`w-full pl-8 pr-8 py-1.5 border rounded-xl font-medium text-slate-800 text-xs outline-none transition-all ${
                error
                  ? 'border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-500'
                  : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white'
              }`}
            />
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Menú desplegable con lista de clientes */}
          {isOpen && (
            <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-xl max-h-64 overflow-y-auto divide-y divide-slate-100 animate-in fade-in zoom-in-95 duration-100">
              {filteredClientes.length === 0 ? (
                <div className="p-4 text-center">
                  <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Cliente no encontrado en la base de datos</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    No existe ningún cliente registrado con "{searchTerm}". Debes darlo de alta en el módulo de Clientes antes de crear el expediente.
                  </p>
                </div>
              ) : (
                <>
                  <div className="p-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0 flex justify-between items-center border-b border-slate-200">
                    <span>Clientes registrados ({filteredClientes.length})</span>
                    <span className="text-indigo-600 font-normal">Usa ↑↓ y Enter para seleccionar</span>
                  </div>
                  {filteredClientes.map((c, idx) => (
                    <div
                      key={c.id || c.nif}
                      onClick={() => handleSelect(c)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`p-3 cursor-pointer transition-colors text-left flex items-start justify-between gap-2 ${
                        highlightedIndex === idx ? 'bg-indigo-50/80' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 text-sm">
                            {c.razonSocial}
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-indigo-100/70 text-indigo-800 px-1.5 py-0.5 rounded">
                            {c.nif}
                          </span>
                        </div>
                        {c.nombreComercial && c.nombreComercial !== c.razonSocial && (
                          <div className="text-xs text-slate-500 truncate mt-0.5">
                            Nom. Comercial: {c.nombreComercial}
                          </div>
                        )}
                        {(c.email || c.telefono) && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {[c.email, c.telefono].filter(Boolean).join(' • ')}
                          </div>
                        )}
                      </div>
                      {c.tipo && (
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full shrink-0 border border-slate-200 font-medium">
                          {c.tipo}
                        </span>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Alerta de bloqueo si no hay cliente válido seleccionado */}
      {(!selectedClient || error) && (
        <div className="flex items-start gap-1.5 mt-1.5 text-rose-600 text-xs">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            {value && !selectedClient
              ? `El cliente '${value}' no está en la base de datos. Selecciona un cliente registrado para poder continuar.`
              : 'Selección obligatoria: El expediente solo puede crearse con un cliente existente en la base de datos.'}
          </span>
        </div>
      )}
    </div>
  );
};

export default ClientAutocomplete;
