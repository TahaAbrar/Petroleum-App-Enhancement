export type CustomerStatus = 'Active' | 'Inactive'
export type CustomerType = 'Retail' | 'Wholesale' | 'Transport' | 'Corporate'

export type Customer = {
  id: string
  name: string
  phone: string
  email: string
  currentBalance: number
  openingBalance: number
  status: CustomerStatus
  type: CustomerType
  createdAt: string
}

export const CUSTOMERS: Customer[] = [
  {
    id: 'CUS-1001',
    name: 'ABC Petroleum',
    phone: '0300-4512789',
    email: 'accounts@abcpetroleum.com',
    currentBalance: 150500,
    openingBalance: 120000,
    status: 'Active',
    type: 'Wholesale',
    createdAt: '2026-08-26',
  },
  {
    id: 'CUS-1002',
    name: 'XYZ Fuel Station',
    phone: '0321-8891204',
    email: 'xyz.fuel@gmail.com',
    currentBalance: -15000,
    openingBalance: 25000,
    status: 'Active',
    type: 'Retail',
    createdAt: '2026-08-26',
  },
  {
    id: 'CUS-1003',
    name: 'City Transport Co.',
    phone: '0333-6745120',
    email: 'billing@citytransport.pk',
    currentBalance: 95200,
    openingBalance: 80000,
    status: 'Active',
    type: 'Transport',
    createdAt: '2026-08-25',
  },
  {
    id: 'CUS-1004',
    name: 'Green Valley Depot',
    phone: '0345-2210987',
    email: 'ops@greenvalleydepot.com',
    currentBalance: 42800,
    openingBalance: 50000,
    status: 'Active',
    type: 'Wholesale',
    createdAt: '2026-08-24',
  },
  {
    id: 'CUS-1005',
    name: 'Highway Filling',
    phone: '0301-7786345',
    email: 'highway.filling@outlook.com',
    currentBalance: 135000,
    openingBalance: 100000,
    status: 'Active',
    type: 'Retail',
    createdAt: '2026-08-22',
  },
  {
    id: 'CUS-1006',
    name: 'Metro Oil Traders',
    phone: '0312-5567812',
    email: 'info@metrooil.pk',
    currentBalance: 67450,
    openingBalance: 40000,
    status: 'Active',
    type: 'Wholesale',
    createdAt: '2026-08-21',
  },
  {
    id: 'CUS-1007',
    name: 'Punjab Logistics',
    phone: '0308-9901234',
    email: 'finance@punjablogistics.com',
    currentBalance: -8200,
    openingBalance: 15000,
    status: 'Inactive',
    type: 'Transport',
    createdAt: '2026-08-20',
  },
  {
    id: 'CUS-1008',
    name: 'Karachi Fuel Hub',
    phone: '0322-4412098',
    email: 'hub@karachifuel.com',
    currentBalance: 210750,
    openingBalance: 180000,
    status: 'Active',
    type: 'Corporate',
    createdAt: '2026-08-18',
  },
  {
    id: 'CUS-1009',
    name: 'Northern Pump Co.',
    phone: '0346-1209876',
    email: 'north.pump@gmail.com',
    currentBalance: 31200,
    openingBalance: 31200,
    status: 'Active',
    type: 'Retail',
    createdAt: '2026-08-16',
  },
  {
    id: 'CUS-1010',
    name: 'Al-Noor Filling',
    phone: '0305-6678901',
    email: 'alnoor.fs@yahoo.com',
    currentBalance: 18800,
    openingBalance: 20000,
    status: 'Active',
    type: 'Retail',
    createdAt: '2026-08-15',
  },
  {
    id: 'CUS-1011',
    name: 'Indus Energy',
    phone: '0331-2345678',
    email: 'accounts@indusenergy.pk',
    currentBalance: 88000,
    openingBalance: 75000,
    status: 'Active',
    type: 'Corporate',
    createdAt: '2026-08-12',
  },
  {
    id: 'CUS-1012',
    name: 'Star Petroleum',
    phone: '0315-8765432',
    email: 'star.petro@hotmail.com',
    currentBalance: -22500,
    openingBalance: 10000,
    status: 'Inactive',
    type: 'Wholesale',
    createdAt: '2026-08-10',
  },
  {
    id: 'CUS-1013',
    name: 'Fast Track Logistics',
    phone: '0302-1987654',
    email: 'pay@fasttracklog.com',
    currentBalance: 56400,
    openingBalance: 45000,
    status: 'Active',
    type: 'Transport',
    createdAt: '2026-08-08',
  },
  {
    id: 'CUS-1014',
    name: 'Royal Fuel Depot',
    phone: '0344-3210987',
    email: 'royal@fueldepot.pk',
    currentBalance: 142300,
    openingBalance: 110000,
    status: 'Active',
    type: 'Wholesale',
    createdAt: '2026-08-05',
  },
  {
    id: 'CUS-1015',
    name: 'Sialkot Transport',
    phone: '0324-7654321',
    email: 'sialkot.tpt@gmail.com',
    currentBalance: 27600,
    openingBalance: 30000,
    status: 'Active',
    type: 'Transport',
    createdAt: '2026-08-03',
  },
  {
    id: 'CUS-1016',
    name: 'Chenab Oil Mills',
    phone: '0307-5432109',
    email: 'chenab.oil@outlook.com',
    currentBalance: 91000,
    openingBalance: 91000,
    status: 'Active',
    type: 'Corporate',
    createdAt: '2026-07-30',
  },
  {
    id: 'CUS-1017',
    name: 'Pak Highway Services',
    phone: '0334-1098765',
    email: 'billing@pakhighway.pk',
    currentBalance: -5400,
    openingBalance: 8000,
    status: 'Inactive',
    type: 'Transport',
    createdAt: '2026-07-28',
  },
  {
    id: 'CUS-1018',
    name: 'Sunrise Filling',
    phone: '0316-6543210',
    email: 'sunrise.fs@gmail.com',
    currentBalance: 38950,
    openingBalance: 25000,
    status: 'Active',
    type: 'Retail',
    createdAt: '2026-07-25',
  },
  {
    id: 'CUS-1019',
    name: 'Capital Fuel Co.',
    phone: '0304-9876543',
    email: 'info@capitalfuel.com',
    currentBalance: 176400,
    openingBalance: 150000,
    status: 'Active',
    type: 'Corporate',
    createdAt: '2026-07-22',
  },
  {
    id: 'CUS-1020',
    name: 'Desert Star Petroleum',
    phone: '0348-2109876',
    email: 'desertstar@petrol.pk',
    currentBalance: 22100,
    openingBalance: 22100,
    status: 'Active',
    type: 'Wholesale',
    createdAt: '2026-07-20',
  },
  {
    id: 'CUS-1021',
    name: 'Faisal Movers Fuel',
    phone: '0320-8761234',
    email: 'fuel@faisalmovers.com',
    currentBalance: 64000,
    openingBalance: 50000,
    status: 'Active',
    type: 'Transport',
    createdAt: '2026-07-18',
  },
  {
    id: 'CUS-1022',
    name: 'Ghazi Filling Station',
    phone: '0306-4321098',
    email: 'ghazi.fs@yahoo.com',
    currentBalance: 14500,
    openingBalance: 20000,
    status: 'Inactive',
    type: 'Retail',
    createdAt: '2026-07-15',
  },
  {
    id: 'CUS-1023',
    name: 'United Oil Traders',
    phone: '0336-7658901',
    email: 'united.oil@traders.pk',
    currentBalance: 118750,
    openingBalance: 90000,
    status: 'Active',
    type: 'Wholesale',
    createdAt: '2026-07-12',
  },
  {
    id: 'CUS-1024',
    name: 'Crescent Energy',
    phone: '0318-2340987',
    email: 'hello@crescentenergy.com',
    currentBalance: 73200,
    openingBalance: 60000,
    status: 'Active',
    type: 'Corporate',
    createdAt: '2026-07-08',
  },
  {
    id: 'CUS-1025',
    name: 'Atlas Petroleum',
    phone: '0342-5678901',
    email: 'atlas@petroleum.pk',
    currentBalance: 45500,
    openingBalance: 40000,
    status: 'Active',
    type: 'Retail',
    createdAt: '2026-07-02',
  },
]

