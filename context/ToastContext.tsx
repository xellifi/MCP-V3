import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, [removeToast]);

  const success = useCallback((msg: string) => addToast(msg, 'success'), [addToast]);
  const error = useCallback((msg: string) => addToast(msg, 'error'), [addToast]);
  const info = useCallback((msg: string) => addToast(msg, 'info'), [addToast]);
  const warning = useCallback((msg: string) => addToast(msg, 'warning'), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, success, error, info, warning }}>
      {children}
      <div
        className="fixed top-4 left-4 right-4 md:left-auto md:right-4 flex flex-col gap-2 md:w-80 pointer-events-none"
        style={{ zIndex: 99999 }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 p-3 md:p-4 rounded-lg shadow-lg border-l-4 transition-all animate-in slide-in-from-right-full fade-in duration-300"
            style={{
              backgroundColor: toast.type === 'success' ? '#22c55e' :
                toast.type === 'error' ? '#ef4444' :
                  toast.type === 'info' ? '#3b82f6' :
                    toast.type === 'warning' ? '#f59e0b' : undefined,
              borderLeftColor: toast.type === 'success' ? '#16a34a' :
                toast.type === 'error' ? '#dc2626' :
                  toast.type === 'info' ? '#2563eb' :
                    toast.type === 'warning' ? '#d97706' : undefined,
              color: '#ffffff'
            }}
          >
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle className="w-5 h-5 text-white" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-white" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-white" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-white" />}
            </div>
            <div className="flex-1 text-sm font-medium leading-relaxed break-words">
              {toast.message}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                removeToast(toast.id);
              }}
              className="flex-shrink-0 p-2 rounded-full text-white/90 hover:text-white hover:bg-white/20 transition-all cursor-pointer pointer-events-auto"
              style={{ pointerEvents: 'auto' }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};