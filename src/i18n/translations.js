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
      pdfHelp: 'Genera el document formal en l\'idioma seleccionat preparat per imprimir o desar.',
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
    // Panel de Administración
    admin: {
      title: 'Panell d\'Administració i Control',
      subtitle: 'Configuració del despatx, catàleg d\'estats, plantilles operatives i gestió de permisos.',
      tabs: {
        classification: 'Àrees, Tràmits i Estats',
        templates: 'Plantilles de Tràmits GTD',
        billing: 'Liquidacions & Cobraments',
        personal: 'Equip i Assessors',
        clients: 'Cartera de Clients',
        maintenance: 'Auditoria & Neteja'
      },
      clientsTab: {
        title: 'Cartera de Clients i Empreses',
        activeClients: 'Actualment hi ha {count} clients actius registrats amb validació de NIF/CIF.',
        openModule: 'Obrir Mòdul Complet de Clients',
        totalInPortfolio: 'Total a la Cartera',
        portfolioDesc: 'Societats, autònoms i particulars',
        mandatoryValidation: 'Validació Obligatòria',
        verifiedTaxId: 'NIF / CIF Verificat',
        taxIdDesc: 'Garanteix traçabilitat legal i fiscal en expedients',
        tools: 'Eines',
        massCsv: 'Càrrega Massiva CSV',
        massCsvDesc: 'Importa carteres completes de programes comptables'
      },
      teamTab: {
        title: 'Gestió de l\'Equip d\'Assessors i Empleats',
        subtitle: 'Controla les altes, permisos i accessos autoritzats. Només el personal registrat aquí podrà accedir a GestFlow.',
        advisorsCount: '{count} assessors a la plantilla',
        newMemberTitle: 'Donar d\'Alta i Autoritzar Nou Assessor / Empleat',
        email: 'Correu Electrònic *',
        fullName: 'Nom Complet',
        area: 'Àrea / Especialitat',
        role: 'Rol i Permisos',
        roleAdvisor: 'Gestor / Assessor (Només els seus expedients)',
        roleAdmin: 'Administrador (Control global)',
        registerBtn: 'Registrar i Autoritzar Empleat',
        table: {
          member: 'Assessor / Empleat',
          area: 'Àrea / Especialitat',
          role: 'Rol',
          status: 'Estat',
          actions: 'Accions',
          superAdmin: 'Super Admin',
          admin: 'Administrador',
          advisor: 'Gestor / Assessor',
          active: 'Actiu',
          revoked: 'Accés Revocat',
          edit: 'Editar',
          suspend: 'Suspendre',
          reactivate: 'Reactivar',
          delete: 'Eliminar',
          empty: 'Sense assessors registrats encara.'
        },
        editModal: {
          title: 'Modificar Fitxa d\'Empleat',
          email: 'Correu Electrònic (Identificador)',
          fullName: 'Nom Complet *',
          fullNamePlaceholder: 'Nom de l\'assessor',
          department: 'Departament / Àrea Assignada *',
          role: 'Rol i Permisos',
          roleAdvisor: 'Gestor / Assessor (Només els seus expedients)',
          roleAdmin: 'Administrador (Accés i control global)',
          cancel: 'Cancel·lar',
          save: 'Desar Canvis',
          saving: 'Desant...'
        }
      },
      auditTab: {
        title: 'Registre d\'Auditoria d\'Expedients',
        downloadAudit: 'Descarregar Auditoria',
        dateCol: 'Data i Hora',
        userCol: 'Assessor / Usuari',
        actionCol: 'Acció',
        detailsCol: 'Detalls',
        empty: 'Sense activitat registrada encara.',
        managementTitle: 'Gestió i Depuració d\'Expedients',
        managementDesc: 'Selecciona expedients per a la seva eliminació permanent o arxivat forçat.',
        deleteSelected: 'Eliminar Seleccionats',
        searchPlaceholder: 'Cercar expedients o clients per eliminar...',
        expedienteCol: 'Expedient',
        clientCol: 'Client',
        typeCol: 'Tipus',
        areaCol: 'Àrea',
        statusCol: 'Estat',
        createdByCol: 'Creat per',
        noResults: 'No s\'han trobat expedients que coincideixin.'
      }
    },
    // Catálogo de Clasificación (Áreas, Tramos, Estados)
    classification: {
      title: 'Classificació Dinàmica i Catàleg d\'Estats',
      subtitle: 'Configura les Àrees, Tipus de Tràmits i la paleta d\'Estats amb colors semàntics sincronitzats en temps real.',
      tabs: {
        areas: 'Àrees / Departaments',
        tramos: 'Trams / Tràmits',
        estados: 'Estats i Colors'
      },
      searchIn: 'Cercar a {tab}...',
      resetOfficialStates: 'Restablir 4 Estats Oficials',
      loadDefaults: 'Carregar Predeterminats',
      newArea: 'Nova Àrea',
      newTramo: 'Nou Tram',
      newState: 'Nou Estat',
      editArea: 'Editar Àrea',
      editTramo: 'Editar Tram',
      editState: 'Editar Estat',
      tableHeaders: {
        stateColor: 'Estat / Color',
        name: 'Nom',
        category: 'Categoria / Tipus',
        filterFinished: 'Filtre Finalitzat',
        description: 'Descripció',
        inUse: 'Expedients en Ús',
        actions: 'Accions'
      },
      tableBody: {
        hiddenOnFinish: 'S\'oculta en Finalitzar',
        inProgress: 'En Procés',
        noDescription: 'Sense descripció',
        singleExp: '1 expedient',
        multiExp: '{count} expedients',
        emptyFilter: 'No hi ha elements que coincideixin amb "{term}".',
        emptyCollection: 'No hi ha {tab} creats a Firestore.',
        createFirst: '+ Crear primer/a {singular}',
        loadStandardValues: 'Carregar valors estàndard'
      },
      footer: {
        showing: 'Mostrant {filtered} de {total} {tab} a Firestore',
        restoreMissing: 'Restaurar / Afegir valors estàndard absents'
      },
      modal: {
        badgePreview: 'Vista prèvia de la Insígnia:',
        nameLabel: 'Nom de {entity}',
        namePlaceholderArea: 'Ex. Fiscal / Tributari',
        namePlaceholderTramo: 'Ex. Venciment Fiscal',
        namePlaceholderState: 'Ex. Pendent Signatura Notarial',
        colorLabel: 'Color Semàntic de la Insígnia',
        categoryLabel: 'Comportament en el Flux de Treball',
        catActive: '🟢 Actiu / En Procés',
        catRisk: '🟡 En Risc / Incidència',
        catUrgent: '🔴 Urgent / Fora de Termini',
        catCompleted: '🔵 Finalitzat / Tancat',
        autoHide: 'Amagar automàticament quan s\'activi el filtre d\'amagar conclosos',
        orderLabel: 'Ordre de Visualització (1 = Primer)',
        descLabel: 'Descripció Informativa',
        descPlaceholder: 'Explica breument quan s\'ha d\'utilitzar...',
        cancel: 'Cancel·lar',
        save: 'Desar',
        saving: 'Desant...'
      },
      colors: {
        emerald: 'Verd (Obert / En Termini)',
        amber: 'Groc (En Risc)',
        rose: 'Vermell (Amb Retard / Vençut)',
        blue: 'Blau (Tancat)',
        indigo: 'Índigo Corporatiu',
        purple: 'Púrpura / Especial',
        cyan: 'Cian / Extern',
        orange: 'Taronja Intens',
        slate: 'Gris Fosc'
      }
    },
    // Plantillas GTD
    templates: {
      title: 'Plantilles de Tràmits i Tasques Predefinides',
      subtitle: 'Crea o importa plantilles per autocompletar expedients GTD amb passos seqüencials i assessors assignats.',
      loadRecommended: 'Carregar Plantilles Recomanades',
      newTemplate: 'Nova Plantilla',
      searchPlaceholder: 'Cercar plantilla per nom o àrea...',
      emptyTitle: 'Sense plantilles configurades',
      emptySubtitle: 'Crea la teva primera plantilla per a expedients recurrents o prem a "Carregar Plantilles Recomanades" per importar els 6 tràmits més freqüents d\'una gestoria.',
      load6Btn: 'Carregar 6 Plantilles d\'Assessoria'
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
    // Panel de Administración
    admin: {
      title: 'Panel de Administración y Control',
      subtitle: 'Configuración del despacho, catálogo de estados, plantillas operativas y gestión de permisos.',
      tabs: {
        classification: 'Áreas, Trámites y Estados',
        templates: 'Plantillas de Trámites GTD',
        billing: 'Liquidaciones & Cobros',
        personal: 'Equipo y Asesores',
        clients: 'Cartera de Clientes',
        maintenance: 'Auditoría & Limpieza'
      },
      clientsTab: {
        title: 'Cartera de Clientes y Empresas',
        activeClients: 'Actualmente hay {count} clientes activos registrados con validación de NIF/CIF.',
        openModule: 'Abrir Módulo Completo de Clientes',
        totalInPortfolio: 'Total en Cartera',
        portfolioDesc: 'Sociedades, autónomos y particulares',
        mandatoryValidation: 'Validación Obligatoria',
        verifiedTaxId: 'NIF / CIF Verificado',
        taxIdDesc: 'Garantiza trazabilidad legal y fiscal en expedientes',
        tools: 'Herramientas',
        massCsv: 'Carga Masiva CSV',
        massCsvDesc: 'Importa carteras completas de programas contables'
      },
      teamTab: {
        title: 'Gestión del Equipo de Asesores y Empleados',
        subtitle: 'Controla las altas, permisos y accesos autorizados. Solo el personal registrado aquí podrá acceder a GestFlow.',
        advisorsCount: '{count} asesores en plantilla',
        newMemberTitle: 'Dar de Alta y Autorizar Nuevo Asesor / Empleado',
        email: 'Correo Electrónico *',
        fullName: 'Nombre Completo',
        area: 'Área / Especialidad',
        role: 'Rol y Permisos',
        roleAdvisor: 'Gestor / Asesor (Solo sus expedientes)',
        roleAdmin: 'Administrador (Control global)',
        registerBtn: 'Registrar y Autorizar Empleado',
        table: {
          member: 'Asesor / Empleado',
          area: 'Área / Especialidad',
          role: 'Rol',
          status: 'Estado',
          actions: 'Acciones',
          superAdmin: 'Super Admin',
          admin: 'Administrador',
          advisor: 'Gestor / Asesor',
          active: 'Activo',
          revoked: 'Acceso Revocado',
          edit: 'Editar',
          suspend: 'Suspender',
          reactivate: 'Reactivar',
          delete: 'Eliminar',
          empty: 'Sin asesores registrados aún.'
        },
        editModal: {
          title: 'Modificar Ficha de Empleado',
          email: 'Correo Electrónico (Identificador)',
          fullName: 'Nombre Completo *',
          fullNamePlaceholder: 'Nombre del asesor',
          department: 'Departamento / Área Asignada *',
          role: 'Rol y Permisos',
          roleAdvisor: 'Gestor / Asesor (Solo sus expedientes)',
          roleAdmin: 'Administrador (Acceso y control global)',
          cancel: 'Cancelar',
          save: 'Guardar Cambios',
          saving: 'Guardando...'
        }
      },
      auditTab: {
        title: 'Registro de Auditoría de Expedientes',
        downloadAudit: 'Descargar Auditoría',
        dateCol: 'Fecha y Hora',
        userCol: 'Asesor / Usuario',
        actionCol: 'Acción',
        detailsCol: 'Detalles',
        empty: 'Sin actividad registrada todavía.',
        managementTitle: 'Gestión y Depuración de Expedientes',
        managementDesc: 'Selecciona expedientes para su eliminación permanente o archivado forzado.',
        deleteSelected: 'Eliminar Seleccionados',
        searchPlaceholder: 'Buscar expedientes o clientes para eliminar...',
        expedienteCol: 'Expediente',
        clientCol: 'Cliente',
        typeCol: 'Tipo',
        areaCol: 'Área',
        statusCol: 'Estado',
        createdByCol: 'Creado por',
        noResults: 'No se encontraron expedientes que coincidan.'
      }
    },
    // Catálogo de Clasificación (Áreas, Tramos, Estados)
    classification: {
      title: 'Clasificación Dinámica y Catálogo de Estados',
      subtitle: 'Configura las Áreas, Tipos de Trámites y la paleta de Estados con colores semánticos sincronizados en tiempo real.',
      tabs: {
        areas: 'Áreas / Departamentos',
        tramos: 'Tramos / Trámites',
        estados: 'Estados y Colores'
      },
      searchIn: 'Buscar en {tab}...',
      resetOfficialStates: 'Restablecer 4 Estados Oficiales',
      loadDefaults: 'Cargar Predeterminados',
      newArea: 'Nueva Área',
      newTramo: 'Nuevo Tramo',
      newState: 'Nuevo Estado',
      editArea: 'Editar Área',
      editTramo: 'Editar Tramo',
      editState: 'Editar Estado',
      tableHeaders: {
        stateColor: 'Estado / Color',
        name: 'Nombre',
        category: 'Categoría / Tipo',
        filterFinished: 'Filtro Finalizado',
        description: 'Descripción',
        inUse: 'Expedientes en Uso',
        actions: 'Acciones'
      },
      tableBody: {
        hiddenOnFinish: 'Se Oculta al Terminar',
        inProgress: 'En Proceso',
        noDescription: 'Sin descripción',
        singleExp: '1 expediente',
        multiExp: '{count} expedientes',
        emptyFilter: 'No hay elementos que coincidan con "{term}".',
        emptyCollection: 'No hay {tab} creados en Firestore.',
        createFirst: '+ Crear primer/a {singular}',
        loadStandardValues: 'Cargar valores estándar'
      },
      footer: {
        showing: 'Mostrando {filtered} de {total} {tab} en Firestore',
        restoreMissing: 'Restaurar / Añadir valores estándar ausentes'
      },
      modal: {
        badgePreview: 'Vista previa del Badge:',
        nameLabel: 'Nombre del {entity}',
        namePlaceholderArea: 'Ej. Fiscal / Tributario',
        namePlaceholderTramo: 'Ej. Vencimiento Fiscal',
        namePlaceholderState: 'Ej. Pendiente Firma Notarial',
        colorLabel: 'Color Semántico del Badge',
        categoryLabel: 'Comportamiento en el Flujo de Trabajo',
        catActive: '🟢 Activo / En Proceso',
        catRisk: '🟡 En Riesgo / Incidencia',
        catUrgent: '🔴 Urgente / Fuera de Plazo',
        catCompleted: '🔵 Finalizado / Cerrado',
        autoHide: 'Ocultar automáticamente cuando se active el filtro de ocultar concluidos',
        orderLabel: 'Orden de Visualización (1 = Primero)',
        descLabel: 'Descripción Informativa',
        descPlaceholder: 'Explica brevemente cuándo se debe usar...',
        cancel: 'Cancelar',
        save: 'Guardar',
        saving: 'Guardando...'
      },
      colors: {
        emerald: 'Verde (Abierto / En Plazo)',
        amber: 'Amarillo (En Riesgo)',
        rose: 'Rojo (Con Retraso / Vencido)',
        blue: 'Azul (Cerrado)',
        indigo: 'Índigo Corporativo',
        purple: 'Púrpura / Especial',
        cyan: 'Cian / Externo',
        orange: 'Naranja Intenso',
        slate: 'Gris Oscuro'
      }
    },
    // Plantillas GTD
    templates: {
      title: 'Plantillas de Trámites y Tareas Predefinidas',
      subtitle: 'Crea o importa plantillas para autocompletar expedientes GTD con pasos secuenciales y asesores asignados.',
      loadRecommended: 'Cargar Plantillas Recomendadas',
      newTemplate: 'Nueva Plantilla',
      searchPlaceholder: 'Buscar plantilla por nombre o área...',
      emptyTitle: 'Sin plantillas configuradas',
      emptySubtitle: 'Crea tu primera plantilla para expedientes recurrentes o pulsa en "Cargar Plantillas Recomendadas" para importar los 6 trámites más frecuentes de una gestoría.',
      load6Btn: 'Cargar 6 Plantillas de Asesoría'
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
