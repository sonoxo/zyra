import test from "node:test";
import assert from "node:assert/strict";
import { ZyraSunoOntology } from "../src/ontology.js";
import type { BatchSpec, SongDraft } from "../src/domain.js";

const batch: BatchSpec = {
  id: "test-batch",
  artist: "Almighty Sonoxo",
  count: 2,
  model: "/va3lm-gpt-doug-llm",
  constraints: {
    maxCharacters: 3000,
    dissFirst: true,
    requireFreshTitle: true,
    requireFreshTheme: true,
    requirePunchlines: true,
    sunoSectionTags: true,
  },
  flow: { name: "test-flow", energy: ["dark"], pacing: ["tight"], structure: ["Intro", "Hook", "Verse", "Outro"] },
  usedTitles: ["USED TITLE"],
  usedThemes: ["used theme"],
  conceptSeeds: ["fresh concept"],
};

const validSong: SongDraft = {
  id: "song-1",
  title: "FRESH TITLE",
  theme: "fresh theme",
  vibePrompt: "dark rap-first diss",
  lyrics: "[Intro]\nXO\n[Hook]\nPunchline one\n[Verse 1]\nPunchline two\n[Outro]\nAlmighty",
  punchlineCount: 2,
  tags: ["diss"],
};

test("accepts a fresh song under the character cap", () => {
  const ontology = new ZyraSunoOntology();
  ontology.registerBatch(batch);
  const result = ontology.registerSong(batch, validSong);
  assert.equal(result.valid, true);
  assert.equal(ontology.snapshot().nodes.some((n) => n.kind === "Song" && n.label === "FRESH TITLE"), true);
});

test("rejects reused titles and non-diss output", () => {
  const ontology = new ZyraSunoOntology();
  ontology.registerBatch(batch);
  const result = ontology.validateSong(batch, { ...validSong, id: "song-2", title: "USED TITLE", tags: [] });
  assert.equal(result.valid, false);
  assert.equal(result.issues.some((i) => i.code === "TITLE_REUSED"), true);
  assert.equal(result.issues.some((i) => i.code === "DISS_REQUIRED"), true);
});

test("rejects lyrics above 3000 characters", () => {
  const ontology = new ZyraSunoOntology();
  ontology.registerBatch(batch);
  const result = ontology.validateSong(batch, { ...validSong, id: "song-3", title: "ANOTHER TITLE", theme: "another theme", lyrics: `[Intro]\n${"x".repeat(3001)}` });
  assert.equal(result.valid, false);
  assert.equal(result.issues.some((i) => i.code === "MAX_CHARS"), true);
});
