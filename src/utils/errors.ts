export function rwsError(reasonCode: string, message: string): string {
  return `<Response ReasonCode="${escapeXml(reasonCode)}" ErrorClientResponseMessage="${escapeXml(message)}"/>`;
}

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
