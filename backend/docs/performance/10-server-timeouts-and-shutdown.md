# 10. Tune HTTP keep-alive; bound graceful shutdown

- **Status:** shipped in [PR #15](https://github.com/rkterungwa16/terk-ewallet/pull/15) (commit `217dbad`)
- **Code:** `src/index.ts`, `src/services/reconcile.service.ts`
  (`startWithdrawalReconciler`), `src/config/env.ts`

## Context

**Keep-alive.** Node closes idle keep-alive sockets after 5 seconds by
default. Railway's proxy, like most proxies, keeps upstream connections
idle for longer (typically around 60s). When Node closes a socket at the
same moment the proxy sends a new request down it, that request fails, and
the client gets a 502. These are intermittent and hard to reproduce, and the
project has seen unexplained 502s on Railway.

**Shutdown.** The reconciler PR (record 04) had added a basic SIGTERM
handler: stop the reconciler, `server.close()`, disconnect Mongo, exit. It
had gaps:

- No deadline: a stuck request (for example, one waiting on Paystack) could
  hold the process open indefinitely.
- A reconciler run already in progress wasn't awaited, so Mongo could be
  disconnected halfway through settling a withdrawal.
- Keep-alive clients weren't told to reconnect.

## Decision

**Timeouts:**

- `server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS` (default 65s), longer
  than the proxy's idle timeout, so the proxy always closes first.
- `server.headersTimeout = keepAliveTimeout + 1000`. Node requires this:
  if the header timeout is shorter, a reused socket can be dropped while the
  next request's headers are still arriving.

**Shutdown on SIGTERM / SIGINT:**

1. Mark the server as shutting down. Stop accepting connections
   (`server.close()`), and close idle keep-alive sockets immediately
   (`closeIdleConnections()`).
2. **Every in-flight response that hasn't sent its headers** gets
   `Connection: close`, and so does any request that arrives while draining.
   Node then closes each socket as soon as its response is done, instead of
   holding it for the 65s keep-alive timeout. A `request` listener added
   with `prependListener`, so it runs before Express writes headers, keeps a
   set of in-flight responses for this.
3. Wait for in-flight requests **and** for any reconciler run already in
   progress. `startWithdrawalReconciler` now returns
   `() => Promise<void>`, which resolves when the current run finishes.
4. Disconnect MongoDB, log `Shutdown complete`, exit 0.
5. **Deadline:** if this takes longer than `SHUTDOWN_TIMEOUT_MS` (default
   10s), close all connections and exit 1.
6. A **second signal** exits immediately with code 1.

## Bugs found while testing

- **In-flight requests held shutdown open.** The first version set
  `Connection: close` only on requests that *arrived* after SIGTERM. A
  request already running kept its keep-alive socket. When it finished,
  the socket went idle after the one-time idle sweep and held the server
  open until the 10s deadline forced exit code 1. Every redeploy with
  traffic would have hit this. Fixed by tracking in-flight responses
  (step 2 above).
- **Overlapping reconciler runs.** In a draft, a timer tick that fired
  during a long run replaced the "current run" promise with an
  already-finished one, so shutdown would have stopped waiting. Fixed by
  only updating it when a run actually starts. Caught before committing.

## Alternatives considered

- **Tuning the proxy instead.** Railway's proxy timeouts aren't
  configurable, and making the app outlast any reasonable proxy is the
  standard fix.
- **A process manager (PM2) for graceful reloads.** Railway already
  replaces containers, so this adds nothing there.

## Consequences

- Idle keep-alive sockets now live up to 65s, so slightly more file
  descriptors are open under bursty traffic. That's negligible at this
  scale.
- **Check Railway's shutdown grace period.** It must be longer than
  `SHUTDOWN_TIMEOUT_MS`, or the container is force-killed before shutdown
  finishes. Lower the setting or raise Railway's.

## Configuration

`KEEP_ALIVE_TIMEOUT_MS` (default `65000`), `SHUTDOWN_TIMEOUT_MS` (default
`10000`).

## Verification

The compiled server ran as a child process on local MongoDB, with a fake
Paystack whose delay was controllable, and received real signals:

| Case | Result |
|---|---|
| Idle socket reused after 6.5s | Same socket (the old 5s default would have closed it) |
| SIGTERM with an idle keep-alive socket open | Exit 0 in 18ms |
| In-flight request during drain | 200, `Connection: close` |
| New connection while draining | Refused |
| Exit after that request | Exit 0, 1.7s after SIGTERM |
| Stuck request | Forced exit 1 at the 1.5s test deadline |
| Second signal | Exit 1 in 211ms |
| SIGTERM mid-reconcile | Run finished first, withdrawal settled, exit 0 |
