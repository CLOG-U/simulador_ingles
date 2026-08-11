import { Link } from "react-router-dom";
import { AcademyLogo } from "../../components/AcademyLogo";

export function LandingPage() {
  return (
    <div className="landing-root min-h-screen text-brand-white">
      <div className="landing-atmosphere" aria-hidden />
      <header className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <AcademyLogo sizeClassName="h-12 w-12 sm:h-14 sm:w-14" withText />
        <Link
          to="/login"
          className="rounded-xl bg-brand-yellow px-4 py-2.5 text-sm font-semibold text-brand-primary-dark transition-transform hover:scale-[1.02]"
        >
          Ingresar
        </Link>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-6rem)] max-w-5xl flex-col justify-center px-4 pb-16 pt-8 sm:px-6">
        <p className="landing-fade-in text-sm font-semibold uppercase tracking-[0.2em] text-brand-sky">
          Powerful English Academy
        </p>
        <h1 className="landing-fade-in-delay-1 mt-4 max-w-3xl font-heading text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
          Práctica, examen y seguimiento en un solo lugar
        </h1>
        <p className="landing-fade-in-delay-2 mt-5 max-w-xl text-base text-brand-white/85 sm:text-lg">
          Plataforma de estudio para clases de inglés: materiales por grupo, práctica guiada y
          evaluaciones con resultados claros.
        </p>
        <div className="landing-fade-in-delay-3 mt-8 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-yellow px-7 text-base font-semibold text-brand-primary-dark transition-transform hover:scale-[1.02]"
          >
            Ingresar
          </Link>
        </div>
      </main>
    </div>
  );
}
