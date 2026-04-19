import { Link } from "wouter";
import { Button, Eyebrow } from "@/components/aw/Primitives";
import { ArrowLeft, Search } from "lucide-react";
import { Reveal } from "@/components/aw/motion";
import { useT } from "@/i18n";

export default function NotFound() {
  const t = useT();
  return (
    <div className="container" style={{ paddingTop: 120, paddingBottom: 160 }}>
      <div className="mx-auto max-w-[560px] flex flex-col items-center text-center gap-5">
        <Reveal>
          <Eyebrow>{t("err.404.eye")}</Eyebrow>
        </Reveal>
        <Reveal delay={60}>
          <h1 className="text-white text-[72px] md:text-[96px] font-bold tracking-tight leading-none mono">
            404
          </h1>
        </Reveal>
        <Reveal delay={120}>
          <p className="text-[14px] text-[color:var(--fg-secondary)] max-w-md leading-relaxed">
            {t("err.404.p")}
          </p>
        </Reveal>
        <Reveal delay={180}>
          <div className="flex items-center gap-2 mt-4">
            <Link href="/">
              <Button variant="primary" size="md" icon={ArrowLeft}>
                {t("err.404.home")}
              </Button>
            </Link>
            <Link href="/checker">
              <Button variant="secondary" size="md" icon={Search}>
                {t("err.404.scan")}
              </Button>
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
