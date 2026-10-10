import { COMPETENCIES, type Competency } from "@/db/schema/enum-values";

export const COMPETENCY_LABELS: Record<Competency, string> = {
  ownership: "Ownership",
  conflict: "Konflik",
  failure: "Kegagalan",
  technical_depth: "Kedalaman teknis",
  leadership: "Kepemimpinan",
  ambiguity: "Ambiguitas",
  collaboration: "Kolaborasi",
  impact: "Dampak",
};

export const COMPETENCY_OPTIONS = COMPETENCIES.map((value) => ({
  value,
  label: COMPETENCY_LABELS[value],
}));

// The four parts of a story, with the hint shown under each field.
export const STAR_PARTS = [
  {
    name: "situation",
    label: "Situasi",
    hint: "Konteksnya apa? Tim, produk, dan masalah yang sedang terjadi.",
  },
  {
    name: "task",
    label: "Tugas",
    hint: "Apa yang menjadi tanggung jawabmu di situasi itu?",
  },
  {
    name: "action",
    label: "Aksi",
    hint: "Apa yang KAMU lakukan, bukan tim. Langkahnya satu per satu.",
  },
  {
    name: "result",
    label: "Hasil",
    hint: "Apa yang berubah? Angka kalau ada, pelajaran kalau tidak.",
  },
] as const;
