# Connect the localhost workspace to supported agent environments

Type: research
Status: resolved
Assignee: agent_integration_research
Blocked by: none
Parent: [Grill My Mind: find the architecture and build a resumable exploration skill](../map.md)

## Question

Which documented skill, CLI, SDK, or protocol interfaces can connect a user-activated branch in a localhost UI to Codex, Claude Code, and GitHub Copilot? Distinguish skill compatibility, execution compatibility, local versus cloud surfaces, session continuation, and limitations needing a prototype.

## Answer

All three support skills, but automatic execution from the local UI needs a supported provider runtime or event bridge. Codex App Server and Copilot SDK are documented candidates. Claude offers SDK and preview existing-session options with different authentication and installation requirements. Keep map persistence independent of vendor sessions. Runtime behavior remains untested; execution ownership requires a user decision.

Evidence: [agent integration research](../../../docs/research/agent-integrations.md).