export function formatPkr(value: number) {
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${value < 0 ? '-' : ''}${formatted} PKR`
}

export function formatFilterDate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export type CustomerTxType = 'Credit' | 'Debit'

export type CustomerTransaction = {
  id: string
  when: string
  type: CustomerTxType
  product: string
  quantity: string
  rate: string
  amount: number
  balance: number
  by: string
}

export type CustomerDetail = Customer & {
  cnic: string
  address: string
  notes: string
  totalCredit: number
  totalDebit: number
  transactionCount: number
  transactions: CustomerTransaction[]
}

/** Dummy detail enrichment — replace with API later */
export function getCustomerDetail(customer: Customer): CustomerDetail {
  const seed = Number(customer.id.replace(/\D/g, '')) || 1
  const totalCredit = Math.round(customer.openingBalance * 0.7 + seed * 120)
  const totalDebit = Math.max(0, totalCredit - (customer.currentBalance - customer.openingBalance))
  const transactionCount = 8 + (seed % 12)

  const transactions: CustomerTransaction[] = [
    {
      id: `TXN-${String(seed).padStart(5, '0')}`,
      when: '17 May 2025 10:30 AM',
      type: 'Debit',
      product: 'Diesel',
      quantity: '500 Ltr',
      rate: '100.00',
      amount: 50000,
      balance: customer.currentBalance,
      by: 'Admin',
    },
    {
      id: `TXN-${String(seed - 1).padStart(5, '0')}`,
      when: '16 May 2025 04:15 PM',
      type: 'Credit',
      product: 'Payment Received',
      quantity: '—',
      rate: '—',
      amount: 20000,
      balance: customer.currentBalance + 50000,
      by: 'Admin',
    },
    {
      id: `TXN-${String(seed - 2).padStart(5, '0')}`,
      when: '15 May 2025 11:05 AM',
      type: 'Debit',
      product: 'Petrol',
      quantity: '250 Ltr',
      rate: '89.00',
      amount: 22250,
      balance: customer.currentBalance + 30000,
      by: 'Accountant',
    },
    {
      id: `TXN-${String(seed - 3).padStart(5, '0')}`,
      when: '14 May 2025 09:40 AM',
      type: 'Credit',
      product: 'Bank Transfer',
      quantity: '—',
      rate: '—',
      amount: 35000,
      balance: customer.currentBalance + 52250,
      by: 'Admin',
    },
    {
      id: `TXN-${String(seed - 4).padStart(5, '0')}`,
      when: '12 May 2025 02:20 PM',
      type: 'Debit',
      product: 'Lubricants',
      quantity: '20 Pack',
      rate: '570.00',
      amount: 11400,
      balance: customer.currentBalance + 17250,
      by: 'User',
    },
  ]

  return {
    ...customer,
    cnic: `12345-${String(6789000 + (seed % 9000)).slice(0, 7)}-${seed % 10}`,
    address: 'Street No. 10, Korangi, Karachi, Pakistan',
    notes: 'Regular customer. Good payment history.',
    totalCredit,
    totalDebit,
    transactionCount,
    transactions,
  }
}

