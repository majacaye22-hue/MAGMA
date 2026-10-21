export const EVENT_INVITATIONS_ENABLED = process.env.NEXT_PUBLIC_EVENT_INVITATIONS_ENABLED === 'true';
export const EVENT_RESPONSES = { pending: 'sin respuesta', going: 'voy', maybe: 'tal vez', declined: 'no puedo' } as const;
export type EventResponse = keyof typeof EVENT_RESPONSES;
