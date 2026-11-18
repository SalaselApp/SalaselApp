import assert from 'node:assert/strict'
import test from 'node:test'

import { podcastPath } from '../app/podcasts/contract.ts'

test('builds a stable podcast detail path without playlist context', () => {
  assert.equal(podcastPath('ar', 'pod_01HZX3A9Y8W2N7Q4R6S5T0V1X2'), '/ar/podcast/pod_01HZX3A9Y8W2N7Q4R6S5T0V1X2')
})

import * as podcastRoutes from '../app/podcasts/contract.ts'

test('detail and playback use separate stable podcast destinations', () => {
  assert.equal(podcastRoutes.podcastPath('ar', 'pod_123'), '/ar/podcast/pod_123')
  assert.equal(podcastRoutes.podcastWatchPath?.('ar', 'pod_123'), '/ar/podcast/pod_123/watch')
})
