import { useRef, useState } from 'react'
import { usePanelRef } from 'ui'

/** A resizable panel that can also be closed and reopened (and closes when dragged below its minimum). */
type Options = {
  /** Begin closed, e.g. a drawer that only opens when something asks for it. */
  startCollapsed?: boolean
  /** Size to open to, as a percentage, when there is no earlier size to return to. */
  openPercent?: number
}

export const useCollapsiblePanel = ({ startCollapsed = false, openPercent }: Options = {}) => {
  const ref = usePanelRef()
  const [isCollapsed, setIsCollapsed] = useState(startCollapsed)
  const lastOpenPercent = useRef<number | null>(null)

  const expand = () => {
    const handle = ref.current
    if (!handle?.isCollapsed()) return
    // A panel that started closed has no earlier size for `expand()` to return to.
    const percent = lastOpenPercent.current ?? openPercent
    if (percent === undefined) handle.expand()
    else handle.resize(`${percent}%`)
  }

  const toggle = () => {
    if (ref.current?.isCollapsed()) expand()
    else ref.current?.collapse()
  }

  return {
    isCollapsed,
    toggle,
    collapse: () => ref.current?.collapse(),
    expand,
    panelProps: {
      collapsible: true,
      collapsedSize: 0,
      panelRef: ref,
      onResize: (size: { asPercentage: number }) => {
        if (size.asPercentage > 0) lastOpenPercent.current = size.asPercentage
        setIsCollapsed(ref.current?.isCollapsed() ?? false)
      },
    },
  }
}

export type CollapsiblePanel = ReturnType<typeof useCollapsiblePanel>
