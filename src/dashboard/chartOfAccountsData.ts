export type AccountType = 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense'
export type NormalBalance = 'Debit' | 'Credit'

export type CoaAccount = {
  id: string
  code: string
  name: string
  type: AccountType
  normalBalance: NormalBalance
  balance: number
  status: 'Active' | 'Inactive'
}

export type CoaSubChart = {
  id: string
  code: string
  name: string
  description: string
  accountCount: number
  accounts: CoaAccount[]
}

export type CoaChart = {
  id: string
  code: string
  name: string
  type: AccountType
  description: string
  subChartCount: number
  accountCount: number
  subCharts: CoaSubChart[]
}

/** Dummy Chart of Accounts — 3 levels: Chart → Sub Chart → Account */
export const CHART_OF_ACCOUNTS: CoaChart[] = [
  {
    id: 'coa-1000',
    code: '1000',
    name: 'Assets',
    type: 'Asset',
    description: 'Resources owned by the business',
    subChartCount: 3,
    accountCount: 8,
    subCharts: [
      {
        id: 'coa-1100',
        code: '1100',
        name: 'Current Assets',
        description: 'Cash and assets convertible within a year',
        accountCount: 4,
        accounts: [
          {
            id: 'acc-1110',
            code: '1110',
            name: 'Cash in Hand',
            type: 'Asset',
            normalBalance: 'Debit',
            balance: 245000,
            status: 'Active',
          },
          {
            id: 'acc-1120',
            code: '1120',
            name: 'Bank - HBL Current',
            type: 'Asset',
            normalBalance: 'Debit',
            balance: 1820450.5,
            status: 'Active',
          },
          {
            id: 'acc-1130',
            code: '1130',
            name: 'Accounts Receivable',
            type: 'Asset',
            normalBalance: 'Debit',
            balance: 958200,
            status: 'Active',
          },
          {
            id: 'acc-1140',
            code: '1140',
            name: 'Fuel Inventory',
            type: 'Asset',
            normalBalance: 'Debit',
            balance: 1245000,
            status: 'Active',
          },
        ],
      },
      {
        id: 'coa-1200',
        code: '1200',
        name: 'Fixed Assets',
        description: 'Long-term tangible assets',
        accountCount: 2,
        accounts: [
          {
            id: 'acc-1210',
            code: '1210',
            name: 'Pumps & Dispensers',
            type: 'Asset',
            normalBalance: 'Debit',
            balance: 3500000,
            status: 'Active',
          },
          {
            id: 'acc-1220',
            code: '1220',
            name: 'Storage Tanks',
            type: 'Asset',
            normalBalance: 'Debit',
            balance: 5200000,
            status: 'Active',
          },
        ],
      },
      {
        id: 'coa-1300',
        code: '1300',
        name: 'Other Assets',
        description: 'Deposits and prepaid items',
        accountCount: 2,
        accounts: [
          {
            id: 'acc-1310',
            code: '1310',
            name: 'Security Deposits',
            type: 'Asset',
            normalBalance: 'Debit',
            balance: 150000,
            status: 'Active',
          },
          {
            id: 'acc-1320',
            code: '1320',
            name: 'Prepaid Insurance',
            type: 'Asset',
            normalBalance: 'Debit',
            balance: 48000,
            status: 'Inactive',
          },
        ],
      },
    ],
  },
  {
    id: 'coa-2000',
    code: '2000',
    name: 'Liabilities',
    type: 'Liability',
    description: 'Amounts owed to creditors and suppliers',
    subChartCount: 2,
    accountCount: 5,
    subCharts: [
      {
        id: 'coa-2100',
        code: '2100',
        name: 'Current Liabilities',
        description: 'Obligations due within one year',
        accountCount: 3,
        accounts: [
          {
            id: 'acc-2110',
            code: '2110',
            name: 'Accounts Payable',
            type: 'Liability',
            normalBalance: 'Credit',
            balance: 642800,
            status: 'Active',
          },
          {
            id: 'acc-2120',
            code: '2120',
            name: 'Supplier Credit - PSO',
            type: 'Liability',
            normalBalance: 'Credit',
            balance: 890000,
            status: 'Active',
          },
          {
            id: 'acc-2130',
            code: '2130',
            name: 'Sales Tax Payable',
            type: 'Liability',
            normalBalance: 'Credit',
            balance: 125400,
            status: 'Active',
          },
        ],
      },
      {
        id: 'coa-2200',
        code: '2200',
        name: 'Long-term Liabilities',
        description: 'Loans and long-term obligations',
        accountCount: 2,
        accounts: [
          {
            id: 'acc-2210',
            code: '2210',
            name: 'Bank Loan - Term',
            type: 'Liability',
            normalBalance: 'Credit',
            balance: 2500000,
            status: 'Active',
          },
          {
            id: 'acc-2220',
            code: '2220',
            name: 'Equipment Financing',
            type: 'Liability',
            normalBalance: 'Credit',
            balance: 780000,
            status: 'Active',
          },
        ],
      },
    ],
  },
  {
    id: 'coa-3000',
    code: '3000',
    name: 'Equity',
    type: 'Equity',
    description: 'Owner capital and retained earnings',
    subChartCount: 2,
    accountCount: 3,
    subCharts: [
      {
        id: 'coa-3100',
        code: '3100',
        name: 'Owner Equity',
        description: 'Capital introduced by owners',
        accountCount: 2,
        accounts: [
          {
            id: 'acc-3110',
            code: '3110',
            name: 'Owner Capital',
            type: 'Equity',
            normalBalance: 'Credit',
            balance: 5000000,
            status: 'Active',
          },
          {
            id: 'acc-3120',
            code: '3120',
            name: 'Owner Drawings',
            type: 'Equity',
            normalBalance: 'Debit',
            balance: 350000,
            status: 'Active',
          },
        ],
      },
      {
        id: 'coa-3200',
        code: '3200',
        name: 'Retained Earnings',
        description: 'Accumulated profits',
        accountCount: 1,
        accounts: [
          {
            id: 'acc-3210',
            code: '3210',
            name: 'Retained Earnings',
            type: 'Equity',
            normalBalance: 'Credit',
            balance: 2180450.5,
            status: 'Active',
          },
        ],
      },
    ],
  },
  {
    id: 'coa-4000',
    code: '4000',
    name: 'Income',
    type: 'Income',
    description: 'Revenue from fuel and related services',
    subChartCount: 2,
    accountCount: 4,
    subCharts: [
      {
        id: 'coa-4100',
        code: '4100',
        name: 'Fuel Sales',
        description: 'Petrol, diesel and CNG revenue',
        accountCount: 3,
        accounts: [
          {
            id: 'acc-4110',
            code: '4110',
            name: 'Petrol Sales',
            type: 'Income',
            normalBalance: 'Credit',
            balance: 4250000,
            status: 'Active',
          },
          {
            id: 'acc-4120',
            code: '4120',
            name: 'Diesel Sales',
            type: 'Income',
            normalBalance: 'Credit',
            balance: 6120000,
            status: 'Active',
          },
          {
            id: 'acc-4130',
            code: '4130',
            name: 'CNG Sales',
            type: 'Income',
            normalBalance: 'Credit',
            balance: 980000,
            status: 'Active',
          },
        ],
      },
      {
        id: 'coa-4200',
        code: '4200',
        name: 'Other Income',
        description: 'Lubricants and service income',
        accountCount: 1,
        accounts: [
          {
            id: 'acc-4210',
            code: '4210',
            name: 'Lubricant Sales',
            type: 'Income',
            normalBalance: 'Credit',
            balance: 312500,
            status: 'Active',
          },
        ],
      },
    ],
  },
  {
    id: 'coa-5000',
    code: '5000',
    name: 'Expenses',
    type: 'Expense',
    description: 'Operating and administrative costs',
    subChartCount: 2,
    accountCount: 5,
    subCharts: [
      {
        id: 'coa-5100',
        code: '5100',
        name: 'Cost of Goods Sold',
        description: 'Direct cost of fuel sold',
        accountCount: 2,
        accounts: [
          {
            id: 'acc-5110',
            code: '5110',
            name: 'Cost of Petrol',
            type: 'Expense',
            normalBalance: 'Debit',
            balance: 3850000,
            status: 'Active',
          },
          {
            id: 'acc-5120',
            code: '5120',
            name: 'Cost of Diesel',
            type: 'Expense',
            normalBalance: 'Debit',
            balance: 5480000,
            status: 'Active',
          },
        ],
      },
      {
        id: 'coa-5200',
        code: '5200',
        name: 'Operating Expenses',
        description: 'Salaries, utilities and overhead',
        accountCount: 3,
        accounts: [
          {
            id: 'acc-5210',
            code: '5210',
            name: 'Salaries & Wages',
            type: 'Expense',
            normalBalance: 'Debit',
            balance: 420000,
            status: 'Active',
          },
          {
            id: 'acc-5220',
            code: '5220',
            name: 'Utilities',
            type: 'Expense',
            normalBalance: 'Debit',
            balance: 86500,
            status: 'Active',
          },
          {
            id: 'acc-5230',
            code: '5230',
            name: 'Maintenance',
            type: 'Expense',
            normalBalance: 'Debit',
            balance: 54200,
            status: 'Active',
          },
        ],
      },
    ],
  },
]

export function formatCoaPkr(value: number) {
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${value < 0 ? '-' : ''}${formatted} PKR`
}
