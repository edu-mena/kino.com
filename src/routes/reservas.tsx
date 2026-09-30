import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Armchair,
  CalendarCheck,
  CalendarDays,
  ChevronLeft,
  Clock,
  FileText,
  Gift,
  MessageSquare,
  Receipt,
  ShieldCheck,
  Star,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import icon from "@/assets/icon.png";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/empty-state";
import {
  DetailAction,
  DetailContactButtons,
  DetailDocuments,
  DetailHeader,
  DetailFacts,
  DetailRow,
  DetailSchedule,
  DetailSection,
  StatusBadge,
  reservationStatusVisual,
} from "@/components/detail-card";
import { ClientListFilters, FilteredEmpty, RecencyHeading } from "@/components/list-recency";
import { MediaLightbox } from "@/components/media-lightbox";
import { ReviewDialog } from "@/components/review-dialog";
import { PageHeading, PageShell } from "@/components/site-shell";
import { isRefReviewed } from "@/data/reviews-store";
import { useRestaurantDetail } from "@/data/use-restaurants-query";
import { formatKz } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { viewerKey } from "@/lib/customer";
import { fileToDocumentDataUrl, isPdfDataUrl } from "@/lib/image-upload";
import {
  EMPTY_CLIENT_LIST_FILTER,
  localDay,
  matchesClientListFilter,
  type ClientListFilter,
} from "@/lib/list-filter";
import { groupByRecency, modifiedAt } from "@/lib/recency-groups";
import { useReservations } from "@/lib/reservations";
import { useMarkKindReadOnView } from "@/lib/notifications";
import { useTranslation } from "@/i18n";

export const Route = createFileRoute("/reservas")({
  head: () => ({
    meta: [
      { title: "Reservas — Luku.com" },
      { name: "description", content: "Acompanhe e agende as suas reservas de mesa." },
      { property: "og:title", content: "Reservas — Luku.com" },
      { property: "og:image", content: icon },
    ],
  }),
  // `?reserva=<uuid>` pré-seleciona uma reserva — deep-link de notificação
  // (ver notification-list.tsx), mesmo padrão de `?r=` em sistema.subscricoes.tsx.
  validateSearch: (s: Record<string, unknown>): { reserva?: string } => {
    const reserva = s["reserva"];
    return typeof reserva === "string" && reserva ? { reserva } : {};
  },
  component: Reservas,
});

const STATUS_KEY: Record<string, string> = {
  Pendente: "statusPending",
  Confirmada: "statusConfirmed",
  Recusada: "statusRejected",
  Cancelada: "statusCanceled",
  Anulada: "statusAnnulled",
  "Não compareceu": "statusNoShow",
};

const STATUS_TONE: Record<string, string> = {
  Confirmada: "bg-success/15 text-success",
  Recusada: "bg-destructive/15 text-destructive",
  Cancelada: "bg-muted-foreground/15 text-muted-foreground",
  Anulada: "bg-muted-foreground/15 text-muted-foreground",
  "Não compareceu": "bg-destructive/15 text-destructive",
};

// `cautionStatus` já chega em português canónico (mock e API real — ver
// `CAUTION_STATUS_FROM_API` em `api-reservations.ts`, mesmo padrão do
// `status` acima), por isso comparações no código usam sempre
// "Pendente"/"Paga"/etc diretamente. Isto só traduz para o idioma da
// interface na exibição.
const CAUTION_STATUS_KEY: Record<string, string> = {
  Pendente: "cautionPending",
  Paga: "cautionPaid",
  "Sem caução": "cautionNotRequired",
  Reembolsada: "cautionRefunded",
};

// Quanto tempo uma reserva "Cancelada" continua visível pro cliente depois
// de cancelada — passado isso, some daqui (o painel do restaurante, em
// `/admin/reservas`, continua a mostrar tudo, sem este limite).
const CANCELED_VISIBLE_MS = 60_000;

