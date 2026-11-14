// Helper de internacionalización (Catalán / Castellano) para Áreas y Trámites

export const BILINGUAL_AREA_PAIRS = [
  {
    ca: 'Fiscal / Tributari',
    es: 'Fiscal / Tributario',
    aliases: ['fiscal', 'tributari', 'tributario', 'fiscalitat', 'fiscalidad'],
    desc_ca: 'Declaracions periòdiques, models tributaris, impostos i AEAT / ATC',
    desc_es: 'Declaraciones periódicas, modelos tributarios, impuestos y AEAT / ATC'
  },
  {
    ca: 'Comptable',
    es: 'Contable',
    aliases: ['comptable', 'contable', 'comptabilitat', 'contabilidad'],
    desc_ca: 'Portar comptabilitat, legalització de llibres i comptes anuals',
    desc_es: 'Llevar contabilidad, legalización de libros y cuentas anuales'
  },
  {
    ca: 'Laboral i Seguretat Social',
    es: 'Laboral y Seguridad Social',
    aliases: ['laboral', 'laboral i seguretat social', 'laboral y seguridad social'],
    desc_ca: 'Nòmines, altes/baixes a TGSS, contractes i convenis',
    desc_es: 'Nóminas, altas/bajas en TGSS, contratos y convenios'
  },
  {
    ca: 'Mercantil i Societari',
    es: 'Mercantil y Societario',
    aliases: ['mercantil', 'societari', 'societario'],
    desc_ca: 'Constitució de societats, modificacions estatutàries i Registre Mercantil',
    desc_es: 'Constitución de sociedades, modificaciones estatutarias y Registro Mercantil'
  },
  {
    ca: 'Jurídic / Legal',
    es: 'Jurídico / Legal',
    aliases: ['juridic', 'juridico', 'legal'],
    desc_ca: 'Assessorament legal, contractes mercantils i procediments',
    desc_es: 'Asesoramiento legal, contratos mercantiles y procedimientos'
  },
  {
    ca: 'Tràmits DGT / Trànsit',
    es: 'Trámites DGT / Tráfico',
    aliases: ['dgt', 'transit', 'trafico', 'tramits dgt', 'tramites dgt'],
    desc_ca: 'Transferències de vehicles, matriculacions i baixes DGT',
    desc_es: 'Transferencias de vehículos, matriculaciones y bajas DGT'
  },
  {
    ca: 'Estrangeria i Residències',
    es: 'Extranjería y Residencias',
    aliases: ['estrangeria', 'extranjeria'],
    desc_ca: 'Permisos de residència, arrels, NIE i renovacions',
    desc_es: 'Permisos de residencia, arraigos, NIE y renovaciones'
  },
  {
    ca: 'Facturació i Cobraments',
    es: 'Facturación y Cobros',
    aliases: ['facturacio', 'facturacion'],
    desc_ca: 'Emissió de factures del despatx i control de liquidacions',
    desc_es: 'Emisión de facturas del despacho y control de cobros'
  },
  {
    ca: 'Direcció / General',
    es: 'Dirección / General',
    aliases: ['direccio', 'direccion', 'general'],
    desc_ca: 'Gestió interna i tràmits transversals del despatx',
    desc_es: 'Gestión interna y trámites transversales del despacho'
  }
];

