# Backlog

## Current

- Investigate graph bottom viewer LaTeX flicker.
  - Current symptom: in graph mode, the bottom card viewer still flickers between rendered and unrendered LaTeX when the mouse moves.
  - Likely next step: move the card viewer into a standalone memoized component outside `QuizApp`, so graph hover/camera state cannot rerender it.
  - Constraint: protect the baked-in `CARDS` block while making graph/UI changes.
- Refactor large embedded constants out of `src/app.jsx`.
  - First target: move `CARDS` into a separate data artifact with content-protection checks.
  - Follow-up: split remaining config/static data into clearer `data` and `config` modules.
- Upgrade the current edit UI to a fuller text editor.
  - Evaluate whether to keep the lightweight `contentEditable` approach or swap in a richer editor with better formatting, tables, and source/visual behavior.
  - Keep this separate from graph work so we can change the editor without risking card-content regressions.

## Next Safe Graph Work

- Continue graph updates using graph-only edits outside the `CARDS` block.
- Improve graph empty-cluster behavior and visual cleanup.
- Consider a later rebuild of the graph model around tags, but only with content-protection checks in place.

## Process Guardrail

- Before risky graph/UI passes, snapshot or hash the `CARDS` block.
- After each pass, verify the `CARDS` block remains unchanged.
