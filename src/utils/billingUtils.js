// Utilidades y configuraciones para la emisión de Liquidaciones Económicas y Facturación
// Soporte multilingüe bilingüe: Català (ca - por defecto) & Castellano (es)

export const DEFAULT_BILLING_SETTINGS = {
  despachoNombre: 'GESTORIA ADMINISTRATIVA',
  despachoSubtitulo: "Serveis Professionals d'Assessoria, Gestió Fiscal, Laboral i Mercantil",
  despachoNif: 'B-12345678',
  despachoDireccion: 'Carrer Major 12, Planta 1a, Barcelona',
  despachoTelefono: '+34 93 123 45 67',
  despachoEmail: 'administracio@gestoria.cat',
  bancoNombre: 'CaixaBank',
  bancoIban: 'ES91 2100 0418 4502 0005 1332',
  bancoTitular: 'Gestoria Administrativa S.L.',

  // Plantilla en Català (Prioritària per defecte)
  emailSubject_ca: 'Liquidació de Despeses i Honoraris - {expediente} ({ref})',
  emailBody_ca: `Benvolgut/da {cliente},

Us fem arribar el desglossament de la liquidació econòmica corresponent al tràmit "{expediente}".

DETALL DE LA LIQUIDACIÓ:
--------------------------------------------------
• Honoraris professionals de gestió: {honorarios} €
• Suplerts i despeses de tercers: {suplidos} €
• Bestretes / Provisions de fons rebudes: -{anticipos} €
--------------------------------------------------
SALDO NET A ABONAR: {saldo} €
--------------------------------------------------

Per formalitzar el pagament, podeu realitzar una transferència bancària al següent compte:
Banc: {banco}
IBAN: {iban}
Concepte bancari obligatori: {ref} - {cliente}

Adjuntem a aquest correu el document detallat de liquidació econòmica en format PDF generat pel despatx per al vostre arxiu comptable.

Restem a la vostra disposició per a qualsevol aclariment o consulta.

Cordialment,
L'equip de {gestoria}`,

  // Plantilla en Castellano
  emailSubject_es: 'Liquidación de Gastos y Honorarios - {expediente} ({ref})',
  emailBody_es: `Estimado/a {cliente},

Le remitimos el desglose de liquidación económica correspondiente al trámite "{expediente}".

DETALLE DE LA LIQUIDACIÓN:
--------------------------------------------------
• Honorarios profesionales de gestión: {honorarios} €
• Suplidos y gastos de terceros: {suplidos} €
• Anticipos / Entregas a cuenta recibidas: -{anticipos} €
--------------------------------------------------
SALDO NETO A ABONAR: {saldo} €
--------------------------------------------------

Para formalizar el pago, pueden realizar una transferencia bancaria a la siguiente cuenta:
Banco: {banco}
IBAN: {iban}
Concepto bancario obligatorio: {ref} - {cliente}

Adjuntamos a este correo el documento detallado de liquidación económica en formato PDF generado por el despacho para su archivo contable.

Quedamos a su entera disposición para cualquier aclaración o consulta.

Atentamente,
El equipo de {gestoria}`,

  // Retrocompatibilidad
  emailSubject: 'Liquidació de Despeses i Honoraris - {expediente} ({ref})',
  emailBody: `Benvolgut/da {cliente},

Us fem arribar el desglossament de la liquidació econòmica corresponent al tràmit "{expediente}".

DETALL DE LA LIQUIDACIÓ:
--------------------------------------------------
• Honoraris professionals de gestió: {honorarios} €
• Suplerts i despeses de tercers: {suplidos} €
• Bestretes / Provisions de fons rebudes: -{anticipos} €
--------------------------------------------------
SALDO NET A ABONAR: {saldo} €
--------------------------------------------------

Per formalitzar el pagament, podeu realitzar una transferència bancària al següent compte:
Banc: {banco}
IBAN: {iban}
Concepte bancari obligatori: {ref} - {cliente}

Adjuntem a aquest correu el document detallat de liquidació econòmica en format PDF generat pel despatx per al vostre arxiu comptable.

Restem a la vostra disposició per a qualsevol aclariment o consulta.

Cordialment,
L'equip de {gestoria}`
};

