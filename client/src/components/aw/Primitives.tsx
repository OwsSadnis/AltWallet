// AltWallet UI primitives — ported from Primitives.jsx
// Design: Terminal-Grade Minimalism (dark #0A0A0A, single #1D9E75 signal color, pill buttons, hairline borders)
import { cn } from "@/lib/utils";
import React from "react";
import { LucideIcon } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  trailingIcon?: LucideIcon;
  children?: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  trailingIcon: TrailingIcon,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(`aw-btn aw-btn-${variant} aw-btn-${size}`, className)}
      {...rest}
    >
      {Icon && <Icon />}
      {children}
      {TrailingIcon && <TrailingIcon />}
    </button>
  );
}

interface ChipProps {
  tone?:
    | "safe"
    | "low"
    | "medium"
    | "high"
    | "critical"
    | "info"
    | "neutral"
    | "beta"
    | "solid";
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Chip({ tone = "neutral", dot, children, className }: ChipProps) {
  return (
    <span className={cn(`aw-chip aw-chip-${tone}`, className)}>
      {dot && <span className="aw-dot" />}
      {children}
    </span>
  );
}

interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
}

export function Eyebrow({ children, className }: EyebrowProps) {
  return <div className={cn("aw-eyebrow", className)}>{children}</div>;
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
}

export function Card({ hover, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn("aw-card", hover && "aw-card-hover", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Divider() {
  return <div className="aw-divider" />;
}

interface IconBtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  active?: boolean;
}

export function IconBtn({ icon: Icon, active, className, ...rest }: IconBtnProps) {
  return (
    <button className={cn("aw-iconbtn", active && "active", className)} {...rest}>
      <Icon />
    </button>
  );
}

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  icon?: LucideIcon;
  mono?: boolean;
  kbd?: string;
  size?: "md" | "lg";
  wrapClassName?: string;
}

export function Input({
  icon: Icon,
  mono,
  kbd,
  size = "md",
  wrapClassName,
  className,
  ...rest
}: InputProps) {
  return (
    <div className={cn("aw-input", size === "lg" && "aw-input-lg", wrapClassName)}>
      {Icon && <Icon className="aw-input-icon" />}
      <input className={cn(mono && "mono", className)} {...rest} />
      {kbd && <span className="aw-kbd">{kbd}</span>}
    </div>
  );
}

export function PulseDot() {
  return <span className="aw-pulse-dot" aria-hidden />;
}
