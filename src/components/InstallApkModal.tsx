import React, { useState, useEffect } from 'react';
import { X, Smartphone, Download, CheckCircle2, Share2, Sparkles, PlusSquare } from 'lucide-react';

interface InstallApkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallApkModal: React.FC<InstallApkModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <div
      id="install-apk-modal"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 font-pixel-heading select-none"
    >
      <div className="bg-[#0e1017] border-2 border-[#ff3b00] w-full max-w-md shadow-[0_0_30px_rgba(255,59,0,0.3)] overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#151722] px-4 py-3 border-b-2 border-[#242634] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone size={16} className="text-[#ff3b00]" />
            <span className="text-[10px] text-white font-bold">INSTALL ON ANDROID (APK / WEBAPP)</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 cursor-pointer transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 space-y-4 font-pixel-label text-zinc-300 text-[10px] leading-relaxed">
          
          <div className="p-3 bg-[#13151f] border border-[#242738] rounded-xs flex items-start gap-3">
            <div className="w-9 h-9 rounded-sm bg-[#ff3b00] text-black font-pixel-heading font-black flex items-center justify-center text-xs shrink-0 shadow-sm">
              P
            </div>
            <div>
              <div className="text-white font-pixel-heading text-[10px] font-bold">Praxis Android PWA</div>
              <div className="text-zinc-400 text-[8.5px] mt-0.5">
                Full offline support • Instant launch • Fullscreen retro focus timer
              </div>
            </div>
          </div>

          {/* 1-Click Install Button (When browser supports native prompt) */}
          {deferredPrompt && !isInstalled && (
            <button
              onClick={handleInstallClick}
              className="w-full py-3 bg-[#ff3b00] hover:bg-[#ff5500] text-black font-pixel-heading font-black text-[11px] flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(255,59,0,0.5)] transition-all uppercase"
            >
              <Download size={14} />
              <span>INSTALL DIRECTLY ON PHONE</span>
            </button>
          )}

          {/* Step-by-Step Android Installation Guide */}
          <div className="space-y-2.5 pt-1">
            <div className="text-[#ff3b00] font-pixel-heading text-[9px] uppercase">
              How to Install on Any Android Device (Chrome / Brave / Edge):
            </div>

            <div className="space-y-2 text-[9px]">
              <div className="flex items-start gap-2 bg-[#090a0f] p-2 border border-[#1d202d]">
                <span className="text-[#ff3b00] font-bold font-mono">1.</span>
                <span>Open this link in <strong>Google Chrome</strong> on your Android device.</span>
              </div>

              <div className="flex items-start gap-2 bg-[#090a0f] p-2 border border-[#1d202d]">
                <span className="text-[#ff3b00] font-bold font-mono">2.</span>
                <div className="flex-1">
                  Tap the <strong>Three Dots (⋮)</strong> menu in the top right corner.
                </div>
              </div>

              <div className="flex items-start gap-2 bg-[#090a0f] p-2 border border-[#1d202d]">
                <span className="text-[#ff3b00] font-bold font-mono">3.</span>
                <div className="flex-1">
                  Select <strong className="text-white">“Install app”</strong> or <strong className="text-white">“Add to Home screen”</strong>.
                </div>
              </div>

              <div className="flex items-start gap-2 bg-[#090a0f] p-2 border border-[#1d202d]">
                <span className="text-[#ff3b00] font-bold font-mono">4.</span>
                <span>Android will automatically generate and install the native WebAPK package on your home screen!</span>
              </div>
            </div>
          </div>

          <div className="text-[8px] text-zinc-500 border-t border-[#1d202d] pt-3 text-center">
            Zero setup required • Runs completely standalone with offline storage
          </div>

        </div>

        {/* Footer */}
        <div className="bg-[#12141c] p-3 border-t border-[#20222f] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1b1e2a] hover:bg-[#282c3d] text-white border border-[#373b50] text-[9px] font-pixel-heading cursor-pointer transition-colors uppercase"
          >
            CLOSE
          </button>
        </div>

      </div>
    </div>
  );
};
