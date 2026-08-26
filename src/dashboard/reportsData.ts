export const REPORT_DATE_LABEL = '01 May 2025 - 17 May 2025'

export const REPORT_TYPES = [
  'Summary Report',
  'Credit Report',
  'Debit Report',
  'Customer Report',
] as const

export const REPORT_CUSTOMERS = [
  'All Customers',
  'ABC Petroleum',
  'XYZ Fuel Station',
  'City Transport Co.',
  'Green Valley Depot',
] as const

export const REPORT_PRODUCTS = [
  'All Products',
  'Petrol',
  'Diesel',
  'Lubricants',
  'Engine Oil',
  'Other Services',
] as const

export const REPORT_SUMMARY = {
  totalCredit: { value: '85,420.00', change: '+8.4%', changeFull: '+8.4% from selected period', tone: 'up' as const },
  totalDebit: { value: '42,180.00', change: '+6.2%', changeFull: '+6.2% from selected period', tone: 'down' as const },
  netFlow: { value: '43,240.00', change: '+5.3%', changeFull: '+5.3% from selected period', tone: 'up' as const },
  totalTx: { value: '156', change: '+12.5%', changeFull: '+12.5% from selected period', tone: 'up' as const },
}

export const TOP_CUSTOMERS = [
  { rank: 1, name: 'ABC Petroleum', credit: '95,200.00', debit: '50,000.00', net: '45,200.00', netPositive: true },
  { rank: 2, name: 'XYZ Fuel Station', credit: '64,000.00', debit: '28,480.00', net: '35,520.00', netPositive: true },
  { rank: 3, name: 'City Transport Co.', credit: '40,000.00', debit: '54,000.00', net: '-14,000.00', netPositive: false },
  { rank: 4, name: 'Highway Filling', credit: '75,000.00', debit: '80,000.00', net: '-5,000.00', netPositive: false },
  { rank: 5, name: 'Green Valley Depot', credit: '58,200.00', debit: '22,800.00', net: '35,400.00', netPositive: true },
]

export const PRODUCT_SUMMARY = [
  { product: 'Petrol', credit: '120,500.00', debit: '89,000.00', net: '31,500.00' },
  { product: 'Diesel', credit: '210,000.00', debit: '175,400.00', net: '34,600.00' },
  { product: 'Lubricants', credit: '45,800.00', debit: '22,800.00', net: '23,000.00' },
  { product: 'Engine Oil', credit: '18,200.00', debit: '9,600.00', net: '8,600.00' },
  { product: 'Other Services', credit: '12,500.00', debit: '4,200.00', net: '8,300.00' },
]

export const REPORT_RECENT_TX = [
  { id: 'TXN-00024', when: '17 May 2025 10:30 AM', type: 'Debit' as const, amount: '50,000.00' },
  { id: 'TXN-00023', when: '17 May 2025 09:15 AM', type: 'Credit' as const, amount: '20,000.00' },
  { id: 'TXN-00022', when: '16 May 2025 04:45 PM', type: 'Credit' as const, amount: '95,200.00' },
]
