# Product Brief — ImageShare (working name)

**Vision**
Enable people to share, discover, and engage with visual stories through a lightweight, privacy-focused image sharing platform.

**Problem**
Mainstream social networks prioritize growth and ads, making image sharing noisy, privacy-intrusive, and unfriendly to creators and small communities.

**Target users**

- Creators: photographers, visual artists, hobbyists.
- Friends & families: private sharing between trusted groups.
- Browsers/discoverers: casual users seeking curated visual content.
- Clubs/educators: moderated topic-focused groups.

**Core value propositions**

- Fast, low-friction image sharing with a clean UI.
- Privacy-first controls: public, followers, private groups.
- Focused discovery: tags, topics, and lightweight curation.
- Image-first interactions: likes, comments, and reposts tuned for visuals.

**MVP — Key features**

- User accounts and profiles (email + optional OAuth).
- Single-image uploads with caption, tags, and visibility settings.
- Follow model, home feed (chronological with small recs).
- Explore by tags/topics and simple search.
- Likes and threaded comments.
- Basic notifications (follows, likes, comments).
- Reporting and simple moderation controls.
- Responsive web UI (mobile-first).

**MVP Scope (minimal to ship)**

- Auth + profile pages.
- Image upload pipeline: client resize, server validation, object storage.
- Home feed (follows + light recommendations).
- Basic notification and reporting flows.
- CDN-backed image delivery.

**Technical notes & constraints**

- Backend: use existing `backend/v1_nestjs` stack.
- Frontend: start with `frontend/web` responsive app; consider PWA later.
- Storage: cloud object storage + CDN; optimize images on upload.
- Data model: users, posts, follows, tags, notifications, reports.
- Security: authentication, authorization, rate limits, encryption at rest.

**Success metrics**

- DAU / MAU and Day-1/Day-7 retention.
- Avg images uploaded per active user per week.
- Engaged sessions (time spent, likes/comments per post).
- % posts with non-public visibility (trust indicator).
- Moderation throughput and time-to-action.

**High-level roadmap**

- 0–3 weeks: project setup, auth, profile, upload, feed, storage/CDN.
- 1–3 months: explore/search, comments, notifications, moderator dashboard.
- 3–6 months: ranking improvements, PWA/mobile, groups/collections.
- 6–12 months: multi-image posts, video, creator features, monetization options.

**Risks & mitigations**

- Moderation load: staged rollout, automated filters, reporting triage.
- Storage/bandwidth cost: size limits, compression, CDN caching.
- Slow adoption: target niche communities, invite flows, creator onboarding.

**Open decisions**

- Auth strategy at launch: email-only or include OAuth providers?
- Upload limits and image processing policies.
- Feed ranking: chronological vs. engagement-weighted for MVP.
- Legal/compliance targets (GDPR retention policies).

**Next steps**

1. Confirm MVP features and auth approach.
2. Create engineering spike for image storage/CDN and schema.
3. Prototype 3 core screens: feed, upload, profile.
4. Break work into first 2-week sprint and prioritize backlog.

---

_Generated from project artifacts in `_bmad-output`._
