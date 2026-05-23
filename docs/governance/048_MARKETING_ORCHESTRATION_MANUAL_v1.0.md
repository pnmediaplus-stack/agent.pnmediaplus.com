# 048_MARKETING_ORCHESTRATION_MANUAL_v1.0

**Classification:** `[SYSTEM ROOT]`  
**Status:** Final operating manual for marketing orchestration inside PN OS  
**Supersedes:** Draft `046_MARKETING_ORCHESTRATION_MANUAL_v1.1`

## 0. Purpose

This document defines how Humans and AI agents must route work across the PN OS Marketing system.

Its job is to ensure:

- đúng agent
- đúng tài liệu
- đúng state
- đúng authority
- đúng approval path

This is an orchestration law.
It is not a creative playbook.

---

## 1. Constitutional Priority

When conflict occurs, obey in this order:

1. PN OS core system constitution and authority matrix
2. financial, billing, auth, engineering, marketplace laws
3. Product Packaging / PMM governance
4. Marketing Constitution and Ads Constitution
5. this orchestration manual
6. operator preference or convenience

No routing convenience may override authority, truth, proof, or approval law.

---

## 2. Core Orchestration Laws

### 2.1 No Context Spam

Do not load every file into every agent session.

Only load:

- the required core constitution
- the relevant specialist documents
- the required output template

### 2.2 PMM Is The Governed Translation Layer

In Go-To-Market work, PMM is the required translation layer between package truth and downstream execution.

No downstream execution team may treat raw packaging notes as launch-ready material.

### 2.3 State-Gated Routing

No artifact may move downstream merely because:

- it contains a `To Agent` field
- the operator is in a hurry
- the content “looks reasonable”

Every handoff must pass its required gate first.

### 2.4 No Metadata, No Handoff

If required metadata is missing, the artifact must not move downstream.

Missing metadata includes:

- claim boundary
- proof direction
- approval requirement
- lifecycle/readiness state
- public-safe boundary where applicable

### 2.5 Launch Readiness Is Separate

Package readiness, PMM readiness, campaign-build readiness, and launch readiness are separate concepts.

The system must never assume:

- package approved = campaign approved
- PMM translated = public-safe
- Chief audited = Human approved

### 2.6 Human Finality

Human remains the final approver whenever approval law is triggered.

This includes:

- strong claims
- budget sensitivity
- compliance/legal sensitivity
- strategic blast radius
- sensitive marketplace representations

---

## 3. Required Load Order Matrix

When opening a session for an agent, the Human Router must load the minimum correct set.

| Agent | Core Constitution | Specialist Docs | Required Output |
| :--- | :--- | :--- | :--- |
| Trend Analyst | `035_MARKETING_CONSTITUTION_v2` | input market/competitor artifact if present | `2. Marketing Handoff Contract v1` |
| Revenue Analyst | `035_MARKETING_CONSTITUTION_v2` | relevant reporting/data input | `2. Marketing Handoff Contract v1` |
| Offer / PMM | `035_MARKETING_CONSTITUTION_v2` | `039_PRODUCT_MARKETING_INTERFACE_SPEC` and related PMM SOP | `042_PRODUCT_MARKETING_HANDOFF_TO_GTM` |
| Growth Strategist | `035_MARKETING_CONSTITUTION_v2` | `037_MARKETING_ADS_CONSTITUTION` + valid PMM GTM packet | `2. Marketing Handoff Contract v1` |
| Content & Distribution Lead | `035_MARKETING_CONSTITUTION_v2` | `037_MARKETING_ADS_CONSTITUTION` + valid PMM GTM packet | content brief / script brief with boundary notes |
| Ads Layer | `035_MARKETING_CONSTITUTION_v2` | `037_MARKETING_ADS_CONSTITUTION` + PMM packet + downstream outputs | ads plan / creative test note |
| Chief Marketing Agent | `035_MARKETING_CONSTITUTION_v2` | `037_MARKETING_ADS_CONSTITUTION` + GTM packet + downstream outputs | audit template / approval note |

