// Reference search only. Never derives prescriptions or state/efficacy values.
export const COLUMNS = ['source_row', '名称', '功效', '性', '味', '归经', 'same_name_records'];
const norm = value => String(value ?? '').normalize('NFKC').trim().toLowerCase();

export function parseCatalog(data) {
  if (data?.schema !== 'luoxiang/herbs@1' || !Array.isArray(data.columns)
      || data.columns.join('|') !== COLUMNS.join('|') || !Array.isArray(data.rows)) throw new Error('资料目录格式不匹配。');
  const ids = new Set();
  return data.rows.map(row => {
    if (!Array.isArray(row) || row.length !== COLUMNS.length || !Number.isInteger(row[0]) || row[0] < 1
        || ids.has(row[0]) || typeof row[1] !== 'string' || !row[1].trim()
        || row.slice(2, 6).some(value => value !== null && typeof value !== 'string')
        || !Number.isInteger(row[6]) || row[6] < 1) throw new Error('资料记录格式或原始行号不一致。');
    ids.add(row[0]);
    return { id: row[0], name: row[1], effect: row[2], nature: row[3], taste: row[4], channel: row[5], sameName: row[6],
      search: norm(`${row[1]} ${row[2] ?? ''}`) };
  });
}

export function filterEntries(rows, { query = '', nature = '', channel = '' } = {}) {
  const text = norm(query), n = norm(nature), c = norm(channel);
  return rows.filter(row => (!text || row.search.includes(text)) && (!n || norm(row.nature).includes(n))
    && (!c || norm(row.channel).includes(c)));
}

export function pageOf(rows, requested = 1, size = 24) {
  const limit = Math.max(1, Math.min(100, Math.trunc(Number(size)) || 24));
  const pages = Math.max(1, Math.ceil(rows.length / limit));
  const page = Math.min(pages, Math.max(1, Math.trunc(Number(requested)) || 1));
  const start = (page-1)*limit;
  return { rows: rows.slice(start, start+limit), total: rows.length, page, pages, start: rows.length ? start+1 : 0, end: Math.min(start+limit, rows.length) };
}

export function isHerbReference(input) {
  if (typeof input === 'string') {
    const header = input.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0].split(/[,\t]/).map(s => s.trim().replace(/^"|"$/g, ''));
    return header.includes('名称') && header.includes('功效') && !header.includes('day');
  }
  if (input?.schema === 'luoxiang/herbs@1') return true;
  const rows = Array.isArray(input) ? input : input?.rows;
  const first = rows?.[0];
  return Boolean(first && typeof first === 'object' && !Array.isArray(first)
    && Object.hasOwn(first, '名称') && Object.hasOwn(first, '功效') && !Object.hasOwn(first, 'day'));
}
