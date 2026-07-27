export function whatsappLink(phone: string | null, message: string): string | null {
  if (!phone) return null;

  let digits = phone.replace(/[^\d]/g, '');
  if (!digits) return null;
  if (digits.length === 8) digits = `65${digits}`; // bare SG mobile number, no country code

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
