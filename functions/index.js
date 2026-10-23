const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Configuración del transporte Nodemailer para Gmail
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

exports.enviarNotificacionExpediente = functions
  .firestore
  .document("expedientes/{expedienteId}")
  .onWrite(async (change, context) => {
    const datosNuevos = change.after.exists ? change.after.data() : null;
    const datosViejos = change.before.exists ? change.before.data() : null;

    // Si el expediente fue eliminado, no enviamos notificación
    if (!datosNuevos) return null;

    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
      console.warn("Notificaciones desactivadas: faltan variables SMTP_USER o SMTP_PASS en el entorno.");
      return null;
    }

    const esCreacion = !change.before.exists;
    let asunto = "";
    let contenido = "";
    let autor = "";

    // 1. Evaluar si es Creación o Modificación
    if (esCreacion) {
      autor = datosNuevos.createdBy || "Sistema";
      asunto = `Nuevo expediente asignado: ${datosNuevos.title || "Sin título"}`;
      contenido = `Hola,\n\nSe te ha asignado un nuevo expediente o trámite en GestFlow:\n\n` +
        `• Expediente: ${datosNuevos.title || "Sin título"}\n` +
        `• Cliente: ${datosNuevos.client || "No especificado"}\n` +
        `• Área / Departamento: ${datosNuevos.department || "-"}\n` +
        `• Tipo de Trámite: ${datosNuevos.type || "-"}\n` +
        `• Estado Inicial: ${datosNuevos.status || "-"}\n` +
        `• Vencimiento Fiscal / Plazo: ${datosNuevos.dueDate || "Sin fecha"}\n` +
        (datosNuevos.description ? `• Observaciones: ${datosNuevos.description}\n` : "") +
        `\nCreado por: ${autor}\n\n` +
        `Accede al portal de GestFlow para consultar la ficha completa y comenzar la gestión.`;
    } else {
      // Modificación
      autor = datosNuevos.updatedBy || "Sistema";

      // Detectar cambios en campos relevantes
      const cambios = [];
      if (datosNuevos.title !== datosViejos.title) {
        cambios.push(`Título: "${datosViejos.title || "-"}" ➔ "${datosNuevos.title || "-"}"`);
      }
      if (datosNuevos.client !== datosViejos.client) {
        cambios.push(`Cliente: "${datosViejos.client || "-"}" ➔ "${datosNuevos.client || "-"}"`);
      }
      if (datosNuevos.status !== datosViejos.status) {
        cambios.push(`Estado: "${datosViejos.status || "-"}" ➔ "${datosNuevos.status || "-"}"`);
      }
      if (datosNuevos.dueDate !== datosViejos.dueDate) {
        cambios.push(`Vencimiento: "${datosViejos.dueDate || "Sin fecha"}" ➔ "${datosNuevos.dueDate || "Sin fecha"}"`);
      }
      if (datosNuevos.department !== datosViejos.department) {
        cambios.push(`Área: "${datosViejos.department || "-"}" ➔ "${datosNuevos.department || "-"}"`);
      }
      if (datosNuevos.type !== datosViejos.type) {
        cambios.push(`Tipo de trámite: "${datosViejos.type || "-"}" ➔ "${datosNuevos.type || "-"}"`);
      }

      const updatesNuevos = (datosNuevos.updates || []).length;
      const updatesViejos = (datosViejos.updates || []).length;
      if (updatesNuevos > updatesViejos) {
        const ultimaNota = datosNuevos.updates[0]?.text || "Nueva nota registrada";
        cambios.push(`Nueva nota en bitácora: "${ultimaNota}"`);
      } else if (JSON.stringify(datosNuevos.updates || []) !== JSON.stringify(datosViejos.updates || [])) {
        cambios.push(`Actualización en bitácora de seguimiento`);
      }

      const actionsNuevas = JSON.stringify(datosNuevos.actions || []);
      const actionsViejas = JSON.stringify(datosViejos.actions || []);
      if (actionsNuevas !== actionsViejas) {
        cambios.push(`Cambios en los pasos o trámites GTD`);
      }

      // Si no hubo ningún cambio relevante, no se envía email
      if (cambios.length === 0) {
        return null;
      }

      asunto = `Actualización en expediente: ${datosNuevos.title || "Sin título"}`;
      contenido = `Hola,\n\nSe ha actualizado un expediente o trámite asignado a tu gestión:\n\n` +
        `• Expediente: ${datosNuevos.title || "Sin título"}\n` +
        `• Cliente: ${datosNuevos.client || "No especificado"}\n` +
        `• Estado actual: ${datosNuevos.status || "-"}\n` +
        `• Vencimiento: ${datosNuevos.dueDate || "Sin fecha"}\n\n` +
        `Modificaciones realizadas por ${autor}:\n` +
        cambios.map(c => `  - ${c}`).join("\n") +
        `\n\nAccede al portal de GestFlow para revisar los detalles actualizados.`;
    }

    // 2. Destinatarios asignados (excluyendo al autor del cambio)
    const asignados = Array.isArray(datosNuevos.assignees) ? datosNuevos.assignees : [];
    const destinatariosFinales = asignados
      .map(email => (typeof email === "string" ? email.trim() : ""))
      .filter(email => email && email.toLowerCase() !== autor.toLowerCase());

    if (destinatariosFinales.length === 0) {
      console.log("No hay destinatarios asignados distintos del autor del cambio. Notificación omitida.");
      return null;
    }

    console.log(`Enviando notificación por Gmail a: ${destinatariosFinales.join(", ")} | Asunto: ${asunto}`);

    // 3. Envío vía Nodemailer con Gmail
    try {
      const mailOptions = {
        from: `"GestFlow Notificaciones" <${smtpUser}>`,
        to: destinatariosFinales.join(", "),
        subject: asunto,
        text: contenido
      };

      const info = await transporter.sendMail(mailOptions);
      console.log("Email de notificación enviado con éxito. MessageId:", info.messageId);
    } catch (error) {
      console.error("Error al enviar el email con Nodemailer:", error);
    }

    return null;
  });