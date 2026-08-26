export type DebitRow = {
  id: string
  customer: string
  when: string
  product: string
  quantity: string
  rate: string
  amount: string
  newBalance: string
  by: string
}

/** Dummy debit rows — replace with API/DB later */
export const DEBIT_ROWS: DebitRow[] = [
  {
    id: 'DBT-00024',
    customer: 'ABC Petroleum',
    when: '17 May 2025 10:30 AM',
    product: 'Diesel',
    quantity: '500 Ltr',
    rate: '100.00',
    amount: '50,000.00',
    newBalance: '150,500.00',
    by: 'Admin',
  },
  {
    id: 'DBT-00023',
    customer: 'XYZ Fuel Station',
    when: '16 May 2025 03:15 PM',
    product: 'Petrol',
    quantity: '320 Ltr',
    rate: '89.00',
    amount: '28,480.00',
    newBalance: '200,500.00',
    by: 'Admin',
  },
  {
    id: 'DBT-00022',
    customer: 'City Transport Co.',
    when: '16 May 2025 11:05 AM',
    product: 'CNG',
    quantity: '1,200 m³',
    rate: '45.00',
    amount: '54,000.00',
    newBalance: '228,980.00',
    by: 'Accountant',
  },
  {
    id: 'DBT-00021',
    customer: 'Green Valley Depot',
    when: '15 May 2025 02:40 PM',
    product: 'Lubricants',
    quantity: '40 Pack',
    rate: '570.00',
    amount: '22,800.00',
    newBalance: '282,980.00',
    by: 'Admin',
  },
  {
    id: 'DBT-00020',
    customer: 'Highway Filling',
    when: '14 May 2025 09:50 AM',
    product: 'Diesel',
    quantity: '800 Ltr',
    rate: '100.00',
    amount: '80,000.00',
    newBalance: '305,780.00',
    by: 'User',
  },
  {
    id: 'DBT-00019',
    customer: 'Metro Logistics',
    when: '13 May 2025 04:20 PM',
    product: 'Super',
    quantity: '250 Ltr',
    rate: '97.00',
    amount: '24,250.00',
    newBalance: '385,780.00',
    by: 'Admin',
  },
  {
    id: 'DBT-00018',
    customer: 'Al-Haram Oil',
    when: '12 May 2025 10:10 AM',
    product: 'Petrol',
    quantity: '150 Ltr',
    rate: '89.00',
    amount: '13,350.00',
    newBalance: '410,030.00',
    by: 'Accountant',
  },
  {
    id: 'DBT-00017',
    customer: 'Sunrise Motors',
    when: '11 May 2025 01:35 PM',
    product: 'Diesel',
    quantity: '100 Ltr',
    rate: '100.00',
    amount: '10,000.00',
    newBalance: '423,380.00',
    by: 'Admin',
  },
]

export const DEBIT_SUMMARY = {
  total: { value: '42,180.00', change: '+6.2% from last month', tone: 'down' as const },
  month: { value: '18,200.00', change: '+8.7% from last month', tone: 'down' as const },
  today: { value: '4,500.00', change: '+5.1% from yesterday', tone: 'down' as const },
  customers: { value: '1,248', change: '+12.5% from last month', tone: 'up' as const },
}

export const DEBIT_SUMMARY_MOBILE = [
  { id: 'total', label: 'Total Debit', value: '42,180', unit: 'PKR', tint: 'fuel' as const },
  { id: 'month', label: 'This Month', value: '18,200', unit: 'PKR', tint: 'amber' as const },
  { id: 'today', label: "Today's Debit", value: '4,500', unit: 'PKR', tint: 'sky' as const },
  { id: 'customers', label: 'Customers', value: '1,248', unit: '', tint: 'rose' as const },
]