Rule:

Growth, Content, and Ads must work from one governed GTM source.

They may not work from:

- raw package draft
- founder shorthand
- unclassified claims
- missing-proof material

---

## 4. Standard Routing Map

### 4.1 Flow A: Detect & Diagnose

Use when:

- market signal shifts
- competitor moves
- CAC, retention, top-up, or conversion changes

Route:

1. Input signal -> Trend Analyst
2. Trend handoff -> Revenue Analyst
3. Revenue handoff -> Chief Marketing Agent
4. Chief report -> Human

### 4.2 Flow B: Go-To-Market

Use when:

- a new package is created
- a new offer needs GTM translation
- campaign building and launch planning are needed

Route:

1. Raw package input -> PMM
2. PMM produces GTM packet
3. PMM packet passes gate
4. PMM packet -> Growth
5. PMM packet -> Content
6. If paid/campaign execution is needed:
   PMM packet + Growth output + Content output -> Ads Layer
7. Growth + Content + Ads outputs -> Chief Marketing Agent
8. Chief audit -> Human
9. Launch only after readiness and approval law are cleared

### 4.3 Flow C: External Audit

Use when:

- an external agency sends a proposal
- an external deck or plan is received
- a competitor artifact needs audit

Route:

1. External artifact -> Chief Marketing Agent
2. Chief audit -> Human

Rule:

External artifacts are never truth by default.
They are proposals, signals, or benchmarks only.

---

## 5. Gate Rules

### 5.1 PMM Packet Gate

Before PMM output may move to Growth, Content, or Ads, it must include:

- claim boundary
- proof direction
- approval requirement
- readiness/lifecycle state
- public-safe vs internal-only distinction where applicable
- forbidden claims where relevant

If missing:

- block downstream handoff
- return artifact to PMM

### 5.2 Growth Gate

Before Growth output may move onward, confirm:

- no offer redefinition
- no pricing drift
- no free-trial invention without authority
- no promise rewrite outside PMM boundary

If violated:

- stop flow
- classify as execution drift
- reissue or return handoff

### 5.3 Content Gate

Before Content output may move onward, confirm:

- no forbidden claim
- no overclaim
- no weak-proof-to-strong-promise upgrade
- no public copy built from internal-only material

If violated:

- stop flow
- return to Content or PMM as appropriate

### 5.4 Ads Gate

Before Ads may execute, confirm:

- claim classification exists
- public-safe material is defined
- approval class is known
- `approved_for_campaign_build` is cleared where required

### 5.5 Chief To Human Gate

Before Human review, Chief output must make clear:

- audit conclusion
- unresolved risks
- approval trigger
- recommended next state

### 5.6 Launch Gate

No public launch before:

- `campaign_ready`
- approval law is cleared
- Human approval exists where required

---

## 6. Human Router SOP

Human acts as the router, not as a passive courier.

### Step 1

Receive the input.

### Step 2

Classify the flow:

- Detect & Diagnose
- Go-To-Market
- External Audit

### Step 3

Open the point-of-entry agent and load the correct documents.

### Step 4

Collect the output.

### Step 5

Do not move it yet.
Check the required gate first.

### Step 6

If gate passes, route to the next agent.

### Step 7

If gate fails, return to the prior owner for correction.

### Step 8

When the flow reaches Human escalation or launch review, Human decides approve/reject.

---

## 7. Failure Handling

If approval metadata is missing:

- block handoff
- return to PMM

If overclaim is detected:

- stop downstream movement
- revert to review state

If proof posture is weak:

- downgrade claims
- revert to proof review

If downstream rewrites offer, pricing, or authority:

- classify as execution drift
- stop flow
- reissue governed handoff

---

## 8. Final Principle

The purpose of orchestration is not speed at any cost.

Its purpose is to ensure downstream execution never outruns:

- truth
- proof
- approval
- authority

If the system must choose between speed and governance, governance wins.
