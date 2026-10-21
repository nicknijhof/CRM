// Shrinks a photo in the browser before it is uploaded. Phone photos are often 4 to 12 MB, and
// Vercel rejects any request over 4.5 MB before our code runs, which shows up as a crashed page.
// Returns a JPEG of at most `maxEdge` pixels on its longest side (about a few hundred KB).
export async function shrinkImage(file: File, maxEdge = 1600, quality = 0.82): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error("That photo format isn't supported. Use a JPG or PNG.");
  }
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('Could not prepare that photo. Try a different one.');
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'photo'}.jpg`, { type: 'image/jpeg' });
}
