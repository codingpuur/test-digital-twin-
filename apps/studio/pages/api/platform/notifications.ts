import type { NextApiRequest, NextApiResponse } from 'next'

// Not used by the mock backend: always empty.
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(200).json([])
}
