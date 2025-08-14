import React from "react";

type AppFooterProps = {
  /** Úsalo cuando el fondo no sea blanco (p. ej. en el login con gradiente) */
  translucent?: boolean;
  /** Activa una animación suave del punto verde del logo */
  pulseDot?: boolean;
  className?: string;
};

export default function AppFooter({
  translucent,
  pulseDot = true,
  className = "",
}: AppFooterProps) {
  const base =
    "w-full py-3 text-xs flex items-center justify-center gap-2 select-none";
const theme = translucent
  ? "bg-white/90 backdrop-blur text-slate-900"
  : "bg-transparent text-black";


  return (
    <footer className={[base, theme, className].join(" ")} aria-label="Footer">
      {/* Marca KJAX minimal */}
      <LogoKJAX pulseDot={pulseDot} />

      {/* Texto © dinámico */}
      <span className="inline-flex items-center gap-1 font-medium">
        <span className="opacity-80">© {new Date().getFullYear()}</span>
        <span className="font-semibold tracking-tight"> Derechos reservados por KJAX Systems</span>
      </span>
    </footer>
  );
}

/** Logo minimal: K azul + punto verde (con opción de animación) */
function LogoKJAX({ pulseDot = true }: { pulseDot?: boolean }) {
  return (
    <span className="inline-flex items-center">
      <svg
        className="h-5 w-5"
        viewBox="0 0 100 100"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M20 20v60h15V56l15 24h18L48 50l20-30H50L35 42V20H20Z"
          fill="#00B4E6"
        />
      </svg>
      {/* punto verde alineado al borde superior derecho del logo */}
      <span className="relative -ml-1 -mt-3 inline-flex h-2 w-2">
        {/* halo/pulse opcional */}
        {pulseDot && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-[#19C37D] opacity-60 animate-ping"></span>
        )}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#19C37D] shadow-[0_0_6px_1px_rgba(25,195,125,.6)]"></span>
      </span>
    </span>
  );
}
