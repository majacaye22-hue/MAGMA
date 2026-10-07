# Magma — Moderation and Posting Rules (Draft)

This is the first operating draft for Magma's community standards. It should be reviewed with the people who will help shape and moderate the community before launch.

## Purpose

Magma exists to make the personal creative projects, experiments, observations, and conversations happening across CDMX easier to discover. Moderation should protect that purpose without turning the platform into a polished portfolio competition or suppressing unfinished, strange, critical, adult, or difficult work.

Magma moderates harm, not discomfort. The human body, sexuality, political expression, profanity, and challenging subject matter are not violations by themselves. Context, consent, presentation, and the effect on other people matter more than whether a work is considered tasteful or advertiser-friendly.

## What belongs on Magma

- Personal creative projects and entries showing their development.
- Finished and unfinished visual work, writing, music, video, performance, and experiments.
- Events, workshops, exhibitions, screenings, listening sessions, and other cultural gatherings in CDMX.
- Questions, collaboration invitations, process notes, references, and observations from the city.
- Constructive responses, disagreement, and criticism directed at ideas or work rather than attacks on a person.
- Mature artistic work, including nudity, sexuality, violence, or difficult subject matter, when it is lawful, consensual, and presented with an appropriate content note.

## What does not belong

Content may be removed when it includes:

- Targeted harassment, threats, intimidation, stalking, or repeated unwanted contact.
- Hate or dehumanizing attacks based on identity or protected characteristics.
- Sexual exploitation, non-consensual intimate material, or sexual content involving minors.
- Private personal information shared without consent.
- Credible encouragement of violence or self-harm.
- Impersonation intended to deceive or harm.
- Spam, scams, automated flooding, or unrelated commercial promotion.
- Copyright infringement reported with enough information to evaluate the claim.
- Deliberately malicious files, links, or attempts to compromise Magma or its members.

Not every uncomfortable, sexual, political, provocative, or critical work violates the rules. Moderators do not remove work merely because it contains nudity, profanity, political criticism, or challenges social norms. Context, consent, artistic intent, impact, and patterns of behavior all matter.

## Mature and sensitive work

- Artistic nudity and consensual adult sexual themes are allowed.
- Graphic sexual imagery, graphic violence, self-harm imagery, and other potentially distressing material require a content note and should be visually obscured until a viewer chooses to reveal it.
- Non-consensual intimate material, sexual exploitation, and any sexualized depiction of a minor are prohibited regardless of artistic framing.
- A content note is not a loophole for harassment, exploitation, threats, or illegal material.
- Moderators should apply the least restrictive action that protects members while preserving legitimate artistic expression.

## Posting expectations

Members should:

- Share work they made, are involved in, or have permission to publish.
- Credit collaborators and sources when appropriate.
- Use content notes when a work contains graphic or potentially distressing material.
- Avoid posting another person's private information or image in a harmful context without consent.
- Keep event details accurate and update them when plans change.
- Use comments to respond to the work or conversation, not to pursue or humiliate its author.

## Moderation roles

### Member

Can publish, comment, block another member, and report a post or comment.

### Moderator / cuidadorx

Can review reports, temporarily hide content, restore it, resolve reports, and remove posts or comments when necessary. Moderators should not review a dispute in which they are directly involved when another moderator is available.

### Owner / administrator

Can appoint or remove moderators, handle appeals and urgent safety cases, and make changes to the rules. Technical administration and community moderation should remain conceptually separate even if one person initially performs both roles.

## Review workflow

1. Read the reported content, report reason, details, and surrounding context.
2. Check whether the issue is immediate and severe. Hide first when leaving it visible could cause harm.
3. If context is unclear but there is no urgent risk, leave the content visible while reviewing.
4. Choose one outcome:
   - **No violation:** resolve the report and leave or restore the content.
   - **Needs context or a small correction:** contact the author and temporarily hide only if necessary.
   - **Clear violation:** remove the post or comment and document the reason.
   - **Severe or repeated violation:** escalate to the owner for an account-level decision.
5. Apply the rule consistently, not based on popularity, personal taste, or friendship.
6. Preserve a private moderation record before permanently deleting content whenever possible.

## Response ladder

- **Informal guidance:** for a first, low-impact mistake that can be corrected.
- **Content hidden pending review:** for uncertainty or potential immediate harm.
- **Content removal and warning:** for a clear violation.
- **Temporary posting restriction:** for repeated violations or serious misconduct.
- **Account removal:** for severe harm, credible threats, exploitation, malicious activity, or a sustained pattern after warnings.

Urgent safety cases can skip directly to removal or account restriction.

## Appeals

- A member should be able to ask why content was removed and request one review.
- When possible, a different moderator should review the appeal.
- The final decision and the rule applied should be communicated plainly.
- Appeals should not expose the identity of the person who submitted a report.

## Privacy and reporting

- Reports are private and visible only to the reporter and moderators through the current data model.
- Reporter identities should not be shared with the reported member.
- Blocking remains a personal safety tool and should not require a moderation finding.
- Moderators should only access report information needed to resolve the case.

## Product work required before launch

- Add standardized report categories that match these rules.
- Add moderation notes and an action history; the current dashboard only changes report status and content visibility.
- Add warnings and account-level restriction states instead of relying only on content deletion.
- Add an appeals channel and record its outcome.
- Add content-note support for sensitive work.
- Add confirmation dialogs and error handling to destructive moderator actions.
- Move moderator mutations behind a server-side API with an audit log rather than performing them directly from the browser.
- Decide how many moderators are needed at launch and establish an escalation contact.

## Open decisions

- Whether political organizing and fundraising belong in the main archive.
- How Magma handles photography or recordings of people in public space.
- What qualifies as sufficiently CDMX-connected content.
- The duration of temporary restrictions and how warnings expire.
- Whether deleted content is retained privately for appeals, and for how long.
