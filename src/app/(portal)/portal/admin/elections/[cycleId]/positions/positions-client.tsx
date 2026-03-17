"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import {
  createElectionPositionAction,
  deleteElectionPositionAction,
  reorderElectionPositionsAction,
  updateElectionPositionAction,
} from "@/app/actions/admin-voting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

type Position = {
  id: string;
  title: string;
  description: string | null;
  maxWinners: number;
  maxNominations: number;
};

function SortablePositionRow({
  position,
  onEdit,
  onDelete,
}: {
  position: Position;
  onEdit: (position: Position) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: position.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-wrap items-center justify-between gap-2 rounded-(--r-md) border border-border bg-(--white) px-3 py-2"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-(--r-sm) text-(--text-3) hover:bg-(--surface)"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <div>
          <p className="text-sm font-semibold text-(--text-1)">{position.title}</p>
          <p className="text-xs text-(--text-3)">
            Winners: {position.maxWinners} · Max nominations: {position.maxNominations}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => onEdit(position)}>
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-(--error) hover:text-(--error)"
          onClick={() => onDelete(position.id)}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

export function ElectionPositionsClient({
  cycleId,
  positions: initialPositions,
}: {
  cycleId: string;
  positions: Position[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [positions, setPositions] = React.useState(initialPositions);
  const [editing, setEditing] = React.useState<Position | null>(null);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [maxWinners, setMaxWinners] = React.useState(1);
  const [maxNominations, setMaxNominations] = React.useState(10);
  const [isBusy, setBusy] = React.useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function resetForm() {
    setEditing(null);
    setTitle("");
    setDescription("");
    setMaxWinners(1);
    setMaxNominations(10);
  }

  function beginEdit(position: Position) {
    setEditing(position);
    setTitle(position.title);
    setDescription(position.description ?? "");
    setMaxWinners(position.maxWinners);
    setMaxNominations(position.maxNominations);
  }

  async function handleSave() {
    if (!title.trim()) {
      toast({ title: "Title is required." });
      return;
    }
    setBusy(true);
    const result = editing
      ? await updateElectionPositionAction({
          positionId: editing.id,
          title: title.trim(),
          description: description.trim() || null,
          maxWinners,
          maxNominations,
        })
      : await createElectionPositionAction({
          cycleId,
          title: title.trim(),
          description: description.trim() || null,
          maxWinners,
          maxNominations,
        });
    setBusy(false);
    if (!result.ok) {
      toast({ title: "Could not save position", description: result.message });
      return;
    }
    toast({ title: editing ? "Position updated" : "Position created", variant: "success" });
    resetForm();
    router.refresh();
  }

  async function handleDelete(positionId: string) {
    const confirmed = window.confirm("Delete this position?");
    if (!confirmed) return;
    const result = await deleteElectionPositionAction(positionId);
    if (!result.ok) {
      toast({ title: "Delete failed", description: result.message });
      return;
    }
    toast({ title: "Position deleted", variant: "success" });
    router.refresh();
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setPositions((previous) => {
      const oldIndex = previous.findIndex((item) => item.id === active.id);
      const newIndex = previous.findIndex((item) => item.id === over.id);
      const reordered = arrayMove(previous, oldIndex, newIndex);
      void reorderElectionPositionsAction(
        cycleId,
        reordered.map((item) => item.id),
      ).then((result) => {
        if (!result.ok) {
          toast({ title: "Could not persist order", description: result.message });
          return;
        }
        toast({ title: "Position order saved", variant: "success" });
        router.refresh();
      });
      return reordered;
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-(--r-lg) border border-border bg-(--white) p-4">
        <h3 className="text-base font-semibold text-(--text-1)">
          {editing ? "Edit position" : "Add position"}
        </h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Input label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
          <Input
            label="Max winners"
            type="number"
            min={1}
            value={maxWinners}
            onChange={(event) => setMaxWinners(Number(event.target.value) || 1)}
          />
          <Input
            label="Max nominations"
            type="number"
            min={1}
            value={maxNominations}
            onChange={(event) => setMaxNominations(Number(event.target.value) || 1)}
          />
          <div className="md:col-span-2">
            <Textarea
              label="Description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <Button variant="navy" onClick={() => void handleSave()} isLoading={isBusy}>
              {editing ? "Update Position" : "Add Position"}
            </Button>
            {editing ? (
              <Button variant="outline" onClick={resetForm}>
                Cancel
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-(--r-lg) border border-border bg-(--white) p-4">
        <h3 className="text-base font-semibold text-(--text-1)">Position order</h3>
        <div className="mt-3 space-y-2">
          <DndContext sensors={sensors} onDragEnd={onDragEnd}>
            <SortableContext items={positions.map((position) => position.id)} strategy={verticalListSortingStrategy}>
              {positions.map((position) => (
                <SortablePositionRow
                  key={position.id}
                  position={position}
                  onEdit={beginEdit}
                  onDelete={(id) => void handleDelete(id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
}
