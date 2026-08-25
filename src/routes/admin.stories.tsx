import { createFileRoute } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import { ImageUploadField } from "@/components/image-upload-field";
import type { RestaurantStory } from "@/data/types";
import { useStoriesAdmin } from "@/lib/stories-admin";
import { useRestaurantAdmin } from "@/lib/restaurant-admin";

export const Route = createFileRoute("/admin/stories")({
  head: () => ({ meta: [{ title: "Stories — Painel Kino.com" }] }),
  component: AdminStories,
});

function AdminStories() {
  const { restaurant } = useRestaurantAdmin();
  const { storiesByRestaurant, createStory, deleteStory } = useStoriesAdmin();
  const [formOpen, setFormOpen] = useState(false);
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<RestaurantStory | null>(null);

  if (!restaurant) return null;

  const stories = [...storiesByRestaurant(restaurant.id)].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!image.trim()) {
      toast.error("Escolha uma imagem primeiro.");
      return;
    }
    createStory(restaurant.id, image.trim());
    toast.success("Story publicado.");
    setImage("");
    setFormOpen(false);
  };

  const handleDelete = () => {
    if (!deleting) return;
    deleteStory(deleting.id);
    toast.success("Story removido.");
    setDeleting(null);
  };

  return (
    <div className="pb-16">
      <AdminPageHeading
        eyebrow="Stories"
        title="Os seus stories"
        description="Imagens temporárias em destaque na home dos clientes — igual às stories de Instagram/WhatsApp."
        action={
          <Button
            onClick={() => {
              setImage("");
              setFormOpen(true);
            }}
            className="rounded-xl"
          >
            <Plus className="h-4 w-4" /> Novo story
          </Button>
        }
      />

      <div className="mx-auto mt-8 max-w-4xl px-4 md:px-6">
        {stories.length === 0 ? (
          <div className="card-soft grid place-items-center gap-3 p-12 text-center">
            <p className="text-sm text-muted-foreground">Ainda não tem stories publicados.</p>
            <Button onClick={() => setFormOpen(true)} className="rounded-xl">
              <Plus className="h-4 w-4" /> Publicar o primeiro
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
                    locale: ptBR,
                  })}
                </p>
                <button
                  type="button"
                  aria-label="Remover story"
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
          <DialogTitle className="font-display text-lg font-bold">Novo story</DialogTitle>
          <DialogDescription>
            Fica visível para os clientes assim que publicar — sem outros campos, é só a imagem.
          </DialogDescription>
          <form onSubmit={handleCreate} className="mt-2 space-y-4">
            <ImageUploadField
              value={image}
              onChange={setImage}
              onUploadingChange={setUploading}
              label="Imagem do story"
              helpText="Cole um link ou carregue uma foto do dispositivo."
            />
            <Button type="submit" disabled={uploading} className="w-full rounded-xl">
              Publicar
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent className="rounded-[1.5rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover este story?</AlertDialogTitle>
            <AlertDialogDescription>
              Deixa de aparecer para os clientes. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
