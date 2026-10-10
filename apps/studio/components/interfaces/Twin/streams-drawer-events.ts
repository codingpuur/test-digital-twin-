/**
 * Clicking "Streams" in the sidebar while Streams is already open should close the drawer. The
 * sidebar link cannot reach the workspace's state, so it announces the click and the workspace
 * listens.
 */
export const TOGGLE_STREAMS_DRAWER_EVENT = 'twin:toggle-streams-drawer'

export const announceStreamsClick = () =>
  window.dispatchEvent(new Event(TOGGLE_STREAMS_DRAWER_EVENT))
