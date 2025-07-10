# Document Hibernation Server (Durable Object)

This directory contains the modular implementation of the `DocumentHibernationServer` for collaborative editing with Yjs and AI-powered spell check.

## Main Files

- **DocumentHibernationServer.ts** – Main durable object class. Manages Yjs doc, awareness, WebSocket connections, and delegates to services.
- **spellCheckService.ts** – Handles AI-powered spell checking and result caching.
- **messageHandlers.ts** – Processes WebSocket messages and routes requests (including spell check).
- **types.ts** – Shared type definitions for spell check, cache, and protocol.
- **documentChangeTracker.ts** – (Currently unused) Logic for tracking document changes.

## Extending

- Add new AI features in `spellCheckService.ts`.
- Add new message types/handlers in `messageHandlers.ts`.

---

**This module is designed for clarity, maintainability, and easy extension.** 