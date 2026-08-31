import { DashboardShell } from '../dashboard/DashboardShell'
import { customerConfig } from '../dashboard/nav'

/** Customer portal — AccReg WebUser login */
export default function CustomerDashboard() {
  return <DashboardShell config={customerConfig()} />
}
