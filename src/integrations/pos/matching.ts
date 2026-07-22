import type { ExternalEmployee, ExternalTable } from "./types";

export type LocalEmployeeCandidate = {
  id: string;
  employeeCode: string;
  name: string;
};

export type LocalTableCandidate = {
  id: string;
  number: number;
  name: string;
};

export function matchExternalEmployee(
  external: ExternalEmployee,
  candidates: LocalEmployeeCandidate[],
): LocalEmployeeCandidate | null {
  if (!external.employeeCode) return null;
  const code = external.employeeCode.trim().toUpperCase();
  const matches = candidates.filter(
    (candidate) => candidate.employeeCode.trim().toUpperCase() === code,
  );
  return matches.length === 1 ? matches[0] : null;
}

function normalizedTableName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export function matchExternalTable(
  external: ExternalTable,
  candidates: LocalTableCandidate[],
): LocalTableCandidate | null {
  if (external.tableNumber !== undefined) {
    const numberMatches = candidates.filter(
      (candidate) => candidate.number === external.tableNumber,
    );
    if (numberMatches.length === 1) return numberMatches[0];
  }
  const name = normalizedTableName(external.name);
  const nameMatches = candidates.filter(
    (candidate) => normalizedTableName(candidate.name) === name,
  );
  return nameMatches.length === 1 ? nameMatches[0] : null;
}
