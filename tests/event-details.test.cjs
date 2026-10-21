const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./event-details-loader.cjs')();
test('CDMX event times round trip and preserve overnight/multiday durations', () => {
  const start = h.eventTimestamp('2026-10-24', '23:30');
  assert.equal(start, '2026-10-25T05:30:00.000Z');
  assert.throws(() => h.eventTimestamp('2026-02-30', '12:00'));
  assert.throws(() => h.eventTimestamp('2026-10-24', ''));
  assert.equal(h.eventLocalParts(start).date, '2026-10-24');
  assert.equal(h.eventLocalParts(start).time, '23:30');
  const payload = h.eventDetailsPayload({ ...h.emptyEventDetails, endDate: '2026-10-25', endTime: '03:00' }, start);
  assert.equal(payload.event_end_date, '2026-10-25T09:00:00.000Z');
  assert.equal(h.eventFinished({ event_date: start, ...payload }, Date.parse('2026-10-25T07:00Z')), false);
  assert.equal(h.eventFinished({ event_date: start, ...payload }, Date.parse('2026-10-25T10:00Z')), true);
  assert.equal(h.eventFinished({ event_date: start }, Date.parse('2026-10-25T05:45Z')), false);
  assert.throws(() => h.eventDetailsPayload({ ...h.emptyEventDetails, endDate: '2026-10-24', endTime: '20:00' }, start));
  assert.throws(() => h.eventDetailsPayload({ ...h.emptyEventDetails, endDate: '2026-10-25' }, start));
});
test('external links, categories and practical details are validated without assuming access', () => {
  assert.equal(h.safeEventLink('javascript:alert(1)'), null);
  assert.equal(h.safeEventLink('https://user:secret@example.com'), null);
  assert.equal(h.safeEventLink('https://ra.co/events/2555229'), 'https://ra.co/events/2555229');
  for (const change of [{ category: 'invalid' }, { link: 'bad' }, { minimumAge: '-1' }, { minimumAge: '18.5' }, { accessibility: 'a'.repeat(1501) }]) {
    assert.throws(() => h.eventDetailsPayload({ ...h.emptyEventDetails, ...change }, null));
  }
  const payload = h.eventDetailsPayload({ ...h.emptyEventDetails, minimumAge: '0', registrationRequired: true, linkKind: 'registration', link: 'https://example.com' }, null);
  assert.equal(payload.minimum_age, 0);
  assert.equal(payload.registration_required, true);
  assert.equal(payload.event_link_kind, 'registration');
  assert.equal(h.eventDetailsPayload(h.emptyEventDetails, null).minimum_age, null);
  assert.equal(h.EVENT_DETAILS_ENABLED, false);
});
