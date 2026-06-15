import ExcelJS from "exceljs";
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType
} from "docx";
import PptxGenJS from "pptxgenjs";
import {
  formatActivityDates,
  formatDate,
  imageFromDataUrl,
  reportFilename
} from "./data.js";

const COLORS = {
  navy: "16242B",
  green: "1D6658",
  greenSoft: "EAF6F2",
  blue: "1675A9",
  blueSoft: "E6F0F7",
  amber: "C58A24",
  amberSoft: "FFF4D8",
  line: "D7DEE7",
  text: "263740",
  muted: "667286",
  white: "FFFFFF"
};

export async function generateReport(payload) {
  if (payload.format === "word") return generateWord(payload);
  if (payload.format === "presentation") return generatePresentation(payload);
  return generateExcel(payload);
}

async function generateExcel({ metadata, activities }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Medição Pro";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Relatório Fotográfico", {
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      margins: {
        left: 0.3,
        right: 0.3,
        top: 0.4,
        bottom: 0.4,
        header: 0.2,
        footer: 0.2
      }
    }
  });

  sheet.columns = Array.from({ length: 12 }, () => ({ width: 12 }));
  sheet.mergeCells("A1:L2");
  styleTitle(sheet.getCell("A1"), "RELATÓRIO DE MEDIÇÃO FOTOGRÁFICA");
  sheet.getRow(1).height = 28;
  sheet.getRow(2).height = 12;

  addMetadataCell(sheet, "A4:C4", "Competência", metadata.competencia);
  addMetadataCell(
    sheet,
    "D4:F4",
    "Ordem de serviço",
    metadata.ordemServico || "Não informada"
  );
  addMetadataCell(sheet, "G4:I4", "Contratada", metadata.contratada);
  addMetadataCell(
    sheet,
    "J4:L4",
    "Tipo de manutenção",
    metadata.tipoManutencao
  );
  sheet.getRow(4).height = 42;

  let row = 6;
  activities.forEach((activity, index) => {
    sheet.mergeCells(`A${row}:L${row}`);
    const heading = sheet.getCell(`A${row}`);
    heading.value = `ATIVIDADE ${String(index + 1).padStart(2, "0")} - ${
      activity.atividade
    }`;
    heading.font = { bold: true, size: 11, color: { argb: COLORS.text } };
    heading.fill = fill(COLORS.blueSoft);
    heading.alignment = { vertical: "middle", wrapText: true };
    heading.border = border();
    sheet.getRow(row).height = 30;
    row += 1;

    sheet.mergeCells(`A${row}:D${row}`);
    sheet.mergeCells(`E${row}:H${row}`);
    sheet.mergeCells(`I${row}:L${row}`);
    setInfoCell(
      sheet.getCell(`A${row}`),
      "Responsável",
      activity.responsavel || "Não informado"
    );
    setInfoCell(
      sheet.getCell(`E${row}`),
      "Data",
      formatActivityDates(activity)
    );
    setInfoCell(
      sheet.getCell(`I${row}`),
      "Situação",
      activity.status === "em-espera" ? "Em espera" : "Concluída",
      activity.status === "em-espera" ? COLORS.amberSoft : COLORS.greenSoft
    );
    sheet.getRow(row).height = 32;
    row += 2;

    sheet.mergeCells(`A${row}:F${row}`);
    sheet.mergeCells(`G${row}:L${row}`);
    setPhotoLabel(sheet.getCell(`A${row}`), "FOTO DE ENTRADA");
    setPhotoLabel(sheet.getCell(`G${row}`), "FOTO DE SAÍDA");
    row += 1;

    const photoStart = row;
    const photoEnd = row + 7;
    preparePhotoArea(sheet, `A${photoStart}:F${photoEnd}`);
    preparePhotoArea(sheet, `G${photoStart}:L${photoEnd}`);
    addExcelImage(workbook, sheet, activity.fotoAntes, {
      tl: { col: 0.15, row: photoStart - 0.85 },
      ext: { width: 430, height: 210 }
    });
    addExcelImage(workbook, sheet, activity.fotoDepois, {
      tl: { col: 6.15, row: photoStart - 0.85 },
      ext: { width: 430, height: 210 }
    });
    for (let current = photoStart; current <= photoEnd; current += 1) {
      sheet.getRow(current).height = 22;
    }
    row = photoEnd + 1;

    sheet.mergeCells(`A${row}:L${row + 1}`);
    const conclusion = sheet.getCell(`A${row}`);
    conclusion.value = `Conclusão: ${
      activity.conclusao || "Não informada"
    }`;
    conclusion.font = { size: 10, color: { argb: COLORS.text } };
    conclusion.alignment = { vertical: "top", wrapText: true };
    conclusion.fill = fill(COLORS.greenSoft);
    conclusion.border = border();
    row += 2;

    if (activity.status === "em-espera") {
      sheet.mergeCells(`A${row}:L${row}`);
      const reason = sheet.getCell(`A${row}`);
      reason.value = `Motivo da espera: ${activity.motivo || "Não informado"}`;
      reason.font = { bold: true, size: 10, color: { argb: "6F4A0C" } };
      reason.fill = fill(COLORS.amberSoft);
      reason.alignment = { vertical: "middle", wrapText: true };
      reason.border = border();
      sheet.getRow(row).height = 28;
      row += 1;
    }
    row += 2;
  });

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return {
    buffer,
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename: reportFilename(metadata, "xlsx")
  };
}

