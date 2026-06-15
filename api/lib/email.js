import nodemailer from "nodemailer";

export function emailIsConfigured() {
  return Boolean(
    process.env.EMAIL_HOST &&
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASSWORD
  );
}

export async function sendReportEmail({
  buffer,
  contentType,
  filename,
  metadata
}) {
  if (!emailIsConfigured()) return false;

  const recipient =
    process.env.REPORT_RECIPIENT ||
    process.env.EMAIL_RECIPIENT ||
    "comercial1@primecsg.com.br";
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "Medição Pro <onboarding@resend.dev>",
    to: recipient,
    subject: `Relatório fotográfico - ${metadata.competencia}`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#334155;line-height:1.6">
        <h2 style="color:#0f172a">Relatório fotográfico processado</h2>
        <p>O relatório referente à competência <strong>${escapeHtml(
          metadata.competencia
        )}</strong> foi gerado com sucesso.</p>
        <p>Tipo de manutenção: <strong>${escapeHtml(
          metadata.tipoManutencao
        )}</strong></p>
      </div>
    `,
    attachments: [{ filename, content: buffer, contentType }]
  });

  return true;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
