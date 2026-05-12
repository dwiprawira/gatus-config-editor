// Type stubs for packages without bundled declarations

declare module 'react-diff-viewer-continued' {
  import type { ComponentType } from 'react'

  interface ReactDiffViewerProps {
    oldValue?: string
    newValue?: string
    splitView?: boolean
    leftTitle?: string
    rightTitle?: string
    hideLineNumbers?: boolean
    showDiffOnly?: boolean
    useDarkTheme?: boolean
    [key: string]: unknown
  }

  const ReactDiffViewer: ComponentType<ReactDiffViewerProps>
  export default ReactDiffViewer
}
