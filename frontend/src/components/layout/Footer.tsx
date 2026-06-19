import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import logoUrl from "../../assets/logo-insat.png";
import Logo from "../common/Logo";

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-[var(--color-dark)] text-white py-12 mt-auto">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <Link to="/" aria-label="Home" className="inline-block mb-4">
              <Logo variant="footer" className="brightness-0 invert" />
            </Link>
            <p className="text-gray-400 max-w-sm">{t("footer.desc")}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">
              {t("footer.usefulLinks")}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/"
                  className="text-gray-400 hover:text-[var(--color-primary)] transition-colors"
                >
                  {t("nav.home")}
                </Link>
              </li>
              <li>
                <Link
                  to="/doctors"
                  className="text-gray-400 hover:text-[var(--color-primary)] transition-colors"
                >
                  {t("nav.doctors")}
                </Link>
              </li>
              <li>
                <Link
                  to="/clinics"
                  className="text-gray-400 hover:text-[var(--color-primary)] transition-colors"
                >
                  {t("nav.clinics")}
                </Link>
              </li>

              <li>
                <Link
                  to="/about"
                  className="text-gray-400 hover:text-[var(--color-primary)] transition-colors flex items-center gap-2"
                >
                  {" "}
                  {t("footer.about")}{" "}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">
              {t("footer.contact")}
            </h3>
            <ul className="space-y-2 text-gray-400">
              <li>admin@insat.dz</li>
              <li>+213 (0) 791 35 90 57</li>
              <li>Setif, Algeria</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} {t("footer.copyright")}
          </p>
          <div className="flex space-x-4 mt-4 md:mt-0">
            <Link to="#" className="hover:text-white transition-colors">
              {t("footer.privacy")}
            </Link>
            <Link to="#" className="hover:text-white transition-colors">
              {t("footer.terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
