/// <reference types="vite/client" />

// CSS Modules 타입
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}
