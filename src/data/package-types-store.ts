import { hasRealBackend } from "@/lib/api-client";
import { INITIAL_PACKAGE_TYPES } from "./mockData";
import type { PackageType } from "./types";

/**
 * CRUD de tipos de pacote do painel de sistema (`/sistema/pacotes`) —
 * mesmo desenho de `@/data/offers-store`: funções puras e síncronas,
 * seguras em SSR. Os 4 tipos seed (`INITIAL_PACKAGE_TYPES`) nunca são
 * apagados de vez, só desativados/editados via `overrides` — mantém o
 * `id` estável para o que já referenciar esse tipo (ver Fase L3b).
 */

const PACKAGE_TYPES_KEY = "luku_package_types_admin";
const CHANGE_EVENT = "luku:menu-changed";

type PackageTypeInput = Omit<PackageType, "id">;

type PackageTypesState = {
  customTypes: PackageType[];
  overrides: Record<string, PackageTypeInput>;
  deletedIds: string[];
};

const EMPTY_STATE: PackageTypesState = { customTypes: [], overrides: {}, deletedIds: [] };

function readState(): PackageTypesState {
  if (typeof window === "undefined") return EMPTY_STATE;
  try {
    const stored = window.localStorage.getItem(PACKAGE_TYPES_KEY);
    return stored ? { ...EMPTY_STATE, ...JSON.parse(stored) } : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

function writeState(state: PackageTypesState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PACKAGE_TYPES_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Todos os tipos: seed + criados no painel de sistema − eliminados, com
 * edições aplicadas. `activeOnly` filtra os desativados — usado pela
 * descoberta pública (Fase L3d); `/sistema/pacotes` mostra sempre tudo. */
export function getEffectivePackageTypes({ activeOnly = false } = {}): PackageType[] {
  const { customTypes, overrides, deletedIds } = readState();
  const fromSeed = hasRealBackend
    ? []
    : INITIAL_PACKAGE_TYPES.filter((t) => !deletedIds.includes(t.id)).map((t) => ({
        ...t,
        ...overrides[t.id],
      }));
  const fromCustom = customTypes
    .filter((t) => !deletedIds.includes(t.id))
    .map((t) => ({ ...t, ...overrides[t.id] }));
  const all = [...fromSeed, ...fromCustom].sort((a, b) => a.position - b.position);
  return activeOnly ? all.filter((t) => t.isActive) : all;
}

export function createPackageType(input: PackageTypeInput): PackageType {
  const state = readState();
  const packageType: PackageType = { id: `package-type-custom-${Date.now()}`, ...input };
  writeState({ ...state, customTypes: [...state.customTypes, packageType] });
  return packageType;
}

export function updatePackageType(id: string, patch: Partial<PackageTypeInput>) {
  const state = readState();
  const current = getEffectivePackageTypes().find((t) => t.id === id);
  if (!current) return;
  const { id: _unused, ...currentInput } = current;
  writeState({
    ...state,
    overrides: { ...state.overrides, [id]: { ...currentInput, ...patch } },
  });
}

export function deletePackageType(id: string) {
  const state = readState();
  writeState({ ...state, deletedIds: [...state.deletedIds, id] });
}