export const I18N_DOC = {
  ca: {
    printBtn: '🖨️ Imprimir / Desar com a PDF',
    docBadge: 'LIQUIDACIÓ ECONÒMICA I ESTAT DE COMPTE',
    ref: 'Ref:',
    issueDate: "Data d'emissió:",
    clientDataTitle: 'Dades del Client',
    clientName: 'Raó Social / Nom:',
    clientNif: 'NIF / CIF:',
    clientEmail: 'Correu electrònic:',
    clientPhone: 'Telèfon:',
    clientAddress: 'Adreça:',
    notSpecified: 'No especificat',
    notIndicated: 'No indicat',
    expRefTitle: "Expedient de Referència",
    procedure: 'Tràmit:',
    department: 'Àrea / Departament:',
    operationType: "Tipus d'Operació:",
    regime: 'Règim:',
    directBilling: 'Facturació Directa',
    includedQuota: 'Inclòs en Quota Mensual',
    internalMgmt: 'Gestió Interna',
    feesExpensesTitle: "Desglossament d'Honoraris Professionals i Suplerts Avançats",
    conceptCol: 'Concepte',
    detailCol: 'Detall / Factura Origen',
    dateCol: 'Data',
    amountCol: 'Import (€)',
    managementFees: 'Honoraris de Gestió Professional',
    invoiceNum: 'Factura Núm: ',
    agreedFees: 'Honoraris pactats',
    externalExpense: 'Despesa suplerta',
    receiptProvided: 'Justificant aportat',
    noFeesOrExpenses: 'Sense honoraris ni suplerts meritats.',
    subtotalGross: 'SUBTOTAL BRUT (Honoraris + Suplerts de Tercers)',
    downPaymentsTitle: 'Provisions de Fons i Lliuraments a Compte (Bestretes)',
    downPaymentCol: 'Lliurament a Compte / Bestreta',
    paymentMethodCol: 'Forma de Pagament',
    receivedCol: 'Import Rebut (€)',
    downPaymentReceived: 'Provisió rebuda',
    totalDownPaymentsDeducted: 'TOTAL BESTRETES DEDUÏDES',
    netToPay: 'Saldo Net a Ingressar pel Client',
    settledExpediente: 'Expedient Totalment Liquidat',
    toReturnToClient: 'Saldo a Favor del Client (Retorn)',
    netAfterDownPayments: 'Import net final després de compensar bestretes',
    noPendingBalance: 'No hi ha saldo pendent de cobrament',
    returnSurplus: 'Import sobrant a retornar al client',
    bankInstructionsTitle: 'Instruccions per a la Transferència Bancària:',
    bankInstructionsNotice: "Preguem que realitzeu l'ingrés del saldo pendent al compte bancari del despatx:",
    bankLabel: 'Banc:',
    ibanLabel: 'IBAN:',
    accountHolderLabel: 'Titular:',
    mandatoryRefLabel: 'Concepte bancari obligatori:',
    legalNotice: "* Nota de Règim Econòmic: Aquest document constitueix una nota informativa de rendició de comptes, liquidació de suplerts i estat de saldo. No substitueix la factura fiscal reglamentària d'honoraris.",
    footerText: (despacho, today) => `Document emès per ${despacho} el ${today}. Per a qualsevol consulta contacteu amb el vostre gestor.`,
    paymentMethods: {
      transferencia: 'Transferència Bancària',
      tarjeta: 'Targeta (TPV)',
      efectivo: 'Efectiu / Metàl·lic',
      bizum: 'Bizum',
      domiciliacion: 'Domiciliació SEPA'
    }
  },
  es: {
    printBtn: '🖨️ Imprimir / Guardar como PDF',
    docBadge: 'LIQUIDACIÓN ECONÓMICA Y ESTADO DE CUENTA',
    ref: 'Ref:',
    issueDate: 'Fecha emisión:',
    clientDataTitle: 'Datos del Cliente',
    clientName: 'Razón Social / Nombre:',
    clientNif: 'NIF / CIF:',
    clientEmail: 'Email:',
    clientPhone: 'Teléfono:',
    clientAddress: 'Dirección:',
    notSpecified: 'No especificado',
    notIndicated: 'No indicado',
    expRefTitle: 'Expediente de Referencia',
    procedure: 'Trámite:',
    department: 'Área / Departamento:',
    operationType: 'Tipo de Operación:',
    regime: 'Régimen:',
    directBilling: 'Facturación Directa',
    includedQuota: 'Incluido en Cuota Mensual',
    internalMgmt: 'Gestión Interna',
    feesExpensesTitle: 'Desglose de Honorarios Profesionales y Suplidos Adelantados',
    conceptCol: 'Concepto',
    detailCol: 'Detalle / Factura Origen',
    dateCol: 'Fecha',
    amountCol: 'Importe (€)',
    managementFees: 'Honorarios de Gestión Profesional',
    invoiceNum: 'Factura Nº: ',
    agreedFees: 'Honorarios pactados',
    externalExpense: 'Gasto suplido',
    receiptProvided: 'Justificante aportado',
    noFeesOrExpenses: 'Sin honorarios ni suplidos devengados.',
    subtotalGross: 'SUBTOTAL BRUTO (Honorarios + Suplidos de Terceros)',
    downPaymentsTitle: 'Provisiones de Fondos y Entregas a Cuenta Recibidas',
    downPaymentCol: 'Entrega a Cuenta / Anticipo',
    paymentMethodCol: 'Forma de Pago',
    receivedCol: 'Importe Recibido (€)',
    downPaymentReceived: 'Provisión recibida',
    totalDownPaymentsDeducted: 'TOTAL ANTICIPOS DEDUCIDOS',
    netToPay: 'Saldo Neto a Ingresar por el Cliente',
    settledExpediente: 'Expediente Totalmente Saldado',
    toReturnToClient: 'Saldo a Favor del Cliente (Devolución)',
    netAfterDownPayments: 'Importe neto final tras compensar anticipos',
    noPendingBalance: 'No existe saldo pendiente de cobro',
    returnSurplus: 'Importe sobrante a reintegrar al cliente',
    bankInstructionsTitle: 'Instrucciones para el Abono / Transferencia Bancaria:',
    bankInstructionsNotice: 'Rogamos realicen el ingreso del saldo pendiente en la cuenta bancaria del despacho:',
    bankLabel: 'Banco:',
    ibanLabel: 'IBAN:',
    accountHolderLabel: 'Titular:',
    mandatoryRefLabel: 'Concepto bancario obligatorio:',
    legalNotice: '* Nota de Régimen Económico: Este documento constituye una nota informativa de rendición de cuentas, liquidación de suplidos y estado de saldo. No sustituye a la factura fiscal reglamentaria de honorarios.',
    footerText: (despacho, today) => `Documento emitido por ${despacho} el ${today}. Para cualquier consulta contacte con su gestor.`,
    paymentMethods: {
      transferencia: 'Transferencia Bancaria',
      tarjeta: 'Tarjeta (TPV)',
      efectivo: 'Metálico / Efectivo',
      bizum: 'Bizum',
      domiciliacion: 'Domiciliación SEPA'
    }
  }
};

