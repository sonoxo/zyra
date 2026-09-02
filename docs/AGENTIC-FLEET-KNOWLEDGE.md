# ZYRA // RVIA Agentic Knowledge Bridge

ZYRA agentic workflows inherit the canonical `rvia-agentic-core-v1` profile maintained in `sonoxo/gpt-doug-llm`.

Canonical profile:
`https://github.com/sonoxo/gpt-doug-llm/blob/main/safety-shield/agents/knowledge/rvia-agentic-core.json`

## ZYRA agent rule

```text
USER / EVENT
  → minimum context
  → bounded plan
  → model reasoning
  → explicit tool request
  → SHADOW GLASS policy
  → ZYRA action
  → validation / eval
  → GLASS ONION audit
```

ZYRA agents should prefer app-native deterministic functions for known operations and use LLM reasoning for ambiguity, synthesis, planning and natural-language interaction. Tool access is explicit; model output is never authority by itself.

Every new ZYRA agent should define mission, owner, inputs, outputs, allowed tools, data classes, side effects, human gate, evals, context/tool budgets, rollback and audit fields before release.

Related builder:
`https://github.com/sonoxo/gpt-doug-llm/blob/main/safety-shield/agents/agentic_builder.py`
