import { createFileRoute } from "@tanstack/react-router";
import { CalendarCheck, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminPageHeading } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Reservation } from "@/data/types";
import { getCustomerNote, setCustomerNote } from "@/data/customer-notes-store";
import { useTranslation } from "@/i18n";
import { useReservations } from "@/lib/reservations";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";

export const Route = createFileRoute("/admin/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Painel Kino.com" }] }),
  component: AdminClientes,
});

type Customer = {
  key: string;
  name: string;
  phone: string;
  email: string;
  reservations: Reservation[];
};

/** Agrupa reservas por cliente (email, com fallback pro telefone quando o
 * email vem vazio) — não há sistema de contas de cliente na app (só uma
 * conta simulada), por isso esta é a única fonte real de identidade de
 * cliente que existe: quem já pediu reserva neste restaurante. Pedidos de
 * entrega não guardam nome/contacto, por isso não entram aqui. */
function groupByCustomer(reservations: Reservation[]): Customer[] {
  const byKey = new Map<string, Customer>();
  for (const r of reservations) {
    const key = r.customerEmail || r.customerPhone || r.customerName;
    const existing = byKey.get(key);
    if (existing) {
      existing.reservations.push(r);
    } else {
      byKey.set(key, {
        key,
        name: r.customerName,
        phone: r.customerPhone,
        email: r.customerEmail,
        reservations: [r],
      });
    }
  }
  return [...byKey.values()].sort((a, b) => {
    const aLatest = Math.max(...a.reservations.map((r) => new Date(r.createdAt).getTime()));
    const bLatest = Math.max(...b.reservations.map((r) => new Date(r.createdAt).getTime()));
    return bLatest - aLatest;
  });
}

function AdminClientes() {
  const { restaurant } = useRestaurantAdmin();
  const { reservations } = useReservations();
  const [query, setQuery] = useState("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const { t } = useTranslation();

  const statusLabels: Record<string, string> = {
    Pendente: t("adminClientes.statusPending"),
    Confirmada: t("adminClientes.statusConfirmed"),
    Recusada: t("adminClientes.statusRejected"),
  };

  const customers = useMemo(() => {
    if (!restaurant) return [];
    return groupByCustomer(reservations.filter((r) => r.restaurantId === restaurant.id));
  }, [reservations, restaurant]);

  const filtered = query
    ? customers.filter((c) =>
        [c.name, c.phone, c.email].some((v) => v.toLowerCase().includes(query.toLowerCase())),
      )
    : customers;

  if (!restaurant) return null;

  const toggleExpand = (customer: Customer) => {
    if (expandedKey === customer.key) {
      setExpandedKey(null);
      return;
    }
    setExpandedKey(customer.key);
    setNoteDraft(getCustomerNote(customer.email || customer.key));
  };

  const saveNote = (customer: Customer) => {
    setCustomerNote(customer.email || customer.key, noteDraft);
    toast.success(t("adminClientes.noteSavedToast"));
  };

  return (
    <div className="pb-16">
      <AdminPageHeading
        eyebrow={t("adminClientes.eyebrow")}
        title={t("adminClientes.title")}
        description={t("adminClientes.description")}
      />

      <div className="mx-auto mt-8 max-w-4xl px-4 md:px-6">
        <label className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("adminClientes.searchPlaceholder")}
            className="w-full min-w-0 bg-transparent text-sm outline-none"
          />
        </label>

        <div className="mt-6 space-y-3">
          {filtered.length === 0 && (
            <div className="card-soft grid place-items-center gap-3 p-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {customers.length === 0
                  ? t("adminClientes.emptyNoCustomers")
                  : t("adminClientes.emptyNoResults")}
              </p>
            </div>
          )}

          {filtered.map((customer) => {
            const expanded = expandedKey === customer.key;
            const totalPeople = customer.reservations.reduce((sum, r) => sum + r.peopleCount, 0);
            return (
              <div key={customer.key} className="card-soft p-5">
                <button
                  type="button"
                  onClick={() => toggleExpand(customer)}
                  className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
                >
                  <div className="min-w-0">
                    <p className="font-display text-base font-bold text-foreground">
                      {customer.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {customer.phone} {customer.email ? `· ${customer.email}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CalendarCheck className="h-3.5 w-3.5 text-primary" />
                      {customer.reservations.length}{" "}
                      {customer.reservations.length === 1
                        ? t("adminClientes.reservationSingular")
                        : t("adminClientes.reservationPlural")}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      {totalPeople} {t("adminClientes.people")}
                    </span>
                  </div>
                </button>

                {expanded && (
                  <div className="mt-4 space-y-4 border-t border-border pt-4">
                    <div className="space-y-2">
                      {customer.reservations
                        .slice()
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                        )
                        .map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2 text-xs"
                          >
                            <span className="text-foreground">
                              {r.date} · {r.time} · {r.peopleCount} pessoas
                            </span>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 font-bold ${
                                r.status === "Confirmada"
                                  ? "bg-success/15 text-success"
                                  : r.status === "Recusada"
                                    ? "bg-destructive/15 text-destructive"
                                    : "bg-brand/15 text-brand"
                              }`}
                            >
                              {statusLabels[r.status] ?? r.status}
                            </span>
                          </div>
                        ))}
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        {t("adminClientes.notesLabel")}
                      </p>
                      <Textarea
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder={t("adminClientes.notesPlaceholder")}
                        className="rounded-xl"
                      />
                      <Button onClick={() => saveNote(customer)} size="sm" className="rounded-xl">
                        {t("adminClientes.saveNote")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
