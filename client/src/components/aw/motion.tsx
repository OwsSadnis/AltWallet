// Small motion helpers: reveal-on-scroll + count-up number
import {
  PropsWithChildren,
  useEffect,
  useRef,
  useState,
  HTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

interface RevealProps extends HTMLAttributes<HTMLDivElement> {
  delay?: number;
}

export function Reveal({
  delay = 0,
  className,
  children,
  style,
  ...rest
}: PropsWithChildren<RevealProps>) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn("aw-reveal", shown && "in", className)}
      style={{ transitionDelay: `${delay}ms`, ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

interface CountUpProps {
  to: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}

export function CountUp({
  to,
  duration = 1000,
  suffix = "",
  prefix = "",
  className,
}: CountUpProps) {
  const [n, setN] = useState(0);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(to * eased));
      if (p < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [to, duration]);

  return (
    <span className={className}>
      {prefix}
      {n.toLocaleString()}
      {suffix}
    </span>
  );
}
