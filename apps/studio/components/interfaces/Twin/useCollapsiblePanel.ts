import { useState } from 'react'
import { usePanelRef } from 'ui'

/** A resizable panel that can also be closed and reopened (and closes when dragged below its minimum). */
export const useCollapsiblePanel = () => {
  const ref = usePanelRef()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const toggle = () => {
    if (ref.current?.isCollapsed()) ref.current.expand()
    else ref.current?.collapse()
  }

  return {
    isCollapsed,
    toggle,
    collapse: () => ref.current?.collapse(),
    expand: () => ref.current?.expand(),
    panelProps: {
      collapsible: true,
      collapsedSize: 0,
      panelRef: ref,
      onResize: () => setIsCollapsed(ref.current?.isCollapsed() ?? false),
    },
  }
}

export type CollapsiblePanel = ReturnType<typeof useCollapsiblePanel>
