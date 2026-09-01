import { readFile } from "node:fs/promises";
import { BatchPlanner } from "./planner.js";
import type { BatchSpec } from "./domain.js";

const [command, inputPath, outputPath] = process.argv.slice(2);

if (!command || !inputPath) {
  console.error("Usage: npm run cli -- plan <batch.json> | export <batch.json> <out.jsonl>");
  process.exit(1);
}

const spec = JSON.parse(await readFile(inputPath, "utf8")) as BatchSpec;
const planner = new BatchPlanner();
const jobs = planner.plan(spec);

if (command === "plan") {
  console.log(JSON.stringify({ batch: spec.id, count: jobs.length, jobs }, null, 2));
  process.exit(0);
}

if (command === "export") {
  if (!outputPath) {
    console.error("export requires an output path");
    process.exit(1);
  }
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { dirname } = await import("node:path");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, jobs.map((job) => JSON.stringify(job)).join("\n") + "\n", "utf8");
  console.log(JSON.stringify({ ok: true, outputPath, jobs: jobs.length }, null, 2));
  process.exit(0);
}

console.error(`Unknown command: ${command}`);
process.exit(1);
