// storage-helper.js
import { supabase } from './supabase-client.js';

/**
 * Sube un archivo PDF al bucket 'residencias' de Supabase.
 * @param {File}   file   El objeto File (p. ej. e.target.files[0]).
 * @param {String} path   Ruta dentro del bucket. Ejemplos:
 *                        'anteproyectos/uid123.pdf', 
 *                        'reportes/uid123.pdf', 
 *                        'finales/uid123.pdf'
 * @returns {Promise<String>}  Una URL firmada válida 1 año
 * @throws {Error} Si la subida falla, lanza un error con mensaje de Supabase.
 */
export async function uploadPdf(file, path) {
  // 1. Subimos el archivo (upsert: true para sobreescribir si ya existía)
  const { error: uploadError } = await supabase
    .storage
    .from('residencias')
    .upload(path, file, { upsert: true });

  if (uploadError) {
    throw new Error(`Error subiendo a Supabase: ${uploadError.message}`);
  }

  // 2. Creamos una URL firmada de 1 año (365 días * 86400 segundos)
  const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;
  const { data, error: signedUrlError } = await supabase
    .storage
    .from('residencias')
    .createSignedUrl(path, ONE_YEAR_IN_SECONDS);

  if (signedUrlError) {
    throw new Error(`Error creando URL firmada: ${signedUrlError.message}`);
  }

  return data.signedUrl;
}
