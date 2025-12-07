// Kimai Timer popup
/* global chrome */
const statusTextEl = document.getElementById('statusText');
const elapsedEl = document.getElementById('elapsed');
const errorEl = document.getElementById('error');
const descriptionEl = document.getElementById('description');
const customerSelect = document.getElementById('customerSelect');
const projectSelect = document.getElementById('projectSelect');
const activitySelect = document.getElementById('activitySelect');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const cancelBtn = document.getElementById('cancelBtn');
const optionsBtn = document.getElementById('optionsBtn');
const tabTitleEl = document.getElementById('tabTitle');
const tabUrlEl = document.getElementById('tabUrl');

let config = null;
let timerInterval = null;
let meta = {
  customers: [],
  projects: [],
  activities: []
};

function setError(msg) {
  if (!msg) {
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  } else {
    errorEl.style.display = 'block';
    errorEl.textContent = msg;
  }
}

function formatSeconds(total) {
  total = Math.max(0, Math.floor(total));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = v => v.toString().padStart(2, '0');
  return h + ':' + pad(m) + ':' + pad(s);
}

function updateElapsedFrom(startMs) {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (!startMs) {
    elapsedEl.textContent = '0:00:00';
    return;
  }
  function tick() {
    const diff = (Date.now() - startMs) / 1000;
    elapsedEl.textContent = formatSeconds(diff);
  }
  tick();
  timerInterval = setInterval(tick, 1000);
}

function storageGet(keys) {
  return new Promise(resolve => {
    chrome.storage.sync.get(keys, resolve);
  });
}

function storageSet(obj) {
  return new Promise(resolve => {
    chrome.storage.sync.set(obj, resolve);
  });
}

async function loadConfig() {
  const data = await storageGet(['kimaiConfig']);
  if (!data.kimaiConfig || !data.kimaiConfig.baseUrl || !data.kimaiConfig.apiToken) {
    throw new Error('Extension non configurée. Clique sur ⚙️ Options pour renseigner URL et jeton API.');
  }
  const baseUrl = data.kimaiConfig.baseUrl.replace(/\/$/, '');
  return {
    baseUrl,
    apiToken: data.kimaiConfig.apiToken
  };
}

async function kimaiFetch(path, options = {}) {
  if (!config) {
    config = await loadConfig();
  }
  const url = config.baseUrl + '/api' + path;
  const headers = Object.assign({
    'Authorization': 'Bearer ' + config.apiToken,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }, options.headers || {});

  const resp = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body || undefined
  });

  const text = await resp.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (e) {
    // ignore
  }
  if (!resp.ok) {
    const msg = json && json.message ? json.message : text || resp.statusText;
    throw new Error('API ' + resp.status + ' ' + resp.statusText + ' - ' + msg);
  }
  return json;
}

async function loadMeta() {
  statusTextEl.textContent = 'Chargement des projets/activités…';
  try {
    const [customers, projects, activities] = await Promise.all([
      kimaiFetch('/customers?visible=1'),
      kimaiFetch('/projects?visible=1'),
      kimaiFetch('/activities?visible=1')
    ]);
    meta.customers = customers || [];
    meta.projects = projects || [];
    meta.activities = activities || [];

    function fillSelect(selectEl, items, placeholder) {
      while (selectEl.options.length > 1) {
        selectEl.remove(1);
      }
      for (const item of items) {
        const opt = document.createElement('option');
        opt.value = item.id;
        opt.textContent = item.name || ('#' + item.id);
        selectEl.appendChild(opt);
      }
      if (placeholder) {
        selectEl.options[0].textContent = placeholder;
      }
    }

    fillSelect(customerSelect, meta.customers, '— Sélectionner un client —');
    fillSelect(projectSelect, meta.projects, '— Sélectionner un projet —');
    fillSelect(activitySelect, meta.activities, '— Sélectionner une activité —');

    const data = await storageGet(['kimaiLastSelection']);
    if (data.kimaiLastSelection) {
      const { customerId, projectId, activityId } = data.kimaiLastSelection;
      if (customerId) customerSelect.value = String(customerId);
      if (projectId) projectSelect.value = String(projectId);
      if (activityId) activitySelect.value = String(activityId);
    }

    statusTextEl.textContent = 'Prêt';
  } catch (e) {
    console.error(e);
    setError('Erreur lors du chargement des données: ' + e.message);
    statusTextEl.textContent = 'Erreur';
  }
}

