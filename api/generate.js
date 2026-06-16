// /pages/api/generate.js ou correspondente em App Router
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "50mb", // Aumentado de 4mb para 50mb devido ao peso das fotos em Base64
    },
  },
};
import { normalizePayload, parseRequestBody } from "./lib/data.js";
import { emailIsConfigured, sendReportEmail } from "./lib/email.js";
import { generateReport } from "./lib/reports.js";

export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Método não permitido." });
  }

  try {
    const payload = normalizePayload(parseRequestBody(request.body));
    const report = await generateReport(payload);
    let emailSent = false;

    if (emailIsConfigured()) {
      try {
        emailSent = await sendReportEmail({
          ...report,
          metadata: payload.metadata
        });
      } catch (error) {
        console.error("Falha ao enviar relatório por e-mail.", error);
      }
    }

    const recipient =
      process.env.REPORT_RECIPIENT ||
      process.env.EMAIL_RECIPIENT ||
      "comercial1@primecsg.com.br";
    response.setHeader("Content-Type", report.contentType);
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${report.filename}"`
    );
    response.setHeader(
      "X-Report-Email",
      emailSent ? "sent" : emailIsConfigured() ? "failed" : "not-configured"
    );
    response.setHeader("X-Report-Recipient", recipient);
    return response.status(200).send(report.buffer);
  } catch (error) {
    console.error("Falha ao gerar relatório.", error);
    return response.status(400).json({
      error: error instanceof Error ? error.message : "Falha ao gerar o relatório."
    });
  }
}