export const BILINGUAL_TRAMO_PAIRS = [
  {
    ca: 'Venciment Fiscal',
    es: 'Vencimiento Fiscal',
    aliases: ['venciment fiscal', 'vencimiento fiscal', 'model fiscal', 'modelo fiscal'],
    desc_ca: 'Termini oficial improrrogable amb presentació telemàtica a AEAT / ATC',
    desc_es: 'Plazo oficial improrrogable con presentación telemática en AEAT / ATC'
  },
  {
    ca: 'Tancament Comptable / Llibres',
    es: 'Cierre Contable / Libros',
    aliases: ['tancament comptable', 'cierre contable', 'tancament anual', 'cierre anual'],
    desc_ca: "Tancament d'exercici, legalització de llibres o dipòsit al Registre Mercantil",
    desc_es: 'Cierre de ejercicio, legalización de libros o depósito en Registro Mercantil'
  },
  {
    ca: 'Nòmines i Seg. Social',
    es: 'Nóminas y Seg. Social',
    aliases: ['nomines', 'nominas', 'nomina'],
    desc_ca: "Enviament d'assegurances socials (SILTRA), contractes i confecció mensual",
    desc_es: 'Envío de seguros sociales (SILTRA), contratos y confección mensual'
  },
  {
    ca: 'Alta / Constitució',
    es: 'Alta / Constitución',
    aliases: ['alta', 'constitucio', 'constitucion'],
    desc_ca: "Creació d'empreses, altes a IAE/036/037 i tràmits d'inici d'activitat",
    desc_es: 'Creación de empresas, altas en IAE/036/037 y trámites de inicio de actividad'
  },
  {
    ca: 'Requeriment / Notificació AEAT',
    es: 'Requerimiento / Notificación AEAT',
    aliases: ['requeriment', 'requerimiento', 'notificacio', 'notificacion'],
    desc_ca: "Resposta en termini a requeriments d'informació o comprovacions",
    desc_es: 'Respuesta en plazo a requerimientos de información o comprobaciones'
  },
  {
    ca: 'Tràmit Administratiu',
    es: 'Trámite Administrativo',
    aliases: ['tramit administratiu', 'tramite administrativo', 'tramit', 'tramite'],
    desc_ca: "Gestions davant d'organismes locals, autonòmics o registres",
    desc_es: 'Gestiones ante organismos locales, autonómicos o registros'
  },
  {
    ca: 'Declaració Renda (IRPF)',
    es: 'Declaración Renta (IRPF)',
    aliases: ['renda', 'renta', 'irpf'],
    desc_ca: 'Campanya anual de Renda i Patrimoni de persones físiques',
    desc_es: 'Campaña anual de Renta y Patrimonio de personas físicas'
  },
  {
    ca: 'Consultoria i Assessorament',
    es: 'Consultoría y Asesoramiento',
    aliases: ['consultoria', 'assessorament', 'asesoramiento', 'consulta', 'consulta general'],
    desc_ca: 'Emissió de dictàmens, informes tributaris o consultes personalitzades',
    desc_es: 'Emisión de dictámenes, informes tributarios o consultas personalizadas'
  },
  {
    ca: 'Altre Tràmit',
    es: 'Otro Trámite',
    aliases: ['altre', 'otro', 'otros', 'altres'],
    desc_ca: 'Tràmits miscel·lanis no enquadrats en categories anteriors',
    desc_es: 'Trámites misceláneos no encuadrados en categorías anteriores'
  }
];

const cleanKey = (str) =>
  String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const findPairByValue = (rawName, category) => {
  const key = cleanKey(rawName);
  if (!key) return null;
  const pairs = category === 'tramos' ? BILINGUAL_TRAMO_PAIRS : BILINGUAL_AREA_PAIRS;
  return (
    pairs.find(
      (p) =>
        cleanKey(p.ca) === key ||
        cleanKey(p.es) === key ||
        (p.aliases && p.aliases.some((a) => cleanKey(a) === key))
    ) || null
  );
};

/**
 * Devuelve la etiqueta traducida de un ítem de Firestore (Área o Trámite).
 * Prioriza campos explícitos (`nombre_es`, `nombre_ca`), luego el diccionario bilingüe estándar,
 * y finalmente el campo `nombre` / `name` almacenado.
 */
export const getLocalizedItemLabel = (item, lang = 'ca', category = 'areas') => {
  if (!item) return '';
  if (typeof item === 'string') return translateClassificationName(item, category, [], lang);

  const baseName = item.nombre || item.name || '';
  if (lang === 'es') {
    if (item.nombre_es && item.nombre_es.trim()) return item.nombre_es.trim();
    const pair = findPairByValue(baseName, category);
    if (pair) return pair.es;
    return baseName;
  }

  if (item.nombre_ca && item.nombre_ca.trim()) return item.nombre_ca.trim();
  const pair = findPairByValue(baseName, category);
  if (pair) return pair.ca;
  return baseName;
};

/**
 * Devuelve la descripción traducida de un ítem de Firestore (Área o Trámite).
 */
