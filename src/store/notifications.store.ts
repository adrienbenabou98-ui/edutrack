import { create } from 'zustand'
import api from '../api/client'

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  read: boolean
  link: string | null
  createdAt: string
}

interface NotificationsState {
  notifications: Notification[]
  unreadCount: number
  fetchNotifications: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    try {
      const { data } = await api.get('/notifications')
      set({
        notifications: data,
        unreadCount: data.filter((n: Notification) => !n.read).length,
      })
    } catch {
      // silently ignore if not authenticated yet
    }
  },

  markRead: async (id: string) => {
    await api.put(`/notifications/${id}/read`)
    set(s => ({
      notifications: s.notifications.map(n => n.id === id ? { ...n, read: true } : n),
      unreadCount: Math.max(0, s.unreadCount - (s.notifications.find(n => n.id === id)?.read ? 0 : 1)),
    }))
  },

  markAllRead: async () => {
    await api.put('/notifications/read-all')
    set(s => ({
      notifications: s.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    }))
  },

  deleteNotification: async (id: string) => {
    await api.delete(`/notifications/${id}`)
    const wasUnread = !get().notifications.find(n => n.id === id)?.read
    set(s => ({
      notifications: s.notifications.filter(n => n.id !== id),
      unreadCount: wasUnread ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
    }))
  },
}))