function getActiveTabInfo() {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs && tabs[0];
    if (!tab) return;
    tabTitleEl.textContent = tab.title || '';
    tabUrlEl.textContent = tab.url || '';
    if (!descriptionEl.value) {
      descriptionEl.value = tab.title || '';
    }
  });
}

async function refreshRunningState() {
  const data = await storageGet(['kimaiRunningTimer']);
  const running = data.kimaiRunningTimer;
  if (running && running.timesheetId) {
    statusTextEl.textContent = 'En cours (#' + running.timesheetId + ')';
    startBtn.disabled = true;
    stopBtn.disabled = false;
    cancelBtn.disabled = false;
    descriptionEl.value = running.description || descriptionEl.value;
    if (running.projectId) projectSelect.value = String(running.projectId);
    if (running.activityId) activitySelect.value = String(running.activityId);
    updateElapsedFrom(running.startTimeMs);
  } else {
    statusTextEl.textContent = 'Arrêté';
    startBtn.disabled = false;
    stopBtn.disabled = true;
    cancelBtn.disabled = true;
    updateElapsedFrom(null);
  }
}

function buildNowString() {
  const d = new Date();
  const pad = n => n.toString().padStart(2, '0');
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}:${ss}`;
}

async function startTimer() {
  setError(null);
  try {
    config = await loadConfig();
  } catch (e) {
    setError(e.message);
    statusTextEl.textContent = 'Non configuré';
    return;
  }

  const projectId = projectSelect.value;
  const activityId = activitySelect.value;
  if (!projectId || !activityId) {
    setError('Sélectionne au minimum un projet et une activité.');
    return;
  }

  const description = descriptionEl.value || '';
  const begin = buildNowString();

  try {
    statusTextEl.textContent = 'Démarrage…';
    startBtn.disabled = true;

    const payload = {
      begin,
      project: Number(projectId),
      activity: Number(activityId),
      description,
      billable: true
    };

    const created = await kimaiFetch('/timesheets', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const timesheetId = created.id;
    const startTimeMs = Date.now();

    await storageSet({
      kimaiRunningTimer: {
        timesheetId,
        startTimeMs,
        description,
        projectId: Number(projectId),
        activityId: Number(activityId)
      },
      kimaiLastSelection: {
        customerId: customerSelect.value ? Number(customerSelect.value) : null,
        projectId: Number(projectId),
        activityId: Number(activityId)
      }
    });

    statusTextEl.textContent = 'En cours (#' + timesheetId + ')';
    stopBtn.disabled = false;
    cancelBtn.disabled = false;
    updateElapsedFrom(startTimeMs);
  } catch (e) {
    console.error(e);
    setError('Erreur lors du démarrage: ' + e.message);
    statusTextEl.textContent = 'Erreur';
    startBtn.disabled = false;
  }
}

async function stopTimer() {
  setError(null);
  const data = await storageGet(['kimaiRunningTimer']);
  const running = data.kimaiRunningTimer;
  if (!running || !running.timesheetId) {
    setError('Aucun timer en cours.');
    await storageSet({ kimaiRunningTimer: {} });
    await refreshRunningState();
    return;
  }
  try {
    statusTextEl.textContent = 'Arrêt en cours…';
    stopBtn.disabled = true;

    await kimaiFetch('/timesheets/' + running.timesheetId + '/stop', {
      method: 'PATCH'
    });

    await storageSet({ kimaiRunningTimer: {} });
    statusTextEl.textContent = 'Arrêté';
    updateElapsedFrom(null);
    startBtn.disabled = false;
    cancelBtn.disabled = true;
  } catch (e) {
    console.error(e);
    setError('Erreur lors de l’arrêt: ' + e.message);
    statusTextEl.textContent = 'Erreur';
    stopBtn.disabled = false;
  }
}

async function cancelTimer() {
  setError(null);
  await storageSet({ kimaiRunningTimer: {} });
  await refreshRunningState();
  statusTextEl.textContent = 'Chrono oublié côté extension (entrée Kimai conservée).';
}

optionsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

startBtn.addEventListener('click', () => {
  startTimer();
});

stopBtn.addEventListener('click', () => {
  stopTimer();
});

cancelBtn.addEventListener('click', () => {
  cancelTimer();
});

document.addEventListener('DOMContentLoaded', async () => {
  getActiveTabInfo();
  try {
    config = await loadConfig();
  } catch (e) {
    setError(e.message);
    statusTextEl.textContent = 'Non configuré';
    startBtn.disabled = true;
    stopBtn.disabled = true;
    cancelBtn.disabled = true;
    return;
  }
  await loadMeta();
  await refreshRunningState();
});
