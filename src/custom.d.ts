// src/custom.d.ts

// Declaraciones existentes para archivos de imagen
declare module '*.avif' {
  const value: string;
  export default value;
}

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.gif' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  // Opción 1: Si se usa como una URL de imagen
   const src: string;
   export default src;

  // Opción 2: Si se usa con SVGR como un componente React
  // import * as React from 'react';
  // export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  // const src: string;
  // export default src;
}

declare module '*.webp' {
  const value: string;
  export default value;
}

// --- INICIO: Añadido para los tipos de Vite ---
// Esto ayuda a TypeScript a entender `import.meta.env`
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // Agrega aquí otras variables de entorno que uses
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
// --- FIN: Añadido para los tipos de Vite ---
