import { useParams } from 'common'
import { Cable, FileSpreadsheet } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button, copyToClipboard } from 'ui'

import { usePostTwinReadingsMutation, useTwinStreamsQuery } from '@/data/twin/twin-queries'
import { BASE_PATH } from '@/lib/constants'
import { csvToReadings } from '@/lib/twin/streams'

const TEST_STREAM = 'demo.sensor'
const HISTORY_HOURS = 6

/** A smooth wave with noise, one point a minute, ending now: enough to try replay and charts. */
const buildSampleHistory = (now = Date.now()) =>
  Array.from({ length: HISTORY_HOURS * 60 }, (_, index) => {
    const ts = now - (HISTORY_HOURS * 60 - index) * 60_000
    const wave = Math.sin((index / 90) * Math.PI * 2)
    return {
      stream: TEST_STREAM,
      ts,
      value: +(50 + wave * 30 + (Math.random() - 0.5) * 6).toFixed(1),
    }
  })

export const ConnectionsPanel = () => {
  const { ref } = useParams()
  const { data } = useTwinStreamsQuery(ref)
  const postReadings = usePostTwinReadingsMutation(ref)
  const csvInput = useRef<HTMLInputElement>(null)
  const [csvError, setCsvError] = useState<string | null>(null)

  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const url = `${origin}${BASE_PATH}/api/ingest/${ref}`
  const key = data?.ingestKey ?? '...'
  const sample = `curl -X POST ${url} \\
  -H "x-ingest-key: ${key}" \\
  -H "content-type: application/json" \\
  -d '{"stream":"P-101.vibration","value":2.9}'`

  const handleCsv = async (file: File) => {
    setCsvError(null)
    const parsed = csvToReadings(await file.text())
    if (parsed.status === 'error') return setCsvError(parsed.message)
    const result = await postReadings.mutateAsync(parsed.readings)
    toast.success(`Imported ${result.accepted} readings from ${file.name}`)
  }

  return (
    <div className="flex flex-col gap-y-5">
      <section className="flex flex-col gap-y-2">
        <h3 className="flex items-center gap-x-2 text-sm">
          <Cable size={14} /> HTTP webhook
        </h3>
        <p className="text-xs text-foreground-light">
          Post readings from a PLC gateway, script or device. A new stream name creates a stream you
          can map to an asset.
        </p>
        <pre className="overflow-x-auto rounded-md border bg-surface-100 p-2 text-xs">{sample}</pre>
        <div className="flex gap-x-2">
          <Button size="tiny" variant="default" onClick={() => copyToClipboard(sample)}>
            Copy example
          </Button>
          <Button size="tiny" variant="default" onClick={() => copyToClipboard(key)}>
            Copy key
          </Button>
        </div>
        <p className="text-xs text-foreground-lighter">
          Also accepts a list, or {'{"readings": [...]}'}. Optional <code>ts</code> (ISO or epoch).
        </p>
      </section>

      <section className="flex flex-col gap-y-2">
        <h3 className="flex items-center gap-x-2 text-sm">
          <FileSpreadsheet size={14} /> CSV upload
        </h3>
        <p className="text-xs text-foreground-light">
          Columns: <code>timestamp,stream,value</code>, or a <code>timestamp</code> column plus one
          column per stream.
        </p>
        <input
          ref={csvInput}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) handleCsv(file)
            event.target.value = ''
          }}
        />
        <Button
          size="tiny"
          variant="default"
          className="self-start"
          loading={postReadings.isPending}
          onClick={() => csvInput.current?.click()}
        >
          Upload readings CSV
        </Button>
        {csvError && <p className="text-xs text-destructive">{csvError}</p>}
      </section>

      <section className="flex flex-col gap-y-2">
        <h3 className="text-sm">Try it</h3>
        <p className="text-xs text-foreground-light">
          Sends one random reading to a <code>{TEST_STREAM}</code> stream, to see the flow end to
          end.
        </p>
        <Button
          size="tiny"
          variant="default"
          className="self-start"
          loading={postReadings.isPending}
          onClick={() =>
            postReadings.mutate([{ stream: TEST_STREAM, value: +(Math.random() * 100).toFixed(1) }])
          }
        >
          Send test reading
        </Button>
        <p className="text-xs text-foreground-light">
          Or fill the last {HISTORY_HOURS} hours of history, then scrub the timeline to replay it.
        </p>
        <Button
          size="tiny"
          variant="default"
          className="self-start"
          loading={postReadings.isPending}
          onClick={() => postReadings.mutate(buildSampleHistory())}
        >
          Load sample history
        </Button>
      </section>
    </div>
  )
}
