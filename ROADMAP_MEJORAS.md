# Hoja de Ruta y Especificaciones de Desarrollo: GestFlow

Documento maestro de especificación y seguimiento de las funcionalidades acordadas para el despacho/gestoría.

---

## 📊 Estado General del Proyecto

- [x] **Seguridad y Acceso Restringido:** Super Administrador permanente (`albmarrib@gmail.com`), pre-autorización de Josep Ferrer (`josep@ferrer-assessoria.com`), bloqueo de registros externos no autorizados.
- [x] **Restricción de Visibilidad por Rol:** Los gestores estándar quedan fijados en *"Mis Expedientes"*; solo administradores acceden al toggle *"Todos"*.
- [x] **Despliegue y Hosting:** Publicado en Firebase Hosting (`https://gestflow-d6045.web.app`) y sincronizado en GitHub (`master`).
- [x] **Backend de Notificaciones:** Cloud Function `enviarNotificacionExpediente` activa en Node 20 vía `avisos.gestflow@gmail.com` enviando alertas en altas, cambios de estado y notas.

---

## 🎯 Nuevos Retos Prioritarios

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. ESTADOS DINÁMICOS & COLORES ➔ 2. TAREAS PREDEFINIDAS & GTD               │
│                                ➔ 3. MÓDULO ECONÓMICO & FACTURACIÓN          │
│                                ➔ 4. CHAT INTERNO CON GLOBOS                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### RETO 1: Gestión Dinámica de Estados y Restauración de Colores ✅ COMPLETADO

#### Diagnóstico:
Con la ampliación de estados del despacho, se perdieron contrastes visuales y paletas cromáticas diferenciadas en las listas, Kanban y badges. Además, los estados deben ser editables desde el Panel de Administración.

#### Tareas implementadas:
- [x] **Colección Firestore `estados`:** Almacenamiento y sincronización en tiempo real de cada estado con `nombre`, `color` (10 paletas semánticas: esmeralda, rubí, ámbar, índigo, azul, púrpura, cian, naranja, pizarra, grafito), `categoria` (*activo*, *urgente*, *bloqueado*, *informativo*, *completado*), indicador `isCompleted` y `orden`.
- [x] **Pestaña en Panel Admin (`ClassificationManager.jsx`):** Sección *"Estados y Colores"* para crear nuevos estados, elegir paleta cromática con vista previa en vivo, clasificar categoría, marcar completitud, editar y reordenar. Incluye botón para inicializar catálogo maestro recomendado.
- [x] **Restauración visual de Badges:** Componente `Badge` dinámico con `EstadosContext` y diseño refinado de alto contraste con punto indicador (dot) en todas las vistas (`ListView`, `GTDView`, `RoadmapView`, `AnalyticsView`, `ExpedienteModal`).
- [x] **Filtro Inteligente "Ocultar Terminados":** Conectado el botón de ocultar completados con los estados marcados con `isCompleted` dinámicamente desde Firestore.

---

### RETO 2: Tareas Predefinidas (Plantillas de Trámites GTD) ✅ COMPLETADO

#### Diagnóstico:
En la gestoría gran parte de los trámites se repiten de forma idéntica (*Constitución de S.L.*, *Alta de Autónomo*, *Modelo 303 IVA*, *Traspaso DGT*, *Cierre Contable*). Actualmente hay que introducir título, pasos y datos a mano cada vez.

#### Tareas implementadas:
- [x] **Colección Firestore `plantillas_tareas`:** Estructura con `titulo`, `area`, `tramo`, `diasVencimiento`, `billingType`, `esFacturable`, `precioHonorarios` y array `pasos` (Pasos GTD precargados y ordenables).
- [x] **Diseñador de Plantillas en Panel Admin (`TemplateManager.jsx`):** Pantalla completa con catálogo de plantillas, diseñador interactivo de pasos GTD (subir/bajar orden, texto y asesor asignado), duplicación rápida y botón de precarga con 6 plantillas maestras estándar de asesoría.
- [x] **Selector en "Nuevo Expediente" (`ExpedienteModal.jsx`):** Desplegable destacado `[ ⚡ Cargar Plantilla Predefinida... ]` que al seleccionarse autorrellena:
  - Título y descripción estándar del procedimiento.
  - Área y trámite por defecto.
  - Plazo de vencimiento calculado automáticamente ($Hoy + N$ días).
  - Todos los pasos GTD precargados en la pestaña de trámites con IDs únicos.
  - Honorarios y régimen de facturación precargados para el módulo económico.

