import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, FileText, Receipt, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getRestaurant } from "@/data/helpers";
import { useAuth } from "@/lib/auth";
import { useCart, type CartOrder } from "@/lib/cart";
import { viewerKey } from "@/lib/customer";
import { formatKz } from "@/lib/format";
import { orderStatusLabel } from "@/lib/order-status";
import { getManagedRestaurantId, usePendingShare } from "@/lib/pending-share";
import { useTranslation } from "@/i18n";

type Purpose = "proof" | "invoice";
type Step = "purpose" | "restaurant" | "order";

/**
 * Aparece sempre que a Luku recebe um documento partilhado doutra app (ver
 * `@/lib/pending-share`) — pergunta o essencial para saber para onde vai:
 * primeiro o "serviço" (comprovativo, do lado do cliente, ou fatura, do
 * lado do restaurante — só pergunta se as duas sessões existirem neste
 * aparelho, senão vai direto à única possível), depois o restaurante
 * (cliente pode ter pedidos em vários; o painel do restaurante só gere um)
 * e por fim o pedido em si — escolher já anexa e fecha.
 */
export function PendingShareDialog() {
  const { t } = useTranslation();
  const { pendingShare, clearPendingShare } = usePendingShare();
  const { user } = useAuth();
  const { orders, orderTotal, setPaymentProof, setInvoice } = useCart();

  const managedRestaurantId = getManagedRestaurantId();
  const isRestaurant = !!managedRestaurantId;

  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [invoiceType, setInvoiceType] = useState<"normal" | "nif">("normal");

  // Mesma regra de "faz sentido anexar aqui" usada nos uploads manuais (ver
  // `paymentDue` em `entrega.tsx` e a condição equivalente em
  // `admin.pedidos.tsx`) — um pedido ainda pendente não tem pagamento
  // fixado para ter comprovativo, e um recusado/cancelado não devia
  // receber nem um nem outro.
  const isEligibleOrder = (o: CartOrder) =>
    o.status !== "pending" && o.status !== "rejected" && o.status !== "canceled";

  // Pedidos "meus" (conta ou convidado — `viewerKey` cobre os dois, por isso
  // não exige login para oferecer "comprovativo": um convidado com pedidos
  // também pode querer anexar um). Se não há nenhum, não faz sentido
  // oferecer essa opção no passo "serviço".
  const mineKey = viewerKey(user);
  const clientOrders = useMemo(
    () =>
      [...orders]
        .filter((o) => o.ownerKey === mineKey && isEligibleOrder(o))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders, mineKey],
  );
  const restaurantOrders = useMemo(
    () =>
      [...orders]
        .filter((o) => o.restaurantId === managedRestaurantId && isEligibleOrder(o))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders, managedRestaurantId],
  );
  const canBeProof = clientOrders.length > 0;

  // Restaurantes distintos com quem o cliente tem pedidos — só para o passo
  // "escolher o restaurante" (o painel de restaurante nunca chega lá, já
  // sabe o seu). Salta o passo sozinho quando só há um.
  const clientRestaurantIds = useMemo(
    () => [...new Set(clientOrders.map((o) => o.restaurantId))],
    [clientOrders],
  );

  // Recomeça o assistente sempre que chega um ficheiro novo — decide já o
  // que der para decidir sozinho (só um "serviço" possível neste aparelho,
  // ou o painel do restaurante, que não tem "qual restaurante" para
  // escolher — só gere o seu).
  useEffect(() => {
    if (!pendingShare) return;
    if (isRestaurant && !canBeProof) {
      setPurpose("invoice");
      setRestaurantId(managedRestaurantId);
    } else if (canBeProof && !isRestaurant) {
      setPurpose("proof");
      setRestaurantId(clientRestaurantIds.length === 1 ? (clientRestaurantIds[0] ?? null) : null);
    } else {
      setPurpose(null);
      setRestaurantId(null);
    }
    setInvoiceType("normal");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingShare]);

  const step: Step | null =
    purpose === null ? "purpose" : purpose === "proof" && !restaurantId ? "restaurant" : "order";

  useEffect(() => {
    if (purpose === "proof" && !restaurantId && clientRestaurantIds.length === 1) {
      setRestaurantId(clientRestaurantIds[0] ?? null);
    }
  }, [purpose, restaurantId, clientRestaurantIds]);

  if (!pendingShare) return null;
  const isPdf = pendingShare.mimeType === "application/pdf";

  const ordersForOrderStep =
    purpose === "invoice"
      ? restaurantOrders
      : clientOrders.filter((o) => o.restaurantId === restaurantId);

  const attachToOrder = (orderId: string) => {
    if (purpose === "invoice") {
      setInvoice(orderId, pendingShare.dataUrl, invoiceType);
      toast.success(t("adminPedidos.invoiceSentToast"));
    } else {
      setPaymentProof(orderId, pendingShare.dataUrl);
      toast.success(t("entrega.proofSentToast"));
    }
    clearPendingShare();
  };

  const goBack = () => {
    if (step === "order" && purpose === "proof" && clientRestaurantIds.length > 1) {
      setRestaurantId(null);
    } else if (step !== "purpose" && canBeProof && isRestaurant) {
      setPurpose(null);
      setRestaurantId(null);
    } else {
      clearPendingShare();
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && clearPendingShare()}>
      <DialogContent className="max-w-sm rounded-[1.5rem] border-none bg-card p-6">
        <DialogTitle className="font-display text-lg font-bold">
          {t("pendingShare.title")}
        </DialogTitle>

        <div className="mt-3 flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
          {isPdf ? (
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-card text-primary">
              <FileText className="h-5 w-5" />
            </span>
          ) : (
            <img
              src={pendingShare.dataUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-lg border border-border object-cover"
            />
          )}
          <span className="min-w-0 truncate text-sm font-semibold text-foreground">
            {pendingShare.name}
          </span>
        </div>

        {step !== "purpose" && (
          <button
            type="button"
            onClick={goBack}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {t("common.back")}
          </button>
        )}

        {step === "purpose" && (
          <div className="mt-3 space-y-2">
            {canBeProof || isRestaurant ? (
              <>
                <p className="text-xs text-muted-foreground">{t("pendingShare.purposeHint")}</p>
                {canBeProof && (
                  <button
                    type="button"
                    onClick={() => setPurpose("proof")}
                    className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-primary"
                  >
                    <Wallet className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 text-sm font-semibold">
                      {t("pendingShare.purposeProof")}
                    </span>
                  </button>
                )}
                {isRestaurant && (
                  <button
                    type="button"
                    onClick={() => setPurpose("invoice")}
                    className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-primary"
                  >
                    <Receipt className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 text-sm font-semibold">
                      {t("pendingShare.purposeInvoice")}
                    </span>
                  </button>
                )}
              </>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                {t("pendingShare.noDestination")}
              </p>
            )}
          </div>
        )}

        {step === "restaurant" && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-muted-foreground">{t("pendingShare.restaurantHint")}</p>
            {clientRestaurantIds.map((id) => {
              const r = getRestaurant(id);
              if (!r) return null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setRestaurantId(id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-primary"
                >
                  <img
                    src={r.coverImage}
                    alt=""
                    className="h-9 w-9 shrink-0 rounded-lg object-cover"
                  />
                  <span className="min-w-0 truncate text-sm font-semibold">{r.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {step === "order" && (
          <div className="mt-3 space-y-2">
            {/* Confirmação visível de para quem vai — sem isto, quando só há
                um restaurante o passo anterior nem chega a aparecer, e o
                cliente ficava sem NENHUMA indicação de para onde estava a
                enviar o comprovativo (só via nomes de restaurantes lá, o
                assistente saltava logo para aqui). */}
            {restaurantId &&
              (() => {
                const r = getRestaurant(restaurantId);
                if (!r) return null;
                return (
                  <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2">
                    <img
                      src={r.coverImage}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-lg object-cover"
                    />
                    <p className="min-w-0 truncate text-xs text-muted-foreground">
                      {t("pendingShare.sendingTo")}{" "}
                      <span className="font-semibold text-foreground">{r.name}</span>
                    </p>
                  </div>
                );
              })()}

            <p className="text-xs text-muted-foreground">{t("pendingShare.orderHint")}</p>

            {purpose === "invoice" && (
              <div className="flex gap-1.5">
                {(["normal", "nif"] as const).map((ty) => (
                  <button
                    key={ty}
                    type="button"
                    onClick={() => setInvoiceType(ty)}
                    aria-pressed={invoiceType === ty}
                    className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                      invoiceType === ty
                        ? "border-brand bg-brand/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-brand"
                    }`}
                  >
                    {t(
                      ty === "nif"
                        ? "adminPedidos.invoiceTypeNif"
                        : "adminPedidos.invoiceTypeNormal",
                    )}
                  </button>
                ))}
              </div>
            )}

            {ordersForOrderStep.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                {t("pendingShare.noOrders")}
              </p>
            ) : (
              ordersForOrderStep.slice(0, 20).map((o) => {
                const itemCount = o.lines.reduce((sum, l) => sum + l.qty, 0);
                // Já tem comprovativo/fatura — escolher aqui SUBSTITUI-o
                // sem confirmação extra (mesmo comportamento de "Substituir"
                // no upload manual), por isso avisa antes de o fazer.
                const hasExisting = purpose === "invoice" ? !!o.invoice : !!o.paymentProof;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => attachToOrder(o.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-primary"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {new Date(o.createdAt).toLocaleDateString("pt-AO", {
                          day: "2-digit",
                          month: "short",
                        })}{" "}
                        · {orderStatusLabel(o.status, t)}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t(`fulfillment.${o.fulfillmentType}`)} · {itemCount}{" "}
                        {itemCount === 1 ? t("entrega.itemSingular") : t("entrega.itemPlural")}
                        {hasExisting && ` · ${t("pendingShare.willReplace")}`}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold text-primary">
                      {formatKz(orderTotal(o))}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
