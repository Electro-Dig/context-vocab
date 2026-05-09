import { vi } from 'vitest';

const localStore = new Map<string, unknown>();

Object.defineProperty(globalThis, 'chrome', {
  value: {
    storage: {
      local: {
        get: vi.fn(async (keys?: string | string[] | Record<string, unknown>) => {
          if (!keys) return Object.fromEntries(localStore);
          if (typeof keys === 'string') return { [keys]: localStore.get(keys) };
          if (Array.isArray(keys)) {
            return Object.fromEntries(keys.map((key) => [key, localStore.get(key)]));
          }
          return Object.fromEntries(
            Object.entries(keys).map(([key, fallback]) => [key, localStore.get(key) ?? fallback])
          );
        }),
        set: vi.fn(async (items: Record<string, unknown>) => {
          Object.entries(items).forEach(([key, value]) => localStore.set(key, value));
        }),
        remove: vi.fn(async (keys: string | string[]) => {
          (Array.isArray(keys) ? keys : [keys]).forEach((key) => localStore.delete(key));
        }),
        clear: vi.fn(async () => localStore.clear())
      }
    },
    runtime: {
      sendMessage: vi.fn(),
      onMessage: { addListener: vi.fn() },
      openOptionsPage: vi.fn()
    }
  },
  writable: true
});

beforeEach(async () => {
  localStore.clear();
  vi.clearAllMocks();
});
