import { useParams } from 'common'
import {
  Box,
  Cable,
  ChartPie,
  FileText,
  Filter,
  FolderOpen,
  Network,
  Tag,
  Ticket,
  Users,
  Waves,
} from 'lucide-react'
import { useRouter } from 'next/router'
import { SidebarGroup, SidebarMenu } from 'ui'

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
  ]
}

export const TwinLinks = () => {
  const { ref } = useParams()
  const router = useRouter()
  const moduleRoutes = getModuleRoutes()
  const iconProps = { size: ICON_SIZE, strokeWidth: ICON_STROKE_WIDTH }
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
        {moduleRoutes.map((route) => (
          <SideBarNavLink
            key={route.key}
            route={{ ...route, link: `/project/${ref}?module=${route.key}` }}
            active={activeModule === route.key}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
