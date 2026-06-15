const DB_NAME = "sistema-medicao-db";
const DB_VERSION = 1;
const RECORD_STORE = "records";
const DEFAULT_CONTRACTOR = "FLASH LOCAÇÃO DE MÃO DE OBRA";

const activityContainer = document.querySelector("#activities");
const activityTemplate = document.querySelector("#activity-template");
const reportForm = document.querySelector("#report-form");
const generateButton = document.querySelector("#generate-button");
const saveRecordButton = document.querySelector("#save-record-button");
const resetRecordButton = document.querySelector("#reset-record-button");
const formStatus = document.querySelector("#form-status");
const activityProgress = document.querySelector("#activity-progress");
const reportPageTitle = document.querySelector("#report-page-title");
const reportPageDescription = document.querySelector("#report-page-description");
const dashboardContent = document.querySelector("#dashboard-content");
const operationsContent = document.querySelector("#operations-content");
const recordsList = document.querySelector("#records-list");
const recordSearch = document.querySelector("#record-search");
const recordTypeFilter = document.querySelector("#record-type-filter");
const recordStatusFilter = document.querySelector("#record-status-filter");
const recordSortFilter = document.querySelector("#record-sort-filter");
const recordsResultCount = document.querySelector("#records-result-count");
const clearRecordFiltersButton = document.querySelector("#clear-record-filters");
const dashboardPeriodFilter = document.querySelector("#dashboard-period-filter");
const dashboardTypeFilter = document.querySelector("#dashboard-type-filter");
const clearDashboardFiltersButton = document.querySelector("#clear-dashboard-filters");
const exportRecordsButton = document.querySelector("#export-records-button");
const importRecordsButton = document.querySelector("#import-records-button");
const recordsImportInput = document.querySelector("#records-import-input");
const reportRecipient = document.querySelector("#report-recipient");
const reportFormat = document.querySelector("#report-format");
const currentViewTitle = document.querySelector("#current-view-title");
const currentDate = document.querySelector("#current-date");
const sidebar = document.querySelector("#sidebar");
const sidebarToggle = document.querySelector("#sidebar-toggle");
const sidebarOverlay = document.querySelector("#sidebar-overlay");
const activityCards = [];

const state = {
  view: "report",
  records: [],
  editingRecordId: null,
  config: {
    recipient: "comercial1@primecsg.com.br",
    emailConfigured: false
  }
};

createActivityCards();
bindNavigation();
bindDashboardFilters();
bindRecordFilters();
bindRecordActions();
bindBackupActions();
initialize();

async function initialize() {
  currentDate.textContent = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long"
  }).format(new Date());
  [state.records, state.config] = await Promise.all([
    getAllRecords(),
    getServiceConfig()
  ]);
  reportRecipient.textContent = state.config.recipient;
  updateGenerateButton();
  renderDashboard();
  renderRecords();
  renderOperations();
  setView("report");
  refreshIcons();
}

