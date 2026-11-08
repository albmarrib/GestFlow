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

### RETO 1: Gestión Dinámica de Estados y Restauración de Colores

#### Diagnóstico:
Con la ampliación de estados del despacho, se perdieron contrastes visuales y paletas cromáticas diferenciadas en las listas, Kanban y badges. Además, los estados deben ser editables desde el Panel de Administración.

#### Tareas a implementar:
- [ ] **Colección Firestore `estados`:** Almacenamiento en tiempo real de cada estado con `nombre`, `color` (esmeralda, ámbar, rubí, índigo, pizarra, violeta), `categoria` (*activo*, *bloqueado*, *completado*) y `orden`.
- [ ] **Pestaña en Panel Admin (`ClassificationManager.jsx`):** Sección *"Estados de Expediente"* para crear nuevos estados, cambiarles el color con vista previa, editarlos y reordenarlos.
- [ ] **Restauración visual de Badges:** Componente `Badge` dinámico con diseño moderno de alto contraste para todas las vistas (`ListView`, `GTDView`, `RoadmapView`, `AnalyticsView`, `ExpedienteModal`).
- [ ] **Filtro Inteligente "Ocultar Terminados":** Conectar el botón de ocultar completados con los estados que el admin marque como `categoria: 'completado'`.

---

### RETO 2: Tareas Predefinidas (Plantillas de Trámites GTD)

#### Diagnóstico:
En la gestoría gran parte de los trámites se repiten de forma idéntica (*Constitución de S.L.*, *Alta de Autónomo*, *Modelo 303 IVA*, *Traspaso DGT*, *Cierre Contable*). Actualmente hay que introducir título, pasos y datos a mano cada vez.

#### Tareas a implementar:
- [ ] **Colección Firestore `plantillas_tareas`:** Estructura con `titulo`, `departamento`, `tipo`, `diasEstimados` (para calcular el vencimiento en automático), `esFacturable`, `precioDefecto` y array `defaultActions` (Pasos GTD precargados).
- [ ] **Diseñador de Plantillas en Panel Admin:** Pantalla para que el administrador cree y gestione las plantillas del despacho, definiendo la secuencia de pasos GTD obligatorios de cada trámite.
- [ ] **Selector en "Nuevo Expediente":** Dropdown destacado `[ ⚡ Cargar Plantilla Predefinida... ]` que al seleccionarse autorrellena:
  - Título y descripción estándar.
  - Área y tipo de trámite.
  - Plazo de vencimiento calculado ($Hoy + N$ días).
  - Todos los pasos GTD precargados en la pestaña de trámites.
  - Honorarios sugeridos para el módulo económico.

---

### RETO 3: Módulo Económico y Control de Facturación

#### Objetivos:
- Cada expediente debe especificar si es facturable o no, con honorarios pactados.
- Control de suplidos y gastos externos (notarías, registros mercantiles, tasas DGT Modelo 790) con justificantes adjuntos.
- Control de pagos a cuenta / provisiones de fondos del cliente.
- Balance automático en vivo:  
  $$\text{Total a Facturar / Cobrar} = \text{Honorarios} + \text{Gastos Suplidos} - \text{Entregas a Cuenta}$$
- Panel financiero global de expedientes cerrados y abiertos pendientes de cobro/facturación.
- Exportador a Excel y CSV optimizado para programas contables (A3, Contasol, Sage).

#### Tareas a implementar:
- [ ] **Campos Económicos en Expediente:**
  - `billingType`: `'included'` (Incluido en cuota mensual), `'billable'` (Facturable adicional), `'non_billable'` (No facturable / Interno).
  - `feeAmount`: Importe de honorarios (€) precargado de la plantilla o manual.
  - `billingStatus`: `'pending'` (Pendiente de facturar), `'invoiced'` (Facturado), `'paid'` (Cobrado).
  - Array `downPayments`: `[{ id, date, amount, concept, paymentMethod, notes, receiptUrl }]`.
  - Array `externalExpenses` (Suplidos): `[{ id, provider, invoiceNumber, date, amount, concept, status, receiptUrl }]`.
- [ ] **Pestaña Económica en `ExpedienteModal.jsx`:**
  - Tarjetas de resumen: Honorarios + Suplidos Adelantados - Pagos Recibidos = Saldo a Facturar.
  - Formularios rápidos para registrar entregas a cuenta y gastos de suplidos con subida de archivo PDF/imagen.
- [ ] **Panel Financiero del Despacho:**
  - Nueva vista o sección para el departamento de administración con totales globales (Pendiente de cobro, Suplidos pendientes de recuperar).
  - Filtro prioritario: *"Expedientes Tramitados / Cerrados sin Facturar"*.
- [ ] **Exportación Contable (Excel & CSV):**
  - Generador de ficheros estructurados con columnas preparadas para enlazar con contabilidad.

---

### RETO 4: Sistema de Comunicación Interno (Chat con Globos)

#### Objetivos:
Facilitar la comunicación ágil entre asesores directamente en el contexto del expediente, evitando WhatsApp y correos dispersos.

#### Tareas a implementar:
- [ ] **Subcolección en tiempo real `expedientes/{id}/messages`:** Almacenamiento eficiente e independiente de mensajes (`senderEmail`, `senderName`, `text`, `createdAt`, `attachments`).
- [ ] **Diseño tipo WhatsApp / Slack (Globos de conversación):**
  - Mensajes propios: alineados a la derecha, color índigo, marca horaria.
  - Mensajes de otros asesores: alineados a la izquierda, color pizarra claro, avatar con inicial y nombre completo.
- [ ] **Pestaña "💬 Chat Interno" en `ExpedienteModal.jsx`:** Con scroll automático al último mensaje y caja de texto con envío por tecla `Enter`.
- [ ] **Badges de actividad no leída:** Indicador visual de mensajes nuevos en el expediente.

---

## 📌 Recomendación de Inicio de Trabajos

Se recomienda comenzar por el **RETO 1 (Estados Dinámicos y Restauración de Colores)**:
1. Es la base visual de toda la aplicación.
2. Tanto tú como Josep veréis de inmediato los expedientes con colores vivos y jerarquizados según su urgencia.
3. Permite al administrador crear y ajustar estados en caliente.
4. Deja la base limpia para que los estados económicos y las plantillas encajen con coherencia.
