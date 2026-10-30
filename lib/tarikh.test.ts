import { describe, expect, it } from 'vitest';
import { formatJulatTarikhMY, formatTarikhMY } from './tarikh';

describe('formatTarikhMY', () => {
  it('menukar ISO kepada dd/mm/yyyy', () => {
    expect(formatTarikhMY('2026-03-01')).toBe('01/03/2026');
    expect(formatTarikhMY('2026-12-31')).toBe('31/12/2026');
  });

  it('membiarkan nilai bukan ISO atau kosong', () => {
    expect(formatTarikhMY('')).toBe('');
    expect(formatTarikhMY(null)).toBe('');
    expect(formatTarikhMY(undefined)).toBe('');
    expect(formatTarikhMY('1 Mac 2026')).toBe('1 Mac 2026');
  });
});

describe('formatJulatTarikhMY', () => {
  it('membina julat lengkap', () => {
    expect(formatJulatTarikhMY('2026-03-01', '2026-03-31')).toBe('01/03/2026 – 31/03/2026');
  });

  it('mengendalikan hujung yang kosong', () => {
    expect(formatJulatTarikhMY('', '')).toBe('');
    expect(formatJulatTarikhMY('2026-06-01', '')).toBe('01/06/2026');
    expect(formatJulatTarikhMY('', '2026-06-30')).toBe('30/06/2026');
  });
});
