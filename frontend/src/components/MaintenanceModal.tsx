import { AlertTriangle, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MaintenanceModalProps {
  message: string
  onLogout?: () => void
}

export default function MaintenanceModal({ message, onLogout }: MaintenanceModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-full">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Bakım Modu</h2>
              <p className="text-white/80 text-sm">Sistem geçici olarak kullanılamıyor</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-gray-600 text-center">
            {message}
          </p>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm text-amber-800 text-center">
              Bakım işlemleri tamamlandığında sisteme tekrar erişebilirsiniz.
              Anlayışınız için teşekkür ederiz.
            </p>
          </div>

          {onLogout && (
            <Button 
              onClick={onLogout} 
              className="w-full"
              variant="default"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Çıkış Yap
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 text-center">
          <p className="text-xs text-gray-500">
            Sorun devam ederse IT departmanı ile iletişime geçin
          </p>
        </div>
      </div>
    </div>
  )
}
