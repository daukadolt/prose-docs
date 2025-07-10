# Document Hibernation Server - Modular Architecture

This directory contains the modular implementation of the DocumentHibernationServer durable object, which has been refactored for better maintainability and readability.

## File Structure

### Core Files

- **`DocumentHibernationServer.ts`** - Main durable object class
  - Handles WebSocket connections and lifecycle
  - Orchestrates the different services
  - Manages Yjs document and awareness

### Supporting Modules

- **`types.ts`** - Type definitions and interfaces
  - `SpellCheckResult` - Structure for spell check results
  - `CacheEntry` - Cache storage structure
  - `TextChange` - Document change tracking
  - `DocumentState` - Current document state
  - `AIRequest` / `AIResponse` - AI communication types

- **`spellCheckService.ts`** - Spell checking functionality
  - AI-powered spell checking using Cloudflare AI
  - Content caching with hash-based invalidation
  - Incremental spell checking for performance
  - Response formatting utilities

- **`documentChangeTracker.ts`** - Document change tracking
  - Tracks text changes for incremental updates
  - Calculates diffs between document versions
  - Manages pending changes queue
  - Processes incremental spell check results

- **`messageHandlers.ts`** - WebSocket message processing
  - Handles text messages (ping/pong, JSON requests)
  - Processes binary Yjs protocol messages
  - Routes AI requests to appropriate handlers
  - Manages new connection setup

## Architecture Benefits

### Separation of Concerns
- Each module has a single responsibility
- Clear interfaces between components
- Easier to test individual components

### Maintainability
- Smaller, focused files are easier to understand
- Changes to one feature don't affect others
- Clear dependency relationships

### Extensibility
- New AI features can be added to `spellCheckService`
- Different message types can be handled in `messageHandlers`
- Document tracking can be enhanced independently

## Usage

The main `DocumentHibernationServer` class automatically initializes all services:

```typescript
export class DocumentHibernationServer extends DurableObject<CloudflareBindings> {
    private spellCheckService: SpellCheckService;
    private documentTracker: DocumentChangeTracker;
    private messageHandlers: MessageHandlers;

    constructor(ctx: DurableObjectState, env: CloudflareBindings) {
        super(ctx, env);
        this.spellCheckService = new SpellCheckService(env);
        this.documentTracker = new DocumentChangeTracker();
        this.messageHandlers = new MessageHandlers(
            this.yDoc,
            this.awareness,
            this.connections,
            this.spellCheckService,
            this.documentTracker
        );
        this.setupDocument();
    }
}
```

## Adding New Features

### New AI Service
1. Create a new service class (e.g., `grammarCheckService.ts`)
2. Add new types to `types.ts`
3. Add handler in `messageHandlers.ts`
4. Initialize in main class

### New Message Types
1. Add message type constants to `types.ts`
2. Add handler method in `messageHandlers.ts`
3. Update the message routing logic

### New Document Features
1. Extend `documentChangeTracker.ts` for new tracking needs
2. Add new Yjs data structures as needed
3. Update the document setup in main class 