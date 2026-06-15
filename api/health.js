export default function handler(request, response) {
  if (request.method !== "GET") {
    return response.status(405).json({ error: "Método não permitido." });
  }

  return response.status(200).json({
    status: "ok",
    service: "sistema-medicao",
    version: "2.0.0",
    timestamp: new Date().toISOString()
  });
}
