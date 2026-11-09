// Utilidades y configuraciones para la emisión de Liquidaciones Económicas y Facturación

export const DEFAULT_BILLING_SETTINGS = {
  despachoNombre: 'GESTORÍA ADMINISTRATIVA',
  despachoSubtitulo: 'Servicios Profesionales de Asesoría, Gestión Fiscal y Laboral',
  despachoNif: 'B-12345678',
  despachoDireccion: 'Calle Mayor 12, Planta 1ª, Madrid',
  despachoTelefono: '+34 91 123 45 67',
  despachoEmail: 'administracion@gestoria.com',
  bancoNombre: 'CaixaBank',
  bancoIban: 'ES91 2100 0418 4502 0005 1332',
  bancoTitular: 'Gestoría Administrativa S.L.',
  emailSubject: 'Liquidación de Gastos y Honorarios - {expediente} ({ref})',
  emailBody: `Estimado/a {cliente},

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
El equipo de {gestoria}`
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

export function generateLiquidationHtml(task, clientData, billingSettings = {}) {
  const cfg = { ...DEFAULT_BILLING_SETTINGS, ...(billingSettings || {}) };
  const billing = calculateTaskBilling(task);
  
  const clientName = clientData?.razonSocial || clientData?.nombreComercial || task?.client || 'Cliente';
  const clientNif = clientData?.nif || task?.clientNif || 'No especificado';
  const clientEmail = clientData?.email || task?.clientEmail || 'No indicado';
  const clientPhone = clientData?.telefono || '-';
  const clientAddress = clientData?.direccion || '-';

  const expCode = task?.id ? `EXP-${String(task.id).slice(-6).toUpperCase()}` : 'EXP-NUEVO';
  const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Liquidacion_${expCode}_${clientName.replace(/[^a-zA-Z0-9]/g, '_')}</title>
  <style>
    @page { 
      size: A4; 
      margin: 15mm; 
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
    <button class="btn" onclick="window.print()">🖨️ Imprimir / Guardar como PDF</button>
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
      <h2>LIQUIDACIÓN ECONÓMICA</h2>
      <p><strong>Ref:</strong> ${expCode}</p>
      <p><strong>Fecha emisión:</strong> ${today}</p>
    </div>
  </div>

  <div class="info-grid">
    <div class="info-box">
      <div class="info-title">Datos del Cliente</div>
      <p><strong>Razón Social / Nombre:</strong> ${clientName}</p>
      <p><strong>NIF / CIF:</strong> ${clientNif}</p>
      <p><strong>Email:</strong> ${clientEmail}</p>
      <p><strong>Teléfono:</strong> ${clientPhone}</p>
      ${clientAddress && clientAddress !== '-' ? `<p><strong>Dirección:</strong> ${clientAddress}</p>` : ''}
    </div>
    <div class="info-box">
      <div class="info-title">Expediente de Referencia</div>
      <p><strong>Trámite:</strong> ${task?.title || 'Expediente de Gestión'}</p>
      <p><strong>Área / Departamento:</strong> ${task?.department || task?.area || 'General'}</p>
      <p><strong>Tipo de Operación:</strong> ${task?.type || task?.tramo || '-'}</p>
      <p><strong>Régimen:</strong> ${billing.billingType === 'billable' ? 'Facturación Directa' : (billing.billingType === 'included' ? 'Incluido en Cuota Mensual' : 'Gestión Interna')}</p>
    </div>
  </div>

  <div class="table-section-title">Desglose de Honorarios Profesionales y Suplidos Adelantados</div>
  <table>
    <thead>
      <tr>
        <th>Concepto</th>
        <th>Detalle / Factura Origen</th>
        <th>Fecha</th>
        <th class="text-right">Importe (€)</th>
      </tr>
    </thead>
    <tbody>
      ${billing.feeAmount > 0 ? `
        <tr>
          <td><strong>Honorarios de Gestión Profesional</strong></td>
          <td>${task?.invoiceNumber ? 'Factura Nº: ' + task.invoiceNumber : 'Honorarios pactados'}</td>
          <td>${today}</td>
          <td class="text-right"><strong>${billing.feeAmount.toFixed(2)} €</strong></td>
        </tr>
      ` : ''}
      ${billing.externalExpenses.map(e => `
        <tr>
          <td>${e.concept || 'Gasto suplido'} (${e.provider || 'Tercero'})</td>
          <td>${e.invoiceNumber ? 'Factura/Tasa: ' + e.invoiceNumber : 'Justificante aportado'}</td>
          <td>${e.date || '-'}</td>
          <td class="text-right">+${Number(e.amount).toFixed(2)} €</td>
        </tr>
      `).join('')}
      ${billing.feeAmount === 0 && billing.externalExpenses.length === 0 ? `
        <tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:14px;">Sin honorarios ni suplidos devengados.</td></tr>
      ` : ''}
      <tr style="background-color: #f1f5f9; font-weight: 700;">
        <td colspan="3">SUBTOTAL BRUTO (Honorarios + Suplidos de Terceros)</td>
        <td class="text-right">${billing.totalGross.toFixed(2)} €</td>
      </tr>
    </tbody>
  </table>

  ${billing.downPayments.length > 0 ? `
    <div class="table-section-title">Provisiones de Fondos y Entregas a Cuenta Recibidas</div>
    <table>
      <thead>
        <tr>
          <th>Entrega a Cuenta / Anticipo</th>
          <th>Forma de Pago</th>
          <th>Fecha</th>
          <th class="text-right">Importe Recibido (€)</th>
        </tr>
      </thead>
      <tbody>
        ${billing.downPayments.map(p => `
          <tr>
            <td>${p.concept || 'Provisión recibida'}</td>
            <td style="text-transform: capitalize;">${p.paymentMethod || 'Transferencia'}</td>
            <td>${p.date || '-'}</td>
            <td class="text-right" style="color: #15803d; font-weight: 600;">-${Number(p.amount).toFixed(2)} €</td>
          </tr>
        `).join('')}
        <tr style="background-color: #f0fdf4; font-weight: 700;">
          <td colspan="3" style="color: #166534;">TOTAL ANTICIPOS DEDUCIDOS</td>
          <td class="text-right" style="color: #166534;">-${billing.totalDownPayments.toFixed(2)} €</td>
        </tr>
      </tbody>
    </table>
  ` : ''}

  <div class="summary-card">
    <div>
      <div class="summary-label">
        ${billing.pendingBalance > 0 ? 'Saldo Neto a Ingresar por el Cliente' : billing.pendingBalance === 0 ? 'Expediente Totalmente Saldado' : 'Saldo a Favor del Cliente (Devolución)'}
      </div>
      <div style="font-size: 11px; color: #cbd5e1; margin-top: 2px;">
        ${billing.pendingBalance > 0 ? 'Importe neto final tras compensar anticipos' : billing.pendingBalance === 0 ? 'No existe saldo pendiente de cobro' : 'Importe sobrante a reintegrar al cliente'}
      </div>
    </div>
    <div class="summary-amount" style="color: ${billing.pendingBalance > 0 ? '#38bdf8' : (billing.pendingBalance === 0 ? '#4ade80' : '#fbbf24')};">
      ${Math.abs(billing.pendingBalance).toFixed(2)} €
    </div>
  </div>

  ${billing.pendingBalance > 0 ? `
    <div class="bank-notice">
      <p style="margin: 0 0 4px 0;"><strong>Instrucciones para el Abono / Transferencia Bancaria:</strong></p>
      <p style="margin: 0 0 2px 0;">Rogamos realicen el ingreso del saldo pendiente en la cuenta bancaria del despacho:</p>
      <p style="margin: 4px 0; font-family: monospace; font-size: 13px; font-weight: 700; color: #0f172a;">
        Banco: ${cfg.bancoNombre} &bull; IBAN: ${cfg.bancoIban}
      </p>
      <p style="margin: 0; font-size: 10px; color: #475569;">
        Titular: <strong>${cfg.bancoTitular}</strong> &bull; Concepto bancario obligatorio: <strong>${expCode} - ${clientName}</strong>
      </p>
    </div>
  ` : ''}

  <div class="legal-notice">
    <strong>* Nota de Régimen Económico:</strong> Este documento constituye una nota informativa de rendición de cuentas, liquidación de suplidos y estado de saldo. No sustituye a la factura fiscal reglamentaria de honorarios.
  </div>

  <div class="footer">
    Documento emitido por ${cfg.despachoNombre} el ${today}. Para cualquier consulta contacte con su gestor.
  </div>
</body>
</html>`;
}

export function openLiquidationPdf(task, clientData, billingSettings = {}) {
  const htmlContent = generateLiquidationHtml(task, clientData, billingSettings);
  const printWin = window.open('', '_blank');
  if (printWin) {
    printWin.document.open();
    printWin.document.write(htmlContent);
    printWin.document.close();
  } else {
    alert("Por favor habilita las ventanas emergentes en tu navegador para ver la liquidación.");
  }
}

export function buildBillingEmail(task, clientData, billingSettings = {}, customRecipient = '') {
  const cfg = { ...DEFAULT_BILLING_SETTINGS, ...(billingSettings || {}) };
  const billing = calculateTaskBilling(task);

  const clientName = clientData?.razonSocial || clientData?.nombreComercial || task?.client || 'Cliente';
  const expCode = task?.id ? `EXP-${String(task.id).slice(-6).toUpperCase()}` : 'EXP';
  const recipient = (customRecipient || clientData?.email || task?.clientEmail || '').trim();

  const replaceTags = (text) => {
    return (text || '')
      .replace(/{cliente}/g, clientName)
      .replace(/{expediente}/g, task?.title || 'Expediente')
      .replace(/{ref}/g, expCode)
      .replace(/{honorarios}/g, billing.feeAmount.toFixed(2))
      .replace(/{suplidos}/g, billing.totalExternalExpenses.toFixed(2))
      .replace(/{anticipos}/g, billing.totalDownPayments.toFixed(2))
      .replace(/{saldo}/g, Math.abs(billing.pendingBalance).toFixed(2))
      .replace(/{iban}/g, cfg.bancoIban)
      .replace(/{banco}/g, cfg.bancoNombre)
      .replace(/{gestoria}/g, cfg.despachoNombre)
      .replace(/{fecha}/g, new Date().toLocaleDateString('es-ES'));
  };

  const subject = replaceTags(cfg.emailSubject);
  const body = replaceTags(cfg.emailBody);

  return {
    recipient,
    subject,
    body
  };
}

export function openBillingEmail(task, clientData, billingSettings = {}, customRecipient = '', logAction = null) {
  const { recipient, subject, body } = buildBillingEmail(task, clientData, billingSettings, customRecipient);
  
  if (!recipient) {
    alert("Este cliente no tiene correo electrónico asignado. Por favor indícalo en su ficha o en el formulario.");
    return false;
  }

  // Abrir cliente de correo predeterminado del sistema operativo (Outlook, Gmail, etc.)
  const mailtoUrl = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = mailtoUrl;

  if (logAction) {
    const billing = calculateTaskBilling(task);
    logAction('email_sent', `Liquidación enviada por email a ${recipient} (Saldo: ${billing.pendingBalance.toFixed(2)} €)`);
  }

  return true;
}
