-- Rename "Doing" to "In Progress" for all existing boards
UPDATE "Column"
SET title = 'In Progress', "updatedAt" = NOW()
WHERE title = 'Doing';

-- For boards that still have exactly 3 columns (To Do, In Progress, Done),
-- shift "Done" from position 2 to position 3 to make room for "In Review"
UPDATE "Column"
SET position = 3, "updatedAt" = NOW()
WHERE title = 'Done'
  AND "boardId" IN (
    SELECT "boardId"
    FROM "Column"
    GROUP BY "boardId"
    HAVING COUNT(*) = 3
  );

-- Insert "In Review" at position 2 for those same boards
INSERT INTO "Column" (id, title, position, "boardId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  'In Review',
  2,
  c."boardId",
  NOW(),
  NOW()
FROM "Column" c
WHERE c.title = 'In Progress'
  AND c."boardId" IN (
    SELECT "boardId"
    FROM "Column"
    GROUP BY "boardId"
    HAVING COUNT(*) = 3
  );
