import type { BatchSpec, Checkpoint, SongDraft } from "./domain.js";
import type { GenerationProvider } from "./provider.js";
import { BatchPlanner } from "./planner.js";
import { ZyraSunoOntology } from "./ontology.js";

export interface PipelineResult {
  accepted: SongDraft[];
  rejected: { song: SongDraft; issues: string[] }[];
  checkpoint: Checkpoint;
}

export class ZyraSunoPipeline {
  constructor(
    private readonly ontology: ZyraSunoOntology,
    private readonly planner: BatchPlanner,
    private readonly provider: GenerationProvider,
  ) {}

  async run(spec: BatchSpec, previous?: Checkpoint): Promise<PipelineResult> {
    this.ontology.registerBatch(spec);
    const jobs = this.planner.plan(spec, previous);
    const accepted: SongDraft[] = [];
    const acceptedForCheckpoint: { id: string; title: string; theme: string; ordinal: number }[] = [];
    const rejected: PipelineResult["rejected"] = [];

    for (const job of jobs) {
      const song = await this.provider.generate(job);
      const validation = this.ontology.validateSong(spec, song);
      if (!validation.valid) {
        job.status = "rejected";
        rejected.push({ song, issues: validation.issues.map((issue) => issue.message) });
        continue;
      }

      this.ontology.registerSong(spec, song);
      job.status = "generated";
      accepted.push(song);
      acceptedForCheckpoint.push({ id: song.id, title: song.title, theme: song.theme, ordinal: job.ordinal });
      spec.usedTitles.push(song.title);
      spec.usedThemes.push(song.theme);
    }

    return {
      accepted,
      rejected,
      checkpoint: this.planner.checkpoint(spec, acceptedForCheckpoint, rejected.map((r) => r.song.id)),
    };
  }
}