export function findClientForTask(task, clientes = []) {
  if (!task || !clientes || clientes.length === 0) return null;
  const formNif = (task.clientNif || '').toUpperCase().trim();
  const formClient = (task.client || '').toLowerCase().trim();

  return clientes.find(c => {
    const cNif = (c.nif || '').toUpperCase().trim();
    const cRazon = (c.razonSocial || '').toLowerCase().trim();
    if (formNif && formNif === cNif) return true;
    if (cNif && formClient.includes(cNif.toLowerCase())) return true;
    if (cRazon && formClient === cRazon) return true;
    if (`${cRazon} (${cNif.toLowerCase()})` === formClient) return true;
    return false;
  }) || null;
}

export function calculateTaskBilling(task = {}) {
  const billingType = task.billingType || (task.esFacturable === false ? 'included' : 'billable');
  const feeAmount = billingType === 'billable' ? (Number(task.feeAmount) || Number(task.precioHonorarios) || 0) : 0;
  
  const downPayments = Array.isArray(task.downPayments) ? task.downPayments : [];
  const externalExpenses = Array.isArray(task.externalExpenses) ? task.externalExpenses : [];

  const totalDownPayments = downPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalExternalExpenses = externalExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const totalGross = feeAmount + totalExternalExpenses;
  const pendingBalance = totalGross - totalDownPayments;

  return {
    billingType,
    feeAmount,
    downPayments,
    externalExpenses,
    totalDownPayments,
    totalExternalExpenses,
    totalGross,
    pendingBalance
  };
}

