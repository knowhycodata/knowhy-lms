import toast, { Toaster } from 'react-hot-toast'

// Toast yapılandırması
export const toastConfig = {
  duration: 4000,
  position: 'top-right' as const,
  style: {
    borderRadius: '8px',
    background: '#333',
    color: '#fff',
    padding: '12px 16px',
    fontSize: '14px',
  },
}

// Toast helper fonksiyonları
export const showToast = {
  success: (message: string) => {
    toast.success(message, {
      duration: 3000,
      style: {
        background: '#10B981',
        color: '#fff',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#10B981',
      },
    })
  },
  
  error: (message: string) => {
    toast.error(message, {
      duration: 5000,
      style: {
        background: '#EF4444',
        color: '#fff',
      },
      iconTheme: {
        primary: '#fff',
        secondary: '#EF4444',
      },
    })
  },
  
  warning: (message: string) => {
    toast(message, {
      duration: 4000,
      icon: '⚠️',
      style: {
        background: '#F59E0B',
        color: '#fff',
      },
    })
  },
  
  info: (message: string) => {
    toast(message, {
      duration: 3000,
      icon: 'ℹ️',
      style: {
        background: '#3B82F6',
        color: '#fff',
      },
    })
  },
  
  loading: (message: string) => {
    return toast.loading(message, {
      style: {
        background: '#333',
        color: '#fff',
      },
    })
  },
  
  dismiss: (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId)
    } else {
      toast.dismiss()
    }
  },
  
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string
      error: string
    }
  ) => {
    return toast.promise(promise, messages, {
      style: {
        background: '#333',
        color: '#fff',
      },
      success: {
        style: {
          background: '#10B981',
          color: '#fff',
        },
      },
      error: {
        style: {
          background: '#EF4444',
          color: '#fff',
        },
      },
    })
  },
}

export { toast, Toaster }
