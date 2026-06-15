import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_PATH = path.join(__dirname, "..", "templates", "relatorio-template.xlsx");
const MAX_ACTIVITIES = 8;

export async function buildReport(payload) {
  const metadata = normalizeMetadata(payload?.metadata);
  const activities = normalizeActivities(payload?.activities);

  if (!metadata.competencia) throw new Error("Informe a competência.");
  if (!metadata.contratada) throw new Error("Informe a contratada.");
  if (!activities.some((activity) => activity.atividade)) {
    throw new Error("Cadastre ao menos uma atividade executada.");
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await fs.readFile(TEMPLATE_PATH));
  const worksheet = workbook.worksheets[0];

  worksheet.getCell("A3").value = "N° Ordem de serviço";
  worksheet.getCell("B2").value = metadata.competencia.toUpperCase();
  worksheet.getCell("E2").value = metadata.contratada.toUpperCase();
  worksheet.getCell("B3").value = metadata.ordemServico;
  worksheet.getCell("D3").value = "TIPO DE MANUTENÇÃO";
  worksheet.getCell("E3").value = metadata.tipoManutencao;

  clearActivityImages(worksheet);

  for (let index = 0; index < MAX_ACTIVITIES; index += 1) {
    const activity = activities[index] || emptyActivity();
    const baseRow = 6 + index * 20;
    worksheet.getCell(`A${baseRow + 17}`).value = formatDateLabel(activity.dataAntes);
    worksheet.getCell(`G${baseRow + 17}`).value = formatDateLabel(activity.dataDepois);
    worksheet.getCell(`A${baseRow + 18}`).value = activityDescription(activity);

    addPhoto(workbook, worksheet, activity.fotoAntes, `A${baseRow + 1}:E${baseRow + 15}`);
    addPhoto(workbook, worksheet, activity.fotoDepois, `G${baseRow + 1}:L${baseRow + 15}`);
  }

  const filename = safeFilename(`Relatorio Fotografico - ${metadata.competencia}.xlsx`);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return { buffer, filename, metadata, activities };
}

function normalizeMetadata(metadata = {}) {
  return {
    competencia: clean(metadata.competencia),
    ordemServico: clean(metadata.ordemServico || metadata.ordemCompra),
    contratada: clean(metadata.contratada),
    tipoManutencao: clean(metadata.tipoManutencao || metadata.escopo)
  };
}

function normalizeActivities(activities = []) {
  return Array.from({ length: MAX_ACTIVITIES }, (_, index) => {
    const activity = activities[index] || {};
    return {
      dataAntes: clean(activity.dataAntes),
      dataDepois: clean(activity.dataDepois),
      responsavel: clean(activity.responsavel),
      atividade: clean(activity.atividade),
      status: activity.status === "em-espera" ? "em-espera" : "concluida",
      motivo: clean(activity.motivo),
      fotoAntes: clean(activity.fotoAntes),
      fotoDepois: clean(activity.fotoDepois)
    };
  });
}

function emptyActivity() {
  return {
    dataAntes: "",
    dataDepois: "",
    responsavel: "",
    atividade: "",
    status: "concluida",
    motivo: "",
    fotoAntes: "",
    fotoDepois: ""
  };
}

function activityDescription(activity) {
  if (!activity.atividade) return "ATIVIDADE EXECUTADA:";
  const date = compactDate(activity.dataAntes);
  const responsible = activity.responsavel ? `${activity.responsavel} - ` : "";
  const status = activity.status === "em-espera" ? "EM ESPERA" : "CONCLUÍDA";
  const reason = activity.motivo ? ` | MOTIVO: ${activity.motivo}` : "";
  return `ATIVIDADE EXECUTADA: ${date}${responsible}${activity.atividade} | STATUS: ${status}${reason}`;
}

function addPhoto(workbook, worksheet, dataUrl, range) {
  if (!dataUrl || !dataUrl.includes(",")) return;
  const [header, base64] = dataUrl.split(",", 2);
  const extension = header.includes("png") ? "png" : "jpeg";
  const imageId = workbook.addImage({ base64, extension });
  worksheet.addImage(imageId, range);
}

function clearActivityImages(worksheet) {
  const existingImages = worksheet.getImages();
  for (const image of existingImages) {
    const top = image.range?.tl?.nativeRow ?? -1;
    if (top >= 5) worksheet._media = worksheet._media.filter((item) => item !== image);
  }
}

function formatDateLabel(value) {
  return value ? `DATA: ${formatDate(value)}` : "DATA:";
}

function formatDate(value) {
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function compactDate(value) {
  if (!value) return "";
  const [, month, day] = String(value).slice(0, 10).split("-");
  return day && month ? `${day}-${month} ` : "";
}

function clean(value) {
  return String(value ?? "").trim();
}

function safeFilename(value) {
  return value.replace(/[\\/:*?"<>|]/g, "-");
}
