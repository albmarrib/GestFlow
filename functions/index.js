const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

admin.initializeApp();

exports.enviarNotificacionExpediente = functions
    .firestore
    .document("expedientes/{expedienteId}")
    .onWrite(async (change, context) => {

        const TENANT_ID = process.env.MICROSOFT_TENANT_ID;
        const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
        const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
        const SENDER_EMAIL = process.env.NOTIFICATION_SENDER_EMAIL || "";

        const datosNuevos = change.after.exists ? change.after.data() : null;
        const datosViejos = change.before.exists ? change.before.data() : null;

        if (!datosNuevos || !datosViejos) return null; 

        // 1. Evaluar cambios relevantes en el expediente
        const cambioType = datosNuevos.type !== datosViejos.type;
        const cambioDept = datosNuevos.department !== datosViejos.department;
        const cambioStatus = datosNuevos.status !== datosViejos.status;
        const cambioDueDate = datosNuevos.dueDate !== datosViejos.dueDate;
        const cambioCliente = datosNuevos.client !== datosViejos.client;
        const cambioActivity = JSON.stringify(datosNuevos.updates || []) !== JSON.stringify(datosViejos.updates || []);
        const cambioGtd = JSON.stringify(datosNuevos.actions || []) !== JSON.stringify(datosViejos.actions || []);

        if (!cambioType && !cambioDept && !cambioStatus && !cambioDueDate && !cambioCliente && !cambioActivity && !cambioGtd) {
            return null;
        }

        // 2. Destinatarios asignados
        const asignados = Array.isArray(datosNuevos.assignees) ? datosNuevos.assignees : [];
        const autorDelCambio = datosNuevos.updatedBy || "";

        const destinatariosFinales = asignados.filter(email => email && email.toLowerCase() !== autorDelCambio.toLowerCase());

        if (destinatariosFinales.length === 0) {
            return null;
        }

        if (!TENANT_ID || !CLIENT_ID || !CLIENT_SECRET || !SENDER_EMAIL) {
            console.log("Notificaciones desactivadas: faltan credenciales de correo.");
            return null;
        }

        console.log(`Enviando notificación de expediente a: ${destinatariosFinales.join(', ')}`);

        // 3. Envío vía Microsoft Graph
        try {
            const params = new URLSearchParams();
            params.append('client_id', CLIENT_ID);
            params.append('scope', 'https://graph.microsoft.com/.default');
            params.append('client_secret', CLIENT_SECRET);
            params.append('grant_type', 'client_credentials');

            const tokenRes = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
                method: 'POST', body: params
            });
            const tokenData = await tokenRes.json();

            const toRecipientsGraph = destinatariosFinales.map(email => ({
                emailAddress: { address: email }
            }));

            await fetch(`https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: {
                        subject: `Gestoría: Actualización en expediente "${datosNuevos.title || 'Sin título'}"`,
                        body: {
                            contentType: "Text",
                            content: `Hola,\n\nSe ha actualizado un expediente o trámite asignado a tu gestión:\n\nExpediente: ${datosNuevos.title || 'Sin título'}\nCliente: ${datosNuevos.client || 'No especificado'}\nÁrea: ${datosNuevos.department || '-'}\nEstado: ${datosNuevos.status || '-'}\nVencimiento: ${datosNuevos.dueDate || 'Sin fecha'}\n\nModificado por: ${autorDelCambio}\n\nAccede al gestor de la asesoría para consultar los detalles.`
                        },
                        toRecipients: toRecipientsGraph
                    }
                })
            });
            
            console.log("Email de notificación enviado con éxito.");
        } catch (error) {
            console.error("Error al enviar el email:", error);
        }
        return null;
    });