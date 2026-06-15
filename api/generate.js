import { buildReport } from "../lib/report.js";

const RECIPIENT = "comercial1@primecsg.com.br";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb"
    }
  }
};

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Método não permitido." });
    return;
  }

  try {
    const report = await buildReport(request.body);
    const emailStatus = await sendReportEmail(report);

    response.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    response.setHeader("Content-Disposition", `attachment; filename="${report.filename}"`);
    response.setHeader("X-Report-Email", emailStatus);
    response.status(200).send(report.buffer);
  } catch (error) {
    console.error(error);
    response.status(400).json({ error: error.message || "Falha ao gerar o relatório." });
  }
}

async function sendReportEmail(report) {
  if (!process.env.RESEND_API_KEY) return "not-configured";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: process.env.REPORT_FROM_EMAIL || "Sistema de Medição <onboarding@resend.dev>",
      to: [RECIPIENT],
      subject: `Relatório fotográfico - ${report.metadata.competencia}`,
      html: `
        <h2>Relatório fotográfico de manutenção</h2>
        <p><strong>Competência:</strong> ${escapeHtml(report.metadata.competencia)}</p>
        <p><strong>Ordem de serviço:</strong> ${escapeHtml(report.metadata.ordemServico || "Não informada")}</p>
        <p><strong>Tipo de manutenção:</strong> ${escapeHtml(report.metadata.tipoManutencao || "Não informado")}</p>
        <p>O arquivo Excel está anexado a esta mensagem.</p>
      `,
      attachments: [
        {
          filename: report.filename,
          content: report.buffer.toString("base64")
        }
      ]
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error("Falha ao enviar e-mail:", detail);
    return "failed";
  }

  return "sent";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