function Reservas() {
  const { reserva: preselect } = Route.useSearch();
  const { reservations: allReservations, cancelReservation, setPaymentProof } = useReservations();
  const { user } = useAuth();
  // Reavalia o filtro periodicamente pra reservas "Cancelada" sumirem
  // sozinhas ao completar 1 minuto, sem precisar de um refresh da página.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);
  // Só as reservas de quem está a ver — as da seed (sem `ownerKey`) ficam
  // para o painel do restaurante.
  const mineKey = viewerKey(user);
  const reservations = useMemo(
    () =>
      allReservations.filter((r) => {
        if (r.ownerKey !== mineKey) return false;
        if (r.status !== "Cancelada") return true;
        if (!r.statusUpdatedAt) return false;
        return now - new Date(r.statusUpdatedAt).getTime() < CANCELED_VISIBLE_MS;
      }),
    [allReservations, mineKey, now],
  );
  const { t } = useTranslation();
  // Ver a lista conta como visto: o badge deste separador desce.
  useMarkKindReadOnView("client", "reservation");
  const statusText = (s: string) => (STATUS_KEY[s] ? t(`reservas.${STATUS_KEY[s]}`) : s);
  const statusTone = (s: string) => STATUS_TONE[s] ?? "bg-brand/15 text-brand";
  const cautionStatusText = (s: string) =>
    CAUTION_STATUS_KEY[s] ? t(`reservas.${CAUTION_STATUS_KEY[s]}`) : s;
  const todayStr = new Date().toISOString().slice(0, 10);

  // Mesma lógica de lista ↔ detalhe do Centro de ajuda (`/ajuda`): no mobile
  // é um ecrã de cada vez, no desktop fica lado a lado.
  const [activeId, setActiveId] = useState<string | null>(preselect ?? null);
  useEffect(() => {
    if (preselect) setActiveId(preselect);
  }, [preselect]);
  const active = reservations.find((r) => r.id === activeId) ?? null;

  // Filtros (restaurante + data) e separadores por data de modificação. O
  // filtro de data usa o dia DA reserva — é a data que cada linha mostra.
  const [filter, setFilter] = useState<ClientListFilter>(EMPTY_CLIENT_LIST_FILTER);
  const filterRestaurants = useMemo(() => {
    const byId = new Map<string, string>();
    for (const r of reservations)
      if (!byId.has(r.restaurantId)) byId.set(r.restaurantId, r.restaurantName);
    return [...byId]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [reservations]);
  const groups = useMemo(() => {
    const rows = reservations
      .filter((r) => matchesClientListFilter(filter, r.restaurantId, localDay(r.date)))
      .map((r) => ({ r, at: modifiedAt(r) }))
      .sort((a, b) => b.at.getTime() - a.at.getTime());
    return groupByRecency(rows, (x) => x.at);
  }, [reservations, filter]);
  // Só para ler a janela de cancelamento pós-confirmação configurada pelo
  // restaurante (`reservationCancellationWindowMinutes`) — as reservas em
  // si já vêm com `restaurantName`/`restaurantImage` denormalizados, sem
  // precisar do `Restaurant` completo para o resto do ecrã.
  const { data: activeRestaurant } = useRestaurantDetail(active?.restaurantId);
  const cancelWindowMinutes = activeRestaurant?.reservationCancellationWindowMinutes ?? 0;
  const canCancelConfirmed =
    !!active &&
    active.status === "Confirmada" &&
    cancelWindowMinutes > 0 &&
    !!active.statusUpdatedAt &&
    now - new Date(active.statusUpdatedAt).getTime() <= cancelWindowMinutes * 60_000;
  // Falta enviar o comprovativo da caução — é a ação que o cliente tem de
  // fazer, por isso sobe para logo a seguir à data/hora.
  const needsCautionProof =
    !!active &&
    active.cautionAmount > 0 &&
    !active.paymentProof &&
    active.cautionStatus === "Pendente" &&
    (active.status === "Pendente" || active.status === "Confirmada");
  const canRate =
    !!active &&
    active.status === "Confirmada" &&
    active.date < todayStr &&
    !isRefReviewed(`reservation:${active.id}`);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [review, setReview] = useState<{ id: string; restaurantId: string; name: string } | null>(
    null,
  );

  // Se a reserva escolhida sumir da lista (ex.: "Cancelada" há mais de 1
  // minuto), fecha o detalhe em vez de continuar a mostrar algo que já não
  // está lá.
  useEffect(() => {
    if (activeId && !reservations.some((r) => r.id === activeId)) setActiveId(null);
  }, [activeId, reservations]);

  const [canceling, setCanceling] = useState(false);

  const handleCancelReservation = async () => {
    if (!confirmCancelId || canceling) return;
    setCanceling(true);
    const ok = await cancelReservation(confirmCancelId);
    setCanceling(false);
    setConfirmCancelId(null);
    if (ok) {
      toast.success(t("reservas.canceledToast"));
    } else {
      toast.error(t("reservas.cancelErrorToast"));
    }
  };

  const [proofUploading, setProofUploading] = useState(false);
  const [proofLightboxOpen, setProofLightboxOpen] = useState(false);
  const proofIsPdf = isPdfDataUrl(active?.paymentProof);
  const [invoiceLightboxOpen, setInvoiceLightboxOpen] = useState(false);
  const invoiceIsPdf = isPdfDataUrl(active?.invoice);

  const onProofFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !active) return;
    setProofUploading(true);
    try {
      const dataUrl = await fileToDocumentDataUrl(file);
      const ok = await setPaymentProof(active.id, dataUrl);
      if (!ok) throw new Error(t("reservas.proofError"));
      toast.success(t("reservas.proofSentToast"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("reservas.proofError"));
    } finally {
      setProofUploading(false);
    }
  };

  return (
    <PageShell>
      <PageHeading
        eyebrow={t("reservas.eyebrow")}
        title={t("reservas.title")}
        description={t("reservas.description")}
      />
      <div className="mx-auto mt-8 max-w-5xl px-4 md:px-6">
        {reservations.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            description={t("reservas.emptyText")}
            action={
              <Link
                to="/restaurantes"
                className="mt-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                {t("reservas.reserveTable")}
              </Link>
            }
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
            {/* Lista */}
            <div className={`min-w-0 ${activeId !== null ? "hidden lg:block" : "block"}`}>
              <div className="space-y-4">
                <ClientListFilters
                  restaurants={filterRestaurants}
                  value={filter}
                  onChange={setFilter}
                />
                {groups.length === 0 && (
                  <FilteredEmpty onClear={() => setFilter(EMPTY_CLIENT_LIST_FILTER)} />
                )}
                {groups.map((group) => (
                  <section key={group.bucket}>
                    <RecencyHeading bucket={group.bucket} className="mb-2 px-1" />
                    <div className="space-y-3">
                      {group.items.map(({ r }) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setActiveId(r.id)}
                          className={`card-soft grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-4 text-left transition-colors hover:border-brand ${
                            activeId === r.id ? "border-brand" : ""
                          }`}
                        >
                          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface">
                            <img
                              src={r.restaurantImage}
                              alt={r.restaurantName}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-display text-base font-bold">
                              {r.restaurantName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {r.date} · {r.time} ·{" "}
                              {t("reservas.peopleCount", { count: r.peopleCount })}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusTone(r.status)}`}
                          >
                            {statusText(r.status)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
              <p className="mt-4 text-center text-xs text-muted-foreground">
                {t("reservas.footerPrefix")}{" "}
                <Link to="/restaurantes" className="font-semibold text-primary hover:underline">
                  {t("reservas.footerLink")}
                </Link>{" "}
                {t("reservas.footerSuffix")}
              </p>
            </div>

            {/* Detalhe */}
            <div className={`min-w-0 ${activeId !== null ? "block" : "hidden lg:block"}`}>
              <div className="card-soft sticky top-24 p-6">
                {active ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveId(null)}
                      className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary lg:hidden"
                    >
                      <ChevronLeft className="h-4 w-4" /> {t("common.back")}
                    </button>

                    {/* 1 · Onde e em que estado */}
                    <DetailHeader
                      image={active.restaurantImage}
                      imageSize="lg"
                      eyebrow={t("detailCard.restaurant")}
                      title={
                        <Link
                          to="/restaurantes/$id"
                          params={{ id: active.restaurantId }}
                          className="hover:underline focus-visible:underline focus-visible:outline-none"
                        >
                          {active.restaurantName}
                        </Link>
                      }
                      // No lugar da província, o tipo de reserva (como o modo
                      // nos pedidos): "Reserva de mesa" ou o nome do pacote.
                      subtitle={
                        active.package
                          ? (active.package.title ?? active.package.packageTypeName)
                          : t("detailCard.tableBooking")
                      }
                      subtitleIcon={active.package ? Gift : Armchair}
                      status={
                        <StatusBadge visual={reservationStatusVisual(active.status)}>
                          {statusText(active.status)}
                        </StatusBadge>
                      }
                    />

                    {/* 2 · Quando e quantos — o que se procura primeiro */}
                    <DetailSchedule
                      items={[
                        {
                          icon: CalendarDays,
                          label: t("detailCard.date"),
                          value: new Date(`${active.date}T12:00:00`).toLocaleDateString("pt-AO", {
                            weekday: "short",
                            day: "2-digit",
                            month: "short",
                          }),
                        },
                        { icon: Clock, label: t("detailCard.time"), value: active.time },
                        {
                          icon: Users,
                          label: t("detailCard.people"),
                          value: active.peopleCount,
                        },
                      ]}
                    />

                    {/* 3 · O que falta fazer — pagar a caução */}
                    {needsCautionProof && (
                      <DetailSection
                        tone="warning"
                        icon={ShieldCheck}
                        title={t("detailCard.cautionTitle")}
                        description={t("detailCard.cautionBody")}
                      >
                        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90">
                          <Upload className="h-4 w-4" />
                          {proofUploading
                            ? t("reservas.proofUploading")
                            : t("reservas.proofUpload")}
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            disabled={proofUploading}
                            onChange={onProofFile}
                          />
                        </label>
                      </DetailSection>
                    )}

                    {/* 4 · Factos — só o que existe */}
                    {(active.cautionAmount > 0 || active.specialRequests) && (
                      <DetailFacts>
                        {active.cautionAmount > 0 && (
                          <DetailRow
                            icon={ShieldCheck}
                            label={t("reservas.detailDeposit")}
                            span
                            hint={
                              <>
                                {cautionStatusText(active.cautionStatus)}
                                {active.promoCode && (
                                  <span className="block font-semibold text-success">
                                    {t("reservas.promoApplied", { code: active.promoCode })}
                                  </span>
                                )}
                              </>
                            }
                          >
                            {formatKz(active.cautionAmount)}
                          </DetailRow>
                        )}
                        {active.specialRequests && (
                          <DetailRow icon={MessageSquare} label={t("reservas.detailRequests")} span>
                            {active.specialRequests}
                          </DetailRow>
                        )}
                      </DetailFacts>
                    )}

                    {/* 5 · Comprovativo e fatura lado a lado — o conteúdo abre por baixo */}
                    <DetailDocuments
                      items={[
                        ...(active.paymentProof
                          ? [
                              {
                                key: "proof",
                                icon: Upload,
                                title: t("reservas.proofTitle"),
                                status: t("reservas.proofSent"),
                                tone: "done" as const,
                                content: (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setProofLightboxOpen(true)}
                                      aria-label={t("reservas.proofViewAria")}
                                      className="block w-full"
                                    >
                                      {proofIsPdf ? (
                                        <span className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:border-primary">
                                          <FileText className="h-5 w-5 shrink-0 text-primary" />
                                          {t("reservas.proofPdfLabel")}
                                        </span>
                                      ) : (
                                        <img
                                          src={active.paymentProof}
                                          alt=""
                                          className="max-h-56 w-full rounded-lg border border-border object-contain transition-opacity hover:opacity-90"
                                        />
                                      )}
                                    </button>
                                    <MediaLightbox
                                      open={proofLightboxOpen}
                                      onOpenChange={setProofLightboxOpen}
                                      src={active.paymentProof}
                                      isPdf={proofIsPdf}
                                      title={t("reservas.proofTitle")}
                                    />
                                  </>
                                ),
                              },
                            ]
                          : []),
                        ...(active.invoice ||
                        active.status === "Confirmada" ||
                        active.status === "Não compareceu"
                          ? [
                              {
                                key: "invoice",
                                icon: Receipt,
                                title: t("reservas.invoiceTitle"),
                                status: active.invoice
                                  ? t("reservas.invoiceIssued")
                                  : t("detailCard.docWaiting"),
                                tone: active.invoice ? ("done" as const) : ("pending" as const),
                                content: active.invoice ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setInvoiceLightboxOpen(true)}
                                      aria-label={t("reservas.invoiceViewAria")}
                                      className="block w-full"
                                    >
                                      {invoiceIsPdf ? (
                                        <span className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:border-primary">
                                          <FileText className="h-5 w-5 shrink-0 text-primary" />
                                          {t("reservas.invoicePdfLabel")}
                                        </span>
                                      ) : (
                                        <img
                                          src={active.invoice}
                                          alt=""
                                          className="max-h-56 w-full rounded-lg border border-border object-contain transition-opacity hover:opacity-90"
                                        />
                                      )}
                                    </button>
                                    <MediaLightbox
                                      open={invoiceLightboxOpen}
                                      onOpenChange={setInvoiceLightboxOpen}
                                      src={active.invoice}
                                      isPdf={invoiceIsPdf}
                                      title={t("reservas.invoiceTitle")}
                                    />
                                  </>
                                ) : (
                                  <p className="text-xs text-muted-foreground">
                                    {t("reservas.invoicePending")}
                                  </p>
                                ),
                              },
                            ]
                          : []),
                      ]}
                    />

                    {/* 6 · Contacto e ações finais */}
                    {activeRestaurant?.phone &&
                      (active.status === "Pendente" || active.status === "Confirmada") &&
                      active.date >= todayStr && (
                        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-5">
                          <span className="min-w-0 text-sm">
                            <span className="block text-xs text-muted-foreground">
                              {t("entrega.complaintContact")}
                            </span>
                            <span className="font-semibold text-foreground">
                              {activeRestaurant.phone}
                            </span>
                          </span>
                          <span className="flex items-center gap-2">
                            <DetailContactButtons
                              phone={activeRestaurant.phone}
                              callLabel={t("detailCard.call")}
                              whatsappLabel={t("detailCard.whatsapp")}
                            />
                          </span>
                        </div>
                      )}

                    {(active.status === "Pendente" || canCancelConfirmed || canRate) && (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {canRate && (
                          <div className="flex-1">
                            <DetailAction
                              variant="solid"
                              block
                              icon={Star}
                              onClick={() =>
                                setReview({
                                  id: active.id,
                                  restaurantId: active.restaurantId,
                                  name: active.restaurantName,
                                })
                              }
                            >
                              {t("reservas.rate")}
                            </DetailAction>
                          </div>
                        )}
                        {(active.status === "Pendente" || canCancelConfirmed) && (
                          <button
                            type="button"
                            onClick={() => setConfirmCancelId(active.id)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-destructive/40 px-4 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/5"
                          >
                            <X className="h-4 w-4" />
                            {t("reservas.cancel")}
                          </button>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="grid place-items-center gap-3 py-12 text-center">
                    <CalendarCheck className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{t("reservas.chooseHint")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <AlertDialog
        open={confirmCancelId !== null}
        onOpenChange={(open) => !open && setConfirmCancelId(null)}
      >
        <AlertDialogContent className="rounded-[1.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("reservas.confirmCancelTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("reservas.confirmCancelDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelReservation}>
              {t("reservas.confirmCancelAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {review && (
        <ReviewDialog
          open
          onOpenChange={(o) => !o && setReview(null)}
          restaurantId={review.restaurantId}
          restaurantName={review.name}
          sourceRef={`reservation:${review.id}`}
        />
      )}
    </PageShell>
  );
}
