// Diccionario de Internacionalización (i18n) Bilingüe: Català (ca) & Castellano (es)

export const translations = {
  ca: {
    // Marca y Cabecera
    appSubtitle: 'Despatx & Assessoria',
    views: {
      expedientes: 'Expedients',
      plan: 'Pla Fiscal',
      vencimientos: 'Venciments',
      gtd: 'Tràmits GTD',
      clientes: 'Clients',
      facturacion: 'Facturació',
      informes: 'Informes',
      admin: 'Panell Admin'
    },
    userMenu: {
      online: 'En línia',
      logout: 'Sortir'
    },
    // Filtros y Búsqueda
    filters: {
      myExpedientes: 'Els meus Expedients',
      allExpedientes: 'Tots els Expedients',
      areas: 'Àrees',
      tramites: 'Tràmits',
      estados: 'Estats',
      searchPlaceholder: 'Cercar per expedient o client...',
      exportExcel: 'Exportar a Excel',
      newExpediente: 'Nou Expedient',
      activeFilters: 'Filtres actius:',
      clearAll: 'Netejar tots',
      hideCompleted: 'Ocultar Tramitats / Tancats',
      showCompleted: 'Mostrar Tramitats / Tancats'
    },
    // Estados Semáforo
    status: {
      abierto: 'Obert',
      enRiesgo: 'En Risc',
      conRetraso: 'Amb Retard',
      cerrado: 'Tancat',
      periodico: 'Tràmit Periòdic'
    },
    // Pestañas Expediente
    expedienteTabs: {
      bitacora: 'Bitàcola',
      gtd: 'GTD',
      facturacion: 'Facturació',
      adjuntos: 'Adjunts',
      chat: 'Xat'
    },
    // Facturación y Liquidaciones
    billing: {
      title: 'Facturació & Honoraris del Despatx',
      liquidationTitle: 'Liquidació Econòmica',
      conditionTitle: 'Condició de Facturació & Honoraris',
      billable: 'A Cobrar / Facturable',
      included: 'Inclòs en Quota',
      nonBillable: 'No Facturable / Intern',
      feeAmount: 'Import Honoraris (€)',
      billingStatus: 'Estat de Facturació',
      pending: 'Pendent',
      invoiced: 'Facturat',
      paid: 'Cobrat i Liquidat',
      invoiceNumber: 'Núm. Factura Despatx',
      expensesTitle: 'Suplerts i Despeses Externes (Tercers)',
      expensesSubtitle: 'Notaries, Registres Mercantils, Taxes DGT, Col·legis Oficials',
      addExpense: '+ Afegir Suplert',
      downPaymentsTitle: 'Lliuraments a Compte i Provisions de Fons',
      addDownPayment: '+ Afegir Bestreta',
      netBalance: 'Saldo Net a Cobrar',
      netBalanceToReturn: 'Saldo a Favor del Client (Retorn)',
      settled: 'Liquidat',
      clientAssignee: 'Client Assignat',
      documentLang: 'Idioma del Document',
      generatePdf: 'Generar / Descarregar PDF',
      sendEmail: 'Enviar Liquidació per Email',
      pdfHelp: 'Genera el document formal en el idioma seleccionat preparat per imprimir o desar.',
      tableHeaders: {
        expedienteClient: 'Expedient & Client',
        status: 'Estat Tràmit',
        fees: 'Honoraris',
        expenses: 'Suplerts',
        downPayments: 'Bestretes',
        balance: 'Saldo Pendent',
        billingStatus: 'Facturació',
        actions: 'Accions'
      }
    },
    // Adjuntos
    attachments: {
      title: 'Fitxers i Documentació',
      addLink: '+ Enllaç Web',
      uploadFile: 'Pujar Fitxer',
      uploading: 'Pujant...',
      dropZone: 'Arrossega fitxers aquí o examina des de l\'ordinador',
      dropZoneOverlay: 'Deixa anar els fitxers aquí per adjuntar-los',
      dropZoneHelp: 'Admet PDF, imatges, resguards bancaris i documents',
      empty: 'Sense fitxers ni enllaços adjunts encara'
    },
    // General
    common: {
      save: 'Desar',
      cancel: 'Cancel·lar',
      edit: 'Editar',
      delete: 'Eliminar',
      manage: 'Gestionar',
      view: 'Veure',
      open: 'Obrir',
      close: 'Tancar',
      loading: 'Carregant...',
      confirm: 'Confirmar'
    }
  },
  es: {
    // Marca y Cabecera
    appSubtitle: 'Despacho & Asesoría',
    views: {
      expedientes: 'Expedientes',
      plan: 'Plan Fiscal',
      vencimientos: 'Vencimientos',
      gtd: 'Trámite GTD',
      clientes: 'Clientes',
      facturacion: 'Facturación',
      informes: 'Informes',
      admin: 'Panel Admin'
    },
    userMenu: {
      online: 'En línea',
      logout: 'Salir'
    },
    // Filtros y Búsqueda
    filters: {
      myExpedientes: 'Mis Expedientes',
      allExpedientes: 'Todos los Expedientes',
      areas: 'Áreas',
      tramites: 'Trámites',
      estados: 'Estados',
      searchPlaceholder: 'Buscar por expediente o cliente...',
      exportExcel: 'Exportar Excel',
      newExpediente: 'Nuevo Expediente',
      activeFilters: 'Filtros activos:',
      clearAll: 'Limpiar todos',
      hideCompleted: 'Ocultar Presentados / Cerrados',
      showCompleted: 'Mostrar Presentados / Cerrados'
    },
    // Estados Semáforo
    status: {
      abierto: 'Abierto',
      enRiesgo: 'En Riesgo',
      conRetraso: 'Con Retraso',
      cerrado: 'Cerrado',
      periodico: 'Trámite Periódico'
    },
    // Pestañas Expediente
    expedienteTabs: {
      bitacora: 'Bitácora',
      gtd: 'GTD',
      facturacion: 'Facturación',
      adjuntos: 'Adjuntos',
      chat: 'Chat'
    },
    // Facturación y Liquidaciones
    billing: {
      title: 'Facturación & Honorarios del Despacho',
      liquidationTitle: 'Liquidación Económica',
      conditionTitle: 'Condición de Facturación & Honorarios',
      billable: 'A Cobrar / Facturable',
      included: 'Incluido en Cuota',
      nonBillable: 'No Facturable / Interno',
      feeAmount: 'Importe Honorarios (€)',
      billingStatus: 'Estado de Facturación',
      pending: 'Pendiente',
      invoiced: 'Facturado',
      paid: 'Cobrado y Liquidado',
      invoiceNumber: 'Nº Factura Despacho',
      expensesTitle: 'Suplidos y Cargos Externos (Terceros)',
      expensesSubtitle: 'Notarías, Registros Mercantiles, Tasas DGT, Colegios Oficiales',
      addExpense: '+ Añadir Suplido',
      downPaymentsTitle: 'Entregas a Cuenta y Provisiones de Fondos',
      addDownPayment: '+ Añadir Anticipo',
      netBalance: 'Saldo Neto a Cobrar',
      netBalanceToReturn: 'Saldo a Favor del Cliente (Devolución)',
      settled: 'Liquidado',
      clientAssignee: 'Cliente Asignado',
      documentLang: 'Idioma del Documento',
      generatePdf: 'Generar / Descargar PDF',
      sendEmail: 'Enviar Liquidación por Email',
      pdfHelp: 'Genera el documento formal en el idioma seleccionado preparado para imprimir o guardar.',
      tableHeaders: {
        expedienteClient: 'Expediente & Cliente',
        status: 'Estado Trámite',
        fees: 'Honorarios',
        expenses: 'Suplidos',
        downPayments: 'Anticipos',
        balance: 'Saldo Pendiente',
        billingStatus: 'Facturación',
        actions: 'Acciones'
      }
    },
    // Adjuntos
    attachments: {
      title: 'Archivos y Documentación',
      addLink: '+ Enlace Web',
      uploadFile: 'Subir Archivo',
      uploading: 'Subiendo...',
      dropZone: 'Arrastra archivos aquí o examinar desde el equipo',
      dropZoneOverlay: 'Suelta tus archivos aquí para adjuntarlos',
      dropZoneHelp: 'Admite PDF, imágenes, justificantes bancarios y documentos',
      empty: 'Sin archivos ni enlaces adjuntos aún'
    },
    // General
    common: {
      save: 'Guardar',
      cancel: 'Cancelar',
      edit: 'Editar',
      delete: 'Eliminar',
      manage: 'Gestionar',
      view: 'Ver',
      open: 'Abrir',
      close: 'Cerrar',
      loading: 'Cargando...',
      confirm: 'Confirmar'
    }
  }
};
