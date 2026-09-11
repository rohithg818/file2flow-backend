// ============================================================
// PURE CLASSIFICATION & RENDERING (no network dependencies)
// ============================================================

const SYSTEM_FIELD_PATTERNS = [
  /^_/,
  /^id$/i,
  /^uuid$/i,
  /^owner/i,
  /^created_/i,
  /^modified_/i,
  /^updated_/i,
  /^deleted_/i,
  /^docstatus$/i,
  /^revision$/i,
  /^checksum$/i,
  /^hash$/i,
  /^etag$/i,
  /^__v$/i,
  /^version$/i,
  /^parent$/i,
  /^parentfield$/i,
  /^parenttype$/i,
  /^modified_by$/i,
];

function isSystemField(key) {
  return SYSTEM_FIELD_PATTERNS.some(p => p.test(key));
}

function isUuidValue(value) {
  if (typeof value !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

const HEADING_KEY_PATTERNS = [
  /^name$/i,
  /^title$/i,
  /^label$/i,
  /^subject$/i,
  /^heading$/i,
  /^clause[_\s]?title$/i,
  /^section[_\s]?title$/i,
  /^item[_\s]?name$/i,
  /^description$/i,
  /^summary$/i,
  /^topic$/i,
  /^question$/i,
];

const LONG_TEXT_THRESHOLD = 100;
const MAX_TABLE_ROWS = 200;

function isLongText(value) {
  return typeof value === 'string' && value.length > LONG_TEXT_THRESHOLD;
}

function truncateArray(arr, maxLen) {
  if (arr.length <= maxLen) return arr;
  return arr.slice(0, maxLen);
}

function isDateField(key, value) {
  if (typeof value !== 'string') return false;
  return /date|time|created|updated|modified|timestamp/i.test(key) ||
    /^\d{4}-\d{2}-\d{2}/.test(value);
}

function isLikelyTitle(key) {
  return HEADING_KEY_PATTERNS.some(p => p.test(key));
}

function findHeadingKey(keys, sample) {
  const preferred = keys.find(k => isLikelyTitle(k));
  if (preferred) return preferred;
  const shortString = keys.find(k =>
    typeof sample[k] === 'string' &&
    sample[k].length > 0 &&
    sample[k].length < 200 &&
    !isSystemField(k) &&
    !isDateField(k, sample[k])
  );
  return shortString || keys[0];
}

function findBodyKey(keys, headingKey, sample) {
  return keys.find(k =>
    k !== headingKey &&
    typeof sample[k] === 'string' &&
    sample[k].length > LONG_TEXT_THRESHOLD
  );
}

function classifyValue(key, value) {
  if (value === null || value === undefined) return { type: 'noise', reason: 'null' };
  if (isSystemField(key)) return { type: 'noise', reason: 'system_field' };
  if (isUuidValue(value)) return { type: 'noise', reason: 'uuid_value' };

  if (Array.isArray(value)) {
    if (value.length === 0) return { type: 'noise', reason: 'empty_array' };
    const first = value[0];
    if (first === null || first === undefined) return { type: 'noise', reason: 'empty_elements' };

    if (typeof first !== 'object') {
      return { type: 'scalar-list', data: truncateArray(value, MAX_TABLE_ROWS) };
    }

    const objKeys = Object.keys(first).filter(k => !isSystemField(k));
    const hasLongText = objKeys.some(k => isLongText(first[k]));
    const truncated = truncateArray(value, MAX_TABLE_ROWS);

    if (hasLongText) {
      return {
        type: 'longtext-list',
        data: truncated,
        totalCount: value.length,
        headingKey: findHeadingKey(objKeys, first),
        bodyKey: findBodyKey(objKeys, findHeadingKey(objKeys, first), first),
        displayKeys: objKeys,
      };
    }

    return { type: 'table', data: truncated, totalCount: value.length, columns: objKeys };
  }

  if (typeof value === 'object') {
    const childKeys = Object.keys(value).filter(k => !isSystemField(k));
    if (childKeys.length === 0) return { type: 'noise', reason: 'empty_object' };
    const hasLongText = childKeys.some(k => isLongText(value[k]));
    if (hasLongText) {
      return { type: 'longtext-block', data: value, keys: childKeys };
    }
    // Recursively classify nested object children
    const nestedBlocks = [];
    const nestedScalars = [];
    for (const [childKey, childVal] of Object.entries(value)) {
      if (isSystemField(childKey)) continue;
      const childClass = classifyValue(childKey, childVal);
      if (childClass.type === 'noise') continue;
      if (childClass.type === 'scalar') {
        nestedScalars.push([childKey, childClass.data]);
      } else {
        nestedBlocks.push({ key: childKey, classification: childClass });
      }
    }
    if (nestedScalars.length > 0) {
      nestedBlocks.unshift({ key: `${key} details`, classification: { type: 'definition-list', pairs: nestedScalars } });
    }
    return { type: 'section', title: key, children: nestedBlocks, data: value, keys: childKeys };
  }

  return { type: 'scalar', data: value, key };
}

function classifyJson(data) {
  if (data === null || data === undefined) {
    return { title: 'Data Report', intro: '', blocks: [] };
  }

  if (typeof data !== 'object') {
    return {
      title: 'Data Report',
      intro: '',
      blocks: [{ key: 'value', classification: { type: 'scalar', data, key: 'value' } }],
    };
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return { title: 'Data Report', intro: '', blocks: [] };
    const first = data[0];
    if (typeof first !== 'object' || first === null) {
      return { title: 'Data Report', intro: '', blocks: [{ key: 'data', classification: { type: 'scalar-list', data } }] };
    }
    const objKeys = Object.keys(first).filter(k => !isSystemField(k));
    const hasLongText = objKeys.some(k => isLongText(first[k]));
    if (hasLongText) {
      return {
        title: 'Data Report',
        intro: '',
        blocks: [{
          key: 'data',
          classification: {
            type: 'longtext-list',
            data,
            headingKey: findHeadingKey(objKeys, first),
            bodyKey: findBodyKey(objKeys, findHeadingKey(objKeys, first), first),
            displayKeys: objKeys,
          },
        }],
      };
    }
    return { title: 'Data Report', intro: '', blocks: [{ key: 'data', classification: { type: 'table', data, columns: objKeys } }] };
  }

  const blocks = [];
  const scalarPairs = [];
  let title = '';

  for (const [key, value] of Object.entries(data)) {
    const classification = classifyValue(key, value);
    if (classification.type === 'noise') continue;
    if (classification.type === 'scalar') {
      scalarPairs.push([key, classification.data]);
    } else {
      blocks.push({ key, classification });
    }
  }

  if (scalarPairs.length > 0) {
    blocks.unshift({ key: 'details', classification: { type: 'definition-list', pairs: scalarPairs } });
  }

  for (const [key, value] of scalarPairs) {
    if (typeof value === 'string' && value.length > 2 && value.length < 200 && !isDateField(key, value)) {
      title = value;
      break;
    }
  }

  return { title: title || 'Data Report', intro: '', blocks };
}

// ============================================================
// HTML ESCAPE
// ============================================================

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// HTML RENDERERS
// ============================================================

function renderDefinitionList(pairs) {
  if (pairs.length === 0) return '';
  let html = '<table class="def-list"><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>';
  for (const [label, value] of pairs) {
    const displayValue = (value === null || value === undefined) ? '—'
      : (typeof value === 'boolean') ? (value ? 'Yes' : 'No')
      : String(value);
    html += `<tr><td class="def-label">${escapeHtml(label)}</td><td>${escapeHtml(displayValue)}</td></tr>`;
  }
  html += '</tbody></table>';
  return html;
}

function renderScalarList(data) {
  return '<ul>' + data.map(item => `<li>${escapeHtml(String(item ?? ''))}</li>`).join('') + '</ul>';
}

function renderTable(data, columns, totalCount) {
  if (columns.length === 0) return '';
  let html = '<table><thead><tr>';
  columns.forEach(k => { html += `<th>${escapeHtml(k)}</th>`; });
  html += '</tr></thead><tbody>';
  data.forEach(item => {
    html += '<tr>';
    columns.forEach(k => {
      const val = item[k];
      if (val && typeof val === 'object') {
        html += `<td>${escapeHtml(JSON.stringify(val))}</td>`;
      } else {
        html += `<td>${escapeHtml(String(val ?? ''))}</td>`;
      }
    });
    html += '</tr>';
  });
  html += '</tbody></table>';
  if (totalCount && totalCount > data.length) {
    html += `<p class="truncation-notice">Showing ${data.length} of ${totalCount} rows</p>`;
  }
  return html;
}

function renderLongTextList(block) {
  const { data, headingKey, bodyKey, displayKeys } = block.classification;
  return data.map((item, i) => {
    const heading = item[headingKey] ? escapeHtml(String(item[headingKey])) : `Section ${i + 1}`;
    let body = '';
    if (bodyKey && bodyKey !== headingKey) {
      body = `<p>${escapeHtml(String(item[bodyKey] ?? ''))}</p>`;
    }
    const otherFields = displayKeys.filter(k => k !== headingKey && k !== bodyKey && typeof item[k] !== 'object');
    if (otherFields.length > 0) {
      body += '<div class="kv-list">' + otherFields.map(k =>
        `<div class="kv"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(item[k] ?? ''))}</div>`
      ).join('') + '</div>';
    }
    return `<div class="section-block"><h3>${heading}</h3>${body}</div>`;
  }).join('\n');
}

function renderLongTextBlock(block) {
  const { data, keys } = block.classification;
  return keys.map(k => {
    const val = data[k];
    if (typeof val === 'string') {
      return `<div class="text-block"><h4>${escapeHtml(k)}</h4><p>${escapeHtml(val)}</p></div>`;
    }
    if (val && typeof val === 'object') {
      return `<div class="text-block"><h4>${escapeHtml(k)}</h4>${renderBlockData(val)}</div>`;
    }
    if (val === null || val === undefined) return '';
    return `<div class="kv"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(val))}</div>`;
  }).join('\n');
}

function renderSection(block) {
  const { title, children } = block.classification;
  const heading = title ? escapeHtml(title) : escapeHtml(block.key);

  // If we have recursively classified children, render them
  if (children && children.length > 0) {
    const childHtml = children.map(child => renderBlock(child)).filter(Boolean).join('\n');
    return `<div class="section-block"><h3>${heading}</h3>${childHtml}</div>`;
  }

  // Fallback: render raw data keys
  const { data, keys } = block.classification;
  const childContent = keys.map(k => {
    const val = data[k];
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
      return `<div class="subsection"><h4>${escapeHtml(k)}</h4>${renderBlockData(val)}</div>`;
    }
    return `<div class="kv"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(val))}</div>`;
  }).join('\n');
  return `<div class="section-block"><h3>${heading}</h3>${childContent}</div>`;
}

function renderBlockData(data) {
  if (data === null || data === undefined) return '';
  if (typeof data === 'boolean') return data ? 'Yes' : 'No';
  if (typeof data === 'number') return escapeHtml(String(data));
  if (typeof data === 'string') return escapeHtml(data);
  if (Array.isArray(data)) {
    if (data.length === 0) return '<em>No data</em>';
    const first = data[0];
    if (typeof first !== 'object' || first === null) return renderScalarList(data);
    const keys = Object.keys(first).filter(k => !isSystemField(k));
    return renderTable(data, keys);
  }
  if (typeof data === 'object') {
    return Object.entries(data).filter(([k]) => !isSystemField(k)).map(([k, v]) => {
      if (v === null || v === undefined) return '';
      if (typeof v === 'object') return `<div class="subsection"><h4>${escapeHtml(k)}</h4>${renderBlockData(v)}</div>`;
      return `<div class="kv"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</div>`;
    }).join('\n');
  }
  return escapeHtml(String(data));
}

function renderBlock(block) {
  const c = block.classification;
  switch (c.type) {
    case 'scalar':
      return `<div class="kv"><strong>${escapeHtml(block.key)}:</strong> ${escapeHtml(String(c.data ?? ''))}</div>`;
    case 'definition-list':
      return `<div class="block"><h3>${escapeHtml(block.key)}</h3>${renderDefinitionList(c.pairs)}</div>`;
    case 'scalar-list':
      return `<div class="block"><h3>${escapeHtml(block.key)}</h3>${renderScalarList(c.data)}</div>`;
    case 'table':
      return `<div class="block"><h3>${escapeHtml(block.key)}</h3>${renderTable(c.data, c.columns, c.totalCount)}</div>`;
    case 'longtext-list':
      return renderLongTextList(block);
    case 'longtext-block':
      return `<div class="block"><h3>${escapeHtml(block.key)}</h3>${renderLongTextBlock(block)}</div>`;
    case 'section':
      return renderSection(block);
    default:
      return '';
  }
}

function renderAllBlocks(blocks) {
  return blocks.map(renderBlock).filter(Boolean).join('\n');
}

module.exports = {
  classifyJson,
  classifyValue,
  isSystemField,
  isUuidValue,
  escapeHtml,
  renderBlock,
  renderAllBlocks,
  renderBlockData,
  renderDefinitionList,
  renderTable,
  renderScalarList,
  renderLongTextList,
  renderSection,
};
