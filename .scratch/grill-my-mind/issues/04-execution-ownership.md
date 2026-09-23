# Decide whether the invoking agent or the application runs exploration

Type: grilling
Status: resolved
Assignee: none
Blocked by: 01
Parent: [Grill My Mind: find the architecture and build a resumable exploration skill](../map.md)

## Question

Should the localhost workspace communicate with the user's invoking agent session, or may it start application-managed provider workers? Establish expectations for setup, authentication, usage, session lifetime, and provider switching before choosing an adapter architecture.

## Answer

The user accepted using the invoking agent as the default for the MVP, provided context growth is kept in view and tested. This is intentionally adjustable after real use. Implement a small command bridge with bounded packets and record packet sizes; do not add separate provider credentials or embedded SDK workers now.
