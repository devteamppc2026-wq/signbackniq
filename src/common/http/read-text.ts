export async function readLimitedText(response: Response, maximumBytes: number): Promise<string> {
  if (!response.body) throw new Error('Empty upstream response');
  const reader = response.body.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > maximumBytes) throw new Error('Upstream response exceeds size limit');
      parts.push(part.value);
    }
    return Buffer.concat(parts).toString('utf8');
  } finally {
    await reader.cancel().catch(() => {});
  }
}
