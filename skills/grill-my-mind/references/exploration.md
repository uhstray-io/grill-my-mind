# Conducting an exploration

The goal is to help the user make a distinction, test a belief, or choose a next step. A large tree is not a success criterion. Match depth and tone to their aim: understanding, a practical decision, planning, or open discovery. Technical architectures, community projects, creative work, personal plans, and business questions can all use the same loop without forcing a software lens.

## Establish just enough direction

Start from the user's stated idea and saved answers. Form a short working frame: the outcome they want, what is already constrained, and the uncertainty this branch can reduce. If the request is broad, propose a provisional frame in the result and make it easy to correct. Do not silently convert a possibility into a commitment.

Ask only when a missing answer would change the next investigation. Budget, time, audience, success criteria, and boundaries are useful dimensions when they matter, not an intake checklist. If the goal is already clear, proceed. If it is not, one concrete question such as “What would you like to be able to decide after exploring this?” can be enough. Do independent work that does not depend on that answer before pausing.

On resumption, identify the saved goal, actual user answers, accepted findings, stale material, and the selected unfinished branch. State a concise orientation only if useful: “We settled X; Y remains open; this branch checks Z.” Do not restart discovery, ask an answered question, or present the original premise as a proven finding. Retrieve an older answer by its question ID or a targeted section search when the packet omits it.

## Propose directions that discriminate

A useful child investigates a consequential uncertainty or compares plausible alternatives. Its title names the issue; its body explains what would be checked and what different outcomes would change. Offer only directions with distinct value, often two or three. There is no requirement to fill every category or use the maximum number of suggestions.

For a field-notebook idea, “Technology,” “Users,” and “Security” are weak labels. Stronger directions might be:

- “One editor or simultaneous editing?” Check the actual field workflow; single-editor use may need a much simpler recovery model.
- “What must survive a lost device?” Identify which records are replaceable and which cannot leave the team; that changes local storage and recovery requirements.

For a neighborhood workshop, “Marketing,” “Budget,” and “Operations” are equally weak. Useful alternatives might be:

- “One trial evening or a recurring program?” Compare the evidence each option would give about demand against the organizer's available time.
- “Tools supplied or brought by participants?” Check accessibility and shared-equipment needs; the answer changes who can attend and the practical cost.

These are examples of useful distinctions, not branches to insert into unrelated maps. Avoid duplicating existing directions or researching an unselected child. A suggestion is an invitation for the user to activate it. Its proposed outcomes are hypotheses, not conclusions.

## Ask questions worth interrupting for

A question should resolve a decision-relevant ambiguity that research or the existing map cannot answer. Ask about the user's priorities, constraints, lived context, or a choice reserved for them. Investigate externally answerable factual uncertainty with available tools. If evidence is unavailable, state that limit instead of disguising a factual question as a preference.

Prefer one blocking question; group a few only when their answers are independently necessary. Ask one thing per question. Explain the consequence briefly and offer concrete choices when they help, while allowing an answer outside those choices. Avoid leading questions, vague requests to “tell me more,” false binaries, and bundled questionnaires. Do not ask the user to endorse the agent's preferred conclusion.

Example: “For the first workshop, which matters more: reaching many neighbors or keeping preparation under one evening? A third priority is welcome.” This distinguishes a real tradeoff only if the user has not already settled it. A grounded open question is better when the relevant choices are unknown.

Put required questions in the result's `questions` array so the browser can save and resume them. Optional curiosities belong in inactive suggestions or the uncertainty notes. Do not add a question merely to avoid completing a branch. Record an answer only when the user supplied it; an inferred preference must remain an inference.

## Preserve the status of each claim

Keep four things distinguishable in concise prose:

- **User statements and preferences:** what the user actually said, including constraints and decisions. A preference can guide the work without being a universal fact.
- **Evidence:** a concrete observation or consulted source tied to the claim it supports or challenges. Include relevant conditions, dates, or scope when they affect applicability.
- **Interpretation:** what you infer from that evidence, the key assumption, and what would change the interpretation. Plausibility is not verification.
- **Unresolved points:** the specific uncertainty, why it matters, and the smallest useful way to resolve it.

Use these distinctions where needed rather than filling a mandatory template. Research to the depth needed for the selected question, using primary sources when available. A source link without a supported claim adds little. Do not manufacture sources, consensus, test results, or precision. If sources disagree, preserve the disagreement and its practical effect. A supported finding can still be unreviewed; acceptance belongs to the user.

When a prior premise changes, check relevant dependency links and stale findings before building on them. Keep prior work and its reasons visible. Save the result's rationale and evidence, not a transcript of private reasoning.

## Stop with a useful result

Before investigating further, judge what would count as enough for this branch. Completion may mean a comparison that enables a choice, a bounded explanation, a tested hypothesis, or a concrete next experiment. Stop when further work is unlikely to change that outcome within the user's scope; explicitly leave residual uncertainty rather than implying exhaustive research.

A result should say what was learned, why it matters for the goal, what remains uncertain, and any distinct next directions. The summary should carry the main conclusion or current blocking point. The body should preserve enough evidence and reasoning to be useful after the chat is gone; avoid repeating the packet or padding every section. Do not close an unresolved branch merely to reset its job. Use questions for a real user dependency and `fail` for an execution block.

When the session ends, give a short handoff: the map identifier or URL, the selected branch's state, the key unresolved point, and the action that resumes work. Do not claim queued work will run after the agent leaves, or continue investigating because another interesting topic appeared.
