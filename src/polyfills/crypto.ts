// Hermes has no global `crypto`, but several libraries expect the Web Crypto
// `crypto.getRandomValues` API — notably nanoid (used to generate DB row ids in
// src/db/schema.ts via $defaultFn(() => nanoid())). Without this, every nanoid()
// call throws `ReferenceError: Property 'crypto' doesn't exist`, which surfaces as
// failed inserts deep inside DB queries.
//
// We back the polyfill with expo-crypto, which is already a native dependency, so
// no extra native module (and no extra native rebuild) is required. Import this
// module before any code that generates ids — it is the first import in the app
// root (src/app/_layout.tsx).
import * as Crypto from 'expo-crypto';

const g = globalThis as typeof globalThis & {
  crypto?: { getRandomValues?: <T extends ArrayBufferView | null>(array: T) => T };
};

if (g.crypto == null) {
  // @ts-expect-error — minimal Crypto shim; only getRandomValues is provided
  g.crypto = {};
}

if (typeof g.crypto.getRandomValues !== 'function') {
  g.crypto.getRandomValues = Crypto.getRandomValues as typeof g.crypto.getRandomValues;
}
