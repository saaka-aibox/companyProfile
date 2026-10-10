/** Local Indonesian numbers start with 0; WhatsApp links need the country code. */
export function getWhatsAppBookingUrl(message: string): string | null {
  const configuredNumber = process.env.WHATSAPP_NUMBER?.trim();
  if (!configuredNumber || !/^[+\d\s().-]+$/.test(configuredNumber)) return null;

  const digits = configuredNumber.replace(/\D/g, "");
  const internationalNumber = digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
  if (!/^[1-9]\d{7,14}$/.test(internationalNumber)) return null;

  return `https://wa.me/${internationalNumber}?text=${encodeURIComponent(message)}`;
}
