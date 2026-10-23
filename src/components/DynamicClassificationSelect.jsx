import React, { useMemo } from 'react';

/**
 * Componente dinámico de selección para Áreas y Tramos
 * Consume colecciones en tiempo real de Firestore con respaldo a maestros estáticos si la colección está vacía.
 */
const DynamicClassificationSelect = ({
  label,
  value,
  onChange,
  items = [],
  fallbackOptions = [],
  icon: Icon,
  placeholder = 'Selecciona una opción...',
  required = false,
  error = false,
  name
}) => {
  // Construir opciones normalizadas a partir de los documentos de Firestore
  const options = useMemo(() => {
    let opts = [];
    if (items && items.length > 0) {
      opts = items
        .map(item => ({
          id: item.id,
          value: item.nombre || item.name || '',
          label: item.nombre || item.name || '',
          description: item.descripcion || item.description || ''
        }))
        .filter(opt => opt.value.trim() !== '');
    } else if (fallbackOptions && fallbackOptions.length > 0) {
      opts = fallbackOptions.map(opt => ({
        id: opt,
        value: opt,
        label: opt,
        description: ''
      }));
    }

    // Si el valor actual no está en la lista (p. ej. datos históricos), lo añadimos para no perderlo
    if (value && !opts.some(o => o.value.toLowerCase() === value.toLowerCase())) {
      opts.unshift({
        id: `legacy-${value}`,
        value: value,
        label: value,
        description: 'Opción histórica'
      });
    }

    return opts;
  }, [items, fallbackOptions, value]);

  const selectedItem = options.find(o => o.value === value);
  const isFromFirestore = items && items.length > 0;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-0.5">
        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
          {Icon && <Icon className="w-3 h-3 text-indigo-500" />}
          <span>{label}</span>
          {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
        {isFromFirestore && (
          <span className="text-[9px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {items.length}
          </span>
        )}
      </div>

      <div className="relative">
        <select
          name={name}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full border py-1.5 px-2.5 rounded-lg bg-white text-xs font-medium text-slate-700 outline-none transition-all cursor-pointer ${
            error
              ? 'border-rose-400 ring-2 ring-rose-100'
              : 'border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
          }`}
        >
          {!value && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.id || opt.value} value={opt.value}>
              {opt.label} {opt.description ? `— (${opt.description})` : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedItem?.description && (
        <p className="mt-1 text-[11px] text-slate-400 italic truncate" title={selectedItem.description}>
          ℹ️ {selectedItem.description}
        </p>
      )}
    </div>
  );
};

export default DynamicClassificationSelect;
