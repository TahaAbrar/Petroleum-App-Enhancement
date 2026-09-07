self.addEventListener('push', (event) => {
  let data = { title: 'New entry added', body: '', url: '/transactions' }
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() }
    }
  } catch {
    /* keep defaults */
  }

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      const focused = windows.some((client) => client.focused)
      if (focused) return

      await self.registration.showNotification(data.title || 'New entry added', {
        body: data.body || '',
        icon: '/logo-192.png',
        badge: '/logo-192.png',
        data: { url: data.url || '/transactions' },
      })
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url || '/transactions'
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      for (const client of windows) {
        if ('focus' in client) {
          await client.focus()
          if ('navigate' in client) {
            await client.navigate(target)
          }
          return
        }
      }
      await self.clients.openWindow(target)
    })(),
  )
})