async function generateWord({ metadata, activities }) {
  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 260 },
      children: [
        new TextRun({
          text: "RELATÓRIO DE MEDIÇÃO FOTOGRÁFICA",
          bold: true,
          size: 32,
          color: COLORS.navy
        })
      ]
    }),
    metadataTable(metadata)
  ];

  activities.forEach((activity, index) => {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 360, after: 120 },
        children: [
          new TextRun({
            text: `Atividade ${String(index + 1).padStart(2, "0")} - ${
              activity.atividade
            }`,
            bold: true,
            color: COLORS.navy
          })
        ]
      }),
      infoParagraph(
        `Responsável: ${activity.responsavel || "Não informado"} | Data: ${formatActivityDates(
          activity
        )} | Situação: ${
          activity.status === "em-espera" ? "Em espera" : "Concluída"
        }`
      ),
      photoTable(activity),
      labelledParagraph(
        "Conclusão",
        activity.conclusao || "Não informada",
        COLORS.green
      )
    );
    if (activity.status === "em-espera") {
      children.push(
        labelledParagraph(
          "Motivo da espera",
          activity.motivo || "Não informado",
          COLORS.amber
        )
      );
    }
  });

  const document = new Document({
    creator: "Medição Pro",
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 }
          }
        },
        children
      }
    ]
  });
  return {
    buffer: await Packer.toBuffer(document),
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    filename: reportFilename(metadata, "docx")
  };
}

