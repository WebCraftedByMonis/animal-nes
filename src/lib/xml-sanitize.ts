/**
 * xml-sanitize.ts
 *
 * Bulletproof sanitization for Google Merchant Center XML feeds.
 *
 * Two exports:
 *   sanitizeText(input)    — strip invalid chars + fix mojibake, NO XML escaping.
 *                            Use this in the DB cleanup script.
 *   sanitizeForXml(input)  — sanitizeText + full XML escaping.
 *                            Use this everywhere in the feed route.
 */

// ─── XML 1.0 character validity ───────────────────────────────────────────────
//
// The XML 1.0 spec defines valid characters as:
//   #x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]
//
// Everything else is illegal and makes xmllint throw "invalid Char value N".
// This regex matches every character that must be REMOVED:
//   \x00-\x08  — NUL, SOH, STX(2), ETX(3), EOT, ENQ, ACK, BEL, BS
//   \x0B       — VT  (vertical tab)
//   \x0C       — FF  (form feed)
//   \x0E-\x1F  — SO through US  (includes char values 14-31 = 0x0E-0x1F)
//   \x7F       — DEL
//   ￾     — non-character
//   ￿     — non-character
//   \uD800-\uDFFF — lone surrogates (invalid Unicode; normalize() throws on them)
//
// Preserved (valid XML whitespace): \x09=tab  \x0A=LF  \x0D=CR
const INVALID_XML_CHARS_RE =
  /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F￾￿]|[\uD800-\uDFFF]/g;

// ─── Mojibake repair table ─────────────────────────────────────────────────────
//
// These patterns arise when UTF-8 product text was imported into MySQL with the
// connection charset set to latin1/cp1252, causing each UTF-8 byte to be
// stored as a separate codepoint.  The most common culprits are smart quotes,
// dashes, and special symbols used in pharmaceutical/veterinary descriptions.
//
// Rules:
//  • Longer patterns must appear before any of their prefixes in the list.
//  • Each replacement is the correct Unicode character.
//  • Applied BEFORE invalid-char stripping so the patterns stay intact.
const MOJIBAKE_REPAIRS: ReadonlyArray<[RegExp, string]> = [
  // ── Smart quotes ────────────────────────────────────────────────────────────
  [/â€™/g, "’"],   // '  RIGHT SINGLE QUOTATION MARK
  [/â€˜/g, "‘"],   // '  LEFT SINGLE QUOTATION MARK
  [/â€œ/g, "“"],   // "  LEFT DOUBLE QUOTATION MARK
  [/â€/g,  "”"],   // "  RIGHT DOUBLE QUOTATION MARK (catch-all, must follow above)
  // ── Dashes ──────────────────────────────────────────────────────────────────
  [/â€"/g, "–"],   // –  EN DASH
  [/â€"/g, "—"],   // —  EM DASH
  // ── Other common symbols ─────────────────────────────────────────────────────
  [/â€¢/g, "•"],   // •  BULLET
  [/â€¦/g, "…"],   // …  HORIZONTAL ELLIPSIS
  [/â„¢/g, "™"],   // ™  TRADE MARK SIGN
  [/Â°/g,  "°"],   // °  DEGREE SIGN
  [/Â®/g,  "®"],   // ®  REGISTERED SIGN
  [/Â©/g,  "©"],   // ©  COPYRIGHT SIGN
  [/Â§/g,  "§"],   // §  SECTION SIGN
  [/Ã—/g,  "×"],   // ×  MULTIPLICATION SIGN
  [/Ã·/g,  "÷"],   // ÷  DIVISION SIGN
  [/Ã©/g,  "é"],   // é  e WITH ACUTE
  [/Ã¨/g,  "è"],   // è  e WITH GRAVE
  [/Ã /g,  "à"],   // à  a WITH GRAVE
  [/Ã¼/g,  "ü"],   // ü  u WITH DIAERESIS
  [/Ã¶/g,  "ö"],   // ö  o WITH DIAERESIS
  [/Ã¤/g,  "ä"],   // ä  a WITH DIAERESIS
  [/Ã±/g,  "ñ"],   // ñ  n WITH TILDE
  // ── Non-breaking space artifact ───────────────────────────────────────────────
  [/Â /g,  " "],         // NBSP mistakenly stored as two bytes
  // ── Standalone Â artifact — must be LAST Â rule ──────────────────────────────
  [/Â/g,   ""],
];

// ─── Core text sanitizer (no XML escaping) ────────────────────────────────────

/**
 * Cleans a raw database value:
 *   1. Coerces null / undefined / numbers to string.
 *   2. Repairs common Windows-1252 mojibake sequences.
 *   3. Removes lone surrogates (invalid Unicode, crashes normalize()).
 *   4. Strips every character illegal in XML 1.0 (control chars, DEL, etc.).
 *   5. Unicode-normalizes to NFC.
 *   6. Collapses runs of whitespace; trims.
 *
 * Result: clean, readable text — safe to store back in the DB or to pass
 * to sanitizeForXml() for XML output.
 */
export function sanitizeText(input: unknown): string {
  if (input == null) return "";
  let s = typeof input === "string" ? input : String(input);
  if (s.length === 0) return "";

  // Step 1 — Mojibake repair (must run before char stripping to keep patterns intact)
  for (const [pattern, replacement] of MOJIBAKE_REPAIRS) {
    s = s.replace(pattern, replacement);
  }

  // Step 2 — Remove lone surrogates BEFORE normalize() to avoid a thrown error
  s = s.replace(/[\uD800-\uDFFF]/g, "");

  // Step 3 — Remove characters invalid in XML 1.0
  s = s.replace(INVALID_XML_CHARS_RE, "");

  // Step 4 — NFC normalization (canonical composition)
  try {
    s = s.normalize("NFC");
  } catch {
    // Should never happen after step 2, but be defensive.
  }

  // Step 5 — Collapse whitespace
  s = s.trim().replace(/\s+/g, " ");

  return s;
}

// ─── XML-ready sanitizer (sanitizeText + XML escaping) ───────────────────────

/**
 * Sanitizes and XML-escapes a value for direct embedding in an XML text node.
 * Do NOT wrap the result in <![CDATA[...]]>; use it as plain text content.
 *
 *   sanitizeForXml("5% w/v & sterile")  →  "5% w/v &amp; sterile"
 *   sanitizeForXml(null)                 →  ""
 *   sanitizeForXml("dosage\x02info")     →  "dosage info"  (control char stripped)
 */
export function sanitizeForXml(input: unknown): string {
  const clean = sanitizeText(input);
  if (clean.length === 0) return "";

  // XML entity escaping — & must be first to avoid double-escaping.
  return clean
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Escapes only the characters that are illegal inside an XML attribute value
 * or text node, WITHOUT the mojibake/control-char stripping.
 * Use this ONLY for values you know are already clean (e.g. hard-coded strings,
 * numeric IDs, URLs with no query params).
 */
export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
