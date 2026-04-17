
const DATA_URL = './data/map-data.json';
const STORAGE_LANG_KEY = 'vol-lang';

const I18N = {
  en: {
    pageTitle: 'Victims of Leviathan',
    pageDescription: 'Victims of Leviathan',
    siteTitle: 'Victims of Leviathan',
    siteSubtitle: 'Statistics on Chinese youth “correction” institutions, built from the final JSON saved by NO CONVERSION THERAPY PROJECT on April 15, 2026',
    langLabel: 'Language',
    viewJson: 'View raw JSON',
    schoolNum: 'Listed institutions',
    formNum: 'Form submissions',
    avgAge: 'Average age',
    lastSynced: 'Last synced',
    filtersTitle: 'Filters',
    keywordLabel: 'Keyword',
    keywordPlaceholder: 'Search by name, address, province, text…',
    provinceLabel: 'Province',
    allProvinces: 'All provinces',
    onlyWithText: 'Only entries with detailed text',
    provinceStatsTitle: 'Province stats',
    entriesTitle: 'Entries',
    loading: 'Loading…',
    loadError: 'Failed to load. Check whether data/map-data.json exists.',
    noResults: 'No matching results',
    summary: function(current, total) { return 'Showing ' + current + ' / ' + total + ' entries'; },
    count: function(current) { return current + ' entries'; },
    experience: 'Experience',
    allegation: 'Allegation',
    contact: 'Contact',
    locate: 'Locate on map',
    popupSeparator: ' · '
  },
  zh: {
    pageTitle: 'Victims of Leviathan',
    pageDescription: 'Victims of Leviathan',
    siteTitle: 'Victims of Leviathan',
    siteSubtitle: '中国青少年“矫正”机构统计，基于 NO CONVERSION THERAPY PROJECT 于 2026年4月15日 最后保存的 JSON 开发而来',
    langLabel: '语言',
    viewJson: '查看原始 JSON',
    schoolNum: '收录机构',
    formNum: '表单提交数',
    avgAge: '平均年龄',
    lastSynced: '最后同步',
    filtersTitle: '筛选',
    keywordLabel: '关键词',
    keywordPlaceholder: '按名称、地址、省份、文本搜索…',
    provinceLabel: '省份',
    allProvinces: '全部省份',
    onlyWithText: '只看有详细文本的条目',
    provinceStatsTitle: '省份统计',
    entriesTitle: '条目',
    loading: '加载中…',
    loadError: '加载失败。请检查 data/map-data.json 是否存在。',
    noResults: '没有匹配结果',
    summary: function(current, total) { return '显示 ' + current + ' / ' + total + ' 条'; },
    count: function(current) { return current + ' 条'; },
    experience: '经历',
    allegation: '指控',
    contact: '联系方式',
    locate: '在地图中定位',
    popupSeparator: ' · '
  }
};

const state = {
  lang: localStorage.getItem(STORAGE_LANG_KEY) || 'en',
  raw: null,
  filtered: [],
  map: null,
  markersLayer: null,
  markersById: new Map(),
  activeId: null
};

const els = {
  siteTitle: document.getElementById('siteTitle'),
  siteSubtitle: document.getElementById('siteSubtitle'),
  langLabel: document.getElementById('langLabel'),
  langSelect: document.getElementById('langSelect'),
  jsonLink: document.getElementById('jsonLink'),
  labelSchoolNum: document.getElementById('labelSchoolNum'),
  labelFormNum: document.getElementById('labelFormNum'),
  labelAvgAge: document.getElementById('labelAvgAge'),
  labelLastSynced: document.getElementById('labelLastSynced'),
  schoolNum: document.getElementById('schoolNum'),
  formNum: document.getElementById('formNum'),
  avgAge: document.getElementById('avgAge'),
  lastSynced: document.getElementById('lastSynced'),
  filtersTitle: document.getElementById('filtersTitle'),
  keywordLabel: document.getElementById('keywordLabel'),
  searchInput: document.getElementById('searchInput'),
  provinceLabel: document.getElementById('provinceLabel'),
  provinceSelect: document.getElementById('provinceSelect'),
  provinceAllOption: document.getElementById('provinceAllOption'),
  onlyWithText: document.getElementById('onlyWithText'),
  onlyWithTextLabel: document.getElementById('onlyWithTextLabel'),
  filterSummary: document.getElementById('filterSummary'),
  provinceStatsTitle: document.getElementById('provinceStatsTitle'),
  provinceStats: document.getElementById('provinceStats'),
  entriesTitle: document.getElementById('entriesTitle'),
  resultCount: document.getElementById('resultCount'),
  resultList: document.getElementById('resultList'),
  itemTemplate: document.getElementById('itemTemplate')
};

