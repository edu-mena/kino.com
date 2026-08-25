import { createFileRoute } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr as frLocale, ptBR } from "date-fns/locale";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
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
import { AdminPageHeading } from "@/components/admin-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { FirstUseHint } from "@/components/first-use-hint";
import { ImageUploadField } from "@/components/image-upload-field";
import type { RestaurantStory } from "@/data/types";
import { useTranslation } from "@/i18n";
import { useFirstUseHint } from "@/lib/first-use-hints";
import { useStoriesAdmin } from "@/lib/stories-admin";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";

export const Route = createFileRoute("/admin/stories")({
  head: () => ({ meta: [{ title: "Stories — Painel Kino.com" }] }),
  component: AdminStories,
});

const dateLocales = { pt: ptBR, en: enUS, fr: frLocale };

function AdminStories() {
  const { restaurant } = useRestaurantAdmin();
  const { storiesByRestaurant, createStory, deleteStory } = useStoriesAdmin();
  const [formOpen, setFormOpen] = useState(false);
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<RestaurantStory | null>(null);
  const { t, locale } = useTranslation();
  const storyHint = useFirstUseHint("story");

  if (!restaurant) return null;

  const stories = [...storiesByRestaurant(restaurant.id)].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!image.trim()) {
      toast.error(t("adminStories.missingImageError"));
      return;
    }
    createStory(restaurant.id, image.trim());
    toast.success(t("adminStories.createdToast"));
    storyHint.dismiss();
    setImage("");
    setFormOpen(false);
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteStory(deleting.id);
    toast.success(t("adminStories.deletedToast"));
    setDeleting(null);
  };

  return (
    <div className="pb-16">
      <AdminPageHeading
        eyebrow={t("adminStories.eyebrow")}
        title={t("adminStories.title")}
        description={t("adminStories.description")}
        action={
          <Button
            onClick={() => {
              setImage("");
              setFormOpen(true);
            }}
            className="rounded-xl"
          >
            <Plus className="h-4 w-4" /> {t("adminStories.newStory")}
          </Button>
        }
      />

      <div className="mx-auto mt-8 max-w-4xl px-4 md:px-6">
        {stories.length === 0 ? (
          <div className="card-soft grid place-items-center gap-3 p-12 text-center">
            <p className="text-sm text-muted-foreground">{t("adminStories.emptyText")}</p>
            <Button onClick={() => setFormOpen(true)} className="rounded-xl">
              <Plus className="h-4 w-4" /> {t("adminStories.publishFirst")}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {stories.map((story) => (
              <div
                key={story.id}
                className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface"
              >
                <img src={story.image} alt="" className="h-full w-full object-cover" />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <p className="absolute bottom-2 left-2 right-2 truncate text-xs font-medium text-white">
                  {formatDistanceToNow(new Date(story.createdAt), {
                    addSuffix: true,
                    locale: dateLocales[locale],
                  })}
                </p>
                <button
                  type="button"
                  aria-label={t("adminStories.removeAria")}
                  onClick={() => setDeleting(story)}
                  className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur transition-opacity hover:bg-destructive group-hover:opacity-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-sm rounded-[1.5rem] border-none bg-card p-6">
          <DialogTitle className="font-display text-lg font-bold">
            {t("adminStories.newStoryDialogTitle")}
          </DialogTitle>
          <DialogDescription>{t("adminStories.newStoryDialogDescription")}</DialogDescription>
          {storyHint.shouldShow && (
            <FirstUseHint text={t("adminStories.firstUseHint")} onDismiss={storyHint.dismiss} />
          )}
          <form onSubmit={handleCreate} className="mt-2 space-y-4">
            <ImageUploadField
              value={image}
              onChange={setImage}
              onUploadingChange={setUploading}
              label={t("adminStories.imageLabel")}
              helpText={t("adminStories.imageHelp")}
            />
            <Button type="submit" disabled={uploading} className="w-full rounded-xl">
              {t("adminStories.publish")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent className="rounded-[1.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("adminStories.deleteDialogTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("adminStories.deleteDialogDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("adminStories.deleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
