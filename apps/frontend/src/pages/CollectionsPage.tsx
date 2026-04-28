import { useEffect, useState } from "react";

import { DndContext, useDroppable } from "@dnd-kit/core";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { PromptCard } from "../components/prompt/PromptCard";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogTrigger } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { collectionService } from "../services/collectionService";
import { promptService } from "../services/promptService";
import type { Collection, PromptRecord } from "../types";

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return fallback;
};

const CollectionDropCard = ({
  collection,
  deleting,
  onDelete
}: {
  collection: Collection;
  deleting: boolean;
  onDelete: (collectionId: string) => void;
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: collection.id
  });

  return (
    <Card
      ref={setNodeRef}
      className={`space-y-3 ${isOver ? "border-accent shadow-glow" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-2xl font-semibold">{collection.name}</h3>
          <p className="text-sm text-[var(--text-secondary)]">{collection.description}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          disabled={deleting}
          onClick={() => onDelete(collection.id)}
        >
          Delete
        </Button>
      </div>
      <p className="text-sm text-[var(--text-secondary)]">
        {collection._count?.prompts ?? collection.prompts?.length ?? 0} prompts
      </p>
    </Card>
  );
};

export const CollectionsPage = () => {
  const { t } = useTranslation();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [prompts, setPrompts] = useState<PromptRecord[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingCollection, setSavingCollection] = useState(false);
  const [syncingPromptId, setSyncingPromptId] = useState<string | null>(null);
  const [removingCollectionId, setRemovingCollectionId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: ""
  });

  const loadData = async () => {
    setLoading(true);

    try {
      const [collectionItems, promptItems] = await Promise.all([
        collectionService.list(),
        promptService.history({ page: "1", limit: "20" })
      ]);

      setCollections(collectionItems);
      setPrompts(promptItems.data.items);
    } catch (error) {
      toast.error(getErrorMessage(error, t("errors.generic")));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Library</p>
          <h1 className="mt-2 font-heading text-6xl">{t("collections.title")}</h1>
          <p className="mt-3 text-[var(--text-secondary)]">{t("collections.subtitle")}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button type="button">{t("collections.newCollection")}</Button>
          </DialogTrigger>
          <DialogContent title={t("collections.newCollection")} description={t("collections.subtitle")}>
            <div className="space-y-4">
              <Input
                placeholder={t("collections.name")}
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
              <Input
                placeholder={t("collections.description")}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => setDialogOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                disabled={savingCollection}
                onClick={async () => {
                  setSavingCollection(true);

                  try {
                    await collectionService.create(form);
                    toast.success(t("toast.collectionSaved"));
                    setForm({ name: "", description: "" });
                    setDialogOpen(false);
                    await loadData();
                  } catch (error) {
                    toast.error(getErrorMessage(error, t("errors.generic")));
                  } finally {
                    setSavingCollection(false);
                  }
                }}
              >
                {t("common.create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <DndContext
        onDragEnd={async (event) => {
          const collectionId = event.over?.id;
          const promptId = String(event.active.id);

          if (!collectionId) {
            return;
          }

          setSyncingPromptId(promptId);

          try {
            await collectionService.addPrompt(String(collectionId), promptId);
            toast.success(t("toast.promptAdded"));
            await loadData();
          } catch (error) {
            toast.error(getErrorMessage(error, t("errors.generic")));
          } finally {
            setSyncingPromptId(null);
          }
        }}
      >
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <Card className="space-y-4 p-6">
            <div>
              <p className="eyebrow">
                Drag source
              </p>
              <h2 className="mt-2 font-heading text-4xl">Recent prompts</h2>
            </div>
            <div className="space-y-3">
              {prompts.map((prompt) => (
                <PromptCard
                  key={prompt.id}
                  prompt={prompt}
                  {...(loading || syncingPromptId === prompt.id
                    ? {}
                    : { draggableId: prompt.id })}
                />
              ))}
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {collections.length > 0 ? (
              collections.map((collection) => (
                <CollectionDropCard
                  key={collection.id}
                  collection={collection}
                  deleting={removingCollectionId === collection.id}
                  onDelete={async (collectionId) => {
                    setRemovingCollectionId(collectionId);

                    try {
                      await collectionService.remove(collectionId);
                      toast.success(t("toast.collectionSaved"));
                      await loadData();
                    } catch (error) {
                      toast.error(getErrorMessage(error, t("errors.generic")));
                    } finally {
                      setRemovingCollectionId(null);
                    }
                  }}
                />
              ))
            ) : (
              <Card className="md:col-span-2">
                <h3 className="font-heading text-4xl">{t("collections.emptyTitle")}</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{t("collections.emptyBody")}</p>
              </Card>
            )}
          </div>
        </div>
      </DndContext>
    </section>
  );
};
