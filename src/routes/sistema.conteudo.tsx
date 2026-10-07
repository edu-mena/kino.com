import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { GuestPagesEditor } from "@/components/guest-pages-editor";
import { ImageUploadField } from "@/components/image-upload-field";
import { SystemPageHeading } from "@/components/system-shell";
import {
  createApiSiteFaq,
  createApiSiteTeamMember,
  createApiSiteTestimonial,
  deleteApiSiteFaq,
  deleteApiSiteTeamMember,
  deleteApiSiteTestimonial,
  fetchApiSiteContent,
  updateApiSiteFaq,
  updateApiSiteSettings,
  updateApiSiteTeamMember,
  updateApiSiteTestimonial,
} from "@/data/api-site-content";
import type {
  SiteContent,
  SiteFaq,
  SiteTeamMember,
  SiteTestimonial,
} from "@/data/types-site-content";
import { useTranslation } from "@/i18n";
import { useSystemAdmin } from "@/lib/system-admin";

export const Route = createFileRoute("/sistema/conteudo")({
  head: () => ({ meta: [{ title: "Conteúdo do site — Sistema Luku.com" }] }),
  component: SistemaConteudo,
});

function SistemaConteudo() {
  const { t } = useTranslation();
  const { token } = useSystemAdmin();
  const [content, setContent] = useState<SiteContent | null>(null);

  const refetch = () => {
    fetchApiSiteContent()
      .then(setContent)
      .catch(() => {});
  };

  useEffect(refetch, []);

  return (
    <div className="pb-16">
      <SystemPageHeading
        eyebrow={t("sistema.conteudo.eyebrow")}
        title={t("sistema.conteudo.title")}
        description={t("sistema.conteudo.description")}
      />

      <div className="mx-auto mt-8 max-w-4xl px-4 md:px-6">
        <Tabs defaultValue="general">
          {/* 5 separadores: num telemóvel quebram linha em vez de sair do ecrã. */}
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="general">{t("sistema.conteudo.tabGeneral")}</TabsTrigger>
            <TabsTrigger value="team">{t("sistema.conteudo.tabTeam")}</TabsTrigger>
            <TabsTrigger value="testimonials">{t("sistema.conteudo.tabTestimonials")}</TabsTrigger>
            <TabsTrigger value="faqs">{t("sistema.conteudo.tabFaqs")}</TabsTrigger>
            <TabsTrigger value="pages">{t("sistema.conteudo.tabPages")}</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralTab content={content} token={token} onSaved={refetch} />
          </TabsContent>
          <TabsContent value="team">
            <TeamTab team={content?.team ?? []} token={token} onChanged={refetch} />
          </TabsContent>
          <TabsContent value="testimonials">
            <TestimonialsTab
              testimonials={content?.testimonials ?? []}
              token={token}
              onChanged={refetch}
            />
          </TabsContent>
          <TabsContent value="faqs">
            <FaqsTab faqs={content?.faqs ?? []} token={token} onChanged={refetch} />
          </TabsContent>
          <TabsContent value="pages">
            <GuestPagesEditor content={content} token={token} onSaved={refetch} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function GeneralTab({
  content,
  token,
  onSaved,
}: {
  content: SiteContent | null;
  token: string | null;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState({
    contactEmail: "",
    contactPhone: "",
    contactAddress: "",
    contactWhatsapp: "",
    aboutEyebrow: "",
    aboutTitle: "",
    aboutDescription: "",
  });
  const [heroValue, setHeroValue] = useState("");
  const [heroMediaType, setHeroMediaType] = useState<"image" | "video">("image");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sincroniza o rascunho com os dados carregados — só quando `content`
  // chega pela primeira vez (não a cada refetch, para não apagar edições em
  // curso do gestor logo após guardar).
  useEffect(() => {
    if (!content) return;
    const s = content.settings;
    setDraft({
      contactEmail: s.contactEmail ?? "",
      contactPhone: s.contactPhone ?? "",
      contactAddress: s.contactAddress ?? "",
      contactWhatsapp: s.contactWhatsapp ?? "",
      aboutEyebrow: s.aboutEyebrow ?? "",
      aboutTitle: s.aboutTitle ?? "",
      aboutDescription: s.aboutDescription ?? "",
    });
    setHeroValue(s.aboutHeroImageUrl ?? "");
    setHeroMediaType(s.aboutHeroMediaType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content?.settings]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    try {
      const heroChanged = heroValue.startsWith("data:");
      await updateApiSiteSettings(
        {
          contactEmail: draft.contactEmail,
          contactPhone: draft.contactPhone,
          contactAddress: draft.contactAddress,
          contactWhatsapp: draft.contactWhatsapp,
          aboutEyebrow: draft.aboutEyebrow,
          aboutTitle: draft.aboutTitle,
          aboutDescription: draft.aboutDescription,
          ...(heroChanged ? { heroMedia: { dataUrl: heroValue, mediaType: heroMediaType } } : {}),
        },
        token,
      );
      toast.success(t("sistema.conteudo.savedToast"));
      onSaved();
    } catch {
      toast.error(t("sistema.conteudo.saveFailedError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-8">
      <section className="card-soft space-y-4 p-5">
        <h2 className="font-display text-base font-bold text-primary">
          {t("sistema.conteudo.contactSectionTitle")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="contact-email">{t("sistema.conteudo.contactEmailLabel")}</Label>
            <Input
              id="contact-email"
              type="email"
              value={draft.contactEmail}
              onChange={(e) => setDraft((d) => ({ ...d, contactEmail: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-phone">{t("sistema.conteudo.contactPhoneLabel")}</Label>
            <Input
              id="contact-phone"
              value={draft.contactPhone}
              onChange={(e) => setDraft((d) => ({ ...d, contactPhone: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-address">{t("sistema.conteudo.contactAddressLabel")}</Label>
            <Input
              id="contact-address"
              value={draft.contactAddress}
              onChange={(e) => setDraft((d) => ({ ...d, contactAddress: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact-whatsapp">{t("sistema.conteudo.contactWhatsappLabel")}</Label>
            <Input
              id="contact-whatsapp"
              value={draft.contactWhatsapp}
              onChange={(e) => setDraft((d) => ({ ...d, contactWhatsapp: e.target.value }))}
            />
          </div>
        </div>
      </section>

      <section className="card-soft space-y-4 p-5">
        <h2 className="font-display text-base font-bold text-primary">
          {t("sistema.conteudo.aboutSectionTitle")}
        </h2>
        <div className="space-y-1.5">
          <Label htmlFor="about-eyebrow">{t("sistema.conteudo.aboutEyebrowLabel")}</Label>
          <Input
            id="about-eyebrow"
            value={draft.aboutEyebrow}
            onChange={(e) => setDraft((d) => ({ ...d, aboutEyebrow: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="about-title">{t("sistema.conteudo.aboutTitleLabel")}</Label>
          <Input
            id="about-title"
            value={draft.aboutTitle}
            onChange={(e) => setDraft((d) => ({ ...d, aboutTitle: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="about-description">{t("sistema.conteudo.aboutDescriptionLabel")}</Label>
          <Textarea
            id="about-description"
            rows={4}
            className="rounded-xl"
            value={draft.aboutDescription}
            onChange={(e) => setDraft((d) => ({ ...d, aboutDescription: e.target.value }))}
          />
        </div>
        <ImageUploadField
          value={heroValue}
          onChange={setHeroValue}
          onUploadingChange={setUploading}
          onMediaChange={(m) => setHeroMediaType(m.mediaType)}
          mediaType={heroMediaType}
          accept="media"
          maxVideoSec={15}
          label={t("sistema.conteudo.heroLabel")}
          helpText={t("sistema.conteudo.heroHelp")}
          crop="cover"
        />
      </section>

      <Button type="submit" className="rounded-xl" disabled={saving || uploading}>
        {t("sistema.conteudo.saveButton")}
      </Button>
    </form>
  );
}

function TeamTab({
  team,
  token,
  onChanged,
}: {
  team: SiteTeamMember[];
  token: string | null;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SiteTeamMember | null>(null);
  const [draft, setDraft] = useState({ name: "", role: "", initials: "", photoUrl: "" });
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<SiteTeamMember | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDraft({ name: "", role: "", initials: "", photoUrl: "" });
    setDialogOpen(true);
  };
  const openEdit = (member: SiteTeamMember) => {
    setEditing(member);
    setDraft({
      name: member.name,
      role: member.role,
      initials: member.initials ?? "",
      photoUrl: member.photoUrl ?? "",
    });
    setDialogOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !draft.name.trim() || !draft.role.trim()) return;
    const input = {
      name: draft.name.trim(),
      role: draft.role.trim(),
      ...(draft.initials.trim() ? { initials: draft.initials.trim() } : {}),
      ...(draft.photoUrl ? { photoUrl: draft.photoUrl } : {}),
    };
    try {
      if (editing) {
        await updateApiSiteTeamMember(editing.id, input, token);
        toast.success(t("sistema.conteudo.updatedToast"));
      } else {
        await createApiSiteTeamMember(input, token);
        toast.success(t("sistema.conteudo.createdToast"));
      }
      setDialogOpen(false);
      onChanged();
    } catch {
      toast.error(t("sistema.conteudo.saveFailedError"));
    }
  };

  return (
    <div className="mt-4">
      <div className="flex justify-end">
        <Button type="button" onClick={openCreate} className="rounded-xl">
          <Plus className="h-4 w-4" /> {t("sistema.conteudo.new")}
        </Button>
      </div>

      {team.length === 0 ? (
        <p className="card-soft mt-4 p-8 text-center text-sm text-muted-foreground">
          {t("sistema.conteudo.teamEmpty")}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {team.map((member) => (
            <div key={member.id} className="card-soft flex items-center gap-4 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold text-primary">
                {member.photoUrl ? (
                  <img src={member.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  member.initials
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold text-foreground">{member.name}</p>
                <p className="text-xs text-muted-foreground">{member.role}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  aria-label={t("sistema.conteudo.edit")}
                  onClick={() => openEdit(member)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-primary"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={t("sistema.conteudo.delete")}
                  onClick={() => setToDelete(member)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[88dvh] max-w-lg flex-col gap-0 rounded-[1.5rem] border-none bg-card p-0">
          <div className="px-6 pt-6">
            <DialogTitle className="font-display text-lg font-bold">
              {editing ? t("sistema.conteudo.teamEditTitle") : t("sistema.conteudo.teamNewTitle")}
            </DialogTitle>
          </div>
          <form
            id="team-form"
            onSubmit={submit}
            className="mt-3 space-y-3 overflow-y-auto px-6 pb-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="team-name">{t("sistema.conteudo.teamNameLabel")}</Label>
              <Input
                id="team-name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="team-role">{t("sistema.conteudo.teamRoleLabel")}</Label>
              <Input
                id="team-role"
                value={draft.role}
                onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="team-initials">{t("sistema.conteudo.teamInitialsLabel")}</Label>
              <Input
                id="team-initials"
                maxLength={4}
                value={draft.initials}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, initials: e.target.value.toUpperCase() }))
                }
              />
            </div>
            <ImageUploadField
              value={draft.photoUrl}
              onChange={(v) => setDraft((d) => ({ ...d, photoUrl: v }))}
              onUploadingChange={setUploading}
              label={t("sistema.conteudo.teamPhotoLabel")}
              crop="dish"
              purpose="site"
              token={token}
            />
          </form>
          <div className="border-t border-border px-6 py-4">
            <Button
              type="submit"
              form="team-form"
              className="w-full rounded-xl"
              disabled={uploading}
            >
              {editing ? t("sistema.conteudo.save") : t("sistema.conteudo.create")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sistema.conteudo.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("sistema.conteudo.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (toDelete && token) {
                  try {
                    await deleteApiSiteTeamMember(toDelete.id, token);
                    toast.success(t("sistema.conteudo.deletedToast"));
                    onChanged();
                  } catch {
                    toast.error(t("sistema.conteudo.deleteFailedError"));
                  }
                }
                setToDelete(null);
              }}
            >
              {t("sistema.conteudo.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TestimonialsTab({
  testimonials,
  token,
  onChanged,
}: {
  testimonials: SiteTestimonial[];
  token: string | null;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SiteTestimonial | null>(null);
  const [draft, setDraft] = useState({ name: "", role: "", quote: "", initials: "", photoUrl: "" });
  const [uploading, setUploading] = useState(false);
  const [toDelete, setToDelete] = useState<SiteTestimonial | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDraft({ name: "", role: "", quote: "", initials: "", photoUrl: "" });
    setDialogOpen(true);
  };
  const openEdit = (item: SiteTestimonial) => {
    setEditing(item);
    setDraft({
      name: item.name,
      role: item.role,
      quote: item.quote,
      initials: item.initials ?? "",
      photoUrl: item.photoUrl ?? "",
    });
    setDialogOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !draft.name.trim() || !draft.role.trim() || !draft.quote.trim()) return;
    const input = {
      name: draft.name.trim(),
      role: draft.role.trim(),
      quote: draft.quote.trim(),
      ...(draft.initials.trim() ? { initials: draft.initials.trim() } : {}),
      ...(draft.photoUrl ? { photoUrl: draft.photoUrl } : {}),
    };
    try {
      if (editing) {
        await updateApiSiteTestimonial(editing.id, input, token);
        toast.success(t("sistema.conteudo.updatedToast"));
      } else {
        await createApiSiteTestimonial(input, token);
        toast.success(t("sistema.conteudo.createdToast"));
      }
      setDialogOpen(false);
      onChanged();
    } catch {
      toast.error(t("sistema.conteudo.saveFailedError"));
    }
  };

  return (
    <div className="mt-4">
      <div className="flex justify-end">
        <Button type="button" onClick={openCreate} className="rounded-xl">
          <Plus className="h-4 w-4" /> {t("sistema.conteudo.new")}
        </Button>
      </div>

      {testimonials.length === 0 ? (
        <p className="card-soft mt-4 p-8 text-center text-sm text-muted-foreground">
          {t("sistema.conteudo.testimonialsEmpty")}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {testimonials.map((item) => (
            <div key={item.id} className="card-soft flex items-start gap-4 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-sm font-bold text-primary">
                {item.photoUrl ? (
                  <img src={item.photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  item.initials
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold text-foreground">
                  {item.name}{" "}
                  <span className="font-normal text-muted-foreground">— {item.role}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{item.quote}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  aria-label={t("sistema.conteudo.edit")}
                  onClick={() => openEdit(item)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-primary"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={t("sistema.conteudo.delete")}
                  onClick={() => setToDelete(item)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[88dvh] max-w-lg flex-col gap-0 rounded-[1.5rem] border-none bg-card p-0">
          <div className="px-6 pt-6">
            <DialogTitle className="font-display text-lg font-bold">
              {editing
                ? t("sistema.conteudo.testimonialEditTitle")
                : t("sistema.conteudo.testimonialNewTitle")}
            </DialogTitle>
          </div>
          <form
            id="testimonial-form"
            onSubmit={submit}
            className="mt-3 space-y-3 overflow-y-auto px-6 pb-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="testimonial-name">{t("sistema.conteudo.testimonialNameLabel")}</Label>
              <Input
                id="testimonial-name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="testimonial-role">{t("sistema.conteudo.testimonialRoleLabel")}</Label>
              <Input
                id="testimonial-role"
                value={draft.role}
                onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="testimonial-quote">
                {t("sistema.conteudo.testimonialQuoteLabel")}
              </Label>
              <Textarea
                id="testimonial-quote"
                rows={3}
                className="rounded-xl"
                value={draft.quote}
                onChange={(e) => setDraft((d) => ({ ...d, quote: e.target.value }))}
              />
            </div>
            <ImageUploadField
              value={draft.photoUrl}
              onChange={(v) => setDraft((d) => ({ ...d, photoUrl: v }))}
              onUploadingChange={setUploading}
              label={t("sistema.conteudo.testimonialPhotoLabel")}
              crop="dish"
              purpose="site"
              token={token}
            />
          </form>
          <div className="border-t border-border px-6 py-4">
            <Button
              type="submit"
              form="testimonial-form"
              className="w-full rounded-xl"
              disabled={uploading}
            >
              {editing ? t("sistema.conteudo.save") : t("sistema.conteudo.create")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sistema.conteudo.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("sistema.conteudo.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (toDelete && token) {
                  try {
                    await deleteApiSiteTestimonial(toDelete.id, token);
                    toast.success(t("sistema.conteudo.deletedToast"));
                    onChanged();
                  } catch {
                    toast.error(t("sistema.conteudo.deleteFailedError"));
                  }
                }
                setToDelete(null);
              }}
            >
              {t("sistema.conteudo.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FaqsTab({
  faqs,
  token,
  onChanged,
}: {
  faqs: SiteFaq[];
  token: string | null;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SiteFaq | null>(null);
  const [draft, setDraft] = useState({ question: "", answer: "" });
  const [toDelete, setToDelete] = useState<SiteFaq | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDraft({ question: "", answer: "" });
    setDialogOpen(true);
  };
  const openEdit = (faq: SiteFaq) => {
    setEditing(faq);
    setDraft({ question: faq.question, answer: faq.answer });
    setDialogOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !draft.question.trim() || !draft.answer.trim()) return;
    const input = { question: draft.question.trim(), answer: draft.answer.trim() };
    try {
      if (editing) {
        await updateApiSiteFaq(editing.id, input, token);
        toast.success(t("sistema.conteudo.updatedToast"));
      } else {
        await createApiSiteFaq(input, token);
        toast.success(t("sistema.conteudo.createdToast"));
      }
      setDialogOpen(false);
      onChanged();
    } catch {
      toast.error(t("sistema.conteudo.saveFailedError"));
    }
  };

  return (
    <div className="mt-4">
      <div className="flex justify-end">
        <Button type="button" onClick={openCreate} className="rounded-xl">
          <Plus className="h-4 w-4" /> {t("sistema.conteudo.new")}
        </Button>
      </div>

      {faqs.length === 0 ? (
        <p className="card-soft mt-4 p-8 text-center text-sm text-muted-foreground">
          {t("sistema.conteudo.faqsEmpty")}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {faqs.map((faq) => (
            <div key={faq.id} className="card-soft flex items-start gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm font-bold text-foreground">{faq.question}</p>
                <p className="mt-1 text-xs text-muted-foreground">{faq.answer}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  aria-label={t("sistema.conteudo.edit")}
                  onClick={() => openEdit(faq)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-primary"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={t("sistema.conteudo.delete")}
                  onClick={() => setToDelete(faq)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="flex max-h-[88dvh] max-w-lg flex-col gap-0 rounded-[1.5rem] border-none bg-card p-0">
          <div className="px-6 pt-6">
            <DialogTitle className="font-display text-lg font-bold">
              {editing ? t("sistema.conteudo.faqEditTitle") : t("sistema.conteudo.faqNewTitle")}
            </DialogTitle>
          </div>
          <form
            id="faq-form"
            onSubmit={submit}
            className="mt-3 space-y-3 overflow-y-auto px-6 pb-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="faq-question">{t("sistema.conteudo.faqQuestionLabel")}</Label>
              <Input
                id="faq-question"
                value={draft.question}
                onChange={(e) => setDraft((d) => ({ ...d, question: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="faq-answer">{t("sistema.conteudo.faqAnswerLabel")}</Label>
              <Textarea
                id="faq-answer"
                rows={4}
                className="rounded-xl"
                value={draft.answer}
                onChange={(e) => setDraft((d) => ({ ...d, answer: e.target.value }))}
              />
            </div>
          </form>
          <div className="border-t border-border px-6 py-4">
            <Button type="submit" form="faq-form" className="w-full rounded-xl">
              {editing ? t("sistema.conteudo.save") : t("sistema.conteudo.create")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("sistema.conteudo.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("sistema.conteudo.deleteDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (toDelete && token) {
                  try {
                    await deleteApiSiteFaq(toDelete.id, token);
                    toast.success(t("sistema.conteudo.deletedToast"));
                    onChanged();
                  } catch {
                    toast.error(t("sistema.conteudo.deleteFailedError"));
                  }
                }
                setToDelete(null);
              }}
            >
              {t("sistema.conteudo.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
