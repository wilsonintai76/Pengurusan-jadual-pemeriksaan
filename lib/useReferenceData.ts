import { useEffect, useMemo, useState } from 'react';
import { dataApi } from './dataApi';
import type { DepartmentInfo, LocationInfo, UserSession } from './types';

let departmentsRequest: Promise<DepartmentInfo[]> | null = null;

/** Unit bukan operasi (cth. SISTEM untuk akaun pentadbir) disembunyikan daripada senarai operasi. */
const isOperational = (department: DepartmentInfo): boolean => department.isOperational !== 0;

/** Loads the department directory from D1 once per page load. */
export function loadDepartments(): Promise<DepartmentInfo[]> {
  if (!departmentsRequest) {
    departmentsRequest = dataApi.departments
      .list()
      .then((list) => list.filter(isOperational))
      .catch((error) => {
        console.error('Gagal memuatkan senarai jabatan:', error);
        return [];
      });
  }
  return departmentsRequest;
}

export function useDepartments(): DepartmentInfo[] {
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);

  useEffect(() => {
    let active = true;
    loadDepartments().then((list) => {
      if (active) setDepartments(list);
    });
    return () => {
      active = false;
    };
  }, []);

  return departments;
}

/** Pegawai operasi sahaja — akaun pentadbir sistem bukan calon Pegawai Bertanggungjawab. */
const isAssignableOfficer = (officer: UserSession): boolean =>
  officer.status !== 'Tidak Aktif' && officer.role !== 'Pentadbir Sistem';

/**
 * Pegawai dimuatkan segar setiap kali komponen dipasang — tiada cache modul —
 * supaya perubahan lantikan di Direktori Pegawai tidak meninggalkan label lapuk.
 */
export function useOfficers(): UserSession[] {
  const [officers, setOfficers] = useState<UserSession[]>([]);

  useEffect(() => {
    let active = true;
    dataApi.officers
      .list()
      .then((list) => {
        if (active) setOfficers(list.filter(isAssignableOfficer));
      })
      .catch((error) => {
        console.error('Gagal memuatkan senarai pegawai:', error);
        if (active) setOfficers([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return officers;
}

/** Senarai lokasi berdaftar — segar setiap kali komponen dipasang (tiada cache modul). */
export function useLocations(): LocationInfo[] {
  const [locations, setLocations] = useState<LocationInfo[]>([]);

  useEffect(() => {
    let active = true;
    dataApi.locations
      .list()
      .then((list) => {
        if (active) setLocations(list);
      })
      .catch((error) => {
        console.error('Gagal memuatkan senarai lokasi:', error);
        if (active) setLocations([]);
      });
    return () => {
      active = false;
    };
  }, []);

  return locations;
}

/** PBAC cross-inspection pairing derived from `departments.cross_partner_id`. */
export function useCrossPairs(): Record<string, string> {
  const departments = useDepartments();

  return useMemo(
    () =>
      departments.reduce<Record<string, string>>((pairs, department) => {
        if (department.crossPartnerId) pairs[department.id] = department.crossPartnerId;
        return pairs;
      }, {}),
    [departments]
  );
}
