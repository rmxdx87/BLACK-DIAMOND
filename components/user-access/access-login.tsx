"use client"

import type React from "react"
import { useMemo, useRef, useState } from "react"
import {
  Activity,
  ArrowUpRight,
  BrainCircuit,
  ChartNoAxesCombined,
  Code2,
  Crown,
  Eye,
  EyeOff,
  Gem,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react"

interface AccessLoginProps {
  onLogin: (accessCode: string) => { success: boolean; error?: string }
  isTransitioning?: boolean
}

const DEVELOPER_NAME = process.env.NEXT_PUBLIC_DEVELOPER_NAME || "HIMANSHU DEVELOPER"

const FEATURES = [
  { icon: Activity, title: "REAL-TIME PREDICTION", detail: "Live signal intelligence" },
  { icon: BrainCircuit, title: "AI POWERED ANALYSIS", detail: "150+ specialized agents" },
  { icon: ChartNoAxesCombined, title: "ADVANCED ANALYTICS", detail: "2000+ pattern insights" },
]

export function AccessLogin({ onLogin, isTransitioning = false }: AccessLoginProps) {
  const [accessCode, setAccessCode] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isCodeVisible, setIsCodeVisible] = useState(false)
  const submitLock = useRef(false)

  const codeProgress = useMemo(() => Math.min(accessCode.length / 8, 1), [accessCode.length])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitLock.current || isTransitioning) return
    if (!accessCode.trim()) {
      setError("Enter your access code to continue")
      return
    }

    const cleanCode = accessCode.trim().toUpperCase()
    if (cleanCode.length !== 8) {
      setError("Access code must be exactly 8 characters")
      return
    }
    if (!/^[A-Z0-9]{8}$/.test(cleanCode)) {
      setError("Access code must contain only letters and numbers")
      return
    }

    submitLock.current = true
    setIsLoading(true)
    setError("")
    try {
      const result = onLogin(cleanCode)
      if (!result.success) {
        setError(result.error || "Access denied")
        setIsLoading(false)
        submitLock.current = false
      }
    } catch {
      setError("Authentication failed. Please try again.")
      setIsLoading(false)
      submitLock.current = false
    }
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")
    setAccessCode(value)
    if (error) setError("")
  }

  return (
    <main className="access-gate">
      <div className="access-gate__aurora" aria-hidden="true" />
      <div className="access-gate__grain" aria-hidden="true" />
      <div className="access-gate__grid" aria-hidden="true" />
      <div className="access-gate__streak access-gate__streak--one" aria-hidden="true" />
      <div className="access-gate__streak access-gate__streak--two" aria-hidden="true" />
      <div className="access-gate__particles access-gate__particles--one" aria-hidden="true" />
      <div className="access-gate__particles access-gate__particles--two" aria-hidden="true" />

      <header className="access-gate__header">
        <div className="access-gate__identity">
          <div className="access-gate__mark" aria-hidden="true"><Gem size={19} strokeWidth={1.4} /></div>
          <div>
            <p className="access-gate__wordmark">BLACK DIAMOND</p>
            <p className="access-gate__descriptor">PREDICTION INTELLIGENCE TERMINAL</p>
          </div>
        </div>
        <div className="access-gate__status"><span /> SYSTEM ONLINE</div>
      </header>

      <section className="access-gate__content" aria-label="Black Diamond secure access">
        <div className="access-gate__showcase">
          <div className="access-gate__eyebrow"><span>BD / 001</span><i /> PRIVATE INTELLIGENCE</div>
          <h1 className="access-gate__title">See beyond<br /><em>the signal.</em></h1>
          <p className="access-gate__intro-copy">A private intelligence terminal for those who operate one step ahead.</p>

          <div className="access-gate__gem-stage" role="img" aria-label="An animated faceted diamond floating above a luminous energy platform">
            <div className="access-gate__gem-halo" />
            <div className="access-gate__ring access-gate__ring--outer" />
            <div className="access-gate__ring access-gate__ring--inner" />
            <div className="access-gate__gem-float">
              <svg className="access-gate__gem-svg" viewBox="0 0 240 270" aria-hidden="true">
                <defs>
                  <linearGradient id="gem-crown" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="#f8f2d8" />
                    <stop offset=".42" stopColor="#a9a8ff" />
                    <stop offset="1" stopColor="#48d9ff" />
                  </linearGradient>
                  <linearGradient id="gem-left" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="#d9c8ff" stopOpacity=".95" />
                    <stop offset=".55" stopColor="#6548bc" stopOpacity=".76" />
                    <stop offset="1" stopColor="#17163e" stopOpacity=".94" />
                  </linearGradient>
                  <linearGradient id="gem-right" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="#79eaff" stopOpacity=".92" />
                    <stop offset=".5" stopColor="#327ed5" stopOpacity=".72" />
                    <stop offset="1" stopColor="#181a48" stopOpacity=".98" />
                  </linearGradient>
                  <linearGradient id="gem-tip" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="#7064d7" stopOpacity=".9" />
                    <stop offset=".52" stopColor="#3674bd" stopOpacity=".78" />
                    <stop offset="1" stopColor="#d8b86c" stopOpacity=".58" />
                  </linearGradient>
                  <filter id="gem-glow" x="-60%" y="-50%" width="220%" height="200%">
                    <feGaussianBlur stdDeviation="5" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                <g className="access-gate__gem-facets" stroke="rgba(226,224,255,.62)" strokeWidth="1.1" strokeLinejoin="round">
                  <path d="M120 13 206 57 226 112 120 255 14 112 34 57Z" fill="#11132d" />
                  <path d="M34 57 88 64 120 13Z" fill="url(#gem-crown)" opacity=".9" />
                  <path d="m88 64 32-51 32 51-32 48Z" fill="#b9bdff" opacity=".8" />
                  <path d="m152 64 54-7-86-44Z" fill="#61d9fa" opacity=".76" />
                  <path d="m14 112 20-55 54 7-22 60Z" fill="url(#gem-left)" />
                  <path d="m88 64 32 48-54 12Z" fill="#7166c7" opacity=".85" />
                  <path d="m152 64 54-7 20 55-52 7Z" fill="url(#gem-right)" />
                  <path d="m152 64-32 48 54 7Z" fill="#4fc8ed" opacity=".86" />
                  <path d="m12 112 78 12 30 131Z" fill="url(#gem-left)" />
                  <path d="m90 124 30-12 30 12-30 131Z" fill="#403a86" opacity=".9" />
                  <path d="m150 124 76-12-106 143Z" fill="url(#gem-tip)" />
                  <path d="m34 57 54 7M152 64l54-7M14 112l76 12M150 124l76-12" fill="none" stroke="#fff4d5" strokeOpacity=".78" />
                  <path d="m89 29-34 46M167 47l35 45M111 138l-11 71" fill="none" stroke="#fff" strokeWidth="2" strokeOpacity=".56" filter="url(#gem-glow)" />
                </g>
              </svg>
              <span className="access-gate__gem-glint access-gate__gem-glint--one" />
              <span className="access-gate__gem-glint access-gate__gem-glint--two" />
            </div>
            <div className="access-gate__platform"><span /></div>
            <div className="access-gate__crystal access-gate__crystal--one" />
            <div className="access-gate__crystal access-gate__crystal--two" />
            <div className="access-gate__crystal access-gate__crystal--three" />
          </div>

          <div className="access-gate__trust">
            <div><ShieldCheck /><span>SECURE ACCESS</span></div>
            <i />
            <div><LockKeyhole /><span>ENCRYPTED CONNECTION</span></div>
            <i />
            <div><Sparkles /><span>TRUSTED PLATFORM</span></div>
          </div>
        </div>

        <div className="access-gate__portal">
          <div className="access-gate__panel-wrap">
            <div className={`access-gate__panel ${isTransitioning ? "access-gate__panel--unlocking" : ""}`}>
              <div className="access-gate__crown" aria-hidden="true"><Crown size={30} strokeWidth={1.25} /></div>
              {isTransitioning ? (
                <div className="access-gate__unlock-state" role="status" aria-live="polite">
                  <div className="access-gate__unlock-icon"><ShieldCheck size={24} /></div>
                  <p className="access-gate__panel-kicker">IDENTITY VERIFIED</p>
                  <h2>Opening your dashboard<span>…</span></h2>
                  <div className="access-gate__scanline" />
                </div>
              ) : (
                <>
                  <div className="access-gate__panel-top"><span className="access-gate__panel-kicker">PRIVATE TERMINAL <i /></span><KeyRound size={15} /></div>
                  <h2>ENTER ACCESS CODE</h2>
                  <p className="access-gate__panel-copy">Unlock the Power of 2000+ Patterns &amp; 150+ AI Agents</p>
                  <form onSubmit={handleSubmit} noValidate>
                    <label className="access-gate__label" htmlFor="access-code">ACCESS CODE <span>{accessCode.length}/08</span></label>
                    <div className={`access-gate__input-wrap ${error ? "access-gate__input-wrap--error" : ""}`}>
                      <LockKeyhole className="access-gate__input-lock" size={17} aria-hidden="true" />
                      <input
                        id="access-code"
                        type={isCodeVisible ? "text" : "password"}
                        value={accessCode}
                        onChange={handleInputChange}
                        placeholder="ENTER YOUR CODE"
                        maxLength={8}
                        disabled={isLoading}
                        autoComplete="off"
                        spellCheck={false}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? "access-error" : "access-hint"}
                      />
                      <button
                        className="access-gate__visibility"
                        type="button"
                        onClick={() => setIsCodeVisible((visible) => !visible)}
                        aria-label={isCodeVisible ? "Hide access code" : "Show access code"}
                        aria-pressed={isCodeVisible}
                        disabled={isLoading}
                      >
                        {isCodeVisible ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                      <div className="access-gate__progress" style={{ transform: `scaleX(${codeProgress})` }} aria-hidden="true" />
                    </div>
                    <p id="access-hint" className="access-gate__hint">8-character secure credential</p>
                    {error && <p id="access-error" className="access-gate__error" role="alert">{error}</p>}
                    <button className="access-gate__submit" type="submit" disabled={isLoading || isTransitioning || accessCode.length !== 8}>
                      {isLoading ? <><LoaderCircle className="access-gate__spinner" size={16} /> VERIFYING ACCESS</> : <>ACCESS DASHBOARD <ArrowUpRight size={16} /></>}
                    </button>
                  </form>
                  <div className="access-gate__panel-footer"><ShieldCheck size={13} /> ENCRYPTED CONNECTION <span /> 256-BIT SECURE</div>
                </>
              )}
            </div>
          </div>

          <div className="access-gate__features">
            {FEATURES.map(({ icon: Icon, title, detail }, index) => (
              <div className="access-gate__feature" key={title} style={{ "--feature-index": index } as React.CSSProperties}>
                <span className="access-gate__feature-icon"><Icon size={17} strokeWidth={1.6} /></span>
                <span className="access-gate__feature-copy"><strong>{title}</strong><small>{detail}</small></span>
                <ArrowUpRight className="access-gate__feature-arrow" size={14} />
              </div>
            ))}
          </div>

          <aside className="access-gate__developer" id="developer">
            <span className="access-gate__developer-icon"><Code2 size={17} /></span>
            <div className="access-gate__developer-copy">
              <span className="access-gate__developer-label">DEVELOPED BY</span>
              <strong>{DEVELOPER_NAME}</strong>
              <span className="access-gate__signature">Building Smarter <i /> Analyzing Deeper <i /> Winning Together</span>
            </div>
            <Sparkles className="access-gate__developer-spark" size={15} aria-hidden="true" />
          </aside>
        </div>
      </section>

      <footer className="access-gate__footer">
        <div className="access-gate__footer-brand"><Gem size={14} /> <strong>BLACK DIAMOND</strong></div>
        <div className="access-gate__footer-powered"><i /> POWERED BY ADVANCED AI TECHNOLOGY <i /></div>
        <div className="access-gate__version">VERSION <span>2.0.0</span></div>
      </footer>
    </main>
  )
}
