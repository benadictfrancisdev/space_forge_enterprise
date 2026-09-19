# SpaceForge Decision UX

Canonical route: `/v2/apps/decisions` (API-backed). Data Agent “Decisions” is a dataset-scoped tool, not a second product.

A decision workspace should present: observation, problem, evidence, root cause, confidence, business/financial impact, recommendation, expected ROI, risk, priority, owner, timeline, status, history.

Lifecycle actions (when the API supports them): Approve, Investigate, Assign, Dismiss. Until then, show analysis results in `DecisionResultView` without fake buttons that POST nowhere.

Marketing Decision Feed with sample cash-runway cards is not the production decision system.
