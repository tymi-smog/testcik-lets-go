BEGIN;

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS image_url TEXT;

UPDATE events
SET image_url = CASE id
  WHEN 4 THEN 'https://picsum.photos/seed/startup-pitch-days/1600/900'
  WHEN 5 THEN 'https://picsum.photos/seed/ecommerce-growth-forum/1600/900'
  WHEN 6 THEN 'https://picsum.photos/seed/tech-future-summit-2026/1600/900'
  WHEN 7 THEN 'https://picsum.photos/seed/summer-beats-open-air/1600/900'
  WHEN 8 THEN 'https://picsum.photos/seed/komedia-malzenska/1600/900'
  WHEN 9 THEN 'https://picsum.photos/seed/dziady-2-0/1600/900'
  WHEN 10 THEN 'https://picsum.photos/seed/hamlet-nowa-interpretacja/1600/900'
  WHEN 11 THEN 'https://picsum.photos/seed/kabaretowy-wieczor-roku/1600/900'
  WHEN 12 THEN 'https://picsum.photos/seed/standup-night-bez-cenzury/1600/900'
  WHEN 13 THEN 'https://picsum.photos/seed/noc-boksu-fight-card/1600/900'
  WHEN 14 THEN 'https://picsum.photos/seed/derby-trojmiasta/1600/900'
  WHEN 15 THEN 'https://picsum.photos/seed/final-pucharu-polski/1600/900'
  WHEN 16 THEN 'https://picsum.photos/seed/hiphop-legends-live/1600/900'
  WHEN 17 THEN 'https://picsum.photos/seed/jazz-night-premium/1600/900'
  WHEN 18 THEN 'https://picsum.photos/seed/rock-arena-2026/1600/900'
  ELSE image_url
END
WHERE id BETWEEN 4 AND 18;

COMMIT;