function createActivityCards() {
  for (let index = 0; index < 8; index += 1) {
    const fragment = activityTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".activity-card");
    const header = fragment.querySelector(".activity-card__header");
    const number = fragment.querySelector(".activity-number");
    const summary = fragment.querySelector(".activity-summary");
    const meta = fragment.querySelector(".activity-meta");
    const statusBadge = fragment.querySelector(".activity-status");
    const clearButton = fragment.querySelector(".clear-activity");
    const statusButtons = [...fragment.querySelectorAll("[data-status]")];
    const fields = Object.fromEntries(
      [...fragment.querySelectorAll("[data-field]")].map((input) => [
        input.dataset.field,
        input
      ])
    );
    const photos = { fotoAntes: "", fotoDepois: "" };
    const photoPromises = { fotoAntes: Promise.resolve(), fotoDepois: Promise.resolve() };

    number.textContent = String(index + 1).padStart(2, "0");
    if (index === 0) card.classList.add("is-open");

    const updateSummary = () => {
      const hasContent = Boolean(
        fields.atividade.value.trim() ||
        fields.responsavel.value.trim() ||
        fields.dataAntes.value ||
        fields.dataDepois.value
      );
      const statusText =
        fields.status.value === "em-espera" ? "Em espera" : "Concluída";

      summary.textContent =
        fields.atividade.value.trim() ||
        fields.responsavel.value.trim() ||
        "Nova atividade";
      meta.textContent =
        fields.responsavel.value.trim() || "Sem responsável informado";
      statusBadge.textContent = hasContent ? statusText : "Pendente";
      statusBadge.className = `activity-status ${
        hasContent
          ? fields.status.value === "em-espera"
            ? "is-waiting"
            : "is-complete"
          : "is-empty"
      }`;
      updateProgress();
    };

    const setStatus = (status) => {
      fields.status.value = status;
      statusButtons.forEach((button) => {
        const active = button.dataset.status === status;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
      fields.motivo.placeholder =
        status === "em-espera"
          ? "Descreva o motivo da atividade estar em espera"
          : "Informe uma observação, se necessário";
      updateSummary();
    };

    const setPhoto = (fieldName, dataUrl) => {
      photos[fieldName] = dataUrl || "";
      const input = fields[fieldName];
      const label = input.closest(".photo-input");
      const preview = label.querySelector("img");
      input.value = "";
      if (photos[fieldName]) {
        preview.src = photos[fieldName];
        label.classList.add("has-image");
      } else {
        preview.removeAttribute("src");
        label.classList.remove("has-image");
      }
    };

    const reset = () => {
      for (const field of Object.values(fields)) {
        field.value = field.dataset.field === "status" ? "concluida" : "";
      }
      setPhoto("fotoAntes", "");
      setPhoto("fotoDepois", "");
      setStatus("concluida");
      card.classList.toggle("is-open", index === 0);
    };

    const setData = (activity = {}) => {
      fields.dataAntes.value = activity.dataAntes || "";
      fields.dataDepois.value = activity.dataDepois || "";
      fields.responsavel.value = activity.responsavel || "";
      fields.atividade.value = activity.atividade || "";
      fields.motivo.value = activity.motivo || "";
      setPhoto("fotoAntes", activity.fotoAntes || "");
      setPhoto("fotoDepois", activity.fotoDepois || "");
      setStatus(activity.status === "em-espera" ? "em-espera" : "concluida");
    };

    const getData = async () => {
      await Promise.all(Object.values(photoPromises));
      return {
        dataAntes: fields.dataAntes.value,
        dataDepois: fields.dataDepois.value,
        responsavel: fields.responsavel.value.trim(),
        atividade: fields.atividade.value.trim(),
        status: fields.status.value,
        motivo: fields.motivo.value.trim(),
        fotoAntes: photos.fotoAntes,
        fotoDepois: photos.fotoDepois
      };
    };

    header.addEventListener("click", () => {
      card.classList.toggle("is-open");
    });

    for (const field of [
      fields.dataAntes,
      fields.dataDepois,
      fields.responsavel,
      fields.atividade,
      fields.motivo
    ]) {
      field.addEventListener("input", updateSummary);
      field.addEventListener("change", updateSummary);
    }

    statusButtons.forEach((button) => {
      button.addEventListener("click", () => setStatus(button.dataset.status));
    });

    for (const fieldName of ["fotoAntes", "fotoDepois"]) {
      const photoField = fields[fieldName];
      photoField.addEventListener("change", () => {
        const file = photoField.files[0];
        if (!file) {
          setPhoto(fieldName, "");
          return;
        }
        photoPromises[fieldName] = fileToDataUrl(file)
          .then((dataUrl) => setPhoto(fieldName, dataUrl))
          .catch((error) => {
            setFormMessage(error.message, "error");
            setPhoto(fieldName, "");
          });
      });
    }

    clearButton.addEventListener("click", reset);

    activityContainer.append(fragment);
    activityCards.push({
      card,
      fields,
      getData,
      reset,
      setData,
      updateSummary
    });
  }

  updateProgress();
}

function bindNavigation() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      setView(button.dataset.view);
      setSidebarOpen(false);
    });
  });

  document.querySelectorAll("[data-go-to]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.goTo === "report") resetForm();
      setView(button.dataset.goTo);
    });
  });

  sidebarToggle.addEventListener("click", () => {
    setSidebarOpen(!document.body.classList.contains("is-sidebar-open"));
  });
  sidebarOverlay.addEventListener("click", () => setSidebarOpen(false));
}

function bindDashboardFilters() {
  dashboardPeriodFilter.addEventListener("change", renderDashboard);
  dashboardTypeFilter.addEventListener("change", renderDashboard);
  clearDashboardFiltersButton.addEventListener("click", () => {
    dashboardPeriodFilter.value = "all";
    dashboardTypeFilter.value = "all";
    renderDashboard();
  });
}

function bindRecordFilters() {
  recordSearch.addEventListener("input", renderRecords);
  recordTypeFilter.addEventListener("change", renderRecords);
  recordStatusFilter.addEventListener("change", renderRecords);
  recordSortFilter.addEventListener("change", renderRecords);
  clearRecordFiltersButton.addEventListener("click", () => {
    recordSearch.value = "";
    recordTypeFilter.value = "all";
    recordStatusFilter.value = "all";
    recordSortFilter.value = "recent";
    renderRecords();
  });
}