export const getLocalizedItemDesc = (item, lang = 'ca', category = 'areas') => {
  if (!item) return '';
  const baseDesc = item.descripcion || item.description || '';
  const baseName = item.nombre || item.name || '';

  if (lang === 'es') {
    if (item.descripcion_es && item.descripcion_es.trim()) return item.descripcion_es.trim();
    const pair = findPairByValue(baseName, category);
    if (pair && pair.desc_es) return pair.desc_es;
    return baseDesc;
  }

  if (item.descripcion_ca && item.descripcion_ca.trim()) return item.descripcion_ca.trim();
  const pair = findPairByValue(baseName, category);
  if (pair && pair.desc_ca) return pair.desc_ca;
  return baseDesc;
};

/**
 * Traduce un nombre en crudo (como viene guardado en un expediente) al idioma activo,
 * buscando tanto en los ítems de Firestore (con `nombre_es` / `nombre_ca`) como en el catálogo estándar.
 */
export const translateClassificationName = (rawName, category = 'areas', items = [], lang = 'ca') => {
  if (!rawName) return '';
  const key = cleanKey(rawName);

  // 1. Buscar coincidencia en los ítems configurados en Firestore
  if (Array.isArray(items) && items.length > 0) {
    const matchedItem = items.find((item) => {
      const n = cleanKey(item.nombre || item.name);
      const nEs = cleanKey(item.nombre_es);
      const nCa = cleanKey(item.nombre_ca);
      return n === key || (nEs && nEs === key) || (nCa && nCa === key);
    });
    if (matchedItem) {
      return getLocalizedItemLabel(matchedItem, lang, category);
    }
  }

  // 2. Fallback al diccionario bilingüe estándar
  const pair = findPairByValue(rawName, category);
  if (pair) {
    return lang === 'es' ? pair.es : pair.ca;
  }

  return rawName;
};

/**
 * Comprueba si el valor almacenado en un expediente coincide con cualquiera de los valores
 * seleccionados en el filtro, contemplando variantes CA/ES del mismo concepto.
 */
export const matchesClassificationFilter = (rawTaskValue, selectedValues = [], category = 'areas', items = []) => {
  if (!Array.isArray(selectedValues) || selectedValues.length === 0) return true;
  if (!rawTaskValue) return false;

  const taskKey = cleanKey(rawTaskValue);
  const taskPair = findPairByValue(rawTaskValue, category);
  const taskCanonical = taskPair ? cleanKey(taskPair.ca) : taskKey;

  // Buscar también el item en Firestore para comparar su nombre / nombre_es / nombre_ca
  const taskItem = Array.isArray(items)
    ? items.find((i) => {
        const n = cleanKey(i.nombre || i.name);
        const nEs = cleanKey(i.nombre_es);
        const nCa = cleanKey(i.nombre_ca);
        return n === taskKey || (nEs && nEs === taskKey) || (nCa && nCa === taskKey);
      })
    : null;

  return selectedValues.some((sel) => {
    const selKey = cleanKey(sel);
    if (selKey === taskKey) return true;

    const selPair = findPairByValue(sel, category);
    if (selPair && taskPair && cleanKey(selPair.ca) === taskCanonical) return true;
    if (selPair && (cleanKey(selPair.ca) === taskKey || cleanKey(selPair.es) === taskKey)) return true;

    if (taskItem) {
      const n = cleanKey(taskItem.nombre || taskItem.name);
      const nEs = cleanKey(taskItem.nombre_es);
      const nCa = cleanKey(taskItem.nombre_ca);
      if (selKey === n || (nEs && selKey === nEs) || (nCa && selKey === nCa)) return true;
    }

    // Buscar si sel corresponde a un ítem de Firestore cuyo nombre/nombre_es coincide con taskKey
    if (Array.isArray(items)) {
      const selItem = items.find((i) => {
        const n = cleanKey(i.nombre || i.name);
        const nEs = cleanKey(i.nombre_es);
        const nCa = cleanKey(i.nombre_ca);
        return selKey === n || (nEs && selKey === nEs) || (nCa && selKey === nCa);
      });
      if (selItem) {
        const n = cleanKey(selItem.nombre || selItem.name);
        const nEs = cleanKey(selItem.nombre_es);
        const nCa = cleanKey(selItem.nombre_ca);
        if (taskKey === n || (nEs && taskKey === nEs) || (nCa && taskKey === nCa)) return true;
      }
    }

    return false;
  });
};
