# ADR 0004: Use SSE for workflow progress with polling fallback

- Status: Accepted
- Date: 2026-09-30

## Context

NUMEN needs near-real-time progress updates while a workflow moves through planning, collection, validation and publication. The browser only needs server-to-client progress; it does not need a bidirectional realtime command channel.

## Decision

Use Server-Sent Events as the primary progress channel.

- The browser subscribes to `/api/v1/tasks/{id}/events`.
- The server sends the current task state immediately on subscription.
- Events include a reconnect hint.
- Stream lifetime is bounded so stale connections are eventually recycled.
- Disconnect, timeout and application shutdown all remove/complete emitters.
- The frontend also polls at a low frequency as a recovery path for proxies, browser reconnects or temporary network interruption.

## Why not WebSockets

WebSockets would add bidirectional connection lifecycle, protocol and operational complexity without a matching product requirement. NUMEN's current progress stream is one-way.

## Consequences

The design stays compatible with normal HTTP infrastructure and browser-native `EventSource`. Polling adds a small amount of duplicate read traffic, but it provides deterministic convergence when an event is missed. If future functionality requires high-frequency bidirectional commands, the transport decision should be revisited rather than forcing SSE beyond its intended role.
