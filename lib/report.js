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
  if (
    activities.some(
      (activity) =>
        activity.atividade &&
        activity.status === "em-espera" &&
        !activity.motivo
    )
  ) {
    throw new Error("Informe o motivo das atividades que estão em espera.");
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
    competencia: clean(metadata.competencia, 80),
    ordemServico: clean(metadata.ordemServico || metadata.ordemCompra, 80),
    contratada: clean(metadata.contratada, 160),
    tipoManutencao: clean(metadata.tipoManutencao || metadata.escopo, 80)
  };
}

function normalizeActivities(activities = []) {
  return Array.from({ length: MAX_ACTIVITIES }, (_, index) => {
    const activity = activities[index] || {};
    return {
      dataAntes: clean(activity.dataAntes, 20),
      dataDepois: clean(activity.dataDepois, 20),
      responsavel: clean(activity.responsavel, 120),
      atividade: clean(activity.atividade, 1000),
      status: activity.status === "em-espera" ? "em-espera" : "concluida",
      motivo: clean(activity.motivo, 500),
      fotoAntes: clean(activity.fotoAntes, 2_000_000),
      fotoDepois: clean(activity.fotoDepois, 2_000_000)
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
  try {
    if (!dataUrl || !dataUrl.includes(",")) return;
    const [header, base64] = dataUrl.split(",", 2);
    if (!/^data:image\/(?:jpeg|jpg|png);base64$/i.test(header)) return;
    if (!base64 || base64.length % 4 !== 0) return;
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return;

    const buffer = Buffer.from(base64, "base64");
    if (!buffer.length || buffer.length > 1_500_000) return;

    const extension = header.toLowerCase().includes("png") ? "png" : "jpeg";
    const imageId = workbook.addImage({ buffer, extension });
    worksheet.addImage(imageId, range);
  } catch (error) {
    console.warn("Imagem ignorada durante a geração do relatório.", error);
  }
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

function clean(value, maxLength = 1000) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function safeFilename(value) {
  return value.replace(/[\\/:*?"<>|]/g, "-");
}