async function generatePresentation({ metadata, activities }) {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Medição Pro";
  pptx.company = metadata.contratada;
  pptx.subject = "Relatório de medição fotográfica";
  pptx.title = `Relatório ${metadata.competencia}`;
  pptx.lang = "pt-BR";
  pptx.theme = {
    headFontFace: "Aptos Display",
    bodyFontFace: "Aptos",
    lang: "pt-BR"
  };

  const cover = pptx.addSlide();
  cover.background = { color: "F3F7F8" };
  cover.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 1.25,
    fill: { color: COLORS.navy },
    line: { color: COLORS.navy }
  });
  cover.addText("MEDIÇÃO PRO", {
    x: 0.65,
    y: 0.38,
    w: 3,
    h: 0.35,
    fontSize: 12,
    bold: true,
    color: COLORS.white,
    charSpacing: 2
  });
  cover.addText("Relatório de medição fotográfica", {
    x: 0.75,
    y: 2.05,
    w: 8.8,
    h: 0.7,
    fontSize: 28,
    bold: true,
    color: COLORS.navy,
    margin: 0
  });
  cover.addText(metadata.competencia, {
    x: 0.78,
    y: 2.88,
    w: 5.2,
    h: 0.45,
    fontSize: 17,
    color: COLORS.green,
    margin: 0
  });
  cover.addText(
    [
      { text: "Ordem de serviço\n", options: { bold: true } },
      { text: metadata.ordemServico || "Não informada" },
      { text: "\n\nContratada\n", options: { bold: true } },
      { text: metadata.contratada },
      { text: "\n\nTipo de manutenção\n", options: { bold: true } },
      { text: metadata.tipoManutencao }
    ],
    {
      x: 0.8,
      y: 3.65,
      w: 5.5,
      h: 2.2,
      fontSize: 12,
      color: COLORS.text,
      breakLine: false,
      margin: 0
    }
  );
  cover.addShape(pptx.ShapeType.roundRect, {
    x: 8.65,
    y: 2.05,
    w: 3.45,
    h: 3.45,
    rectRadius: 0.08,
    fill: { color: COLORS.green },
    line: { color: COLORS.green }
  });
  cover.addText(String(activities.length).padStart(2, "0"), {
    x: 9.25,
    y: 2.75,
    w: 2.25,
    h: 1,
    align: "center",
    fontSize: 46,
    bold: true,
    color: COLORS.white,
    margin: 0
  });
  cover.addText("ATIVIDADES\nREGISTRADAS", {
    x: 9.1,
    y: 3.85,
    w: 2.55,
    h: 0.8,
    align: "center",
    fontSize: 11,
    bold: true,
    color: COLORS.white,
    charSpacing: 1.2,
    margin: 0
  });

  activities.forEach((activity, index) => {
    const slide = pptx.addSlide();
    slide.background = { color: "F7F9FB" };
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 13.333,
      h: 0.72,
      fill: { color: COLORS.navy },
      line: { color: COLORS.navy }
    });
    slide.addText(`ATIVIDADE ${String(index + 1).padStart(2, "0")}`, {
      x: 0.55,
      y: 0.2,
      w: 2,
      h: 0.25,
      fontSize: 10,
      bold: true,
      color: COLORS.white,
      charSpacing: 1.4,
      margin: 0
    });
    slide.addText(activity.atividade, {
      x: 0.55,
      y: 0.95,
      w: 8.8,
      h: 0.55,
      fontSize: 21,
      bold: true,
      color: COLORS.navy,
      margin: 0,
      fit: "shrink"
    });
    slide.addText(
      `${activity.responsavel || "Responsável não informado"}  |  ${formatActivityDates(
        activity
      )}`,
      {
        x: 0.57,
        y: 1.55,
        w: 7.2,
        h: 0.3,
        fontSize: 10,
        color: COLORS.muted,
        margin: 0
      }
    );
    slide.addText(
      activity.status === "em-espera" ? "EM ESPERA" : "CONCLUÍDA",
      {
        x: 10.55,
        y: 1.04,
        w: 1.75,
        h: 0.42,
        align: "center",
        valign: "mid",
        fontSize: 9,
        bold: true,
        color:
          activity.status === "em-espera" ? "6F4A0C" : COLORS.green,
        fill: {
          color:
            activity.status === "em-espera"
              ? COLORS.amberSoft
              : COLORS.greenSoft
        },
        line: {
          color:
            activity.status === "em-espera" ? "E6C77E" : "A9CFC3"
        },
        margin: 0.04
      }
    );

    addSlidePhoto(
      slide,
      pptx,
      activity.fotoAntes,
      "FOTO DE ENTRADA",
      0.55,
      2.05
    );
    addSlidePhoto(
      slide,
      pptx,
      activity.fotoDepois,
      "FOTO DE SAÍDA",
      6.75,
      2.05
    );

    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.55,
      y: 5.78,
      w: 12.2,
      h: activity.status === "em-espera" ? 1.05 : 0.78,
      rectRadius: 0.05,
      fill: { color: COLORS.greenSoft },
      line: { color: "C9DDD7" }
    });
    slide.addText(
      [
        { text: "Conclusão: ", options: { bold: true, color: COLORS.green } },
        { text: activity.conclusao || "Não informada" }
      ],
      {
        x: 0.78,
        y: 5.96,
        w: 11.7,
        h: 0.4,
        fontSize: 10,
        color: COLORS.text,
        margin: 0,
        fit: "shrink"
      }
    );
    if (activity.status === "em-espera") {
      slide.addText(
        [
          {
            text: "Motivo da espera: ",
            options: { bold: true, color: COLORS.amber }
          },
          { text: activity.motivo || "Não informado" }
        ],
        {
          x: 0.78,
          y: 6.38,
          w: 11.7,
          h: 0.3,
          fontSize: 9,
          color: "6F4A0C",
          margin: 0,
          fit: "shrink"
        }
      );
    }
  });

  const output = await pptx.write({ outputType: "nodebuffer" });
  return {
    buffer: Buffer.from(output),
    contentType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    filename: reportFilename(metadata, "pptx")
  };
}

function styleTitle(cell, value) {
  cell.value = value;
  cell.font = { bold: true, size: 17, color: { argb: COLORS.white } };
  cell.fill = fill(COLORS.navy);
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = border(COLORS.navy);
}

function addMetadataCell(sheet, range, label, value) {
  sheet.mergeCells(range);
  const cell = sheet.getCell(range.split(":")[0]);
  cell.value = {
    richText: [
      { text: `${label}\n`, font: { bold: true, size: 9, color: { argb: COLORS.muted } } },
      { text: value, font: { bold: true, size: 10, color: { argb: COLORS.text } } }
    ]
  };
  cell.alignment = { vertical: "middle", wrapText: true };
  cell.fill = fill("F7F9FB");
  cell.border = border();
}

