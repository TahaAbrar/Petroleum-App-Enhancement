export type PaymentType = 'Cash' | 'Online' | 'Bank Transfer'

export type CreditRow = {
  id: string
  customer: string
  when: string
  amount: string
  paymentType: PaymentType
  reference: string
  newBalance: string
  by: string
}

/** Dummy credit rows — replace with API/DB later */
export const CREDIT_ROWS: CreditRow[] = [
  {
    id: 'CRD-00024',
    customer: 'ABC Petroleum',
    when: '17 May 2025 09:15 AM',
    amount: '20,000.00',
    paymentType: 'Cash',
    reference: 'REF-00024',
    newBalance: '150,500.00',
    by: 'Admin',
  },
  {
    id: 'CRD-00023',
    customer: 'XYZ Fuel Station',
    when: '16 May 2025 04:30 PM',
    amount: '35,000.00',
    paymentType: 'Online',
    reference: 'REF-00023',
    newBalance: '130,500.00',
    by: 'Admin',
  },
  {
    id: 'CRD-00022',
    customer: 'Al-Haram Oil',
    when: '16 May 2025 11:20 AM',
    amount: '15,500.00',
    paymentType: 'Bank Transfer',
    reference: 'REF-00022',
    newBalance: '95,500.00',
    by: 'Accountant',
  },
  {
    id: 'CRD-00021',
    customer: 'City Transport Co.',
    when: '15 May 2025 02:45 PM',
    amount: '42,000.00',
    paymentType: 'Cash',
    reference: 'REF-00021',
    newBalance: '80,000.00',
    by: 'Admin',
  },
  {
    id: 'CRD-00020',
    customer: 'Green Valley Depot',
    when: '14 May 2025 10:05 AM',
    amount: '18,750.00',
    paymentType: 'Online',
    reference: 'REF-00020',
    newBalance: '38,000.00',
    by: 'User',
  },
  {
    id: 'CRD-00019',
    customer: 'Highway Filling',
    when: '13 May 2025 03:40 PM',
    amount: '27,300.00',
    paymentType: 'Bank Transfer',
    reference: 'REF-00019',
    newBalance: '19,250.00',
    by: 'Admin',
  },
  {
    id: 'CRD-00018',
    customer: 'Metro Logistics',
    when: '12 May 2025 09:50 AM',
    amount: '9,800.00',
    paymentType: 'Cash',
    reference: 'REF-00018',
    newBalance: '-8,050.00',
    by: 'Accountant',
  },
  {
    id: 'CRD-00017',
    customer: 'Sunrise Motors',
    when: '11 May 2025 01:15 PM',
    amount: '55,000.00',
    paymentType: 'Online',
    reference: 'REF-00017',
    newBalance: '-17,850.00',
    by: 'Admin',
  },
]

export const CREDIT_SUMMARY = {
  total: { value: '85,420.00', change: '+8.4% from last month' },
  month: { value: '25,600.00', change: '+12.1% from last month' },
  today: { value: '6,300.00', change: '+5.2% from yesterday' },
  customers: { value: '1,248', change: '+3.8% from last month' },
}

/** Compact labels for mobile summary strip */
export const CREDIT_SUMMARY_MOBILE = [
  { id: 'total', label: 'Total Credit', value: '85,420', unit: 'PKR', tint: 'fuel' as const },
  { id: 'month', label: 'This Month', value: '25,600', unit: 'PKR', tint: 'amber' as const },
  { id: 'today', label: "Today's", value: '6,300', unit: 'PKR', tint: 'sky' as const },
  { id: 'customers', label: 'Customers', value: '1,248', unit: '', tint: 'rose' as const },
]