export function generateLiquidationHtml(task, clientData, billingSettings = {}, lang = 'ca') {
  const cfg = { ...DEFAULT_BILLING_SETTINGS, ...(billingSettings || {}) };
  const billing = calculateTaskBilling(task);
  const docLang = lang === 'es' ? 'es' : 'ca';
  const txt = I18N_DOC[docLang] || I18N_DOC.ca;
  
  const clientName = clientData?.razonSocial || clientData?.nombreComercial || task?.client || (docLang === 'ca' ? 'Client' : 'Cliente');
  const clientNif = clientData?.nif || task?.clientNif || txt.notSpecified;
  const clientEmail = clientData?.email || task?.clientEmail || txt.notIndicated;
  const clientPhone = clientData?.telefono || '-';
  const clientAddress = clientData?.direccion || '-';

  const expCode = task?.id ? `EXP-${String(task.id).slice(-6).toUpperCase()}` : 'EXP-NOU';
  const dateLocale = docLang === 'ca' ? 'ca-ES' : 'es-ES';
  const today = new Date().toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit', year: 'numeric' });

  const regimeLabel = billing.billingType === 'billable' 
    ? txt.directBilling 
    : (billing.billingType === 'included' ? txt.includedQuota : txt.internalMgmt);

  return `<!DOCTYPE html>
<html lang="${docLang}">
<head>
  <meta charset="UTF-8">
  <title>Liquidacio_${expCode}_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}</title>
  <style>
    @page { 
      size: A4; 
      margin: 14mm; 
    }
    * { 
      box-sizing: border-box; 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
    }
    body { 
      color: #1e293b; 
      background: #ffffff; 
      margin: 0; 
      padding: 24px; 
      font-size: 13px; 
      line-height: 1.5; 
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start; 
      border-bottom: 2px solid #0f172a; 
      padding-bottom: 16px; 
      margin-bottom: 20px; 
    }
    .brand-title { 
      font-size: 20px; 
      font-weight: 800; 
      color: #0f172a; 
      margin: 0 0 2px 0; 
      letter-spacing: -0.3px;
    }
    .brand-sub { 
      font-size: 11px; 
      color: #475569; 
      font-weight: 600; 
      margin: 0 0 4px 0;
    }
    .brand-meta {
      font-size: 10px;
      color: #64748b;
      line-height: 1.4;
    }
    .doc-badge { 
      background: #f8fafc; 
      border: 1px solid #cbd5e1; 
      padding: 10px 16px; 
      border-radius: 8px; 
      text-align: right; 
    }
    .doc-badge h2 { 
      margin: 0; 
      font-size: 13px; 
      font-weight: 800; 
      color: #0f172a; 
      letter-spacing: 0.5px;
    }
    .doc-badge p { 
      margin: 3px 0 0 0; 
      font-size: 11px; 
      color: #64748b; 
    }
    .info-grid { 
      display: grid; 
      grid-template-columns: 1fr 1fr; 
      gap: 16px; 
      margin-bottom: 20px; 
    }
    .info-box { 
      background: #f8fafc; 
      border: 1px solid #e2e8f0; 
      border-radius: 8px; 
      padding: 12px 14px; 
    }
    .info-title { 
      font-size: 10px; 
      font-weight: 700; 
      text-transform: uppercase; 
      letter-spacing: 0.5px; 
      color: #475569; 
      margin-bottom: 6px; 
      border-bottom: 1px solid #e2e8f0; 
      padding-bottom: 4px; 
    }
    .info-box p { 
      margin: 2px 0; 
      font-size: 12px; 
    }
    table { 
      width: 100%; 
      border-collapse: collapse; 
      font-size: 12px; 
      margin-bottom: 18px; 
    }
    th { 
      background: #0f172a; 
      color: #ffffff; 
      font-weight: 600; 
      text-align: left; 
      padding: 8px 10px; 
      font-size: 11px; 
      text-transform: uppercase; 
    }
    th.text-right, td.text-right { 
      text-align: right; 
    }
    td { 
      padding: 8px 10px; 
      border-bottom: 1px solid #e2e8f0; 
    }
    tr:nth-child(even) td { 
      background-color: #f8fafc; 
    }
    .table-section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      color: #334155;
      margin-bottom: 6px;
    }
    .summary-card { 
      background: #0f172a; 
      color: #ffffff; 
      border-radius: 8px; 
      padding: 14px 18px; 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      margin-top: 16px; 
    }
    .summary-label { 
      font-size: 12px; 
      font-weight: 600; 
      text-transform: uppercase; 
      color: #94a3b8; 
    }
    .summary-amount { 
      font-size: 22px; 
      font-weight: 800; 
      color: #38bdf8; 
    }
    .bank-notice { 
      margin-top: 18px; 
      background: #eff6ff; 
      border: 1px solid #bfdbfe; 
      border-radius: 8px; 
      padding: 12px 16px; 
      font-size: 11px; 
      color: #1e40af; 
    }
    .legal-notice {
      margin-top: 14px;
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 10px;
      color: #92400e;
    }
    .footer { 
      margin-top: 26px; 
      text-align: center; 
      font-size: 10px; 
      color: #94a3b8; 
      border-top: 1px solid #e2e8f0; 
      padding-top: 10px; 
    }
    .no-print { 
      position: fixed; 
      top: 16px; 
      right: 16px; 
      z-index: 9999; 
      display: flex;
      gap: 8px;
    }
    .btn { 
      background: #2563eb; 
      color: white; 
      border: none; 
      padding: 10px 18px; 
      border-radius: 6px; 
      font-weight: 700; 
      font-size: 13px; 
      cursor: pointer; 
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.15); 
    }
    .btn:hover { 
      background: #1d4ed8; 
    }
    @media print { 
      .no-print { display: none !important; } 
      body { padding: 0; } 
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="btn" onclick="window.print()">${txt.printBtn}</button>
  </div>

  <div class="header">
    <div>
      <div class="brand-title">${cfg.despachoNombre}</div>
      <div class="brand-sub">${cfg.despachoSubtitulo}</div>
      <div class="brand-meta">
        ${cfg.despachoNif ? `CIF/NIF: ${cfg.despachoNif} &bull; ` : ''}
        ${cfg.despachoDireccion ? `${cfg.despachoDireccion} &bull; ` : ''}
        ${cfg.despachoTelefono ? `Tel: ${cfg.despachoTelefono} &bull; ` : ''}
        ${cfg.despachoEmail ? `Email: ${cfg.despachoEmail}` : ''}
      </div>
    </div>
    <div class="doc-badge">
      <h2>${txt.docBadge}</h2>
      <p><strong>${txt.ref}</strong> ${expCode}</p>
      <p><strong>${txt.issueDate}</strong> ${today}</p>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-title">${txt.clientDataTitle}</div>
      <p><strong>${txt.clientName}</strong> ${clientName}</p>
      <p><strong>${txt.clientNif}</strong> ${clientNif}</p>
      <p><strong>${txt.clientEmail}</strong> ${clientEmail}</p>
      <p><strong>${txt.clientPhone}</strong> ${clientPhone}</p>
      ${clientAddress && clientAddress !== '-' ? `<p><strong>${txt.clientAddress}</strong> ${clientAddress}</p>` : ''}
    </div>
    <div class="info-box">
      <div class="info-title">${txt.expRefTitle}</div>
      <p><strong>${txt.procedure}</strong> ${task?.title || (docLang === 'ca' ? 'Expedient de Gestió' : 'Expediente de Gestión')}</p>
      <p><strong>${txt.department}</strong> ${task?.department || task?.area || 'General'}</p>
      <p><strong>${txt.operationType}</strong> ${task?.type || task?.tramo || '-'}</p>
      <p><strong>${txt.regime}</strong> ${regimeLabel}</p>
    </div>
  </div>

  <div class="table-section-title">${txt.feesExpensesTitle}</div>
  <table>
    <thead>
      <tr>
        <th>${txt.conceptCol}</th>
        <th>${txt.detailCol}</th>
        <th>${txt.dateCol}</th>
        <th class="text-right">${txt.amountCol}</th>
      </tr>
    </thead>
    <tbody>
      ${billing.feeAmount > 0 ? `
        <tr>
          <td><strong>${txt.managementFees}</strong></td>
          <td>${task?.invoiceNumber ? txt.invoiceNum + task.invoiceNumber : txt.agreedFees}</td>
          <td>${today}</td>
          <td class="text-right"><strong>${billing.feeAmount.toFixed(2)} €</strong></td>
        </tr>
      ` : ''}
      ${billing.externalExpenses.map(e => `
        <tr>
          <td>${e.concept || txt.externalExpense} (${e.provider || 'Tercer'})</td>
          <td>${e.invoiceNumber ? txt.invoiceNum + e.invoiceNumber : txt.receiptProvided}</td>
          <td>${e.date || '-'}</td>
          <td class="text-right">+${Number(e.amount).toFixed(2)} €</td>
        </tr>
      `).join('')}
      ${billing.feeAmount === 0 && billing.externalExpenses.length === 0 ? `
        <tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:14px;">${txt.noFeesOrExpenses}</td></tr>
      ` : ''}
      <tr style="background-color: #f1f5f9; font-weight: 700;">
        <td colspan="3">${txt.subtotalGross}</td>
        <td class="text-right">${billing.totalGross.toFixed(2)} €</td>
      </tr>
    </tbody>
  </table>

  ${billing.downPayments.length > 0 ? `
    <div class="table-section-title">${txt.downPaymentsTitle}</div>
    <table>
      <thead>
        <tr>
          <th>${txt.downPaymentCol}</th>
          <th>${txt.paymentMethodCol}</th>
          <th>${txt.dateCol}</th>
          <th class="text-right">${txt.receivedCol}</th>
        </tr>
      </thead>
      <tbody>
        ${billing.downPayments.map(p => {
          const mKey = (p.paymentMethod || 'transferencia').toLowerCase();
          const methodName = txt.paymentMethods[mKey] || p.paymentMethod || 'Transferència';
          return `
            <tr>
              <td>${p.concept || txt.downPaymentReceived}</td>
              <td style="text-transform: capitalize;">${methodName}</td>
              <td>${p.date || '-'}</td>
              <td class="text-right" style="color: #15803d; font-weight: 600;">-${Number(p.amount).toFixed(2)} €</td>
            </tr>
          `;
        }).join('')}
        <tr style="background-color: #f0fdf4; font-weight: 700;">
          <td colspan="3" style="color: #166534;">${txt.totalDownPaymentsDeducted}</td>
          <td class="text-right" style="color: #166534;">-${billing.totalDownPayments.toFixed(2)} €</td>
        </tr>
      </tbody>
    </table>
  ` : ''}

  <div class="summary-card">
    <div>
      <div class="summary-label">
        ${billing.pendingBalance > 0 ? txt.netToPay : billing.pendingBalance === 0 ? txt.settledExpediente : txt.toReturnToClient}
      </div>
      <div style="font-size: 11px; color: #cbd5e1; margin-top: 2px;">
        ${billing.pendingBalance > 0 ? txt.netAfterDownPayments : billing.pendingBalance === 0 ? txt.noPendingBalance : txt.returnSurplus}
      </div>
    </div>
    <div class="summary-amount" style="color: ${billing.pendingBalance > 0 ? '#38bdf8' : (billing.pendingBalance === 0 ? '#4ade80' : '#fbbf24')};">
      ${Math.abs(billing.pendingBalance).toFixed(2)} €
    </div>
  </div>

  ${billing.pendingBalance > 0 ? `
    <div class="bank-notice">
      <p style="margin: 0 0 4px 0;"><strong>${txt.bankInstructionsTitle}</strong></p>
      <p style="margin: 0 0 2px 0;">${txt.bankInstructionsNotice}</p>
      <p style="margin: 4px 0; font-family: monospace; font-size: 13px; font-weight: 700; color: #0f172a;">
        ${txt.bankLabel} ${cfg.bancoNombre} &bull; ${txt.ibanLabel} ${cfg.bancoIban}
      </p>
      <p style="margin: 0; font-size: 10px; color: #475569;">
        ${txt.accountHolderLabel} <strong>${cfg.bancoTitular}</strong> &bull; ${txt.mandatoryRefLabel} <strong>${expCode} - ${clientName}</strong>
      </p>
    </div>
  ` : ''}

  <div class="legal-notice">
    ${txt.legalNotice}
  </div>

  <div class="footer">
    ${txt.footerText(cfg.despachoNombre, today)}
  </div>
</body>
</html>`;
}

