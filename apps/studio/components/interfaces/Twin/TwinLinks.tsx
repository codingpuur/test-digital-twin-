import { useParams } from 'common'
import {
  Box,
  Cable,
  ChartPie,
  FileText,
  Filter,
  FolderOpen,
  Gauge,
  Network,
  PlayCircle,
  Sparkles,
  Tag,
  Ticket,
  Users,
  Waves,
} from 'lucide-react'
import { useRouter } from 'next/router'
import { SidebarGroup, SidebarMenu } from 'ui'

import { announceStreamsClick } from './streams-drawer-events'
import { DEFAULT_TWIN_MODULE } from './twin.types'
import { ICON_SIZE, ICON_STROKE_WIDTH, SideBarNavLink } from '@/components/interfaces/Sidebar'

// Built lazily: Sidebar and this file import each other, so the icon constants can't be read at load time.
const getModuleRoutes = () => {
  const iconProps = { size: ICON_SIZE, strokeWidth: ICON_STROKE_WIDTH }
  return [
    { key: 'dashboards', label: 'Dashboards', icon: <ChartPie {...iconProps} /> },
    { key: 'filters', label: 'Filters', icon: <Filter {...iconProps} /> },
    { key: 'assets', label: 'Assets', icon: <Tag {...iconProps} /> },
    { key: 'files', label: 'Files', icon: <FolderOpen {...iconProps} /> },
    { key: 'docs', label: 'Docs', icon: <FileText {...iconProps} /> },
    { key: 'systems', label: 'Systems', icon: <Network {...iconProps} /> },
    { key: 'connections', label: 'Connections', icon: <Cable {...iconProps} /> },
    { key: 'tickets', label: 'Tickets', icon: <Ticket {...iconProps} /> },
    { key: 'users', label: 'Users', icon: <Users {...iconProps} /> },
    { key: 'streams', label: 'Streams', icon: <Waves {...iconProps} /> },
    { key: 'simulation', label: 'Simulation', icon: <PlayCircle {...iconProps} /> },
    { key: 'pump', label: 'Pump twin', icon: <Gauge {...iconProps} /> },
  ]
}

export const TwinLinks = () => {
  const { ref } = useParams()
  const router = useRouter()
  const moduleRoutes = getModuleRoutes()
  const iconProps = { size: ICON_SIZE, strokeWidth: ICON_STROKE_WIDTH }
  const isAssistant = router.pathname.endsWith('/assistant')
  const activeModule = (router.query.module as string | undefined) ?? DEFAULT_TWIN_MODULE

  return (
    <SidebarGroup className="gap-0.5">
      <SidebarMenu>
        <SideBarNavLink
          route={{
            key: 'model',
            label: '3D model',
            icon: <Box {...iconProps} />,
            link: `/project/${ref}`,
          }}
          active={false}
        />
        <SideBarNavLink
          route={{
            key: 'assistant',
            label: 'Assistant',
            icon: <Sparkles {...iconProps} />,
            link: `/project/${ref}/assistant`,
          }}
          active={isAssistant}
        />
        {moduleRoutes.map((route) => (
          <SideBarNavLink
            key={route.key}
            route={{ ...route, link: `/project/${ref}?module=${route.key}` }}
            active={!isAssistant && activeModule === route.key}
            // Clicking Streams again, while it is already open, closes the drawer.
            onClick={
              route.key === 'streams' && activeModule === 'streams'
                ? announceStreamsClick
                : undefined
            }
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
