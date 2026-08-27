import { randomUUID } from "node:crypto";
import type { BatchSpec, Checkpoint, GenerationJob } from "./domain.js";

const clean = (s: string) => s.trim().replace(/\s+/g, " ");

export class BatchPlanner {
  plan(spec: BatchSpec, checkpoint?: Checkpoint): GenerationJob[] {
    const start = (checkpoint?.lastCompletedOrdinal ?? 0) + 1;
    const usedTitles = new Set([...(spec.usedTitles ?? []), ...(checkpoint?.usedTitles ?? [])].map((v) => clean(v).toLowerCase()));
    const usedThemes = new Set([...(spec.usedThemes ?? []), ...(checkpoint?.usedThemes ?? [])].map((v) => clean(v).toLowerCase()));

    const seeds = spec.conceptSeeds.filter((seed) => {
      const n = clean(seed).toLowerCase();
      return !usedThemes.has(n) && !usedTitles.has(n);
    });

    if (seeds.length === 0) throw new Error("No fresh concept seeds remain");

    const jobs: GenerationJob[] = [];
    for (let ordinal = start; ordinal <= spec.count; ordinal++) {
      const seed = seeds[(ordinal - start) % seeds.length];
      jobs.push({
        id: randomUUID(),
        batchId: spec.id,
        ordinal,
        artist: spec.artist,
        model: spec.model,
        titleSeed: seed,
        themeSeed: seed,
        status: "queued",
        prompt: this.buildPrompt(spec, ordinal, seed),
      });
    }
    return jobs;
  }

  checkpoint(spec: BatchSpec, accepted: { id: string; title: string; theme: string; ordinal: number }[], rejectedSongIds: string[] = []): Checkpoint {
    const lastCompletedOrdinal = accepted.reduce((m, s) => Math.max(m, s.ordinal), 0);
    return {
      batchId: spec.id,
      lastCompletedOrdinal,
      usedTitles: [...new Set([...spec.usedTitles, ...accepted.map((s) => s.title)])],
      usedThemes: [...new Set([...spec.usedThemes, ...accepted.map((s) => s.theme)])],
      acceptedSongIds: accepted.map((s) => s.id),
      rejectedSongIds,
      updatedAt: new Date().toISOString(),
    };
  }

  private buildPrompt(spec: BatchSpec, ordinal: number, seed: string) {
    const c = spec.constraints;
    return [
      `/va3lm-gpt-doug-llm zyraXSuno job=${ordinal}/${spec.count}`,
      `artist=${JSON.stringify(spec.artist)}`,
      `concept=${JSON.stringify(seed)}`,
      `model=${JSON.stringify(spec.model)}`,
      `rules=max_chars:${c.maxCharacters}; diss_first:${c.dissFirst}; fresh_title:${c.requireFreshTitle}; fresh_theme:${c.requireFreshTheme}; punchlines:${c.requirePunchlines}; suno_tags:${c.sunoSectionTags}`,
      `energy=${spec.flow.energy.join(", ")}`,
      `pacing=${spec.flow.pacing.join(", ")}`,
      `structure=${spec.flow.structure.join(" > ")}`,
      `return=TITLE + THEME + VIBE_PROMPT + COMPLETE_LYRICS + PUNCHLINE_COUNT + TAGS`,
    ].join(" :: ");
  }
}
