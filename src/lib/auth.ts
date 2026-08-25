const AUTH_KEY = 'fuelledger_authed'

export function isAuthenticated(): boolean {
  return sessionStorage.getItem(AUTH_KEY) === '1'
}

export function setAuthenticated(value: boolean): void {
  if (value) {
    sessionStorage.setItem(AUTH_KEY, '1')
  } else {
    sessionStorage.removeItem(AUTH_KEY)
  }
}
