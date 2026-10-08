import { useMemo, useState } from 'react'

import { elementTag } from '../asset-bridge'
import { getElementReadings, getLiveSignals } from '../simulation/signals'
import { STATUS_COLORS } from '../status-colors'
import { getStreamReadings } from '../stream-bridge'
import type { TwinElement } from '../twin.types'
import type { FocusRequest } from '../ViewerEffects'
import { buildVoiceAssets, colorForScore, type StreamRisk } from './voice-context'
import { parseVoiceCommand } from './voice-intents'
import type { VoiceAction, VoiceContext, VoiceResult } from './voice.types'
import type { TwinStreamRow } from '@/data/twin/twin-queries'
import { isWarningValue } from '@/lib/twin/streams'
import type { TicketInput } from '@/lib/twin/workspace'

type UseVoiceCommandsOptions = {
  elements: TwinElement[]
  isDemoModel: boolean
  streamsByTag: Map<string, TwinStreamRow[]>
  onSelect: (id: string | null) => void
  onJumpTime: (timestamp: number) => void
  onGoLive: () => void
  onCreateTicket: (input: TicketInput) => void
}

const streamRisksOf = (streamsByTag: Map<string, TwinStreamRow[]>): StreamRisk[] =>
  [...streamsByTag.entries()].flatMap(([assetTag, streams]) =>
    streams
      .filter((stream) => isWarningValue(stream.lastValue, stream.warnAbove))
      .map((stream) => ({
        assetTag,
        reason: `${stream.parameter || stream.key} is ${stream.lastValue} ${stream.unit}, above the limit of ${stream.warnAbove}.`,
      }))
  )

/** Runs voice commands against the twin: what to say, and what to do on the 3D model. */
export const useVoiceCommands = ({
  elements,
  isDemoModel,
  streamsByTag,
  onSelect,
  onJumpTime,
  onGoLive,
  onCreateTicket,
}: UseVoiceCommandsOptions) => {
  const [alertIds, setAlertIds] = useState<string[]>([])
  const [focusRequest, setFocusRequest] = useState<FocusRequest | null>(null)
  const [scoreColors, setScoreColors] = useState<Record<string, string> | null>(null)
  const [pendingTicketTag, setPendingTicketTag] = useState<string | null>(null)

  const assets = useMemo(
    () =>
      buildVoiceAssets(elements, { isDemo: isDemoModel, streamRisks: streamRisksOf(streamsByTag) }),
    [elements, isDemoModel, streamsByTag]
  )

  const readingsFor: VoiceContext['readingsFor'] = (assetId, atMs) => {
    const element = elements.find((item) => item.id === assetId)
    if (!element) return []
    const simulated = isDemoModel
      ? getElementReadings(element, getLiveSignals(atMs ?? Date.now()))
      : []
    const fromStreams = getStreamReadings(element, streamsByTag, atMs)
    return [...simulated, ...fromStreams].map((reading) => `${reading.label}: ${reading.value}`)
  }

  const focusOn = (id: string | null) => {
    onSelect(id)
    setFocusRequest({ id, nonce: Date.now() })
  }

  const run = (action: VoiceAction) => {
    switch (action.type) {
      case 'highlight':
        setScoreColors(null)
        return setAlertIds(action.ids)
      case 'focus':
        return focusOn(action.id)
      case 'colorByScore': {
        const scored = new Map(assets.map((asset) => [asset.id, asset.score]))
        setAlertIds([])
        // Zoom out so every coloured asset is in view.
        focusOn(null)
        return setScoreColors(
          Object.fromEntries(
            elements.map((element) => {
              const score = action.ids.includes(element.id) ? scored.get(element.id) : undefined
              return [
                element.id,
                score === undefined ? STATUS_COLORS.Unlinked : colorForScore(score),
              ]
            })
          )
        )
      }
      case 'jumpTime':
        return onJumpTime(action.timestamp)
      case 'goLive':
        return onGoLive()
      case 'clear':
        setAlertIds([])
        setScoreColors(null)
        setPendingTicketTag(null)
        return focusOn(null)
      case 'proposeTicket':
        return setPendingTicketTag(action.assetTag)
      case 'cancelTicket':
        return setPendingTicketTag(null)
      case 'createTicket': {
        setPendingTicketTag(null)
        const element = elements.find((item) => elementTag(item) === action.assetTag)
        return onCreateTicket({
          title: `Inspect ${element?.displayName ?? action.assetTag}`,
          description: 'Created by the voice assistant.',
          assetTag: action.assetTag,
          priority: 'high',
          assignee: '',
        })
      }
    }
  }

  const handleCommand = (transcript: string): VoiceResult => {
    const result = parseVoiceCommand(transcript, {
      assets,
      now: Date.now(),
      pendingTicketTag,
      readingsFor,
    })
    result.actions.forEach(run)
    return result
  }

  return {
    handleCommand,
    alertIds,
    focusRequest,
    scoreColors,
    pendingTicketTag,
    clear: () => run({ type: 'clear' }),
  }
}
