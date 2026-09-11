"use client";

import React, { useMemo } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const THEMES = {
  blue: "from-blue-500 to-blue-600",
  red: "from-red-500 to-red-600",
  purple: "from-purple-500 to-purple-600",
  green: "from-emerald-500 to-emerald-600",
  amber: "from-amber-500 to-amber-600",
  cyan: "from-cyan-500 to-cyan-600",
  indigo: "from-indigo-500 to-indigo-600",
  slate: "from-slate-500 to-slate-600",
  orange: "from-orange-500 to-orange-600",
} as const;

type ThemeType = keyof typeof THEMES;

interface CardData {
  id: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
  theme?: ThemeType;
  gradient?: string;
  onClick?: () => void;
  disabled?: boolean;
}

interface Card3DListProps {
  cards: CardData[];
  className?: string;
  columns?: 1 | 2 | 3 | 4;
  gap?: "sm" | "md" | "lg";
  animated?: boolean;
  staggerDelay?: number;
}

const GRIDS = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
} as const;

const GAPS = {
  sm: "gap-4",
  md: "gap-5",
  lg: "gap-6",
} as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: [0.23, 1, 0.32, 1] },
  },
};

function ToolCard({ card }: { card: CardData }) {
  const gradient = useMemo(
    () => card.gradient || (card.theme ? THEMES[card.theme] : THEMES.blue),
    [card.gradient, card.theme]
  );

  return (
    <motion.button
      onClick={card.onClick}
      disabled={card.disabled}
      className={cn(
        "group relative flex flex-col justify-between rounded-2xl p-5 text-left text-white overflow-hidden",
        "bg-gradient-to-br",
        gradient,
        "transition-shadow duration-300 hover:shadow-xl",
        card.disabled && "opacity-50 cursor-not-allowed",
        !card.disabled && "cursor-pointer"
      )}
      whileHover={card.disabled ? undefined : { y: -4, scale: 1.01 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="flex items-start justify-between">
        {card.icon && (
          <div className="text-white/90">{card.icon}</div>
        )}
        <div className="h-2 w-2 rounded-full bg-white/40 group-hover:bg-white/60 transition-colors" />
      </div>

      <div className="mt-6">
        <h3 className="text-[15px] font-semibold tracking-tight leading-snug">
          {card.title}
        </h3>
        <p className="text-[13px] text-white/80 mt-1 leading-relaxed line-clamp-2">
          {card.description}
        </p>
      </div>
    </motion.button>
  );
}

function Card3DList({
  cards,
  className,
  columns = 3,
  gap = "md",
  animated = true,
  staggerDelay = 0.06,
}: Card3DListProps) {
  const gridClass = useMemo(() => GRIDS[columns], [columns]);
  const gapClass = useMemo(() => GAPS[gap], [gap]);

  const customVariants = useMemo(
    () => ({
      ...containerVariants,
      visible: {
        ...containerVariants.visible,
        transition: {
          ...containerVariants.visible.transition,
          staggerChildren: staggerDelay,
        },
      },
    }),
    [staggerDelay]
  );

  return (
    <motion.div
      className={cn("grid w-full", gridClass, gapClass, className)}
      variants={animated ? customVariants : undefined}
      initial={animated ? "hidden" : undefined}
      animate={animated ? "visible" : undefined}
    >
      {cards.map((card) => (
        <motion.div
          key={card.id}
          variants={animated ? itemVariants : undefined}
          whileInView={animated ? "visible" : undefined}
          initial={animated ? "hidden" : undefined}
          viewport={animated ? { once: true, margin: "-30px", amount: 0.2 } : undefined}
        >
          <ToolCard card={card} />
        </motion.div>
      ))}
    </motion.div>
  );
}

export { Card3DList, type CardData };
