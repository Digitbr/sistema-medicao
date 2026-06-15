export function parseRequestBody(body) {
  if (typeof body === "string") return JSON.parse(body);
  return body || {};
}

export function normalizePayload(payload) {
  const metadata = {
    competencia: clean(payload?.metadata?.competencia),
    ordemServico: clean(payload?.metadata?.ordemServico),
    contratada: clean(payload?.metadata?.contratada),
    tipoManutencao: clean(payload?.metadata?.tipoManutencao)
  };
  const activities = Array.isArray(payload?.activities)
    ? payload.activities.map(normalizeActivity).filter((item) => item.atividade)
    : [];
  const format = ["excel", "word", "presentation"].includes(payload?.format)
    ? payload.format
    : "excel";

  if (!metadata.competencia || !metadata.contratada || !metadata.tipoManutencao) {
    throw new Error(
      "Competência, contratada e tipo de manutenção são obrigatórios."
    );
  }
  if (!activities.length) {
    throw new Error("Cadastre ao menos uma atividade para gerar o relatório.");
  }

  return { metadata, activities, format };
}

export function normalizeActivity(activity = {}) {
  const status = activity.status === "em-espera" ? "em-espera" : "concluida";
  const legacyConclusion =
    status === "concluida" && !activity.conclusao ? activity.motivo : "";

  return {
    atividade: clean(activity.atividade || activity.problema),
    responsavel: clean(activity.responsavel),
    conclusao: clean(activity.conclusao || legacyConclusion),
    motivo: status === "em-espera" ? clean(activity.motivo) : "",
    status,
    dataAntes: clean(activity.dataAntes),
    dataDepois: clean(activity.dataDepois),
    fotoAntes: validImageDataUrl(activity.fotoAntes),
    fotoDepois: validImageDataUrl(activity.fotoDepois)
  };
}

export function validImageDataUrl(value) {
  const dataUrl = typeof value === "string" ? value : "";
  return /^data:image\/(?:png|jpe?g);base64,/i.test(dataUrl) ? dataUrl : "";
}

export function imageFromDataUrl(dataUrl) {
  const match = String(dataUrl).match(
    /^data:image\/(png|jpe?g);base64,([a-z0-9+/=\s]+)$/i
  );
  if (!match) return null;
  const extension = match[1].toLowerCase() === "png" ? "png" : "jpeg";
  return {
    buffer: Buffer.from(match[2].replace(/\s/g, ""), "base64"),
    extension,
    mimeType: extension === "png" ? "image/png" : "image/jpeg"
  };
}

export function formatDate(value) {
  if (!value) return "Não informada";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export function formatActivityDates(activity) {
  const before = formatDate(activity.dataAntes);
  const after = formatDate(activity.dataDepois);
  return before === after ? before : `${before} a ${after}`;
}

export function reportFilename(metadata, extension) {
  const reference = metadata.ordemServico || metadata.competencia;
  const safeReference = reference
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "");
  return `Relatorio_Fotografico_${safeReference || "Medicao"}.${extension}`;
}

function clean(value) {
  return String(value || "").trim();
}
