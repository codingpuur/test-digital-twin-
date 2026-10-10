import type { NextApiRequest, NextApiResponse } from 'next'

import { apiWrapper } from '@/lib/api/apiWrapper'

export default (req: NextApiRequest, res: NextApiResponse) => apiWrapper(req, res, handler)

const wave = (seconds: number, periodSec: number, phase = 0) =>
  0.5 + 0.5 * Math.sin(((seconds + phase) / periodSec) * Math.PI * 2)

/**
 * A stand-in for a customer's sensor API, so polling can be tried offline. Values move with the
 * clock; P-101 slowly crosses its vibration warning level. Its shape is the "local-pumps" preset.
 */
async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const seconds = Date.now() / 1000
  const pump = (index: number, base: number, swing: number) => ({
    vibration: +(base + swing * wave(seconds, 120, index * 40)).toFixed(2),
    temperature: +(55 + 30 * wave(seconds, 300, index * 70)).toFixed(1),
    power: +(40 + 30 * wave(seconds, 90, index * 25)).toFixed(1),
  })
  return res.status(200).json({
    ts: Math.floor(seconds),
    pumps: { 'P-101': pump(0, 3, 6), 'P-102': pump(1, 2.4, 1.2) },
  })
}
