import { describe, expect, it } from 'vitest';
import { kumpulanArasDaripadaKod } from './kumpulanAras';

describe('kumpulanArasDaripadaKod', () => {
  it('mengumpulkan bilik asrama mengikut blok + aras', () => {
    const a = kumpulanArasDaripadaKod('130101 / BGN / ALA / 01 / B01', 'Asrama Lelaki Blok A Aras 1 Bilik 01');
    const b = kumpulanArasDaripadaKod('130101/BGN/ALA/01/B02', 'Asrama Lelaki Blok A Aras 1 Bilik 02');
    expect(a).toEqual({ kunci: '130101/BGN/ALA/01', nama: 'Asrama Lelaki Blok A Aras 1' });
    expect(b?.kunci).toBe(a?.kunci);
  });

  it('membezakan aras dan blok', () => {
    const aras2 = kumpulanArasDaripadaKod('130101 / BGN / ALA / 02 / B01', 'Asrama Lelaki Blok A Aras 2 Bilik 01');
    expect(aras2?.kunci).toBe('130101/BGN/ALA/02');
  });

  it('tidak mengumpulkan ruang bukan asrama atau kod tidak lengkap', () => {
    expect(kumpulanArasDaripadaKod('130101 / BGN / JKM1 / 01 / B09', 'BENGKEL MESIN')).toBeNull();
    expect(kumpulanArasDaripadaKod('130101 / BGN / ALA', 'Asrama Lelaki Blok A')).toBeNull();
  });
});
