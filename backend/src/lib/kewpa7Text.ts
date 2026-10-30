export interface Kewpa7Officer {
  id: string;
  nama: string;
  jawatan: string;
}

export interface Kewpa7Asset {
  bil: number;
  noSiriPendaftaran: string;
  keteranganAset: string;
  tarikhPenempatan: string;
  statusFizikal: string;
}

export interface Kewpa7Extracted {
  bahagian: string;
  lokasi: string;
  kodLokasi: string;
  pegawaiBertanggungjawabList: Kewpa7Officer[];
  senaraiAset: Kewpa7Asset[];
}

/**
 * Buang penanda jadual/penegasan markdown dan normalkan semua jenis ruang (termasuk
 * ruang tak pecah `\u00A0` yang biasa muncul dalam PDF) kepada satu ruang biasa.
 */
function flattenLine(line: string): string {
  return line
    .replace(/\|/g, ' ')
    .replace(/\*/g, ' ')
    .replace(/^[#>]+\s*/, '')
    .replace(/[\s\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff]+/g, ' ')
    .trim();
}

/** Label yang menandakan nama pegawai dalam borang KEW.PA-7 (bukan penanda seksyen). */
const OFFICER_LABELS = [
  'nama pegawai bertanggungjawab',
  'pegawai yang bertanggungjawab',
  'pegawai bertanggungjawab',
  'pegawai pengesah',
  'nama penyelia lokasi',
  'penyelia lokasi',
  'nama penjaga premis',
  'penjaga premis',
  'nama pegawai',
  'nama penjaga',
];

/**
 * Label mesti berada di awal baris (`Pegawai Bertanggungjawab: Ahmad`), bukan di tengah
 * nilai — jika tidak, jawatan seperti "Penyelia Lokasi" akan disalah anggap sebagai label.
 * Borang sebenar menomborkan blok tandatangan sebagai `(a)` dan `(b)`.
 */
const OFFICER_LABEL_RE = new RegExp(
  `^\\s*(?:\\(?[a-z0-9]{1,2}\\)?[.)]?\\s*)?(?:${OFFICER_LABELS.join('|')})\\s*[:.]?\\s*(.*)$`,
  'i'
);

/** Penanda blok tandatangan KEW.PA-7: `(a) Disediakan oleh` dan `(b) Disahkan oleh`. */
const SECTION_VERIFIED_RE = /\bdisahkan oleh\b/i;
const SECTION_PREPARED_RE = /\bdisediakan oleh\b/i;

/** Baris berlabel lain (`Nama:`, `Jawatan:`) — bukan nilai pegawai. */
const FIELD_LABEL_RE = /^\s*[a-zA-Z][a-zA-Z /&.]{0,40}\s*[:.]\s/;

/** Teks label/penanda yang tidak boleh menjadi nama pegawai. */
const NON_NAME_RE = /^(nama|jawatan|tandatangan|disediakan|disahkan|tarikh|bil)\b/i;

/** Baris yang bermula dengan medan lain — bukan nilai untuk medan semasa. */
const FIELD_START_RE =
  /^(bahagian|jabatan|unit|kod\s*lokasi|kod|bil|tarikh|nama|jawatan|tandatangan|no)\s*[:.|]/i;

/** Sempadan antara medan apabila PDF memadatkan beberapa medan dalam satu baris. */
const FIELD_SPLIT_RE = /\s+(?=(?:bahagian|jabatan\s*\/\s*unit|jabatan|unit|lokasi)\s*[:.|])/i;

/** Penanda sementara supaya "Kod Lokasi" tidak dipisah pada ruang antara "Kod" dan "Lokasi". */
const KOD_TOKEN = '\u0000KODLOKASI\u0000';

/** Awalan yang boleh mendahului label medan: `-`, `•`, `2.`, `(b)`. */
const FIELD_PREFIX_RE = /^\s*(?:[-•·*>]+\s*|\(?[a-z0-9]{1,2}\)?[.)]\s*)*/i;

/** Label medan yang menandakan nilai sebelumnya sudah tamat. */
const NEXT_FIELD_RE = /\s+(?:kod\s*lokasi|bahagian|jabatan|unit|lokasi)\s*[:.|]/i;

/** Bersihkan nilai medan: buang pemisah depan dan potong jika medan lain menyusul. */
function sanitizeFieldValue(raw: string): string {
  return raw
    .replace(/^[\s:.\-–—|]+/, '')
    .split(NEXT_FIELD_RE)[0]
    .replace(/\s+/g, ' ')
    .trim();
}

/** Buang penomboran & pemisah awal daripada nilai label. */
function cleanOfficerValue(value: string): string {
  return value
    .replace(/^[\s:.\-–—]+/, '')
    .replace(/^\d+[.)]\s*/, '')
    .trim();
}

/**
 * Pecahkan `Nama - Jawatan`, `Nama (Jawatan)` atau `Nama, Jawatan` kepada dua medan.
 * Nilai yang mengandungi kod pendaftaran aset ditolak (baris jadual, bukan pegawai).
 */