export function openLiquidationPdf(task, clientData, billingSettings = {}, lang = 'ca') {
  const htmlContent = generateLiquidationHtml(task, clientData, billingSettings, lang);
  const printWin = window.open('', '_blank');
  if (printWin) {
    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  } else {
    alert(lang === 'ca' 
      ? "Si us plau, habiliteu les finestres emergents al navegador per veure la liquidació en PDF."
      : "Por favor habilita las ventanas emergentes en tu navegador para ver la liquidación en PDF.");
  }
}

export function buildBillingEmail(task, clientData, billingSettings = {}, customRecipient = '', lang = 'ca') {
  const cfg = { ...DEFAULT_BILLING_SETTINGS, ...(billingSettings || {}) };
  const billing = calculateTaskBilling(task);
  const docLang = lang === 'es' ? 'es' : 'ca';

  const clientName = clientData?.razonSocial || clientData?.nombreComercial || task?.client || (docLang === 'ca' ? 'Client' : 'Cliente');
  const expCode = task?.id ? `EXP-${String(task.id).slice(-6).toUpperCase()}` : 'EXP';
  const recipient = (customRecipient || clientData?.email || task?.clientEmail || '').trim();

  const dateLocale = docLang === 'ca' ? 'ca-ES' : 'es-ES';
  const todayFormatted = new Date().toLocaleDateString(dateLocale);

  const replaceTags = (text) => {
    return (text || '')
      .replace(/{cliente}/g, clientName)
      .replace(/{expediente}/g, task?.title || (docLang === 'ca' ? 'Expedient' : 'Expediente'))
      .replace(/{ref}/g, expCode)
      .replace(/{honorarios}/g, billing.feeAmount.toFixed(2))
      .replace(/{suplidos}/g, billing.totalExternalExpenses.toFixed(2))
      .replace(/{anticipos}/g, billing.totalDownPayments.toFixed(2))
      .replace(/{saldo}/g, Math.abs(billing.pendingBalance).toFixed(2))
      .replace(/{iban}/g, cfg.bancoIban)
      .replace(/{banco}/g, cfg.bancoNombre)
      .replace(/{gestoria}/g, cfg.despachoNombre)
      .replace(/{fecha}/g, todayFormatted);
  };

  let rawSubject = '';
  let rawBody = '';

  if (docLang === 'ca') {
    rawSubject = cfg.emailSubject_ca || DEFAULT_BILLING_SETTINGS.emailSubject_ca || cfg.emailSubject;
    rawBody = cfg.emailBody_ca || DEFAULT_BILLING_SETTINGS.emailBody_ca || cfg.emailBody;
  } else {
    rawSubject = cfg.emailSubject_es || cfg.emailSubject || DEFAULT_BILLING_SETTINGS.emailSubject_es;
    rawBody = cfg.emailBody_es || cfg.emailBody || DEFAULT_BILLING_SETTINGS.emailBody_es;
  }

  const subject = replaceTags(rawSubject);
  const body = replaceTags(rawBody);

  return {
    recipient,
    subject,
    body,
    lang: docLang
  };
}

export function openBillingEmail(task, clientData, billingSettings = {}, customRecipient = '', logAction = null, lang = 'ca') {
  const { recipient, subject, body, lang: docLang } = buildBillingEmail(task, clientData, billingSettings, customRecipient, lang);
  
  if (!recipient) {
    alert(docLang === 'ca'
      ? "Aquest client no té adreça de correu electrònic assignada. Si us plau, indiqueu-la a la seva fitxa o al camp d'enviament."
      : "Este cliente no tiene correo electrónico asignado. Por favor indícalo en su ficha o en el formulario.");
    return false;
  }

  // Abrir cliente de correo predeterminado del sistema operativo
  const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoUrl;

  if (logAction) {
    const billing = calculateTaskBilling(task);
    const msg = docLang === 'ca'
      ? `Liquidació enviada per email a ${recipient} (Saldo: ${billing.pendingBalance.toFixed(2)} €) [Català]`
      : `Liquidación enviada por email a ${recipient} (Saldo: ${billing.pendingBalance.toFixed(2)} €) [Castellano]`;
    logAction('email_sent', msg);
  }

  return true;
}
