import { useState } from 'react'
import { usePanelRef } from 'ui'

/** A resizable panel that can also be closed and reopened (and closes when dragged below its minimum). */
type Options = {
  /** Begin closed, e.g. a drawer that only opens when something asks for it. */
  startCollapsed?: boolean
  /** Size to open to when there is no earlier size to return to (a number is pixels). */
  openSize?: number | string
}

export const useCollapsiblePanel = ({ startCollapsed = false, openSize }: Options = {}) => {
  const ref = usePanelRef()
  const [isCollapsed, setIsCollapsed] = useState(startCollapsed)

  const expand = () => {
    const handle = ref.current
    if (!handle?.isCollapsed()) return
    // A panel that started closed has no earlier size for `expand()` to return to, so it opens to
    // a fixed size instead.
    if (openSize !== undefined) handle.resize(openSize)
    else handle.expand()
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
      onResize: () => setIsCollapsed(ref.current?.isCollapsed() ?? false),
    },
  }
}

export type CollapsiblePanel = ReturnType<typeof useCollapsiblePanel>
