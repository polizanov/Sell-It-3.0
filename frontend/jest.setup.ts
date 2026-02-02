import '@testing-library/jest-dom'
import { TextDecoder, TextEncoder } from 'node:util'
import 'whatwg-fetch'

// React Router depends on TextEncoder in the test environment.
if (!globalThis.TextEncoder) {
  globalThis.TextEncoder = TextEncoder as unknown as typeof globalThis.TextEncoder
}

if (!globalThis.TextDecoder) {
  globalThis.TextDecoder = TextDecoder as unknown as typeof globalThis.TextDecoder
}

