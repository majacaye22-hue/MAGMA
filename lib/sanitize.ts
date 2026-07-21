import DOMPurify from 'isomorphic-dompurify'

// Tiptap StarterKit outputs only these tags (heading configured for h2/h3 only,
// no Link extension). Everything else — script, style, iframe, on* attrs,
// javascript: URLs — is stripped by DOMPurify before it even hits ALLOWED_TAGS.
const ALLOWED_TAGS = [
  'p', 'br', 'hr',
  'strong', 'em', 's',
  'h2', 'h3',
  'ul', 'ol', 'li',
  'blockquote',
  'code', 'pre',
]

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR: [] })
}