export function parseOfficerEntry(raw: string): Kewpa7Officer | null {
  const value = cleanOfficerValue(raw);
  if (!value || value.length > 120) return null;
  if (/[/:]/.test(value)) return null;
  if (/^\d/.test(value)) return null;
  if (NON_NAME_RE.test(value)) return null;
  if (!/[a-zA-Z]{3}/.test(value)) return null;
  // Baris berulang seperti "Tiada" / "-" bukan pegawai.
  if (/^(tiada|none|n\/a|-)\.?$/i.test(value)) return null;

  let nama = value;
  let jawatan = '';

  const parenthesis = value.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (parenthesis) {
    nama = parenthesis[1];
    jawatan = parenthesis[2];
  } else {
    const dash = value.split(/\s+[-–—]\s+|\s*[-–—]\s+/);
    if (dash.length >= 2) {
      nama = dash[0];
      jawatan = dash.slice(1).join(' - ');
    } else {
      const comma = value.split(/\s*,\s*/);
      if (comma.length >= 2 && comma[0].split(' ').length <= 6) {
        nama = comma[0];
        jawatan = comma.slice(1).join(', ');
      }
    }
  }

  const cleanNama = nama.replace(/\s+/g, ' ').trim();
  if (!cleanNama || !/[a-zA-Z]{3}/.test(cleanNama)) return null;

  return {
    id: '',
    nama: cleanNama,
    jawatan: jawatan.replace(/\s+/g, ' ').trim(),
  };
}

/**
 * Kesan pegawai daripada teks KEW.PA-7.
 *
 * Borang sebenar meletakkan dua blok tandatangan bersebelahan:
 * `(a) Disediakan oleh :` di kiri dan `(b) Disahkan oleh :` di kanan, dengan baris
 * `Nama : … Jawatan : …` berulang. Oleh itu satu baris boleh mengandungi **dua** pegawai.
 * Semua nama diekstrak; pengguna boleh memadam yang tidak berkaitan dalam borang.
 */
export function parseKewpa7Officers(lines: string[]): Kewpa7Officer[] {
  const found: Kewpa7Officer[] = [];
  const seen = new Set<string>();

  const push = (entry: Kewpa7Officer | null) => {
    if (!entry) return;
    const key = entry.nama.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    found.push(entry);
  };

  lines.forEach((line, index) => {
    const labelMatch = line.match(OFFICER_LABEL_RE);
    if (labelMatch) {
      const inline = cleanOfficerValue(labelMatch[1] ?? '');
      if (inline) {
        push(parseOfficerEntry(inline));
      } else {
        // Nilai pada baris berikutnya (blok tandatangan dua baris), selagi bukan label lain.
        const next = lines[index + 1];
        if (next && !OFFICER_LABEL_RE.test(next) && !FIELD_LABEL_RE.test(next)) {
          push(parseOfficerEntry(next));
        }
      }
      return;
    }

    // Satu atau lebih pasangan `Nama : X` (dan `Jawatan : Y`) dalam baris yang sama.
    const segments = line.split(/nama\s*[:.]\s*/i).slice(1);
    if (!segments.length) return;

    segments.forEach((segment) => {
      const [namePart, jawatanPart] = segment.split(/jawatan\s*[:.]\s*/i);
      const entry = parseOfficerEntry(namePart);
      if (!entry) return;

      if (jawatanPart) {
        entry.jawatan = cleanOfficerValue(jawatanPart);
      } else {
        const next = lines[index + 1] ?? '';
        const jawatanMatch = next.match(/^\s*jawatan\s*[:.]\s*(.+)$/i);
        if (jawatanMatch) entry.jawatan = cleanOfficerValue(jawatanMatch[1]);
      }

      push(entry);
    });
  });

  const hasVerifiedBlock = lines.some((line) => SECTION_VERIFIED_RE.test(line));
  const hasPreparedBlock = lines.some((line) => SECTION_PREPARED_RE.test(line));

  // Dua blok tandatangan + dua nama: susunan lajur kiri→kanan ialah (a) Disediakan, (b) Disahkan.
  // "Disahkan oleh" dianggap penyelia lokasi, jadi didahulukan sebagai pegawai utama.
  const ordered =
    hasVerifiedBlock && hasPreparedBlock && found.length === 2 ? [found[1], found[0]] : found;

  return ordered.map((entry, index) => ({
    id: `OFF-${index + 1}`,
    nama: entry.nama,
    jawatan: entry.jawatan,
  }));
}

/**
 * Fallback heuristik: kenal pasti baris aset daripada teks KEW.PA-7 tanpa AI.
 * Kod pendaftaran biasanya berbentuk `KPT/PKS/H/07/13` atau `JKM/BGN/2026/0042`.
 */
