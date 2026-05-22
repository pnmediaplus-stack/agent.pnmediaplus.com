# 03_CONSTITUTIONAL_LAYER_ISOLATION_STEP3.md

status: ACTIVE
layer: CONSTITUTION
authority_level: CORE
freeze_phase: STEP_3

---

# PURPOSE

Separates PN OS governance documents into strict authority layers.

This prevents:
- authority diffusion
- role creep
- runtime documents redefining constitution
- workflow documents redefining protocol

---

# CANONICAL LAYERS

## 1. CONSTITUTION

Owns:
- immutable laws
- authority matrix
- fail-fast rules
- financial / identity / execution laws

Must NOT contain:
- workflow procedures
- role behavior details
- implementation instructions

---

## 2. PROTOCOL

Owns:
- state taxonomy
- gate taxonomy
- handoff contract
- verdict schema
- escalation protocol

Must NOT contain:
- domain workflow detail
- agent personality
- runtime implementation logic

---

## 3. RUNTIME

Owns:
- execution sequencing
- queue topology
- runtime dispatch rules
- runtime safety boundaries

Must NOT redefine:
- constitutional authority
- protocol states
- gate semantics

---

## 4. WORKFLOW

Owns:
- domain process flow
- n8n orchestration design
- campaign / marketing / product workflows

Must NOT redefine:
- state taxonomy
- role authority
- constitutional laws

---

## 5. CAPABILITY

Owns:
- agent role behavior
- capability scope
- allowed / forbidden actions

Must NOT redefine:
- constitutional truth
- protocol state machine
- runtime authority

---

## 6. IMPLEMENTATION

Owns:
- code patch detail
- operational instructions
- local adapters

Must NOT redefine:
- any higher-layer authority

---

## 7. ARTIFACT

Owns:
- pack manifests
- dependency maps
- release records
- validation checklists

Must NOT redefine:
- protocol semantics
- runtime authority

---

# IMPORT RULE

Lower layer MUST use:

imports:
- artifact_id

Lower layer MUST NOT inline or duplicate upper-layer authority.

---

# INVALID CONDITIONS

INVALID_FOR_RUNTIME if:
- Runtime file defines new state taxonomy
- Workflow file defines new gate semantics
- Role pack claims final apply authority
- Implementation patch bypasses imported constitutional law

---

# STATUS

layer_isolation: ESTABLISHED
authority_diffusion_guard: ACTIVE
