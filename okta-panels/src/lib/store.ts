/**
 * Global in-memory store for server-side flags shared across API routes.
 *
 * Next.js hot-reloads modules in development, so we pin the store to
 * `globalThis` to survive HMR without losing state.  In production the
 * module is loaded once and the singleton lives for the lifetime of the
 * Node process.
 */

interface GlobalStore {
  isPaused: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __appStore: GlobalStore | undefined;
}

function createStore(): GlobalStore {
  return { isPaused: false };
}

export const store: GlobalStore =
  globalThis.__appStore ?? (globalThis.__appStore = createStore());
