# Roadmap

Planned and proposed future work, migrated out of `README.md` to keep that
file focused on "how to run this." See `DESIGN.md` for the rationale behind
decisions already made.

## Planned

- Map view: toggle from board to map, pins colored by stage (see `DESIGN.md` §7)
- Allow for backup emails to be added
- Replace the edit toggle with a little visual handle, and make the placement a bit more slick (shouldn't have
  the delay upon dropping)
- Application should have a checkbox for who has applied
- Automatic address geocoding / photo enrichment
- Finer-grained sharing (view-only links, per-person access)

## Proposed: in-app email threading (shared inbox)

Status: not started — write-up below is a spec to build from, not a
decision that's shipped.

### Problem

Realtor communication happens over email, outside the app. Right now
there's no first-class way for a roommate to see the original email thread
or reply/CC into it themselves — the only options are manually forwarding
or CC'ing on every reply.

### Approach

A per-board (later, per-thread) email alias on a domain we control, paired
with an inbound-email provider (e.g. Resend, Postmark, Mailgun — any with
webhook-based inbound parsing), so the whole conversation surfaces inside
a prospect's card instead of living only in someone's personal inbox.
This assumes email login/accounts exist for the app (see "Finer-grained
sharing" above) — one board member per real identity, not just the
code-access model.

**Flow:**

1. (Outside the app) User applies to a listing, hears back from a
   realtor, and decides to add it to the board.
2. User forwards that email (and any later related ones) to an address
   associated with their board, e.g. `reply+<board-code>@reply.<app-domain>`.
3. An inbound-email provider receives it and POSTs a webhook to a new
   `/api/inbound-email` route. If the message doesn't yet match a
   prospect, it lands in a small "unmatched" queue for the user to attach
   to an existing card or use to create a new one.
4. On first match, the app mints a **per-thread reply alias**
   (`reply+<token>@reply.<app-domain>`, via plus-addressing on the one
   receiving address) and stores the thread — participants, subject,
   message IDs. Every future inbound message for that alias is
   auto-matched via the token, no manual matching needed again.
5. Logged-in board members view the thread on the prospect's card and can
   reply in-app. Replies send **from the app's domain** (display name set
   to the person, e.g. "Alex via Rental Kanban"), with `Reply-To`/`Cc`
   rewritten to the real external participants and `In-Reply-To`/
   `References` set from thread history so the realtor's own mail client
   threads it correctly. This is the same address-per-conversation
   pattern shared-inbox tools (Front, Help Scout) use, just scoped to a
   rental board — no per-user OAuth against personal mailboxes, no
   restricted Gmail/Graph API scopes, no scanning anyone's real inbox.

**New schema (roughly):**

```
threads
  id
  board_id       FK
  prospect_id    FK, nullable until matched
  reply_token    text, unique
  subject        text
  participants   jsonb   -- external To/Cc addresses currently on the thread
  created_at

messages
  id
  thread_id       FK
  direction       enum('inbound','outbound')
  from_address    text
  to_addresses    jsonb
  cc_addresses    jsonb
  sent_by_user_id FK, nullable   -- which board member sent it (outbound only)
  message_id      text            -- RFC 5322 Message-ID
  in_reply_to     text, nullable
  provider_id     text            -- provider's internal id, to refetch body/attachments
  subject         text
  body_text       text
  body_html       text
  created_at
```

**Known tradeoffs / open questions:**

- Replies sent from the app show a `reply.<app-domain>` sending address
  (with the sender's name attached), not the board member's personal
  email — cosmetic, not functional; threading and delivery work either way.
- Inbound `From` headers are trivially spoofable; low stakes here (worst
  case is a stray unmatched thread), not worth defending against.
- Inbound HTML needs sanitizing before rendering (strip scripts, consider
  proxying remote images so a tracking pixel doesn't leak a viewer's IP).
- Requires a subdomain (e.g. `reply.<app-domain>`) with MX/SPF/DKIM
  configured for the chosen provider.
