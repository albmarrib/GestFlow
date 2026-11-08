# Hoja de Ruta: Mejoras Gestor de Expedientes

Documento de especificación de mejoras acordadas para el despacho/gestoría.

---

## 1. Sistema de Comunicación Interno (Chat)

### Objetivos:
- Facilitar la comunicación en tiempo real entre asesores, gestores y administradores sin depender de canales externos (WhatsApp, emails dispersos).
- Permitir tanto la comunicación contextual (ligada a un expediente) como general del despacho.

### Especificaciones técnicas:
1. **Chat específico por Expediente:**
   - Ubicación: Nueva pestaña **💬 Chat Interno** en la columna derecha de `ExpedienteModal.jsx` (junto a Bitácora, Pasos GTD y Adjuntos).
   - Datos por mensaje: `id`, `expedienteId`, `senderEmail`, `senderName`, `text`, `createdAt`, `attachments` (opcional).
   - Notificaciones: Generar alerta/badge en la campana de notificaciones a los gestores asignados al expediente cuando se reciba un nuevo mensaje.
2. **Chat Genérico / Canales del Despacho:**
   - Panel deslizable (drawer) o botón flotante en la barra superior.
   - Canales temáticos: `#general`, `#fiscal`, `#laboral`, `#contable`.
   - Mensajes directos o avisos rápidos entre usuarios del equipo.

---

## 2. Restricción de Visibilidad por Rol (Filtro "Todos" solo para Administradores)

### Diagnóstico actual:
- Actualmente el filtro inicial es `filterScope = 'all'` y los botones `[Mis Expedientes]` y `[Todos]` son visibles y utilizables por cualquier usuario logueado.

### Cambios a implementar:
1. **Para usuarios estándar / gestores (`!isAdmin`):**
   - El selector "Todos" queda oculto o deshabilitado.
   - El filtro queda forzado permanentemente en `filterScope = 'mine'` (solo ven expedientes donde su email esté en `assignees` o `assigneeEmail`).
   - Aplica a todas las vistas derivadas: Listado, Plan Fiscal, Vencimientos y Trámites GTD.
2. **Para administradores (`isAdmin`):**
   - Mantienen el control total y el toggle para alternar entre `Mis Expedientes` y `Todos` (supervisión global).
3. **Seguridad adicional:**
   - Ajustar las reglas de `firestore.rules` para proteger la lectura a nivel de base de datos.

---

## 3. Módulo Económico y Control de Facturación

### Objetivos:
- Evitar fugas de ingresos por trámites no facturados o gastos de terceros (notarías, registros, tasas) no repercutidos al cliente.

### Campos y Datos en el Expediente:
1. **Modalidad de Facturación:**
   - `billingType`: `'included'` (Incluido en cuota mensual), `'billable'` (Facturable adicional), `'non_billable'` (No facturable / Interno).
2. **Honorarios y Presupuesto:**
   - `budgetAmount`: Importe de honorarios estimados/pactados (€).
3. **Provisiones de Fondos / Entregas a Cuenta:**
   - Array `downPayments`: `[{ id, date, amount, concept, paymentMethod, notes, receiptUrl }]`.
4. **Suplidos y Facturas de Terceros (Gastos Externos):**
   - Array `externalExpenses`: `[{ id, provider, invoiceNumber, date, baseAmount, vatAmount, totalAmount, status ('paid_by_agency' | 'pending_payment'), pdfUrl }]`.
   - Ejemplos típicos: Notarías, Registro Mercantil, Registro de la Propiedad, Tasas DGT, Modelo 790, etc.
5. **Balance Económico Automático:**
   - Cálculo en tiempo real:
     $$\text{Total a Facturar} = \text{Honorarios} + \text{Gastos Terceros (Suplidos)} - \text{Entregas a Cuenta}$$
6. **Alerta y Vista "Pendientes de Facturar":**
   - Cuando un expediente pasa a estado `"Presentado / Tramitado"` o `"Cerrado"`, si es facturable y su estado de facturación no es `"Invoiced"` / `"Paid"`, se lista en un informe/filtro prioritario para el departamento de facturación.

