# NVIDIA SuperHub — ZYRA / XUNIA integration

Independent repository discovery and local workspace tooling. No NVIDIA affiliation.
This module lives inside both ecosystem repositories; no separate download is needed.

## Repository commands

Requires Python 3.10+ and Git; no Python dependencies needed for these commands.

```bash
npm run nvidia -- catalog
npm run nvidia -- search tensor
npm run nvidia -- plan ai-foundry
npm run nvidia -- graph
npm run nvidia -- sync ai-foundry --dry-run
npm run nvidia:test
```

The catalog command enumerates all public repositories directly under the NVIDIA
organization through paginated GitHub REST requests. It does not enumerate other
NVIDIA-owned organizations. GITHUB_TOKEN is optional; API errors fail the command.
The live catalog is fetched on demand, not bundled or claimed to have been
fully retrieved during this integration. Fixtures are synthetic test data only.

Plans report missing entries explicitly. Each blueprint is a discovery grouping,
not a tested GPU compatibility guarantee. Graph exports canonical Repository and
Tool objects with USES metadata relationships; it does not mutate the domain graph.
Search, plan, graph and doctor are read-only after catalog generation.

## Checkout and execution boundary

Sync defaults to shallow source checkout when run without --dry-run. Run it only
from an authorized local operator context after existing ZYRA approval processes.
It is not registered as an unattended agent execution endpoint. It does not install
dependencies, execute upstream code, provision GPUs, or deploy services.
Existing checkout directories are skipped, never overwritten or updated.
Archived projects and unlisted licenses are blocked by default. The small license
allowlist is an operational review policy, not legal clearance or a statement
that other licenses prohibit cloning. --allow-unknown-license explicitly permits
unknown licenses for local review only. Preserve upstream terms before redistribution.

## Ecosystem ownership

- XUNIA domain registry: https://github.com/sonoxo/xuniadao
- ZYRA approval/execution layer: https://github.com/sonoxo/zyra
- Global Black House authority remains unchanged.
- Official XUNIA website: https://xunia.org

Both repositories carry the same bounded module and offline regression tests.
No real-world targeting, weapons control, or autonomous engagement integration
is provided. No live GPU acceleration or UI integration is claimed.

Source module adapted from the original NVIDIA SuperHub scaffold, MIT license.
