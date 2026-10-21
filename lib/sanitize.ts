import DOMPurify from 'isomorphic-dompurify'

// Only local profile links survive; arbitrary URLs and attributes are stripped.
const ALLOWED_TAGS = [
  'p', 'br', 'hr',
  'strong', 'em', 's',
  'h2', 'h3',
  'ul', 'ol', 'li',
  'blockquote',
  'code', 'pre', 'a',
]

export function sanitizeHtml(html: string): string {
  const body = DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR: ['href'], RETURN_DOM: true }) as HTMLElement
  for (const link of body.querySelectorAll('a')) {
    const href = link.getAttribute('href') ?? ''
    if (!/^\/profile\/[a-zA-Z0-9_]{3,30}$/.test(href)) link.replaceWith(...Array.from(link.childNodes))
  }
  return body.innerHTML
}
