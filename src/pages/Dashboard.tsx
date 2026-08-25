import { DashboardShell } from '../dashboard/DashboardShell'
import { adminConfig } from '../dashboard/nav'

/** Admin portal — full FuelLedger dashboard */
export default function Dashboard() {
  return <DashboardShell config={adminConfig()} />
}
