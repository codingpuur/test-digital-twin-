declare module 'occt-import-js' {
  type OcctModule = {
    ReadStepFile: (content: Uint8Array, params: null) => any
    ReadIgesFile: (content: Uint8Array, params: null) => any
  }
  export default function occtimport(options?: {
    locateFile?: (path: string) => string
  }): Promise<OcctModule>
}
