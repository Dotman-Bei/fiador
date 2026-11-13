# Frontend contract

1. Two surfaces: a landing page at / and the product at /app. The landing page is a required deliverable, not a stretch goal. The architect gives it its own plan: routes, the sections (hero, problem, how it works, proof, demo-video slot, button into /app, footer with the repo link) and the real copy, drawn only from the brief and README.
2. UI code in the plans is structural only: semantic markup, routing, state and data. No custom colors, fonts, shadows or animation. All visual design happens in the Design pass, which uses the ui-inspiration skill (~/.claude/skills/ui-inspiration) as its only source of truth for frontend design, so nobody invents a style before it.
3. Executors apply the plan's UI code exactly and do not style.
4. The Design pass runs the ui-inspiration skill, writes docs/design/direction.md (the references it used, the principles they share, the token set, and the product's own identity), builds / and /app only from the tokens in that file, and then checks every page against it.
5. The build is not finished until the Design pass has run and every page has been checked against docs/design/direction.md.
