"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  FileCode2,
  FileJson,
  FileImage,
  FileType,
} from "lucide-react"

type DocCard = {
  label: string
  ext: string
  iconBg: string
  icon: React.ElementType
}

const DOC_CARDS: DocCard[] = [
  { label: "Invoice", ext: "DOCX", iconBg: "bg-blue-500", icon: FileText },
  { label: "Revenue", ext: "XLSX", iconBg: "bg-emerald-500", icon: FileSpreadsheet },
  { label: "Pitch Deck", ext: "PPTX", iconBg: "bg-orange-500", icon: Presentation },
  { label: "Order Data", ext: "JSON", iconBg: "bg-amber-500", icon: FileJson },
  { label: "Spec Doc", ext: "MD", iconBg: "bg-indigo-500", icon: FileCode2 },
  { label: "Landing Page", ext: "HTML", iconBg: "bg-rose-500", icon: FileType },
  { label: "Screenshot", ext: "PNG", iconBg: "bg-purple-500", icon: FileImage },
  { label: "Contract", ext: "DOCX", iconBg: "bg-blue-500", icon: FileText },
  { label: "Budget", ext: "XLSX", iconBg: "bg-emerald-500", icon: FileSpreadsheet },
  { label: "Notes", ext: "MD", iconBg: "bg-indigo-500", icon: FileCode2 },
]

type CorridorPath = {
  perspective?: number
  cardWidth?: number
  cardHeight?: number
  cardRadius?: number
  birthHeight?: number
  exitHeight?: number
  railBirth?: number
  railExit?: number
  fan?: number
  turnBirth?: number
  turnExit?: number
  stops?: number
}

const PATH: Required<CorridorPath> = {
  perspective: 30,
  cardWidth: 24,
  cardHeight: 32,
  cardRadius: 1.6,
  birthHeight: 3.0,
  exitHeight: 55,
  railBirth: -12,
  railExit: 50,
  fan: 3.0,
  turnBirth: 8,
  turnExit: 30,
  stops: 28,
}

function keyframes(dir: 1 | -1, name: string, p: Required<CorridorPath>) {
  const steps: string[] = []
  for (let s = 0; s <= p.stops; s++) {
    const u = s / p.stops
    const scale =
      (p.birthHeight / p.cardHeight) *
      Math.pow(p.exitHeight / p.birthHeight, u)
    const z = p.perspective * (1 - 1 / scale)
    const rail =
      p.railExit - (p.railExit - p.railBirth) * Math.pow(1 - u, p.fan)
    const turn = p.turnBirth + (p.turnExit - p.turnBirth) * u
    steps.push(
      `${(u * 100).toFixed(2)}%{transform:translate3d(${(dir * rail).toFixed(
        2,
      )}cqw,0,${z.toFixed(2)}cqw) rotateY(${(-dir * turn).toFixed(2)}deg)}`,
    )
  }
  return `@keyframes ${name}{${steps.join("")}}`
}

function DocumentCard({ doc, className }: { doc: DocCard; className?: string }) {
  const Icon = doc.icon
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-xl border p-2",
        "bg-white/80 border-[#E2E8F0] backdrop-blur-sm shadow-sm",
        className,
      )}
    >
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", doc.iconBg)}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <span className="text-[7px] font-bold text-[#334155] leading-none">{doc.label}</span>
      <span className="text-[6px] font-mono text-[#94A3B8] uppercase">{doc.ext}</span>
    </div>
  )
}

export type DocStreamHeroProps = {
  cards?: number
  speed?: number
  axis?: number
  path?: CorridorPath
  children?: React.ReactNode
  className?: string
}

export function DocStreamHero({
  cards = 9,
  speed = 20,
  axis = 55,
  path,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & DocStreamHeroProps) {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const right = `dsh-r-${id}`
  const left = `dsh-l-${id}`
  const cardClass = `dsh-c-${id}`

  const p = React.useMemo(() => ({ ...PATH, ...path }), [path])

  const css = React.useMemo(
    () =>
      `${keyframes(1, right, p)}${keyframes(-1, left, p)}` +
      `@media(prefers-reduced-motion:reduce){.${cardClass}{animation-play-state:paused}}`,
    [right, left, cardClass, p],
  )

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      {...props}
      style={{ containerType: "inline-size", ...props.style }}
    >
      <style>{css}</style>

      {/* Ambient blue glow blob */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, #93C5FD 0%, transparent 70%)',
            filter: 'blur(100px)',
          }}
        />
      </div>

      {/* Top/bottom gradient to blend into page */}
      <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-b from-[#DBEAFE] via-transparent to-[#F0F7FF]" />
      {/* Left/right gradient to fade corridor edges */}
      <div className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-r from-[#DBEAFE] via-transparent to-[#DBEAFE]" />

      {/* Corridor with center-clearing mask */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          perspective: `${p.perspective}cqw`,
          perspectiveOrigin: `50% ${axis}%`,
          maskImage: "radial-gradient(ellipse 44% 38% at 50% 50%, transparent 0%, black 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 44% 38% at 50% 50%, transparent 0%, black 100%)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{ transformStyle: "preserve-3d" }}
        >
          {[right, left].map((name) =>
            Array.from({ length: cards }, (_, i) => {
              const doc = DOC_CARDS[i % DOC_CARDS.length]
              return (
                <div
                  key={`${name}-${i}`}
                  className={cn(cardClass, "absolute")}
                  style={{
                    left: "50%",
                    top: `${axis}%`,
                    width: `${p.cardWidth}cqw`,
                    height: `${p.cardHeight}cqw`,
                    marginLeft: `${-p.cardWidth / 2}cqw`,
                    marginTop: `${-p.cardHeight / 2}cqw`,
                    borderRadius: `${p.cardRadius}cqw`,
                    animation: `${name} ${speed}s linear infinite`,
                    animationDelay: `${-(i * speed) / cards}s`,
                    backfaceVisibility: "hidden",
                  }}
                >
                  <DocumentCard doc={doc} className="w-full h-full" />
                </div>
              )
            }),
          )}
        </div>
      </div>

      {children}
    </div>
  )
}

export default DocStreamHero
