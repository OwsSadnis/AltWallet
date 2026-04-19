import { Link } from "wouter";
import { useT } from "@/i18n";

export function Footer() {
  const t = useT();
  return (
    <footer className="aw-footer">
      <div className="container">
        <div className="aw-footer-inner">
          <div className="aw-footer-row">
            <span>{t("footer.rights")}</span>
            <span className="sep">·</span>
            <Link href="/terms">{t("footer.terms")}</Link>
            <span className="sep">·</span>
            <Link href="/privacy">{t("footer.privacy")}</Link>
            <span className="sep">·</span>
            <a href="mailto:hello@altwallet.id">{t("footer.contact")}</a>
          </div>
          <p className="aw-footer-note">{t("footer.note")}</p>
        </div>
      </div>
    </footer>
  );
}
