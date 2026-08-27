import { randomUUID } from "node:crypto";
import type {
  BatchSpec,
  OntologyEdge,
  OntologyNode,
  SongDraft,
  ValidationResult,
} from "./domain.js";

const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");

export class ZyraSunoOntology {
  private nodes = new Map<string, OntologyNode>();
  private edges: OntologyEdge[] = [];

  addNode<T>(kind: OntologyNode<T>["kind"], label: string, data: T, id = randomUUID()) {
    if (this.nodes.has(id)) throw new Error(`Ontology node already exists: ${id}`);
    const node: OntologyNode<T> = {
      id,
      kind,
      label,
      data,
      createdAt: new Date().toISOString(),
    };
    this.nodes.set(id, node as OntologyNode);
    return node;
  }

  link(from: string, to: string, relation: OntologyEdge["relation"]) {
    if (!this.nodes.has(from) || !this.nodes.has(to)) {
      throw new Error(`Cannot link missing ontology nodes: ${from} -> ${to}`);
    }
    const edge: OntologyEdge = {
      id: randomUUID(),
      from,
      to,
      relation,
      createdAt: new Date().toISOString(),
    };
    this.edges.push(edge);
    return edge;
  }

  registerBatch(spec: BatchSpec) {
    const artist = this.addNode("Artist", spec.artist, { name: spec.artist }, `artist:${norm(spec.artist)}`);
    const batch = this.addNode("Batch", spec.id, spec, `batch:${spec.id}`);
    const constraints = this.addNode("ConstraintSet", `${spec.id}:constraints`, spec.constraints, `constraints:${spec.id}`);
    const flow = this.addNode("FlowProfile", spec.flow.name, spec.flow, `flow:${norm(spec.flow.name)}`);
    this.link(batch.id, artist.id, "CREATED_BY");
    this.link(batch.id, constraints.id, "HAS_CONSTRAINTS");
    this.link(batch.id, flow.id, "USES_FLOW");
    return batch;
  }

  registerSong(batch: BatchSpec, song: SongDraft) {
    const validation = this.validateSong(batch, song);
    if (!validation.valid) return validation;

    const songNode = this.addNode("Song", song.title, song, `song:${song.id}`);
    const titleNode = this.addNode("Title", song.title, { value: song.title }, `title:${norm(song.title)}`);
    const themeNode = this.addNode("Theme", song.theme, { value: song.theme }, `theme:${norm(song.theme)}`);
    this.link(songNode.id, `batch:${batch.id}`, "BELONGS_TO_BATCH");
    this.link(songNode.id, titleNode.id, "DERIVED_FROM");
    this.link(songNode.id, themeNode.id, "USES_THEME");
    if (song.flowProfile && this.nodes.has(`flow:${norm(song.flowProfile)}`)) {
      this.link(songNode.id, `flow:${norm(song.flowProfile)}`, "USES_FLOW");
    }
    return validation;
  }

  validateSong(batch: BatchSpec, song: SongDraft): ValidationResult {
    const issues: ValidationResult["issues"] = [];
    const charCount = [...song.lyrics].length;
    const usedTitles = new Set(batch.usedTitles.map(norm));
    const usedThemes = new Set(batch.usedThemes.map(norm));

    for (const node of this.nodes.values()) {
      if (node.kind === "Title") usedTitles.add(norm(node.label));
      if (node.kind === "Theme") usedThemes.add(norm(node.label));
    }

    if (charCount > batch.constraints.maxCharacters) {
      issues.push({ code: "MAX_CHARS", message: `${charCount} exceeds ${batch.constraints.maxCharacters}`, severity: "error" });
    }
    if (batch.constraints.requireFreshTitle && usedTitles.has(norm(song.title))) {
      issues.push({ code: "TITLE_REUSED", message: `Title already used: ${song.title}`, severity: "error" });
    }
    if (batch.constraints.requireFreshTheme && usedThemes.has(norm(song.theme))) {
      issues.push({ code: "THEME_REUSED", message: `Theme already used: ${song.theme}`, severity: "error" });
    }
    if (batch.constraints.requirePunchlines && (song.punchlineCount ?? 0) < 2) {
      issues.push({ code: "PUNCHLINES_LOW", message: "At least two punchlines are required", severity: "error" });
    }
    if (batch.constraints.dissFirst && !(song.tags ?? []).some((tag) => norm(tag) === "diss")) {
      issues.push({ code: "DISS_REQUIRED", message: "Song must be tagged diss", severity: "error" });
    }
    if (batch.constraints.sunoSectionTags && !/^\[(intro|hook|verse|chorus|bridge|outro|switch)/im.test(song.lyrics)) {
      issues.push({ code: "SECTION_TAGS", message: "Suno section tags are required", severity: "error" });
    }

    return { valid: !issues.some((issue) => issue.severity === "error"), characterCount: charCount, issues };
  }

  snapshot() {
    return { nodes: [...this.nodes.values()], edges: [...this.edges] };
  }
}
