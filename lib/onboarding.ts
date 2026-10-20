// Bump the version whenever questions, agreements or privacy wording change.
export const ONBOARDING_VERSION = '2026-10-20.v1'
export const ONBOARDING_QUESTIONS = [
  '¿Qué te mueve últimamente?',
  '¿Qué te gustaría compartir o hacer posible en Magma?',
] as const
export const COMMUNITY_AGREEMENTS = [
  'Respeto los límites de otras personas. No acoso, discrimino ni insisto ante un no.',
  'Comparto trabajo propio o con permiso y doy crédito a sus autorxs y colaboradorxs.',
  'Pido consentimiento antes de compartir información o trabajo privado de otra persona. Una invitación no implica que haya aceptado colaborar.',
  'Uso avisos de contenido cuando hace falta y no comparto material de explotación, íntimo sin consentimiento o que ponga a alguien en riesgo.',
  'Cuido las conversaciones: sin suplantaciones, estafas ni spam. Puedo disentir sin atacar a una persona.',
] as const
export const ONBOARDING_PRIVACY = 'Tus respuestas son privadas. La persona responsable de Magma podrá leerlas para conocer a la comunidad y cuidar este espacio. No aparecerán en tu perfil. Se guardan con tu cuenta y se eliminan al eliminarla.'

export function validateOnboarding(value: unknown): { motivation: string; contribution: string } | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  if (input.accepted !== true || input.version !== ONBOARDING_VERSION) return null
  if (typeof input.motivation !== 'string' || typeof input.contribution !== 'string') return null
  const motivation = input.motivation.trim()
  const contribution = input.contribution.trim()
  if (!motivation || !contribution || motivation.length > 1500 || contribution.length > 1500) return null
  return { motivation, contribution }
}
