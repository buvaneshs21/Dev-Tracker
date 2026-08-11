"use client";

import { useState } from "react";

import Modal from "@/components/ui/Modal";
import ProjectForm, {
  EMPTY_PROJECT_FORM,
  type ProjectFormValues,
} from "./ProjectForm";
import { toDateInputValue } from "@/lib/dates";
import type { ProjectDTO } from "@/lib/types";

interface ProjectFormDialogProps {
  onClose: () => void;
  /** Present when editing; absent when creating. */
  project?: ProjectDTO | null;
  onSaved: (project: ProjectDTO) => void;
}

function toFormValues(project: ProjectDTO): ProjectFormValues {
  return {
    name: project.name,
    description: project.description,
    color: project.color,
    status: project.status,
    startDate: toDateInputValue(project.startDate),
    dueDate: toDateInputValue(project.dueDate),
  };
}

/**
 * One dialog serves create and edit. The two differ only in verb, endpoint and
 * button copy — separate components would be the same form twice.
 */
/* The parent mounts this only while the dialog is open, so state initialises
 * fresh every time — a cancelled edit can't leak into the next one, and no
 * reset effect is needed. */
export default function ProjectFormDialog({
  onClose,
  project,
  onSaved,
}: ProjectFormDialogProps) {
  const editing = Boolean(project);

  const [values, setValues] = useState<ProjectFormValues>(() =>
    project ? toFormValues(project) : EMPTY_PROJECT_FORM,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(
        editing ? `/api/projects/${project?.id}` : "/api/projects",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          data.error ||
            (res.status === 401
              ? "Your session expired. Please sign in again."
              : "Could not save the project."),
        );
        setSaving(false);
        return;
      }

      const saved: ProjectDTO = await res.json();
      onSaved(saved);
      onClose();
    } catch {
      // fetch only rejects on network failure — everything else is res.ok.
      setError("Network error. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? "Edit project" : "New project"}
      description={
        editing
          ? "Update the details of this project."
          : "Group related tasks and track progress in one place."
      }
    >
      <ProjectForm
        values={values}
        onChange={setValues}
        onSubmit={submit}
        onCancel={onClose}
        saving={saving}
        formError={error}
        submitLabel={editing ? "Save changes" : "Create project"}
        pendingLabel={editing ? "Updating…" : "Creating…"}
      />
    </Modal>
  );
}
