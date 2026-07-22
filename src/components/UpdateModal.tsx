import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Download,
  Sparkles,
  CheckCircle2,
  X,
  ArrowRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react'

interface UpdateInfo {
  currentVersion?: string
  version?: string
  releaseNotes?: string
  releaseUrl?: string
  [key: string]: unknown
}

interface ProgressInfo {
  percent: number
  bytesPerSecond?: number
  transferred?: number
  total?: number
}

declare global {
  interface Window {
    electronAPI?: {
      isElectron?: boolean
      checkForUpdates: () => Promise<void>
      downloadUpdate: () => Promise<void>
      quitAndInstall: () => Promise<void>
      onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void
      onDownloadProgress: (callback: (progress: ProgressInfo) => void) => () => void
      onUpdateDownloaded: (callback: (info: UpdateInfo) => void) => () => void
      onUpdateError: (callback: (err: string) => void) => () => void
    }
  }
}

function formatBytes(bytes?: number): string {
  if (!bytes || isNaN(bytes)) return '0 MB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export function UpdateModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [status, setStatus] = useState<'available' | 'downloading' | 'downloaded' | 'error'>('available')
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [progress, setProgress] = useState<ProgressInfo>({ percent: 0 })
  const [errorMessage, setErrorMessage] = useState<string>('')

  const currentVersion = updateInfo?.currentVersion || '1.0.5'
  const latestVersion = updateInfo?.version || currentVersion

  useEffect(() => {
    // 1. Web / Server fallback update check
    fetch('/api/check-update')
      .then(res => res.json())
      .then(data => {
        if (data.updateAvailable) {
          setUpdateInfo({
            currentVersion: data.currentVersion,
            version: data.latestVersion,
            releaseNotes: data.name,
            releaseUrl: data.releaseUrl
          })
          // If running in browser or web mode, show update prompt
          if (!window.electronAPI?.isElectron) {
            setIsOpen(true)
          }
        }
      })
      .catch(() => {})

    // 2. Electron Native IPC Listeners
    if (window.electronAPI?.isElectron) {
      const unsubAvailable = window.electronAPI.onUpdateAvailable((info) => {
        setUpdateInfo(info)
        setStatus('available')
        setIsOpen(true)
      })

      const unsubProgress = window.electronAPI.onDownloadProgress((prog) => {
        setStatus('downloading')
        setProgress(prog)
        setIsOpen(true)
      })

      const unsubDownloaded = window.electronAPI.onUpdateDownloaded((info) => {
        setUpdateInfo(info)
        setStatus('downloaded')
        setIsOpen(true)
      })

      const unsubError = window.electronAPI.onUpdateError((err) => {
        setStatus('error')
        setErrorMessage(err || 'Failed to download update.')
      })

      window.electronAPI.checkForUpdates?.().catch(() => {})

      return () => {
        unsubAvailable()
        unsubProgress()
        unsubDownloaded()
        unsubError()
      }
    }
  }, [])

  const handleStartDownload = () => {
    if (window.electronAPI?.isElectron) {
      setStatus('downloading')
      setProgress({ percent: 1 })
      window.electronAPI.downloadUpdate().catch(() => {
        setStatus('error')
        setErrorMessage('Failed to start download.')
      })
    } else {
      window.open(updateInfo?.releaseUrl || 'https://github.com/solankisumit123/viewstats/releases', '_blank')
    }
  }

  const handleRestartAndInstall = () => {
    if (window.electronAPI?.isElectron) {
      window.electronAPI.quitAndInstall()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-md bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden text-card-foreground"
        >
          {/* Top Decorative Header with Glow */}
          <div className="relative h-28 bg-gradient-to-br from-youtube/20 via-background to-card flex items-center justify-center border-b border-border/40 overflow-hidden">
            {/* Background glowing circle */}
            <div className="absolute w-32 h-32 bg-youtube/20 rounded-full blur-2xl animate-pulse" />

            {/* App Logo with red glowing ring */}
            <div className="relative z-10 w-16 h-16 rounded-2xl bg-youtube flex items-center justify-center shadow-lg shadow-youtube/30 border border-white/20">
              <Play className="w-8 h-8 text-white fill-current translate-x-0.5" />
            </div>

            {/* Close Button */}
            {status !== 'downloading' && (
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-3.5 right-3.5 p-2 rounded-xl bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Body Content */}
          <div className="p-6 space-y-6 text-center">
            
            {/* Title & Version Pill */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-youtube/10 text-youtube text-xs font-bold border border-youtube/20">
                <Sparkles className="w-3.5 h-3.5" />
                <span>ViewStats Desktop Update</span>
              </div>
              
              <h3 className="text-xl font-black tracking-tight text-foreground">
                {status === 'downloaded' ? 'Update Ready to Install!' : status === 'downloading' ? 'Downloading Software Update...' : 'New Version Available'}
              </h3>

              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
                <span className="bg-muted px-2.5 py-0.5 rounded-lg text-xs font-bold">v{currentVersion}</span>
                <ArrowRight className="w-3.5 h-3.5 text-youtube" />
                <span className="bg-youtube text-white px-2.5 py-0.5 rounded-lg text-xs font-bold shadow-sm">
                  v{latestVersion}
                </span>
              </div>
            </div>

            {/* ── State 1: Available ── */}
            {status === 'available' && (
              <div className="space-y-5">
                <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 text-xs text-muted-foreground text-left space-y-2">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-youtube" />
                    What's New in v{latestVersion}:
                  </div>
                  {updateInfo?.releaseNotes ? (
                    <p className="text-sm text-foreground leading-relaxed">{updateInfo.releaseNotes}</p>
                  ) : (
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Single-instance desktop launch protection</li>
                      <li>Automatic high-resolution channel avatar caching</li>
                      <li>Enhanced light mode text visibility & performance</li>
                    </ul>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all"
                  >
                    Later
                  </button>
                  <button
                    onClick={handleStartDownload}
                    className="flex-[2] py-3 px-4 rounded-xl font-bold text-xs bg-youtube text-white hover:bg-youtube/90 shadow-lg shadow-youtube/25 flex items-center justify-center gap-2 transition-all group"
                  >
                    <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                    <span>Download & Update Now</span>
                  </button>
                </div>
              </div>
            )}

            {/* ── State 2: Downloading Progress ── */}
            {status === 'downloading' && (
              <div className="space-y-4 py-2">
                {/* Visual Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold text-muted-foreground">
                    <span className="flex items-center gap-1.5 text-foreground">
                      <RefreshCw className="w-3.5 h-3.5 text-youtube animate-spin" />
                      Downloading Setup...
                    </span>
                    <span className="text-youtube font-black text-sm">{progress.percent}%</span>
                  </div>

                  <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden border border-border/80">
                    <motion.div
                      className="h-full bg-gradient-to-r from-youtube to-red-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(3, progress.percent)}%` }}
                      transition={{ ease: 'easeOut', duration: 0.3 }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
                    <span>{formatBytes(progress.transferred)} / {formatBytes(progress.total || 115 * 1024 * 1024)}</span>
                    {progress.bytesPerSecond && (
                      <span>{(progress.bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s</span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground italic">
                  Please keep the application open. The update will be ready shortly!
                </p>
              </div>
            )}

            {/* ── State 3: Downloaded & Ready ── */}
            {status === 'downloaded' && (
              <div className="space-y-5 py-2">
                <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center mx-auto border border-green-500/20">
                  <CheckCircle2 className="w-6 h-6 animate-bounce" />
                </div>

                <p className="text-xs text-muted-foreground">
                  ViewStats v{latestVersion} installer has been downloaded. Restart the application now to complete the update!
                </p>

                <button
                  onClick={handleRestartAndInstall}
                  className="w-full py-3.5 px-4 rounded-xl font-extrabold text-sm bg-youtube text-white hover:bg-youtube/90 shadow-xl shadow-youtube/30 flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02]"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Restart & Install Now</span>
                </button>
              </div>
            )}

            {/* ── State 4: Error ── */}
            {status === 'error' && (
              <div className="space-y-4 py-2">
                <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto border border-destructive/20">
                  <AlertCircle className="w-6 h-6" />
                </div>

                <p className="text-xs text-muted-foreground">
                  {errorMessage || 'Something went wrong during update download.'}
                </p>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-muted text-muted-foreground hover:bg-muted/80"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleStartDownload}
                    className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-youtube text-white hover:bg-youtube/90 shadow-md"
                  >
                    Retry Download
                  </button>
                </div>
              </div>
            )}

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
