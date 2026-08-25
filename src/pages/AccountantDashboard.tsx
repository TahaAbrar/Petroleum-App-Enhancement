import { DashboardShell } from '../dashboard/DashboardShell'
import { accountantConfig } from '../dashboard/nav'

/** Accountant portal — separate page file (not shared admin Dashboard.tsx) */
export default function AccountantDashboard() {
  return <DashboardShell config={accountantConfig()} />
}
