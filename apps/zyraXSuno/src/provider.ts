import type { GenerationJob, SongDraft } from "./domain.js";

export interface GenerationProvider {
  name: string;
  generate(job: GenerationJob): Promise<SongDraft>;
}

export class CallbackProvider implements GenerationProvider {
  constructor(
    public readonly name: string,
    private readonly callback: (job: GenerationJob) => Promise<SongDraft>,
  ) {}

  generate(job: GenerationJob) {
    return this.callback(job);
  }
}

export class DryRunProvider implements GenerationProvider {
  readonly name = "dry-run";

  async generate(job: GenerationJob): Promise<SongDraft> {
    return {
      id: `dry:${job.id}`,
      title: `DRY RUN ${job.ordinal}`,
      theme: job.themeSeed,
      vibePrompt: "dry-run provider; replace with an authorized model adapter",
      lyrics: `[Intro]\n${job.prompt}\n\n[Outro]\nDRY RUN`,
      punchlineCount: 2,
      tags: ["diss", "dry-run"],
    };
  }
}