---

### RETO 3: Módulo Económico y Control de Facturación ✅ COMPLETADO

#### Objetivos:
- Cada expediente define si es a cobrar (`billable`), incluido en cuota (`included`) o no facturable (`non_billable`), con honorarios pactados editables.
- Control de suplidos y gastos externos (notarías, registros mercantiles, tasas DGT) con importes y enlaces a justificantes.
- Control de pagos a cuenta / provisiones de fondos abonadas por el cliente.
- Balance automático en vivo:  
  $$\text{Total a Facturar / Cobrar} = \text{Honorarios} + \text{Gastos Suplidos} - \text{Entregas a Cuenta}$$
- Panel financiero global de expedientes cerrados y abiertos pendientes de cobro/facturación.
- Exportador a Excel y CSV optimizado para programas contables (A3, Contasol, Sage).

#### Tareas implementadas:
- [x] **Pestaña Económica en Expediente (`ExpedienteBillingTab.jsx`):**
  - Selector de régimen (A Cobrar / Cuota / No facturable), honorarios editables y estado de factura (`pending`, `invoiced`, `paid`).
  - Gestor de entregas a cuenta y provisiones con fecha, método de pago y justificantes.
  - Gestor de suplidos y tasas de terceras partes con proveedor, número de documento y justificantes.
  - Tarjeta de liquidación económica en vivo con desglose y saldo pendiente.
- [x] **Panel Financiero Global (`BillingView.jsx`):**
  - 4 KPIs financieros globales (Honorarios Pendientes, Suplidos Adelantados, Anticipos Cobrados, Saldo Neto a Cobrar).
  - Alerta prioritaria destacada para expedientes tramitados/cerrados pendientes de facturar.
  - Tabla de liquidación con cambio rápido de estado de facturación y número de factura.
- [x] **Exportación Contable (Excel & CSV):**
  - Exportación con un solo clic a formato Excel `.xlsx` y fichero `.csv` estructurado con columnas contables estándar.

---

### RETO 4: Sistema de Comunicación Interno (Chat con Globos) ✅ COMPLETADO

#### Objetivos:
Facilitar la comunicación ágil entre asesores directamente en el contexto del expediente, evitando WhatsApp y correos dispersos.

#### Tareas implementadas:
- [x] **Subcolección en tiempo real `expedientes/{id}/messages`:** Almacenamiento eficiente e independiente de mensajes (`senderEmail`, `senderName`, `text`, `createdAt`).
- [x] **Diseño tipo WhatsApp / Slack (`ExpedienteChatTab.jsx`):**
  - Globos de conversación elegantes: mensajes propios alineados a la derecha con degradado índigo; mensajes de compañeros a la izquierda en fondo blanco/gris con avatar y nombre.
  - Reconocimiento automático y formato clicable de enlaces web (URLs).
  - Marca horaria inteligente y ticks de lectura.
- [x] **Pestaña "💬 Chat Interno" en `ExpedienteModal.jsx`:** Con scroll automático al último mensaje, caja de texto con envío por tecla `Enter` y botón para compartir enlaces.

---

## 📌 Recomendación de Inicio de Trabajos

Se recomienda comenzar por el **RETO 1 (Estados Dinámicos y Restauración de Colores)**:
1. Es la base visual de toda la aplicación.
2. Tanto tú como Josep veréis de inmediato los expedientes con colores vivos y jerarquizados según su urgencia.
3. Permite al administrador crear y ajustar estados en caliente.
4. Deja la base limpia para que los estados económicos y las plantillas encajen con coherencia.
