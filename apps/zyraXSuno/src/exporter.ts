import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { GenerationJob, SongDraft } from "./domain.js";

export interface SunoExportRecord {
  jobId: string;
  ordinal: number;
  title: string;
  style: string;
  lyrics: string;
  theme: string;
  sourceModel: string;
}

export function toSunoRecord(job: GenerationJob, song: SongDraft): SunoExportRecord {
  return {
    jobId: job.id,
    ordinal: job.ordinal,
    title: song.title,
    style: song.vibePrompt,
    lyrics: song.lyrics,
    theme: song.theme,
    sourceModel: job.model,
  };
}

export async function writeSunoJsonl(path: string, rows: SunoExportRecord[]) {
  await mkdir(dirname(path), { recursive: true });
  const body = rows.map((row) => JSON.stringify(row)).join("\n") + "\n";
  await writeFile(path, body, "utf8");
  return { path, count: rows.length };
}