function bindRecordActions() {
  reportFormat.addEventListener("change", updateGenerateButton);

  saveRecordButton.addEventListener("click", async () => {
    await saveCurrentRecord();
  });

  resetRecordButton.addEventListener("click", () => {
    if (!confirm("Limpar todos os campos desta medição?")) return;
    resetForm();
  });

  recordsList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-record-action]");
    if (!button) return;
    const record = state.records.find((item) => item.id === button.dataset.recordId);
    if (!record) return;

    const action = button.dataset.recordAction;
    if (action === "edit") {
      loadRecordIntoForm(record);
      setView("report");
      return;
    }

    if (action === "delete") {
      if (!confirm(`Apagar a medição ${recordLabel(record)}?`)) return;
      await deleteRecord(record.id);
      state.records = state.records.filter((item) => item.id !== record.id);
      if (state.editingRecordId === record.id) resetForm();
      renderAllDataViews();
      return;
    }

    if (action === "export") {
      await exportSavedRecord(
        record,
        button,
        button.dataset.recordFormat || "excel"
      );
    }
  });

  const openRecordFromSummary = (event) => {
    const button = event.target.closest("[data-open-record]");
    if (!button) return;
    setView("records");
    const box = recordsList.querySelector(
      `[data-record-box="${CSS.escape(button.dataset.openRecord)}"]`
    );
    if (box) {
      box.open = true;
      box.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  dashboardContent.addEventListener("click", openRecordFromSummary);
  operationsContent.addEventListener("click", openRecordFromSummary);
}

function bindBackupActions() {
  exportRecordsButton.addEventListener("click", exportRecordsBackup);
  importRecordsButton.addEventListener("click", () => recordsImportInput.click());
  recordsImportInput.addEventListener("change", importRecordsBackup);
}

function exportRecordsBackup() {
  const payload = JSON.stringify(
    {
      format: "medicao-pro-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      records: state.records
    },
    null,
    2
  );
  const url = URL.createObjectURL(
    new Blob([payload], { type: "application/json;charset=utf-8" })
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `backup-medicoes-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function importRecordsBackup(event) {
  const file = event.target.files[0];
  event.target.value = "";
  if (!file) return;

  try {
    const payload = JSON.parse(await file.text());
    if (payload?.format !== "medicao-pro-backup" || !Array.isArray(payload.records)) {
      throw new Error("O arquivo selecionado não é um backup válido do Medição Pro.");
    }

    const validRecords = payload.records.filter(isValidBackupRecord);
    if (!validRecords.length) {
      throw new Error("O backup não contém medições válidas.");
    }
    if (
      !confirm(
        `Importar ${validRecords.length} medição(ões)? Registros com o mesmo identificador serão atualizados.`
      )
    ) {
      return;
    }

    await Promise.all(validRecords.map((record) => putRecord(record)));
    state.records = await getAllRecords();
    renderAllDataViews();
    alert(`${validRecords.length} medição(ões) importada(s) com sucesso.`);
  } catch (error) {
    alert(error.message || "Não foi possível importar o backup.");
  }
}

function isValidBackupRecord(record) {
  return Boolean(
    record &&
      typeof record.id === "string" &&
      record.metadata &&
      typeof record.metadata === "object" &&
      Array.isArray(record.activities)
  );
}

function setView(view) {
  state.view = view;
  const viewTitles = {
    dashboard: "Dashboard",
    report: state.editingRecordId ? "Editar medição" : "Nova medição",
    records: "Registros",
    operations: "Visão operacional"
  };
  currentViewTitle.textContent = viewTitles[view] || "Medição Pro";
  document.querySelectorAll("[data-view-panel]").forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.viewPanel === view);
  });
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });
  if (view === "dashboard") renderDashboard();
  if (view === "records") renderRecords();
  if (view === "operations") renderOperations();
  refreshIcons();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setSidebarOpen(open) {
  document.body.classList.toggle("is-sidebar-open", open);
  sidebarToggle.setAttribute("aria-expanded", String(open));
  sidebarToggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
  sidebar.setAttribute("aria-hidden", String(!open && window.innerWidth <= 760));
}

function resetForm() {
  reportForm.reset();
  reportForm.elements.contratada.value = DEFAULT_CONTRACTOR;
  state.editingRecordId = null;
  activityCards.forEach((activity) => activity.reset());
  reportPageTitle.textContent = "Nova medição de serviço";
  reportPageDescription.textContent =
    "Preencha os dados, registre as atividades e gere o relatório.";
  saveRecordButton.textContent = "Salvar medição";
  setFormMessage("Salve a medição ou escolha um formato para gerar o relatório.");
}

function loadRecordIntoForm(record) {
  resetForm();
  state.editingRecordId = record.id;
  reportForm.elements.competencia.value = record.metadata.competencia || "";
  reportForm.elements.ordemServico.value = record.metadata.ordemServico || "";
  reportForm.elements.contratada.value =
    record.metadata.contratada || DEFAULT_CONTRACTOR;
  reportForm.elements.tipoManutencao.value =
    record.metadata.tipoManutencao || "";
  activityCards.forEach((activity, index) => {
    activity.setData(record.activities[index]);
  });
  reportPageTitle.textContent = `Editar ${recordLabel(record)}`;
  reportPageDescription.textContent =
    "Atualize os dados e salve para manter o histórico sincronizado.";
  saveRecordButton.textContent = "Atualizar medição";
  setFormMessage(`Editando registro salvo em ${formatDateTime(record.updatedAt)}.`);
}

async function saveCurrentRecord(options = {}) {
  const record = await collectCurrentRecord();
  if (!record) return null;
  await putRecord(record);
  upsertStateRecord(record);
  state.editingRecordId = record.id;
  reportPageTitle.textContent = `Editar ${recordLabel(record)}`;
  reportPageDescription.textContent =
    "Atualize os dados e salve para manter o histórico sincronizado.";
  saveRecordButton.textContent = "Atualizar medição";
  renderAllDataViews();
  if (!options.silent) {
    setFormMessage("Medição salva nos registros.", "success");
  }
  return record;
}

async function collectCurrentRecord() {
  if (!reportForm.reportValidity()) return null;

  try {
    validateActivities();
  } catch (error) {
    setFormMessage(error.message, "error");
    return null;
  }

  saveRecordButton.disabled = true;
  generateButton.disabled = true;
  setFormMessage("Preparando fotos e salvando a medição...");

  try {
    const formData = new FormData(reportForm);
    const activities = await Promise.all(
      activityCards.map((activity) => activity.getData())
    );
    const existing = state.records.find(
      (record) => record.id === state.editingRecordId
    );
    const now = new Date().toISOString();
    return {
      id: existing?.id || crypto.randomUUID(),
      metadata: {
        competencia: String(formData.get("competencia") || "").trim(),
        ordemServico: String(formData.get("ordemServico") || "").trim(),
        contratada: String(formData.get("contratada") || "").trim(),
        tipoManutencao: String(formData.get("tipoManutencao") || "").trim()
      },
      activities,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      lastExportedAt: existing?.lastExportedAt || ""
    };
  } finally {
    saveRecordButton.disabled = false;
    generateButton.disabled = false;
  }
}

reportForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const record = await saveCurrentRecord({ silent: true });
  if (!record) return;
  await exportSavedRecord(record, generateButton, reportFormat.value);
});

async function exportSavedRecord(record, button, format = "excel") {
  const formatLabel = reportFormatLabel(format);
  button.disabled = true;
  setFormMessage(`Gerando ${formatLabel} e preparando a exportação...`);

  try {
    const payload = JSON.stringify({
      metadata: record.metadata,
      activities: record.activities,
      format
    });
    if (new Blob([payload]).size > 3.8 * 1024 * 1024) {
      throw new Error(
        "As fotos ultrapassaram o limite do envio. Remova algumas imagens e tente novamente."
      );
    }

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Falha ao gerar o relatório.");
    }

    const emailStatus = response.headers.get("X-Report-Email");
    const recipient =
      response.headers.get("X-Report-Recipient") || state.config.recipient;
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = downloadUrl;
    anchor.download = filenameFromResponse(response);
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(downloadUrl);

    record.lastExportedAt = new Date().toISOString();
    record.lastExportFormat = format;
    record.updatedAt = record.lastExportedAt;
    await putRecord(record);
    upsertStateRecord(record);
    renderAllDataViews();

    if (emailStatus === "sent") {
      setFormMessage(
        `Relatório baixado e enviado para ${recipient}.`,
        "success"
      );
    } else if (emailStatus === "failed") {
      setFormMessage(
        `${formatLabel} baixado, mas o envio por e-mail falhou. Tente novamente.`,
        "warning"
      );
    } else {
      setFormMessage(
        `${formatLabel} baixado. O envio por e-mail aguarda a configuração do serviço.`,
        "warning"
      );
    }
  } catch (error) {
    setFormMessage(error.message, "error");
  } finally {
    button.disabled = false;
  }
}

function renderAllDataViews() {
  renderDashboard();
  renderRecords();
  renderOperations();
}

function renderRecords() {
  const search = normalizeText(recordSearch.value);
  const type = recordTypeFilter.value;
  const status = recordStatusFilter.value;
  const sort = recordSortFilter.value;
  const filtered = state.records
    .filter((record) => {
      const activities = filledActivities(record);
      const haystack = normalizeText(
        [
          record.metadata.competencia,
          record.metadata.ordemServico,
          record.metadata.contratada,
          record.metadata.tipoManutencao,
          ...activities.flatMap((activity) => [
            activity.responsavel,
            activity.atividade,
            activity.motivo
          ])
        ].join(" ")
      );
      if (search && !haystack.includes(search)) return false;
      if (type !== "all" && record.metadata.tipoManutencao !== type) return false;
      if (status === "complete" && activities.some(isWaiting)) return false;
      if (status === "waiting" && !activities.some(isWaiting)) return false;
      return true;
    });

  filtered.sort((a, b) => {
    if (sort === "oldest") {
      return String(a.updatedAt).localeCompare(String(b.updatedAt));
    }
    if (sort === "order") {
      return recordLabel(a).localeCompare(recordLabel(b), "pt-BR", {
        numeric: true
      });
    }
    return String(b.updatedAt).localeCompare(String(a.updatedAt));
  });

  recordsResultCount.textContent = `${filtered.length} ${
    filtered.length === 1 ? "registro" : "registros"
  }`;

  if (!filtered.length) {
    recordsList.innerHTML = `
      <div class="empty-state">
        <strong>Nenhuma medição encontrada</strong>
        <p>Salve uma nova medição ou ajuste os filtros.</p>
        <button type="button" class="primary-action" data-go-to-empty="report">
          Criar medição
        </button>
      </div>
    `;
    refreshIcons();
    recordsList
      .querySelector("[data-go-to-empty]")
      ?.addEventListener("click", () => {
        resetForm();
        setView("report");
      });
    return;
  }

  recordsList.innerHTML = filtered.map(recordBox).join("");
  refreshIcons();
}

function recordBox(record) {
  const activities = filledActivities(record);
  const waiting = activities.filter(isWaiting).length;
  const completed = activities.length - waiting;
  const statusClass = waiting ? "is-waiting" : "is-complete";
  const statusText = waiting ? `${waiting} em espera` : "Concluída";

  return `
    <details class="record-box" data-record-box="${escapeAttr(record.id)}">
      <summary>
        <span class="record-main">
          <strong>${escapeHtml(recordLabel(record))}</strong>
          <small>${escapeHtml(record.metadata.competencia || "Sem competência")} · ${escapeHtml(record.metadata.tipoManutencao || "Tipo não informado")}</small>
        </span>
        <span class="record-count">${activities.length} atividade(s)</span>
        <span class="activity-status ${statusClass}">${statusText}</span>
        <span class="record-date">${formatDate(record.updatedAt)}</span>
      </summary>
      <div class="record-box__content">
        <div class="record-metadata">
          ${metadataItem("Ordem de serviço", record.metadata.ordemServico || "Não informada")}
          ${metadataItem("Contratada", record.metadata.contratada || "Não informada")}
          ${metadataItem("Tipo de manutenção", record.metadata.tipoManutencao || "Não informado")}
          ${metadataItem("Atualizado em", formatDateTime(record.updatedAt))}
        </div>

        <div class="record-activity-list">
          ${activities.map((activity, index) => recordActivity(activity, index)).join("")}
        </div>

        <div class="record-actions">
          <span>${completed} concluída(s) · ${waiting} em espera</span>
          <div>
            <button type="button" class="secondary-action" data-record-action="edit" data-record-id="${escapeAttr(record.id)}">Editar</button>
            <button type="button" class="secondary-action" data-record-action="export" data-record-format="excel" data-record-id="${escapeAttr(record.id)}">Excel</button>
            <button type="button" class="secondary-action" data-record-action="export" data-record-format="word" data-record-id="${escapeAttr(record.id)}">Word</button>
            <button type="button" class="secondary-action" data-record-action="export" data-record-format="presentation" data-record-id="${escapeAttr(record.id)}">PowerPoint</button>
            <button type="button" class="danger-action" data-record-action="delete" data-record-id="${escapeAttr(record.id)}">Apagar</button>
          </div>
        </div>
      </div>
    </details>
  `;
}

function recordActivity(activity, index) {
  const waiting = isWaiting(activity);
  return `
    <article class="saved-activity">
      <div class="saved-activity__heading">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <div>
          <strong>${escapeHtml(activity.atividade)}</strong>
          <small>${escapeHtml(activity.responsavel || "Sem responsável")} · ${formatActivityDates(activity)}</small>
        </div>
        <span class="activity-status ${waiting ? "is-waiting" : "is-complete"}">${waiting ? "Em espera" : "Concluída"}</span>
      </div>
      ${activity.motivo ? `<p><strong>Motivo/observação:</strong> ${escapeHtml(activity.motivo)}</p>` : ""}
      ${activity.fotoAntes || activity.fotoDepois ? `
        <div class="saved-photos">
          ${activity.fotoAntes ? `<figure><img src="${escapeAttr(activity.fotoAntes)}" alt="Foto antes"><figcaption>Antes</figcaption></figure>` : ""}
          ${activity.fotoDepois ? `<figure><img src="${escapeAttr(activity.fotoDepois)}" alt="Foto depois"><figcaption>Depois</figcaption></figure>` : ""}
        </div>
      ` : ""}
    </article>
  `;
}

function renderDashboard() {
  const records = dashboardFilteredRecords();
  const activities = records.flatMap(filledActivities);
  const waiting = activities.filter(isWaiting);
  const completed = activities.length - waiting.length;
  const completionRate = activities.length
    ? Math.round((completed / activities.length) * 100)
    : 0;
  const average = records.length
    ? (activities.length / records.length).toFixed(1).replace(".", ",")
    : "0";
  const typeCounts = countBy(
    records,
    (record) => record.metadata.tipoManutencao || "Não informado"
  );
  const topType = sortedEntries(typeCounts)[0];
  const monthly = buildMonthlySeries(records);
  const recent = records
    .slice()
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, 5);

  dashboardContent.innerHTML = `
    ${
      records.length !== state.records.length
        ? `<div class="filter-context"><strong>${records.length}</strong> de ${state.records.length} medições consideradas nos indicadores.</div>`
        : ""
    }
    <section class="dashboard-metrics">
      ${dashboardMetric("Medições", records.length, "registros salvos")}
      ${dashboardMetric("Atividades", activities.length, `${average} por medição`)}
      ${dashboardMetric("Concluídas", completed, `${completionRate}% do total`, "green")}
      ${dashboardMetric("Em espera", waiting.length, waiting.length ? "exigem acompanhamento" : "sem pendências", waiting.length ? "amber" : "green")}
      ${dashboardMetric("Taxa de conclusão", `${completionRate}%`, `${completed} de ${activities.length} atividades`, "blue")}
    </section>

    <section class="dashboard-grid">
      <article class="panel dashboard-panel">
        <div class="panel-title">
          <div>
            <h2>Tipos de manutenção</h2>
            <p>Distribuição quantitativa das medições.</p>
          </div>
        </div>
        ${renderBarChart(sortedEntries(typeCounts), records.length, "Nenhuma medição registrada.")}
      </article>

      <article class="panel dashboard-panel">
        <div class="panel-title">
          <div>
            <h2>Evolução mensal</h2>
            <p>Medições salvas nos últimos seis meses.</p>
          </div>
        </div>
        ${renderMonthlyChart(monthly)}
      </article>
    </section>

    <section class="dashboard-grid dashboard-grid--analysis">
      <article class="panel dashboard-panel">
        <div class="panel-title">
          <div>
            <h2>Análise operacional</h2>
            <p>Leitura automática dos dados registrados.</p>
          </div>
        </div>
        <div class="insight-list">
          ${insightItem("Maior demanda", topType ? `${topType[0]} representa ${percentage(topType[1], records.length)}% das medições.` : "Aguardando registros para identificar a maior demanda.")}
          ${insightItem("Acompanhamento", waiting.length ? `${waiting.length} atividade(s) estão em espera em ${records.filter((record) => filledActivities(record).some(isWaiting)).length} medição(ões).` : "Não há atividades em espera no histórico.")}
          ${insightItem("Produtividade", records.length ? `A média atual é de ${average} atividade(s) por medição.` : "A média será calculada após o primeiro registro.")}
        </div>
        ${waiting.length ? `
          <div class="waiting-reasons">
            <strong>Motivos recentes de espera</strong>
            ${waiting.slice(0, 4).map((activity) => `<p>${escapeHtml(activity.motivo || "Motivo não informado")}</p>`).join("")}
          </div>
        ` : ""}
      </article>

      <article class="panel dashboard-panel">
        <div class="panel-title">
          <div>
            <h2>Medições recentes</h2>
            <p>Últimos registros atualizados.</p>
          </div>
        </div>
        ${recent.length ? `
          <div class="recent-records">
            ${recent.map((record) => `
              <button type="button" data-open-record="${escapeAttr(record.id)}">
                <span>
                  <strong>${escapeHtml(recordLabel(record))}</strong>
                  <small>${escapeHtml(record.metadata.tipoManutencao || "Tipo não informado")}</small>
                </span>
                <span>${formatDate(record.updatedAt)} <i data-lucide="chevron-right" aria-hidden="true"></i></span>
              </button>
            `).join("")}
          </div>
        ` : `<div class="chart-empty">Nenhuma medição registrada.</div>`}
      </article>
    </section>
  `;
  refreshIcons();
}

function dashboardFilteredRecords() {
  const period = dashboardPeriodFilter.value;
  const type = dashboardTypeFilter.value;
  const threshold =
    period === "all"
      ? null
      : new Date(Date.now() - Number(period) * 24 * 60 * 60 * 1000);

  return state.records.filter((record) => {
    if (type !== "all" && record.metadata.tipoManutencao !== type) return false;
    if (threshold) {
      const updatedAt = new Date(record.updatedAt || record.createdAt);
      if (Number.isNaN(updatedAt.getTime()) || updatedAt < threshold) return false;
    }
    return true;
  });
}

function renderOperations() {
  const records = state.records
    .slice()
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
  const activities = records.flatMap((record) =>
    filledActivities(record).map((activity) => ({ activity, record }))
  );
  const waiting = activities.filter(({ activity }) => isWaiting(activity));
  const responsibleCounts = countBy(
    activities.filter(({ activity }) => activity.responsavel),
    ({ activity }) => activity.responsavel
  );
  const latestExports = records.filter((record) => record.lastExportedAt).slice(0, 5);

  operationsContent.innerHTML = `
    <section class="operations-summary">
      ${operationMetric("Pendências abertas", waiting.length, waiting.length ? "requerem acompanhamento" : "operação em dia", waiting.length ? "amber" : "green")}
      ${operationMetric("Responsáveis ativos", Object.keys(responsibleCounts).length, "nomes identificados", "blue")}
      ${operationMetric("Relatórios exportados", latestExports.length, "entre os registros recentes", "teal")}
    </section>

    <section class="operations-layout">
      <article class="panel operations-primary">
        <div class="panel-title">
          <div>
            <h2>Fila de acompanhamento</h2>
            <p>Atividades em espera, ordenadas pela atualização da medição.</p>
          </div>
          <span class="section-count">${waiting.length}</span>
        </div>
        ${
          waiting.length
            ? `<div class="operations-table">
                <div class="operations-table__head">
                  <span>Ordem / atividade</span>
                  <span>Responsável</span>
                  <span>Motivo</span>
                  <span>Atualização</span>
                </div>
                ${waiting
                  .map(
                    ({ activity, record }) => `
                      <button type="button" class="operations-row" data-open-record="${escapeAttr(record.id)}">
                        <span>
                          <strong>${escapeHtml(recordLabel(record))}</strong>
                          <small>${escapeHtml(activity.atividade)}</small>
                        </span>
                        <span>${escapeHtml(activity.responsavel || "Não informado")}</span>
                        <span>${escapeHtml(activity.motivo || "Motivo não informado")}</span>
                        <span>${formatDate(record.updatedAt)}</span>
                      </button>
                    `
                  )
                  .join("")}
              </div>`
            : `<div class="positive-state">
                <i data-lucide="circle-check-big" aria-hidden="true"></i>
                <strong>Nenhuma atividade em espera</strong>
                <p>As medições registradas não possuem pendências abertas.</p>
              </div>`
        }
      </article>

      <aside class="operations-side">
        <article class="panel">
          <div class="panel-title">
            <div>
              <h2>Distribuição por responsável</h2>
              <p>Quantidade de atividades registradas.</p>
            </div>
          </div>
          ${renderBarChart(sortedEntries(responsibleCounts).slice(0, 6), activities.length, "Nenhum responsável informado.")}
        </article>
        <article class="panel">
          <div class="panel-title">
            <div>
              <h2>Últimas exportações</h2>
              <p>Relatórios gerados recentemente.</p>
            </div>
          </div>
          ${
            latestExports.length
              ? `<div class="export-history">${latestExports
                  .map(
                    (record) => `
                      <button type="button" data-open-record="${escapeAttr(record.id)}">
                        <span>
                          <strong>${escapeHtml(recordLabel(record))}</strong>
                          <small>${escapeHtml(record.metadata.competencia || "Sem competência")}</small>
                        </span>
                        <time>${formatDateTime(record.lastExportedAt)}</time>
                      </button>
                    `
                  )
                  .join("")}</div>`
              : `<div class="compact-empty">Nenhum relatório exportado ainda.</div>`
          }
        </article>
      </aside>
    </section>
  `;
  refreshIcons();
}

function operationMetric(label, value, hint, tone) {
  return `
    <article class="operation-metric is-${tone}">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${hint}</small>
    </article>
  `;
}

function dashboardMetric(label, value, hint, tone = "") {
  return `
    <article class="dashboard-metric ${tone ? `is-${tone}` : ""}">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${hint}</small>
    </article>
  `;
}

function renderBarChart(entries, total, emptyMessage) {
  if (!entries.length) return `<div class="chart-empty">${emptyMessage}</div>`;
  const max = Math.max(...entries.map(([, value]) => value), 1);
  return `
    <div class="bar-chart">
      ${entries.map(([label, value]) => `
        <div class="bar-row">
          <span>${escapeHtml(label)}</span>
          <div><i style="width:${Math.round((value / max) * 100)}%"></i></div>
          <strong>${value} <small>(${percentage(value, total)}%)</small></strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderMonthlyChart(monthly) {
  const max = Math.max(...monthly.map((item) => item.value), 1);
  return `
    <div class="monthly-chart">
      ${monthly.map((item) => `
        <div class="month-column">
          <strong>${item.value}</strong>
          <div><i style="height:${Math.max(6, Math.round((item.value / max) * 100))}%"></i></div>
          <span>${item.label}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function insightItem(title, text) {
  return `<div class="insight-item"><strong>${title}</strong><p>${text}</p></div>`;
}

function buildMonthlySeries(records) {
  const formatter = new Intl.DateTimeFormat("pt-BR", { month: "short" });
  const now = new Date();
  return Array.from({ length: 6 }, (_, offset) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - offset), 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    return {
      key,
      label: formatter.format(date).replace(".", ""),
      value: records.filter((record) => String(record.createdAt).slice(0, 7) === key).length
    };
  });
}

function validateActivities() {
  const filled = activityCards.filter(({ fields }) =>
    fields.atividade.value.trim()
  );
  if (!filled.length) throw new Error("Cadastre ao menos uma atividade executada.");

  const waitingWithoutReason = filled.find(
    ({ fields }) =>
      fields.status.value === "em-espera" && !fields.motivo.value.trim()
  );
  if (waitingWithoutReason) {
    waitingWithoutReason.card.classList.add("is-open");
    waitingWithoutReason.fields.motivo.focus();
    throw new Error("Informe o motivo da atividade que está em espera.");
  }
}

function updateProgress() {
  const total = activityCards.filter(({ fields }) =>
    fields.atividade.value.trim()
  ).length;
  activityProgress.textContent = `${total} de 8`;
}

async function fileToDataUrl(file) {
  if (!file) return "";
  if (!["image/jpeg", "image/png"].includes(file.type)) {
    throw new Error("Use somente imagens JPG ou PNG.");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error(`${file.name} ultrapassa o limite de 10 MB.`);
  }
  return await new Promise((resolve, reject) => {
    const sourceUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const targetWidth = 900;
      const targetHeight = 450;
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, targetWidth, targetHeight);
      const scale = Math.min(
        targetWidth / image.naturalWidth,
        targetHeight / image.naturalHeight
      );
      const width = image.naturalWidth * scale;
      const height = image.naturalHeight * scale;
      context.drawImage(
        image,
        (targetWidth - width) / 2,
        (targetHeight - height) / 2,
        width,
        height
      );
      URL.revokeObjectURL(sourceUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.65));
    };
    image.onerror = () => {
      URL.revokeObjectURL(sourceUrl);
      reject(new Error(`Não foi possível processar ${file.name}.`));
    };
    image.src = sourceUrl;
  });
}

async function getServiceConfig() {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) throw new Error("Configuração indisponível.");
    const config = await response.json();
    return {
      recipient: config.recipient || "comercial1@primecsg.com.br",
      emailConfigured: Boolean(config.emailConfigured)
    };
  } catch {
    return {
      recipient: "comercial1@primecsg.com.br",
      emailConfigured: false
    };
  }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(RECORD_STORE)) {
        const store = database.createObjectStore(RECORD_STORE, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllRecords() {
  try {
    const database = await openDatabase();
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(RECORD_STORE, "readonly");
      const request = transaction.objectStore(RECORD_STORE).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => database.close();
    });
  } catch (error) {
    console.error("Falha ao carregar registros.", error);
    return [];
  }
}

async function putRecord(record) {
  const database = await openDatabase();
  return await new Promise((resolve, reject) => {
    const transaction = database.transaction(RECORD_STORE, "readwrite");
    transaction.objectStore(RECORD_STORE).put(record);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

async function deleteRecord(id) {
  const database = await openDatabase();
  return await new Promise((resolve, reject) => {
    const transaction = database.transaction(RECORD_STORE, "readwrite");
    transaction.objectStore(RECORD_STORE).delete(id);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

function upsertStateRecord(record) {
  const index = state.records.findIndex((item) => item.id === record.id);
  if (index >= 0) state.records[index] = structuredClone(record);
  else state.records.push(structuredClone(record));
}

function filledActivities(record) {
  return (record.activities || []).filter((activity) =>
    String(activity.atividade || "").trim()
  );
}

function isWaiting(activity) {
  return activity.status === "em-espera";
}

function recordLabel(record) {
  const order = String(record.metadata.ordemServico || "").trim();
  if (order) return /^os(?:\s|-)/i.test(order) ? order : `OS ${order}`;
  return `Medição ${record.metadata.competencia || ""}`.trim();
}

function metadataItem(label, value) {
  return `<div><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`;
}

function formatActivityDates(activity) {
  const before = activity.dataAntes ? formatDate(activity.dataAntes) : "sem data";
  const after = activity.dataDepois ? formatDate(activity.dataDepois) : "sem data";
  return `${before} a ${after}`;
}

function filenameFromResponse(response) {
  const disposition = response.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="([^"]+)"/i);
  return match?.[1] || "Relatório Fotográfico.xlsx";
}

function reportFormatLabel(format) {
  return {
    excel: "Excel",
    word: "Word",
    presentation: "PowerPoint"
  }[format] || "relatório";
}

function updateGenerateButton() {
  generateButton.textContent = `Salvar e gerar ${reportFormatLabel(
    reportFormat.value
  )}`;
}

function setFormMessage(message, type = "") {
  formStatus.textContent = message;
  formStatus.className = type ? `${type}-text` : "";
}

function formatDate(value) {
  if (!value) return "—";
  const date = String(value).includes("T")
    ? new Date(value)
    : new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function countBy(items, selector) {
  return items.reduce((counts, item) => {
    const key = selector(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function sortedEntries(counts) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function percentage(value, total) {
  return total ? Math.round((value / total) * 100) : 0;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("\n", " ");
}

function refreshIcons() {
  window.lucide?.createIcons({
    attrs: {
      "aria-hidden": "true",
      "stroke-width": 1.8
    }
  });
}
