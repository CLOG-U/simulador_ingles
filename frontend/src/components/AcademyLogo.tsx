type AcademyLogoProps = {
  className?: string;
  /** Show academy name next to the mark */
  withText?: boolean;
  /** Image size classes, e.g. h-12 w-12 */
  sizeClassName?: string;
};

export function AcademyLogo({
  className = "",
  withText = false,
  sizeClassName = "h-12 w-12",
}: AcademyLogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src="/pea-logo.png"
        alt="Powerful English Academy"
        className={`${sizeClassName} shrink-0 rounded-xl object-cover`}
        width={96}
        height={96}
        decoding="async"
      />
      {withText && (
        <div className="min-w-0 leading-tight">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-sky">
            Powerful English Academy
          </p>
        </div>
      )}
    </div>
  );
}
