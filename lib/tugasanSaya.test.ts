import { describe, expect, it } from 'vitest';
import {
  adaTugasan,
  isPemeriksaUntukJadual,
  isPenyeliaUntukJadual,
  kiraTugasanSaya,
} from './tugasanSaya';

const jadual = (overrides: Record<string, unknown> = {}) =>
  ({
    pemeriksa1: '',
    pemeriksa1Email: '',
    pemeriksa2: '',
    pemeriksa2Email: '',
    penjaga: '',
    penjagaEmel: '',
    penjagaSenarai: [],
    ...overrides,
  }) as Parameters<typeof isPemeriksaUntukJadual>[0];

describe('isPemeriksaUntukJadual', () => {
  it('memadankan e-mel pemeriksa 1', () => {
    const item = jadual({ pemeriksa1: 'Ali', pemeriksa1Email: 'ali@poliku.edu.my' });
    expect(isPemeriksaUntukJadual(item, { name: 'Nama Lain', email: 'ALI@poliku.edu.my' })).toBe(true);
  });

  it('memadankan e-mel pemeriksa 2', () => {
    const item = jadual({ pemeriksa2: 'Siti', pemeriksa2Email: 'siti@poliku.edu.my' });
    expect(isPemeriksaUntukJadual(item, { email: 'siti@poliku.edu.my' })).toBe(true);
  });

  it('menolak pegawai lain walaupun namanya serupa sebahagian', () => {
    const item = jadual({ pemeriksa1: 'Ahmad Nasir', pemeriksa1Email: 'nasir@poliku.edu.my' });
    expect(isPemeriksaUntukJadual(item, { name: 'Ahmad', email: 'ahmad@poliku.edu.my' })).toBe(false);
  });

  it('gugur ke nama apabila e-mel jadual kosong', () => {
    const item = jadual({ pemeriksa1: 'Ahmad Nasir' });
    expect(isPemeriksaUntukJadual(item, { name: 'ahmad nasir', email: 'x@poliku.edu.my' })).toBe(true);
  });
});

describe('isPenyeliaUntukJadual', () => {
  it('memadankan e-mel penyelia lokasi', () => {
    const item = jadual({ penjaga: 'Azlan', penjagaEmel: 'azlan@poliku.edu.my' });
    expect(isPenyeliaUntukJadual(item, { email: 'azlan@poliku.edu.my' })).toBe(true);
  });

  it('memadankan nama dalam senarai pegawai ruang apabila e-mel kosong', () => {
    const item = jadual({
      penjaga: 'Penyelia Utama',
      penjagaSenarai: [{ nama: 'Pegawai Kedua', telefon: '011', emel: '' }],
    });
    expect(isPenyeliaUntukJadual(item, { name: 'pegawai kedua' })).toBe(true);
  });

  it('memadankan pegawai ruang kedua walaupun e-mel penyelia utama milik orang lain', () => {
    const item = jadual({
      penjaga: 'Penyelia Utama',
      penjagaEmel: 'utama@poliku.edu.my',
      penjagaSenarai: [
        { nama: 'Penyelia Utama', telefon: '011', emel: 'utama@poliku.edu.my' },
        { nama: 'Pegawai Kedua', telefon: '012', emel: 'kedua@poliku.edu.my' },
      ],
    });
    expect(isPenyeliaUntukJadual(item, { name: 'Pegawai Kedua', email: 'kedua@poliku.edu.my' })).toBe(true);
    expect(isPenyeliaUntukJadual(item, { email: 'lain@poliku.edu.my' })).toBe(false);
  });

  it('menolak pegawai yang bukan penyelia ruang', () => {
    const item = jadual({ penjaga: 'Azlan', penjagaEmel: 'azlan@poliku.edu.my' });
    expect(isPenyeliaUntukJadual(item, { email: 'lain@poliku.edu.my' })).toBe(false);
  });
});

describe('kiraTugasanSaya', () => {
  const pegawai = { name: 'Ali', email: 'ali@poliku.edu.my' };

  it('mengira pemeriksaan dan penyeliaan secara berasingan', () => {
    const senarai = [
      jadual({ pemeriksa1: 'Ali', pemeriksa1Email: 'ali@poliku.edu.my' }),
      jadual({ penjaga: 'Ali', penjagaEmel: 'ali@poliku.edu.my' }),
      jadual({ pemeriksa1: 'Siti', pemeriksa1Email: 'siti@poliku.edu.my' }),
    ];
    expect(kiraTugasanSaya(senarai, pegawai)).toEqual({
      pemeriksaan: 1,
      penyeliaan: 1,
      kedua: 0,
      jumlah: 2,
    });
  });

  it('tidak mengira dua kali apabila pemeriksa bagi ruang sendiri', () => {
    const senarai = [
      jadual({
        pemeriksa1: 'Ali',
        pemeriksa1Email: 'ali@poliku.edu.my',
        penjaga: 'Ali',
        penjagaEmel: 'ali@poliku.edu.my',
      }),
    ];
    expect(kiraTugasanSaya(senarai, pegawai)).toEqual({
      pemeriksaan: 1,
      penyeliaan: 1,
      kedua: 1,
      jumlah: 1,
    });
  });

  it('memulangkan sifar tanpa pengguna', () => {
    expect(kiraTugasanSaya([jadual({ penjaga: 'Ali' })], null)).toEqual({
      pemeriksaan: 0,
      penyeliaan: 0,
      kedua: 0,
      jumlah: 0,
    });
  });

  it('adaTugasan menerima sama ada peranan', () => {
    expect(adaTugasan(jadual({ penjaga: 'Ali', penjagaEmel: 'ali@poliku.edu.my' }), pegawai)).toBe(true);
    expect(adaTugasan(jadual({ pemeriksa2: 'Ali', pemeriksa2Email: 'ali@poliku.edu.my' }), pegawai)).toBe(true);
    expect(adaTugasan(jadual({ pemeriksa1: 'Siti', pemeriksa1Email: 'siti@poliku.edu.my' }), pegawai)).toBe(false);
  });
});
