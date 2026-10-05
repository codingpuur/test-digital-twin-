import type { NextApiRequest, NextApiResponse } from 'next'

// Telemetry and feature flags are not used by the mock backend.
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json({})
}
