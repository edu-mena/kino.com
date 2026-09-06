// Vite trata .webp/.png/.jpg/.mp4/... nativamente (tipados por "vite/client"),
// mas .jfif (JPEG com outra extensão) não está na lista — declara-o aqui para
// que `import x from "@/assets/*.jfif"` resolva como URL. Ver também
// `assetsInclude` em vite.config.ts.
declare module "*.jfif" {
  const src: string;
  export default src;
}
