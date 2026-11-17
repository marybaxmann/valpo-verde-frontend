import { api } from "./client";

/**
 * Carga firmada de fotografías (037; decisión H). La API corre en Vercel,
 * que rechaza cuerpos de más de ~4,5 MB; los originales del Inspector no se
 * reducen (son evidencia), así que los grandes van en dos pasos:
 *
 * 1. `POST {base}/upload-url` con tipo, tamaño y SHA-256: el backend aplica
 *    las mismas reglas que la subida directa y entrega un enlace de un solo
 *    uso a una ruta de staging que decide él.
 * 2. `PUT` del archivo a ese enlace (directo a Supabase Storage).
 * 3. `POST {base}/confirm`: el backend descarga, verifica el formato real, el
 *    tamaño y la huella, y recién entonces registra la foto.
 */
export const LIMITE_CUERPO_API = 4 * 1024 * 1024;

export async function sha256Hex(archivo: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await archivo.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

interface SubidaFirmada {
  upload_id: string;
  signed_url: string;
}

export async function subirFirmada(base: string, archivo: File, vista?: string): Promise<unknown> {
  const sha256 = await sha256Hex(archivo);
  const contentType = archivo.type === "image/png" ? "image/png" : "image/jpeg";
  const { data } = await api.post<{ data: SubidaFirmada }>(`${base}/upload-url`, {
    content_type: contentType,
    bytes: archivo.size,
    sha256,
    ...(vista ? { vista } : {}),
  });

  const put = await fetch(data.signed_url, {
    method: "PUT",
    headers: { "Content-Type": contentType, "x-upsert": "false" },
    body: archivo,
  });
  if (!put.ok) {
    throw new Error(`No se pudo subir la foto al almacenamiento (${put.status}).`);
  }

  return api.post(`${base}/confirm`, { upload_id: data.upload_id, sha256, ...(vista ? { vista } : {}) });
}
