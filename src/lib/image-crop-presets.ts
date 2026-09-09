/**
 * Regras de corte por tipo de imagem. Cada campo de upload passa um destes
 * nomes ao `ImageUploadField`; o editor de corte (`ImageCropper`) fixa o
 * rácio, o tamanho final e a orientação mostrada ao gestor.
 *
 * `aspect` = largura ÷ altura do enquadramento.
 * `maxDimension` = lado maior da imagem final (px) — mantém o data URL
 * dentro da quota do `localStorage` (sem backend de imagens).
 * `hintKey` = chave i18n do texto de orientação (`imageCropper.*`).
 */
export type CropPreset = {
  aspect: number;
  maxDimension: number;
  hintKey: string;
};

export const CROP_PRESETS = {
  /** Foto de prato — quadrada, prato centrado e enquadrado. */
  dish: { aspect: 1, maxDimension: 900, hintKey: "imageCropper.hintDish" },
  /** Capa do restaurante — panorâmica (o nome sobrepõe-se em baixo). */
  cover: { aspect: 16 / 9, maxDimension: 1600, hintKey: "imageCropper.hintCover" },
  /** Galeria do restaurante — panorâmica. */
  gallery: { aspect: 16 / 9, maxDimension: 1280, hintKey: "imageCropper.hintGallery" },
  /** Imagem de promoção — panorâmica (título e botão sobrepõem-se). */
  promo: { aspect: 16 / 9, maxDimension: 1400, hintKey: "imageCropper.hintPromo" },
  /** Story — vertical, formato ecrã de telemóvel. */
  story: { aspect: 9 / 16, maxDimension: 1280, hintKey: "imageCropper.hintStory" },
} as const satisfies Record<string, CropPreset>;

export type CropPresetName = keyof typeof CROP_PRESETS;
