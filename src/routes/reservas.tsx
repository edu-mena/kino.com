import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarCheck, ChevronLeft, FileText, Star, Upload, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { MediaLightbox } from "@/components/media-lightbox";
import { ReviewDialog } from "@/components/review-dialog";
import { PageHeading, PageShell } from "@/components/site-shell";
import { isRefReviewed } from "@/data/reviews-store";
import { useRestaurantDetail } from "@/data/use-restaurants-query";
import { formatKz } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { viewerKey } from "@/lib/customer";
import { fileToDocumentDataUrl, isPdfDataUrl } from "@/lib/image-upload";
import { useReservations } from "@/lib/reservations";
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
  const statusText = (s: string) => (STATUS_KEY[s] ? t(`reservas.${STATUS_KEY[s]}`) : s);
  const statusTone = (s: string) => STATUS_TONE[s] ?? "bg-brand/15 text-brand";
  const cautionStatusText = (s: string) =>
    CAUTION_STATUS_KEY[s] ? t(`reservas.${CAUTION_STATUS_KEY[s]}`) : s;
  const todayStr = new Date().toISOString().slice(0, 10);

  // Mesma lógica de lista ↔ detalhe do Centro de ajuda (`/ajuda`): no mobile
  // é um ecrã de cada vez, no desktop fica lado a lado.
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = reservations.find((r) => r.id === activeId) ?? null;
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
              <div className="space-y-3">
                {reservations.map((r) => (
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
                        {r.date} · {r.time} · {t("reservas.peopleCount", { count: r.peopleCount })}
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

                    <div className="flex items-center gap-3">
                      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface">
                        <img
                          src={active.restaurantImage}
                          alt={active.restaurantName}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <h2 className="min-w-0 flex-1 truncate font-display text-lg font-bold text-primary">
                        {active.restaurantName}
                      </h2>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusTone(active.status)}`}
                      >
                        {statusText(active.status)}
                      </span>
                    </div>

                    <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-t border-border pt-5 text-sm">
                      <Field label={t("reservas.detailWhen")}>
                        {active.date} · {active.time}
                      </Field>
                      <Field label={t("reservas.detailPeople")}>
                        {t("reservas.peopleCount", { count: active.peopleCount })}
                      </Field>
                      {active.cautionAmount > 0 && (
                        <Field label={t("reservas.detailDeposit")}>
                          {formatKz(active.cautionAmount)}
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {cautionStatusText(active.cautionStatus)}
                          </span>
                          {active.promoCode && (
                            <span className="mt-0.5 block text-xs font-semibold text-success">
                              {t("reservas.promoApplied", { code: active.promoCode })}
                            </span>
                          )}
                        </Field>
                      )}
                    </dl>

                    <div className="mt-4 border-t border-border pt-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        {t("reservas.detailRequests")}
                      </p>
                      <p className="mt-1.5 rounded-lg bg-surface p-3 text-sm text-foreground">
                        {active.specialRequests || t("reservas.noRequests")}
                      </p>
                    </div>

                    {/* Comprovativo de pagamento da caução */}
                    {active.cautionAmount > 0 &&
                      (active.paymentProof || active.cautionStatus === "Pendente") && (
                        <div className="mt-4 border-t border-border pt-4">
                          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            {t("reservas.proofTitle")}
                          </p>
                          {active.paymentProof ? (
                            <div className="mt-2 space-y-2">
                              <button
                                type="button"
                                onClick={() => setProofLightboxOpen(true)}
                                aria-label={t("reservas.proofViewAria")}
                                className="block w-full"
                              >
                                {proofIsPdf ? (
                                  <span className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:border-primary">
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
                              <span className="block text-xs font-semibold text-success">
                                {t("reservas.proofSent")}
                              </span>
                              <MediaLightbox
                                open={proofLightboxOpen}
                                onOpenChange={setProofLightboxOpen}
                                src={active.paymentProof}
                                isPdf={proofIsPdf}
                                title={t("reservas.proofTitle")}
                              />
                            </div>
                          ) : (
                            <>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {t("reservas.proofHint")}
                              </p>
                              <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/50 px-4 py-3 text-xs font-bold text-primary transition-colors hover:bg-primary/5">
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
                            </>
                          )}
                        </div>
                      )}

                    {/* Fatura emitida pelo restaurante — o cliente só vê, não carrega.
                        Combina o consumo e a caução; numa reserva "não compareceu",
                        é só a caução. */}
                    {(active.invoice ||
                      active.status === "Confirmada" ||
                      active.status === "Não compareceu") && (
                      <div className="mt-4 border-t border-border pt-4">
                        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          {t("reservas.invoiceTitle")}
                        </p>
                        {active.invoice ? (
                          <div className="mt-2 space-y-2">
                            <button
                              type="button"
                              onClick={() => setInvoiceLightboxOpen(true)}
                              aria-label={t("reservas.invoiceViewAria")}
                              className="block w-full"
                            >
                              {invoiceIsPdf ? (
                                <span className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:border-primary">
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
                            <span className="block text-xs font-semibold text-success">
                              {t("reservas.invoiceIssued")}
                            </span>
                            <MediaLightbox
                              open={invoiceLightboxOpen}
                              onOpenChange={setInvoiceLightboxOpen}
                              src={active.invoice}
                              isPdf={invoiceIsPdf}
                              title={t("reservas.invoiceTitle")}
                            />
                          </div>
                        ) : (
                          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarCheck className="h-3.5 w-3.5 shrink-0" />
                            {t("reservas.invoicePending")}
                          </p>
                        )}
                      </div>
                    )}

                    {(active.status === "Pendente" ||
                      canCancelConfirmed ||
                      (active.status === "Confirmada" &&
                        active.date < todayStr &&
                        !isRefReviewed(`reservation:${active.id}`))) && (
                      <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5">
                        {(active.status === "Pendente" || canCancelConfirmed) && (
                          <button
                            type="button"
                            onClick={() => setConfirmCancelId(active.id)}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-dashed border-destructive/50 px-4 py-2.5 text-xs font-semibold text-destructive transition-colors hover:bg-destructive/5"
                          >
                            <X className="h-3.5 w-3.5" />
                            {t("reservas.cancel")}
                          </button>
                        )}
                        {active.status === "Confirmada" &&
                          active.date < todayStr &&
                          !isRefReviewed(`reservation:${active.id}`) && (
                            <button
                              type="button"
                              onClick={() =>
                                setReview({
                                  id: active.id,
                                  restaurantId: active.restaurantId,
                                  name: active.restaurantName,
                                })
                              }
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
                            >
                              <Star className="h-3.5 w-3.5" />
                              {t("reservas.rate")}
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

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-foreground">{children}</dd>
    </div>
  );
}
