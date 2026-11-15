"use client"

export function ScanLines({ className = "" }: { className?: string }) {
  return (
    <div className={`fixed inset-0 pointer-events-none ${className}`} style={{ zIndex: 1 }}>
      <div
        className="absolute inset-0 opacity-10"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            #00ff41 2px,
            #00ff41 4px
          )`,
        }}
      />
    </div>
  )
}