function setInfoCell(cell, label, value, fillColor = "F7F9FB") {
  cell.value = `${label}: ${value}`;
  cell.font = { size: 9, color: { argb: COLORS.text } };
  cell.fill = fill(fillColor);
  cell.border = border();
  cell.alignment = { vertical: "middle", wrapText: true };
}

function setPhotoLabel(cell, label) {
  cell.value = label;
  cell.font = { bold: true, size: 9, color: { argb: COLORS.muted } };
  cell.fill = fill("F7F9FB");
  cell.border = border();
  cell.alignment = { horizontal: "center", vertical: "middle" };
}

function preparePhotoArea(sheet, range) {
  sheet.mergeCells(range);
  const cell = sheet.getCell(range.split(":")[0]);
  cell.value = "Imagem não informada";
  cell.font = { italic: true, size: 9, color: { argb: COLORS.muted } };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.fill = fill("F3F6F8");
  cell.border = border();
}

function addExcelImage(workbook, sheet, dataUrl, placement) {
  const image = imageFromDataUrl(dataUrl);
  if (!image) return;
  const imageId = workbook.addImage({
    buffer: image.buffer,
    extension: image.extension
  });
  sheet.addImage(imageId, placement);
}

function metadataTable(metadata) {
  const items = [
    ["Competência", metadata.competencia],
    ["Ordem de serviço", metadata.ordemServico || "Não informada"],
    ["Contratada", metadata.contratada],
    ["Tipo de manutenção", metadata.tipoManutencao]
  ];
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: items.map(
      ([label, value]) =>
        new TableRow({
          children: [
            wordCell(label, true, 28),
            wordCell(value, false, 72)
          ]
        })
    )
  });
}

function photoTable(activity) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          photoWordCell("FOTO DE ENTRADA", activity.fotoAntes),
          photoWordCell("FOTO DE SAÍDA", activity.fotoDepois)
        ]
      })
    ]
  });
}

function photoWordCell(label, dataUrl) {
  const image = imageFromDataUrl(dataUrl);
  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
      children: [new TextRun({ text: label, bold: true, size: 18, color: COLORS.muted })]
    })
  ];
  children.push(
    image
      ? new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: image.buffer,
              type: image.extension === "jpeg" ? "jpg" : "png",
              transformation: { width: 280, height: 140 }
            })
          ]
        })
      : new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: "Imagem não informada",
              italics: true,
              color: COLORS.muted
            })
          ]
        })
  );
  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    margins: { top: 120, right: 120, bottom: 120, left: 120 },
    borders: wordBorders(),
    children
  });
}

function wordCell(text, bold, width) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    margins: { top: 100, right: 100, bottom: 100, left: 100 },
    borders: wordBorders(),
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold,
            size: 19,
            color: bold ? COLORS.muted : COLORS.text
          })
        ]
      })
    ]
  });
}

function infoParagraph(text) {
  return new Paragraph({
    spacing: { after: 140 },
    children: [new TextRun({ text, size: 19, color: COLORS.muted })]
  });
}

function labelledParagraph(label, value, color) {
  return new Paragraph({
    spacing: { before: 160, after: 100 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, color }),
      new TextRun({ text: value, color: COLORS.text })
    ]
  });
}

function addSlidePhoto(slide, pptx, dataUrl, label, x, y) {
  slide.addText(label, {
    x,
    y,
    w: 5.75,
    h: 0.28,
    align: "center",
    fontSize: 9,
    bold: true,
    color: COLORS.muted,
    margin: 0
  });
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y: y + 0.35,
    w: 5.75,
    h: 3,
    rectRadius: 0.04,
    fill: { color: "EDF2F5" },
    line: { color: COLORS.line, width: 1 }
  });
  if (dataUrl) {
    slide.addImage({
      data: dataUrl,
      x: x + 0.08,
      y: y + 0.43,
      w: 5.59,
      h: 2.84,
      transparency: 0
    });
  } else {
    slide.addText("Imagem não informada", {
      x,
      y: y + 1.63,
      w: 5.75,
      h: 0.3,
      align: "center",
      fontSize: 10,
      italic: true,
      color: COLORS.muted,
      margin: 0
    });
  }
}

function fill(color) {
  return { type: "pattern", pattern: "solid", fgColor: { argb: color } };
}

function border(color = COLORS.line) {
  return {
    top: { style: "thin", color: { argb: color } },
    left: { style: "thin", color: { argb: color } },
    bottom: { style: "thin", color: { argb: color } },
    right: { style: "thin", color: { argb: color } }
  };
}

function wordBorders() {
  const edge = { style: BorderStyle.SINGLE, size: 1, color: COLORS.line };
  return { top: edge, left: edge, bottom: edge, right: edge };
}
