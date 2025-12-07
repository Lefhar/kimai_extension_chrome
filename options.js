// Options Kimai Timer
/* global chrome */
const baseUrlInput = document.getElementById('baseUrl');
const apiTokenInput = document.getElementById('apiToken');
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');

function storageGet(keys) {
  return new Promise(resolve => chrome.storage.sync.get(keys, resolve));
}

function storageSet(obj) {
  return new Promise(resolve => chrome.storage.sync.set(obj, resolve));
}

async function loadOptions() {
  const data = await storageGet(['kimaiConfig']);
  if (data.kimaiConfig) {
    baseUrlInput.value = data.kimaiConfig.baseUrl || '';
    apiTokenInput.value = data.kimaiConfig.apiToken || '';
  }
}

async function saveOptions() {
  let baseUrl = baseUrlInput.value.trim();
  const apiToken = apiTokenInput.value.trim();

  if (!baseUrl || !apiToken) {
    statusEl.textContent = 'URL et jeton API sont obligatoires.';
    statusEl.style.color = '#b91c1c';
    return;
  }

  if (baseUrl.endsWith('/')) {
    baseUrl = baseUrl.slice(0, -1);
  }

  await storageSet({
    kimaiConfig: {
      baseUrl,
      apiToken
    }
  });

  statusEl.textContent = 'Enregistré.';
  statusEl.style.color = '#16a34a';
  setTimeout(() => {
    statusEl.textContent = '';
  }, 2000);
}

document.addEventListener('DOMContentLoaded', () => {
  loadOptions();
  saveBtn.addEventListener('click', saveOptions);
});
