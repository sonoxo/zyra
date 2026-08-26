<p align="center"><img src="../../docs/assets/zyra-8088-computational-mind.svg" width="100%" alt="Zyra 8088 Computational Mind" /></p>

# Zyra Live Implement // VIRGINIA /VAL3M

**Ontology-first live implementation for the VZN // Vision Virginia ecosystem.**

The browser sends VIRGINIA missions to a server-side gateway. Foundry credentials remain server-side. `/VAL3M` converts the mission into bounded Ontology reads/actions and returns JSON evidence.

## Beginner version

Think of this app like a control room:

**You type a job → Zyra reads it → Zyra runs the supported operation → you see the result.**

If you want to stop the Zyra Live Implement runtime, use:

```text
/RICHMONDVA3LM
```

The canonical stack signature is also accepted:

```text
/RICHMONDVA3LM - GPT - DOUG - 3LM - XUNIABOT - ZYRA - PALANTIR
```

### What `/RICHMONDVA3LM` does

1. Zyra recognizes a dedicated shutdown mission.
2. No Ontology action is run as part of that shutdown mission.
3. Zyra returns a final shutdown result to the browser.
4. After that response finishes, the Zyra HTTP server stops accepting requests.
5. The Foundry gateway in this process goes offline with Zyra.

It stops **this Zyra runtime and its bridge connections**. It does **not** shut down Palantir's external platform or unrelated external services.

## Live command surface

```text
/VAL3M
AGENTS 24
LIST ONTOLOGIES
LIST OBJECT_TYPES <ontology>
LIST OBJECTS <ontology> <objectType>
APPLY <ontology> <action> {"parameter":"value"}
STOP WHEN green

/RICHMONDVA3LM
```

## Palantir AIP / Ontology path

- `GET /api/v2/ontologies`
- `GET /api/v2/ontologies/{ontology}/objectTypes`
- `GET /api/v2/ontologies/{ontology}/objects/{objectType}`
- `POST /api/v2/ontologies/{ontology}/actions/{action}/apply`

Set `FOUNDRY_BASE_URL` and `FOUNDRY_TOKEN` in the runtime environment. Never place the token in browser code or commit it.

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
  M --> O[Palantir Ontology API]
  O --> R[Objects / Actions]
  R --> E[Evidence JSON]
  E --> G{STOP WHEN green}
  G -->|continue| M
  G -->|verified| D[Deliver]
  V --> S[/RICHMONDVA3LM]
  S --> X[Return shutdown result]
  X --> Y[Close Zyra runtime + Foundry gateway]
```

**Additive-only design:** this app lives in its own directory and does not replace the existing Zyra application.