function t(key) {
  const args = Array.prototype.slice.call(arguments, 1);
  const dict = I18N[state.lang] || I18N.en;
  const value = dict[key];
  if (typeof value === 'function') return value.apply(null, args);
  return value;
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeText(value) {
  return String(value || '').trim();
}

function entryHasText(entry) {
  return Boolean(normalizeText(entry.experience) || normalizeText(entry.scandal) || normalizeText(entry.else));
}

function buildEntryText(entry) {
  return [
    entry.name,
    entry.addr,
    entry.province,
    entry.prov,
    entry.city,
    entry.county,
    entry.else,
    entry.experience,
    entry.scandal,
    entry.contact,
    entry.HMaster,
    entry.inputType
  ].join(' ').toLowerCase();
}

function formatLastSynced(value) {
  if (!value) return '-';
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return String(value);
  if (state.lang === 'zh') return date.toLocaleString('zh-CN', { hour12: false });
  return date.toLocaleString('en-GB', { hour12: false });
}

function getEntryId(entry, index) {
  return (entry.name || 'entry') + '-' + entry.lat + '-' + entry.lng + '-' + index;
}

function applyTranslations() {
  document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
  document.title = t('pageTitle');
  document.querySelector('meta[name="description"]').setAttribute('content', t('pageDescription'));
  els.siteTitle.textContent = t('siteTitle');
  els.siteSubtitle.textContent = t('siteSubtitle');
  els.langLabel.textContent = t('langLabel');
  els.jsonLink.textContent = t('viewJson');
  els.labelSchoolNum.textContent = t('schoolNum');
  els.labelFormNum.textContent = t('formNum');
  els.labelAvgAge.textContent = t('avgAge');
  els.labelLastSynced.textContent = t('lastSynced');
  els.filtersTitle.textContent = t('filtersTitle');
  els.keywordLabel.textContent = t('keywordLabel');
  els.searchInput.placeholder = t('keywordPlaceholder');
  els.provinceLabel.textContent = t('provinceLabel');
  els.onlyWithTextLabel.textContent = t('onlyWithText');
  els.provinceStatsTitle.textContent = t('provinceStatsTitle');
  els.entriesTitle.textContent = t('entriesTitle');
}

function populateStats() {
  const raw = state.raw || {};
  els.schoolNum.textContent = raw.schoolNum != null ? raw.schoolNum : '-';
  els.formNum.textContent = raw.formNum != null ? raw.formNum : '-';
  els.avgAge.textContent = raw.avg_age != null ? raw.avg_age : '-';
  els.lastSynced.textContent = formatLastSynced(raw.last_synced);
}

function populateProvinceSelect() {
  const entries = (state.raw && state.raw.data) || [];
  const provinceSet = new Set();
  entries.forEach(function(item) {
    const p = normalizeText(item.province);
    if (p) provinceSet.add(p);
  });
  const provinces = Array.from(provinceSet).sort(function(a, b) { return a.localeCompare(b, 'zh-Hans-CN'); });
  const current = els.provinceSelect.value;
  els.provinceSelect.innerHTML = '';
  const option = document.createElement('option');
  option.value = '';
  option.textContent = t('allProvinces');
  els.provinceSelect.appendChild(option);
  provinces.forEach(function(province) {
    const el = document.createElement('option');
    el.value = province;
    el.textContent = province;
    els.provinceSelect.appendChild(el);
  });
  els.provinceSelect.value = provinces.indexOf(current) >= 0 ? current : '';
}

function renderProvinceStats() {
  const stats = (state.raw && state.raw.statistics) || [];
  els.provinceStats.innerHTML = '';
  stats.forEach(function(item) {
    const chip = document.createElement('span');
    chip.className = 'province-chip';
    chip.textContent = item.province + ': ' + item.count;
    els.provinceStats.appendChild(chip);
  });
}

function initMap() {
  if (state.map) return;
  state.map = L.map('map', { worldCopyJump: true, preferCanvas: true }).setView([35.8, 104.1], 4);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(state.map);
  state.markersLayer = L.layerGroup().addTo(state.map);
}

function renderMap(entries) {
  initMap();
  state.markersLayer.clearLayers();
  state.markersById.clear();
  const bounds = [];

  entries.forEach(function(entry) {
    const lat = Number(entry.lat);
    const lng = Number(entry.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const parts = [];
    parts.push('<div class="popup-title">' + escapeHtml(entry.name || '') + '</div>');
    parts.push('<div class="popup-meta">' + escapeHtml([entry.province, entry.prov].filter(Boolean).join(t('popupSeparator'))) + '</div>');
    if (normalizeText(entry.contact)) {
      parts.push('<div class="popup-contact"><strong>' + escapeHtml(t('contact')) + ':</strong> ' + escapeHtml(entry.contact) + '</div>');
    }

    const marker = L.marker([lat, lng]);
    marker.bindPopup(parts.join(''));
    marker.on('click', function() {
      focusEntry(entry.__id, true);
    });
    marker.addTo(state.markersLayer);

    state.markersById.set(entry.__id, marker);
    bounds.push([lat, lng]);
  });

  if (bounds.length > 0) {
    state.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 7 });
  }
}

