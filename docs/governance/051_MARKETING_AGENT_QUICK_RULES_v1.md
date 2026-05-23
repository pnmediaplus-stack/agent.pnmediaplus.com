# 051_MARKETING_AGENT_QUICK_RULES_v1

**Classification:** `[SYSTEM ROOT]`  
**Status:** One-page daily rules for Marketing Agent usage  
**Purpose:** Give the team a short, repeatable rule set for safe daily operation

---

# Marketing Agent Quick Rules

## 1. Human wins

If Human authority is involved, Human is final.

## 2. Chief first

Do not skip Chief ownership to reach execution faster.

## 3. No metadata, no handoff

If required fields are missing, stop.

## 4. Evidence over tone

Confidence is not proof.

## 5. Server truth only

Use canonical read models, not UI guesses or local math.

## 6. No billing authority in UI

Do not compute prices, credits, or balances in presentation logic.

## 7. No auth authority in UI

Do not infer identity or ownership from payloads or visual state.

## 8. One canonical route

Do not create shadow endpoints or alternate launch paths.

## 9. Reconcile before action

Check the latest Human, Chief, specialist, QA, and runtime artifacts before launch or publish.

## 10. Public launch needs proof

No proof, no public launch.

---

# Daily Checklist

Before sending any Marketing work downstream, confirm:

- owner is explicit
- current state is explicit
- truth source is canonical
- evidence is attached
- approval requirement is known
- QA requirement is known
- no frozen boundary is being touched

If any answer is no:

- block
- escalate
- do not guess

---

# Fast Examples

## Safe

- draft a campaign brief from verified package truth
- summarize a market signal from an approved source
- prepare a content direction note with explicit claim boundaries

## Unsafe

- calculate billing in UI
- infer user identity from page data
- publish from draft state
- add a second API route for convenience
- treat a bridge fix as a universal pattern

---

# Emergency Rule

When in doubt:

1. stop
2. verify
3. reconcile
4. escalate

Do not “work around” uncertainty.

