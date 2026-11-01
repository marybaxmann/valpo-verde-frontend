/**
 * Reduce una foto en el navegador antes de enviarla: lado mayor de
 * `maxLado` píxeles, en JPEG. La API corre en Vercel, que rechaza
 * solicitudes de más de ~4,5 MB; una ejecución de mantenimiento envía hasta
 * 10 fotos en una sola solicitud. El backend igual recodifica y quita los
 * metadatos (CC-049): esto solo achica el envío.
 */
export async function reducirFoto(archivo: File, maxLado = 1600, calidad = 0.8): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, maxLado / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return archivo;
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", calidad));
  // Si el navegador no puede, se envía el original (el backend lo valida).
  if (!blob || blob.size >= archivo.size) return archivo;
  return new File([blob], archivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}

/** Tamaño legible: «1,2 MB». */
export function tamano(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toLocaleString("es-CL", { maximumFractionDigits: 1 })} MB`
    : `${Math.round(bytes / 1024)} KB`;
}