function renderList(entries) {
  els.resultList.innerHTML = '';
  els.resultCount.textContent = t('count', entries.length);

  if (entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'summary';
    empty.textContent = t('noResults');
    els.resultList.appendChild(empty);
    return;
  }

  entries.forEach(function(entry) {
    const node = els.itemTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.entryId = entry.__id;

    const headerBtn = node.querySelector('.entry-header');
    const titleEl = node.querySelector('.entry-title');
    const metaEl = node.querySelector('.entry-meta');
    const expEl = node.querySelector('.entry-experience');
    const scaEl = node.querySelector('.entry-scandal');
    const conEl = node.querySelector('.entry-contact');
    const locateBtn = node.querySelector('.entry-locate');

    titleEl.textContent = entry.name || '';
    metaEl.textContent = [entry.province, entry.prov, entry.addr].filter(Boolean).join(' · ');

    const expText = normalizeText(entry.experience || entry.else);
    if (expText) {
      expEl.textContent = t('experience') + ': ' + expText;
      expEl.classList.remove('hidden');
    }

    const scandalText = normalizeText(entry.scandal);
    if (scandalText) {
      scaEl.textContent = t('allegation') + ': ' + scandalText;
      scaEl.classList.remove('hidden');
    }

    const contactText = normalizeText(entry.contact);
    if (contactText) {
      conEl.textContent = t('contact') + ': ' + contactText;
      conEl.classList.remove('hidden');
    }

    locateBtn.textContent = t('locate');
    locateBtn.addEventListener('click', function(event) {
      event.stopPropagation();
      focusEntry(entry.__id, true);
      const marker = state.markersById.get(entry.__id);
      if (marker) marker.openPopup();
    });

    headerBtn.addEventListener('click', function() {
      const isExpanded = node.classList.contains('expanded');
      collapseAllEntries();
      if (!isExpanded) {
        node.classList.add('expanded');
        state.activeId = entry.__id;
      } else {
        state.activeId = null;
      }
      updateActiveEntryStyles();
    });

    els.resultList.appendChild(node);
  });

  updateActiveEntryStyles();
}

function collapseAllEntries() {
  els.resultList.querySelectorAll('.entry').forEach(function(node) {
    node.classList.remove('expanded');
  });
}

function updateActiveEntryStyles() {
  els.resultList.querySelectorAll('.entry').forEach(function(node) {
    const active = node.dataset.entryId === state.activeId;
    node.classList.toggle('active', active);
  });
}

function focusEntry(entryId, open) {
  state.activeId = entryId;
  updateActiveEntryStyles();

  const node = els.resultList.querySelector('[data-entry-id="' + cssEscape(entryId) + '"]');
  if (node) {
    if (open) {
      collapseAllEntries();
      node.classList.add('expanded');
    }
    node.classList.add('active');
    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const entry = state.filtered.find(function(item) { return item.__id === entryId; });
  if (entry) {
    const marker = state.markersById.get(entryId);
    if (marker) {
      state.map.flyTo([Number(entry.lat), Number(entry.lng)], Math.max(state.map.getZoom(), 7), { duration: 0.6 });
      if (open) marker.openPopup();
    }
  }
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
  return String(value).replace(/["\\]/g, '\\$&');
}

function applyFilters() {
  const entries = ((state.raw && state.raw.data) || []).map(function(entry, index) {
    const clone = Object.assign({}, entry);
    clone.__id = getEntryId(entry, index);
    return clone;
  });

  const keyword = els.searchInput.value.trim().toLowerCase();
  const province = els.provinceSelect.value;
  const onlyWithText = els.onlyWithText.checked;

  state.filtered = entries.filter(function(entry) {
    if (province && normalizeText(entry.province) !== province) return false;
    if (onlyWithText && !entryHasText(entry)) return false;
    if (keyword && buildEntryText(entry).indexOf(keyword) === -1) return false;
    return true;
  });

  els.filterSummary.textContent = t('summary', state.filtered.length, entries.length);
  renderMap(state.filtered);
  renderList(state.filtered);
}

async function loadData() {
  try {
    els.filterSummary.textContent = t('loading');
    const response = await fetch(DATA_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    state.raw = await response.json();
    populateStats();
    populateProvinceSelect();
    renderProvinceStats();
    applyFilters();
  } catch (error) {
    console.error(error);
    els.filterSummary.textContent = t('loadError');
    els.resultList.innerHTML = '<div class="summary">' + escapeHtml(t('loadError')) + '</div>';
  }
}

function bindEvents() {
  els.langSelect.value = state.lang;
  els.langSelect.addEventListener('change', function() {
    state.lang = els.langSelect.value === 'zh' ? 'zh' : 'en';
    localStorage.setItem(STORAGE_LANG_KEY, state.lang);
    applyTranslations();
    populateStats();
    populateProvinceSelect();
    renderProvinceStats();
    applyFilters();
  });

  els.searchInput.addEventListener('input', applyFilters);
  els.provinceSelect.addEventListener('change', applyFilters);
  els.onlyWithText.addEventListener('change', applyFilters);
}

function bootstrap() {
  if (state.lang !== 'en' && state.lang !== 'zh') state.lang = 'en';
  applyTranslations();
  bindEvents();
  loadData();
}

bootstrap();
