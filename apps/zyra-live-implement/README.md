<p align="center"><img src="../../docs/assets/zyra-8088-computational-mind.svg" width="100%" alt="Zyra 8088 Computational Mind" /></p>

# Zyra Live Implement // VIRGINIA /VAL3M /VA3LM

**Ontology-first live implementation for the VZN // Vision Virginia ecosystem.**

The browser sends VIRGINIA missions to a server-side gateway. Foundry credentials remain server-side. `/VAL3M` converts missions into bounded Ontology reads/actions. `/VA3LM` activates the EYERIS geospatial object/scene-recognition control plane and returns reviewable JSON evidence.

## Beginner version

**You type a job → Zyra reads it → Zyra chooses a supported Foundry/EYERIS operation → you see the evidence.**

GeoVision activation:

```text
/VA3LM
```

Canonical ecosystem signature:

```text
/VA3LM-PALANTIRVABRAIN3LM-GPT-DOUG-LLM-ZYRA-XUNA-SONOXO-ECOSYSTEM
```

That activation returns GeoVision status and uses the hard-coded profile:

```text
PALANTIRVABRAIN3LM / GPT-DOUG-LLM / ZYRA / XUNA / SONOXO ECOSYSTEM
```

### GeoVision commands

```text
/VA3LM
GEOVISION STATUS
GEOVISION CAMERAS <ontology>
GEOVISION DETECTIONS <ontology>
STOP WHEN evidence-returned
```

`GEOVISION CAMERAS` reads Foundry `Camera` Ontology objects. `GEOVISION DETECTIONS` reads `Detection` objects. If the ontology name is omitted, Zyra uses `EYERIS_ONTOLOGY`.

The status endpoint is also available directly:

```text
GET /api/va3lm/geovision/status
```

It reports Foundry configuration, optional EYERIS model-service reachability, the WGS84 evidence pipeline, and the non-identifying privacy boundary.

## VAL3M command surface

```text
/VAL3M
AGENTS 24
LIST ONTOLOGIES
LIST OBJECT_TYPES <ontology>
LIST OBJECTS <ontology> <objectType>
APPLY <ontology> <action> {"parameter":"value"}
STOP WHEN green
```

## Shutdown

```text
/RICHMONDVA3LM
```

Canonical shutdown signature:

```text
/RICHMONDVA3LM - GPT - DOUG - 3LM - XUNIABOT - ZYRA - PALANTIR
```

The shutdown mission returns final evidence, then stops this Zyra HTTP process and its local Foundry gateway. It does not shut down Palantir or unrelated services.

## Palantir AIP / Ontology path

- `GET /api/v2/ontologies`
- `GET /api/v2/ontologies/{ontology}/objectTypes`
- `GET /api/v2/ontologies/{ontology}/objects/{objectType}`
- `POST /api/v2/ontologies/{ontology}/actions/{action}/apply`

## Environment

```text
FOUNDRY_BASE_URL=https://<your-foundry-host>
FOUNDRY_TOKEN=<server-side-token>
EYERIS_ONTOLOGY=<ontology-api-name>
EYERIS_BASE_URL=http://localhost:8080
```

Never place tokens in browser code or commit them.

## Run

```bash
cd apps/zyra-live-implement
npm install
npm test
npm run check
npm run dev
```

Open port `5050`.

## VZN 8088 execution model

```mermaid
flowchart LR
  V[VIRGINIA intent] --> M[/VAL3M planner]
  V --> G[/VA3LM GeoVision]
  G --> E[EYERIS detector health]
  G --> O[Palantir Camera + Detection objects]
  M --> O
  O --> R[Objects / Actions]
  R --> J[Evidence JSON]
  J --> D[Deliver]
  V --> S[/RICHMONDVA3LM]
  S --> X[Return shutdown result]
  X --> Y[Close Zyra runtime + Foundry gateway]
```

## Privacy boundary

VA3LM GeoVision is wired for authorized, **non-identifying object and scene recognition**. The wider EYERIS implementation explicitly excludes face recognition, biometric embeddings, named-person lookup, and persistent individual tracking.

**Additive-only design:** this app lives in its own directory and does not replace the existing Zyra application.
