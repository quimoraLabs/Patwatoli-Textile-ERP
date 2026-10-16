'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Download, WifiOff, X, Sparkles, CheckCircle2 } from 'lucide-react';

interface PwaContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  isOffline: boolean;
  promptInstall: () => Promise<void>;
}

const PwaContext = createContext<PwaContextType>({
  isInstallable: false,
  isInstalled: false,
  isOffline: false,
  promptInstall: async () => {},
});

export const usePwa = () => useContext(PwaContext);

export default function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [justInstalled, setJustInstalled] = useState(false);

  useEffect(() => {
    // 1. Service Worker Registration
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope);
        })
        .catch((err) => {
          console.error('[PWA] Service Worker registration failed:', err);
        });
    }

    // 2. Check if already running as standalone PWA
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    ) {
      setIsInstalled(true);
    }

    // 3. Listen for BeforeInstallPrompt event (Chrome, Edge, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);

      // Check if user previously dismissed
      const dismissed = localStorage.getItem('ptx_pwa_dismissed');
      if (!dismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. App Installed event
    const handleAppInstalled = () => {
      console.log('[PWA] Patwatoli Textile ERP installed successfully!');
      setIsInstalled(true);
      setIsInstallable(false);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      setJustInstalled(true);
      setTimeout(() => setJustInstalled(false), 5000);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // 5. Online / Offline network status listeners
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) {
      // If iOS or manual, show instructions
      alert('To install Patwatoli ERP on your device, tap Share / Settings and select "Add to Home Screen" (होम स्क्रीन पर जोड़ें).');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Install prompt outcome: ${outcome}`);
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const dismissBanner = () => {
    setShowInstallBanner(false);
    localStorage.setItem('ptx_pwa_dismissed', 'true');
  };

  return (
    <PwaContext.Provider value={{ isInstallable, isInstalled, isOffline, promptInstall }}>
      {children}

      {/* Offline Status Toast */}
      {isOffline && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3 px-4 py-3 bg-amber-500/90 text-slate-950 font-semibold rounded-2xl shadow-2xl backdrop-blur-md border border-amber-400 text-xs animate-bounce">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>आप अभी ऑफलाइन हैं (Offline Mode) - लोकल डेटा सुरक्षित है</span>
        </div>
      )}

      {/* Just Installed Toast */}
      {justInstalled && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 bg-emerald-600 text-white font-semibold rounded-2xl shadow-2xl border border-emerald-400 text-xs">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>पटवाटोली ERP ऐप सफलतापूर्वक इंस्टॉल हो गया!</span>
        </div>
      )}

      {/* Floating Modern PWA Install Banner */}
      {showInstallBanner && !isInstalled && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full p-4 glass-panel rounded-2xl border border-indigo-500/40 shadow-2xl shadow-indigo-950/60 flex items-center gap-4 bg-slate-900/95 backdrop-blur-xl animate-fade-in">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/30">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
              Patwatoli ERP App
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PWA
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              डेस्कटॉप या मोबाइल पर 1-क्लिक में इंस्टॉल करें
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={promptInstall}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>इंस्टॉल करें</span>
              </button>
              <button
                onClick={dismissBanner}
                className="px-2.5 py-1.5 text-slate-400 hover:text-white text-xs font-medium rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                बाद में
              </button>
            </div>
          </div>
          <button
            onClick={dismissBanner}
            className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800 transition-colors self-start cursor-pointer"
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </PwaContext.Provider>
  );
}