export function parseKewpa7Text(text: string): Kewpa7Extracted | null {
  const lines = text
    .split(/\r?\n/)
    .map(flattenLine)
    // `AI.toMarkdown()` menambah blok `Metadata` (contoh: `- PDFFormatVersion=1.4`).
    .filter((line) => line && !/^[-•·*]?\s*[A-Za-z][\w.]*=/.test(line))
    .filter(Boolean);

  if (!lines.length) return null;

  /**
   * Nilai medan mesti bermula dengan label itu sendiri (`Lokasi : BENGKEL AUTOMOTIF`).
   * Pencarian subteks biasa akan menyebabkan `Kod Lokasi` mengisi medan `Lokasi`.
   *
   * PDF sebenar tidak konsisten: ada yang tiada titik bertindih (`Lokasi  BENGKEL`),
   * ada yang meletakkan nilai pada baris berikutnya, dan ada yang memadatkan beberapa
   * medan dalam satu baris. Ketiga-tiganya disokong melalui `segments`.
   */
  const segments = lines.flatMap((line) =>
    line
      // "Kod Lokasi" dilindungi dahulu supaya tidak dipisah pada ruang dalam labelnya.
      .replace(/kod\s+lokasi/gi, KOD_TOKEN)
      .split(FIELD_SPLIT_RE)
      .map((part) => part.split(KOD_TOKEN).join('Kod Lokasi'))
  );

  /**
   * Sambung nilai yang terpotong oleh baris baharu, cth.
   * `Kod Lokasi : 130101 / BGN / JKM1 / 01 /` + `B04`.
   */
  const joinContinuation = (value: string, index: number): string => {
    let result = value;

    for (let look = index + 1; look <= index + 3 && look < segments.length; look += 1) {
      const next = segments[look].replace(FIELD_PREFIX_RE, '').trim();
      if (!next || next.length > 12 || /[:|=]/.test(next)) break;

      // Kod KEW.PA-7 mempunyai 5 segmen; 4 segmen + token bilik (`B04`) = terpotong.
      const parts = result.split('/').map((part) => part.trim());
      const continuesCode =
        /[/|]$/.test(result) ||
        (parts.length === 4 && /^[A-Z]{1,3}\d{1,4}$/i.test(next));

      if (!continuesCode) break;
      result = `${result} ${next}`;
    }

    return result.replace(/\s+/g, ' ').trim();
  };

  const findValue = (labels: string[]): string => {
    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index].replace(FIELD_PREFIX_RE, '');

      for (const label of labels) {
        // Label berbilang perkataan dibenarkan berbilang ruang (`Kod  Lokasi`).
        const escaped = label
          .trim()
          .split(/\s+/)
          .map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          .join('\\s+');
        // Label berbilang perkataan (cth. "Kod Lokasi") tidak kekeliruan, jadi boleh
        // dikesan juga di tengah segmen apabila PDF memadatkan medan.
        const anchor = /\s/.test(label.trim()) ? '(?:^|\\s)' : '^';
        const match = segment.match(
          new RegExp(`${anchor}\\s*${escaped}\\b\\s*[:.|]?\\s*(.*)$`, 'i')
        );
        if (!match) continue;

        const inline = sanitizeFieldValue(match[1]);
        if (inline) return joinContinuation(inline, index);

        // Nilai pada baris berikutnya. Langkau baris pemisah sahaja (`:`, `-`).
        for (let look = 1; look <= 3; look += 1) {
          const next = segments[index + look];
          if (!next) break;
          if (FIELD_START_RE.test(next)) break;

          const value = sanitizeFieldValue(next);
          if (value) return joinContinuation(value, index + look);
        }
      }
    }
    return '';
  };

  const codePattern = /\b[A-Z]{2,}(?:\/[A-Z0-9.-]{1,}){2,}\b/g;
  const statusPattern = /\b(Baik|Rosak|Usang|Hilang|Tidak Digunakan)\b/i;

  const assets: Kewpa7Asset[] = [];

  lines.forEach((line) => {
    const codes = line.match(codePattern);
    if (!codes?.length) return;

    const noSiri = codes[0];
    const status = line.match(statusPattern)?.[0] ?? 'Baik';
    const date = line.match(/\b\d{2}\/\d{2}\/\d{4}\b/)?.[0] ?? '';

    const keterangan = line
      .replace(noSiri, ' ')
      .replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, ' ')
      .replace(statusPattern, ' ')
      .replace(/^\s*\d+[.)]?\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();

    assets.push({
      bil: assets.length + 1,
      noSiriPendaftaran: noSiri,
      keteranganAset: keterangan || 'Aset alih',
      tarikhPenempatan: date,
      statusFizikal: status,
    });
  });

  if (!assets.length) return null;

  const extent = {
    // `Bahagian` pada borang = Jabatan/Unit pemilik aset.
    bahagian: findValue(['Bahagian', 'Jabatan / Unit', 'Jabatan/Unit', 'Jabatan', 'Unit']) || '',
    kodLokasi: findValue(['Kod Lokasi']) || '',
  };
  const lokasi = findValue(['Lokasi', 'Bangunan', 'Tempat']);

  return {
    bahagian: extent.bahagian,
    lokasi,
    kodLokasi: extent.kodLokasi,
    pegawaiBertanggungjawabList: parseKewpa7Officers(lines),
    senaraiAset: assets,
  };
}
