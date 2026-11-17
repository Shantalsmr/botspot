import "server-only";

/**
 * Envio de correos con Resend (API REST, sin dependencias).
 * Variables: RESEND_API_KEY y EMAIL_FROM (p. ej. "The Bot Spot <bookings@thebotspot.org>").
 * El dominio del remitente debe estar verificado en Resend (registros DNS).
 * Si no estan configuradas, no se envia nada y se avisa en el log (el sitio sigue funcionando).
 */

export const OWNER_EMAIL = "info@thebotspot.org";

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  /** Texto plano: se convierte a HTML simple. */
  text: string;
  replyTo?: string;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function toHtml(text: string): string {
  const linked = escapeHtml(text).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1">$1</a>');
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#111">${linked.replace(/\n/g, "<br>")}</div>`;
}

/** Envia un correo. Devuelve false si no se pudo (nunca lanza error). */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn("[email] RESEND_API_KEY / EMAIL_FROM no configurados; no se envio:", msg.subject);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: Array.isArray(msg.to) ? msg.to : [msg.to],
        subject: msg.subject,
        text: msg.text,
        html: toHtml(msg.text),
        reply_to: msg.replyTo,
      }),
    });
    if (!res.ok) {
      console.error("[email] Resend respondio", res.status, await res.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error("[email] error al enviar", error);
    return false;
  }
}
