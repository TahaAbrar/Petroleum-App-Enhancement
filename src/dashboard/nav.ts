import type { BottomNavItem, NavItem, PortalRole } from './types'

const NAV_BASE: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid', path: '/dashboard' },
  { id: 'chartOfAccounts', label: 'Chart of Accounts', icon: 'ledger', path: '/chart-of-accounts' },
  { id: 'customers', label: 'Search Account', icon: 'users', path: '/customers' },
  { id: 'credit', label: 'Credit', icon: 'credit', path: '/credit' },
  { id: 'debit', label: 'Debit', icon: 'debit', path: '/debit' },
  { id: 'transactions', label: 'Transactions', icon: 'swap', path: '/transactions' },
  { id: 'reports', label: 'Reports', icon: 'doc', path: '/reports' },
]

const CUSTOMER_NAV: NavItem[] = [
  { id: 'dashboard', label: 'My Account', icon: 'grid', path: '/customer/dashboard' },
  { id: 'transactions', label: 'My Transactions', icon: 'swap', path: '/customer/transactions' },
]

const BOTTOM_BASE = [
  { id: 'home', label: 'Home', path: '/dashboard', icon: 'home' },
  { id: 'customers', label: 'Search Account', path: '/customers', icon: 'users' },
  { id: 'fab', label: 'Add', path: '/credit', icon: 'plus' },
  { id: 'transactions', label: 'Txns', path: '/transactions', icon: 'swap' },
  { id: 'reports', label: 'Reports', path: '/reports', icon: 'doc' },
] as const

const CUSTOMER_BOTTOM: BottomNavItem[] = [
  { id: 'home', label: 'Home', path: '/customer/dashboard', icon: 'home' },
  { id: 'transactions', label: 'Txns', path: '/customer/transactions', icon: 'swap' },
]

function withPrefix(path: string, prefix: string) {
  if (!prefix) return path
  if (path === '/dashboard') return `${prefix}/dashboard`
  return `${prefix}${path}`
}

export function buildNav(role: PortalRole): NavItem[] {
  if (role === 'Customer') return CUSTOMER_NAV

  const prefix =
    role === 'Accountant' ? '/accountant' : role === 'User' ? '/user' : ''

  const allowed =
    role === 'Administrator'
      ? NAV_BASE
      : role === 'Accountant'
        ? NAV_BASE.filter((n) =>
            [
              'dashboard',
              'customers',
              'credit',
              'debit',
              'transactions',
              'reports',
              'chartOfAccounts',
            ].includes(n.id),
          )
        : NAV_BASE.filter((n) =>
            ['dashboard', 'transactions', 'reports', 'chartOfAccounts'].includes(n.id),
          )

  return allowed.map((item) => ({
    ...item,
    path: withPrefix(item.path, prefix),
  }))
}

export function buildBottomNav(role: PortalRole): BottomNavItem[] {
  if (role === 'Customer') return CUSTOMER_BOTTOM

  const prefix =
    role === 'Accountant' ? '/accountant' : role === 'User' ? '/user' : ''

  return BOTTOM_BASE.map((item) => ({
    ...item,
    path:
      item.id === 'home'
        ? withPrefix('/dashboard', prefix)
        : withPrefix(item.path, prefix),
  })).filter((item) => {
    if (role === 'User' && (item.id === 'customers' || item.id === 'fab')) return false
    return true
  })
}

export function adminConfig() {
  const nav = buildNav('Administrator')
  return {
    portalTitle: 'Petroleum Accounting System',
    roleLabel: 'Super Admin',
    nav,
    bottomNav: buildBottomNav('Administrator'),
    homePath: '/dashboard',
    txPath: '/transactions',
    kind: 'staff' as const,
  }
}

export function accountantConfig() {
  const nav = buildNav('Accountant')
  return {
    portalTitle: 'Accountant Portal',
    roleLabel: 'Accountant',
    nav,
    bottomNav: buildBottomNav('Accountant'),
    homePath: '/accountant/dashboard',
    txPath: '/accountant/transactions',
    kind: 'staff' as const,
  }
}

export function userConfig() {
  const nav = buildNav('User')
  return {
    portalTitle: 'User Portal',
    roleLabel: 'User',
    nav,
    bottomNav: buildBottomNav('User'),
    homePath: '/user/dashboard',
    txPath: '/user/transactions',
    kind: 'staff' as const,
  }
}

export function customerConfig() {
  const nav = buildNav('Customer')
  return {
    portalTitle: 'Customer Portal',
    roleLabel: 'Customer',
    nav,
    bottomNav: buildBottomNav('Customer'),
    homePath: '/customer/dashboard',
    txPath: '/customer/transactions',
    kind: 'customer' as const,
  }
}
