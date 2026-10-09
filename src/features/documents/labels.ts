import { DOCUMENT_TYPES, type DocumentType } from "@/db/schema/enum-values";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  cv: "CV",
  cover_letter: "Cover letter",
};

export const DOCUMENT_TYPE_OPTIONS = DOCUMENT_TYPES.map((value) => ({
  value,
  label: DOCUMENT_TYPE_LABELS[value],
}));
