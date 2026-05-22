# 03_SHA_GENERATION_WORKFLOW

status: ACTIVE
layer: RUNTIME
authority_level: CORE
tier: TIER_2_5

---

# PURPOSE

Defines how SHA256 content identity is generated for registry population.

---

# SHA INPUT RULE

SHA must be computed from normalized artifact content.

Recommended normalization:
- UTF-8
- preserve line order
- preserve body content
- do not include filesystem metadata
- do not include modified timestamp

---

# COMMAND EXAMPLES

## Linux / macOS

```bash
sha256sum artifact.md
```

## PowerShell

```powershell
Get-FileHash .\artifact.md -Algorithm SHA256
```

## Node.js

```js
import { createHash } from "crypto";
import { readFileSync } from "fs";

const content = readFileSync("artifact.md");
const hash = createHash("sha256").update(content).digest("hex");
console.log(hash);
```

---

# SHA RECORD FORMAT

```yaml
content_sha256: "<sha>"
sha_algorithm: SHA256
sha_scope: FULL_FILE_CONTENT
sha_generated_at: "<timestamp>"
```

---

# VALIDATION RULE

If SHA changes without version change:
- BLOCKED_BY_VERSION_DRIFT

---

# NEXT ACTIONS

## Immediate Next Step
- Run SHA generation over all ACTIVE_CANDIDATE artifacts.

## Required Inputs
- File paths
- Read access to corpus

## Recommended Owner
- Architect or n8n workflow

## Blocking Conditions
- File cannot be read
- Encoding ambiguous
- SHA mismatch on replay

## Suggested Next Package
- Conflict Queue Standard
