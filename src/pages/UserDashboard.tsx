import { DashboardShell } from '../dashboard/DashboardShell'
import { userConfig } from '../dashboard/nav'

/** User portal — separate page file (not shared admin Dashboard.tsx) */
export default function UserDashboard() {
  return <DashboardShell config={userConfig()} />
}
