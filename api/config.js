export default function handler(request, response) {
  if (request.method !== "GET") {
    return response.status(405).json({ error: "Método não permitido." });
  }

  const recipient =
    process.env.REPORT_RECIPIENT ||
    process.env.EMAIL_RECIPIENT ||
    "comercial1@primecsg.com.br";

  return response.status(200).json({
    recipient,
    emailConfigured: Boolean(
      process.env.EMAIL_HOST &&
        process.env.EMAIL_USER &&
        process.env.EMAIL_PASSWORD
    )
  });
}
