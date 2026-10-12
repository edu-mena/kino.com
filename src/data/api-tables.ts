import { apiFetch } from "@/lib/api-client";
import type {
  RestaurantTable,
  TableCombination,
  TableFeature,
  TableInput,
  TablePatch,
  TableShape,
} from "./tables-store";

/** CRUD real de mesas, junções por dia e códigos QR
 * (backend/app/Http/Controllers/Api/V1/RestaurantTableController.php,
 * TableCombinationController.php, QrCodeController.php) — só usado quando
 * `hasRealBackend`. Tudo exige `token` (staff, `manageOperations`), exceto
 * `resolveApiQr`, que é o telemóvel do cliente a abrir o QR. */

type ApiTable = {
  id: string;
  name: string;
  seats: number;
  area: string | null;
  description?: string | null;
  features?: string[];
  shape?: string;
  isCombinable?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  qrCode?: { code: string; scans: number; lastScannedAt: string | null } | null;
};

function mapApiTable(t: ApiTable, restaurantId: string): RestaurantTable {
  return {
    id: t.id,
    restaurantId,
    name: t.name,
    seats: t.seats,
    ...(t.area ? { area: t.area } : {}),
    ...(t.description ? { description: t.description } : {}),
    features: (t.features ?? []) as TableFeature[],
    shape: (t.shape ?? "square") as TableShape,
    isCombinable: t.isCombinable ?? true,
    isActive: t.isActive ?? true,
    sortOrder: t.sortOrder ?? 0,
    ...(t.qrCode
      ? {
          qr: {
            code: t.qrCode.code,
            scans: t.qrCode.scans,
            ...(t.qrCode.lastScannedAt ? { lastScannedAt: t.qrCode.lastScannedAt } : {}),
          },
        }
      : {}),
  };
}

/** camelCase do frontend → snake_case do FormRequest. */
function tableBody(input: TablePatch): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (input.name !== undefined) body["name"] = input.name;
  if (input.seats !== undefined) body["seats"] = input.seats;
  if (input.area !== undefined) body["area"] = input.area || null;
  if (input.description !== undefined) body["description"] = input.description || null;
  if (input.features !== undefined) body["features"] = input.features;
  if (input.shape !== undefined) body["shape"] = input.shape;
  if (input.isCombinable !== undefined) body["is_combinable"] = input.isCombinable;
  if (input.isActive !== undefined) body["is_active"] = input.isActive;
  return body;
}

export async function fetchApiTables(
  restaurantId: string,
  token: string,
): Promise<RestaurantTable[]> {
  const { data } = await apiFetch<{ data: ApiTable[] }>(`/restaurants/${restaurantId}/tables`, {
    token,
  });
  return data.map((t) => mapApiTable(t, restaurantId));
}

export async function createApiTable(
  restaurantId: string,
  input: Omit<TableInput, "restaurantId">,
  token: string,
): Promise<RestaurantTable> {
  const { data } = await apiFetch<{ data: ApiTable }>(`/restaurants/${restaurantId}/tables`, {
    method: "POST",
    token,
    body: tableBody(input),
  });
  return mapApiTable(data, restaurantId);
}

export async function createApiTablesBulk(
  restaurantId: string,
  spec: {
    prefix: string;
    start: number;
    count: number;
    seats: number;
    area?: string;
    shape?: TableShape;
  },
  token: string,
): Promise<RestaurantTable[]> {
  const { data } = await apiFetch<{ data: ApiTable[] }>(
    `/restaurants/${restaurantId}/tables/bulk`,
    { method: "POST", token, body: spec },
  );
  return data.map((t) => mapApiTable(t, restaurantId));
}

export async function updateApiTable(
  id: string,
  restaurantId: string,
  patch: TablePatch,
  token: string,
): Promise<RestaurantTable> {
  const { data } = await apiFetch<{ data: ApiTable }>(`/tables/${id}`, {
    method: "PATCH",
    token,
    body: tableBody(patch),
  });
  return mapApiTable(data, restaurantId);
}

export async function reorderApiTables(
  restaurantId: string,
  ids: string[],
  token: string,
): Promise<void> {
  await apiFetch(`/restaurants/${restaurantId}/tables/order`, {
    method: "PUT",
    token,
    body: { ids },
  });
}

export async function deleteApiTable(id: string, token: string): Promise<void> {
  await apiFetch(`/tables/${id}`, { method: "DELETE", token });
}

// ── Junções por dia ──────────────────────────────────────────────────────

type ApiCombination = {
  id: string;
  date: string;
  seats: number;
  label: string | null;
  tableIds?: string[];
};

function mapApiCombination(c: ApiCombination, restaurantId: string): TableCombination {
  return {
    id: c.id,
    restaurantId,
    date: c.date,
    seats: c.seats,
    tableIds: c.tableIds ?? [],
    ...(c.label ? { label: c.label } : {}),
  };
}

export async function fetchApiCombinations(
  restaurantId: string,
  range: { from: string; to: string },
  token: string,
): Promise<TableCombination[]> {
  const { data } = await apiFetch<{ data: ApiCombination[] }>(
    `/restaurants/${restaurantId}/table-combinations?from=${range.from}&to=${range.to}`,
    { token },
  );
  return data.map((c) => mapApiCombination(c, restaurantId));
}

export async function createApiCombination(
  restaurantId: string,
  input: { date: string; tableIds: string[]; seats?: number; label?: string },
  token: string,
): Promise<TableCombination> {
  const { data } = await apiFetch<{ data: ApiCombination }>(
    `/restaurants/${restaurantId}/table-combinations`,
    {
      method: "POST",
      token,
      body: {
        date: input.date,
        table_ids: input.tableIds,
        ...(input.seats ? { seats: input.seats } : {}),
        ...(input.label ? { label: input.label } : {}),
      },
    },
  );
  return mapApiCombination(data, restaurantId);
}

export async function updateApiCombination(
  id: string,
  restaurantId: string,
  patch: { seats?: number; label?: string; tableIds?: string[] },
  token: string,
): Promise<TableCombination> {
  const body: Record<string, unknown> = {};
  if (patch.seats !== undefined) body["seats"] = patch.seats;
  if (patch.label !== undefined) body["label"] = patch.label || null;
  if (patch.tableIds !== undefined) body["table_ids"] = patch.tableIds;
  const { data } = await apiFetch<{ data: ApiCombination }>(`/table-combinations/${id}`, {
    method: "PATCH",
    token,
    body,
  });
  return mapApiCombination(data, restaurantId);
}

export async function deleteApiCombination(id: string, token: string): Promise<void> {
  await apiFetch(`/table-combinations/${id}`, { method: "DELETE", token });
}
