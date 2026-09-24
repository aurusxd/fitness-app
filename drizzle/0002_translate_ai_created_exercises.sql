-- Translates the exercises the AI created under English names, including the annotated duplicates
-- that predate v7 ("Goblet Squat (limited range, pain-free)").
--
-- Each name is handled the same way, so the file works on any database whatever it happens to
-- hold: if the Russian exercise already exists, the programs pointing at the English row are
-- repointed at it and the English row is dropped; if it does not, the row is simply renamed.
-- Logged sets hang off program_exercises, which survives either path, so training history keeps.

UPDATE `program_exercises` SET `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Разгибание рук на блоке')
WHERE `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Cable Triceps Pushdown')
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Разгибание рук на блоке');
--> statement-breakpoint
DELETE FROM `exercises` WHERE `name` = 'Cable Triceps Pushdown'
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Разгибание рук на блоке');
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Разгибание рук на блоке' WHERE `name` = 'Cable Triceps Pushdown';
--> statement-breakpoint
UPDATE `program_exercises` SET `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Мёртвый жук')
WHERE `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Dead Bug')
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Мёртвый жук');
--> statement-breakpoint
DELETE FROM `exercises` WHERE `name` = 'Dead Bug'
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Мёртвый жук');
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Мёртвый жук' WHERE `name` = 'Dead Bug';
--> statement-breakpoint
UPDATE `program_exercises` SET `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Жим гантелей лёжа')
WHERE `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Dumbbell Bench Press')
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Жим гантелей лёжа');
--> statement-breakpoint
DELETE FROM `exercises` WHERE `name` = 'Dumbbell Bench Press'
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Жим гантелей лёжа');
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Жим гантелей лёжа' WHERE `name` = 'Dumbbell Bench Press';
--> statement-breakpoint
UPDATE `program_exercises` SET `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Подъём гантелей на бицепс')
WHERE `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Dumbbell Biceps Curl')
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Подъём гантелей на бицепс');
--> statement-breakpoint
DELETE FROM `exercises` WHERE `name` = 'Dumbbell Biceps Curl'
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Подъём гантелей на бицепс');
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Подъём гантелей на бицепс' WHERE `name` = 'Dumbbell Biceps Curl';
--> statement-breakpoint
UPDATE `program_exercises` SET `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Махи гантелями в стороны')
WHERE `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Dumbbell Lateral Raise')
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Махи гантелями в стороны');
--> statement-breakpoint
DELETE FROM `exercises` WHERE `name` = 'Dumbbell Lateral Raise'
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Махи гантелями в стороны');
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Махи гантелями в стороны' WHERE `name` = 'Dumbbell Lateral Raise';
--> statement-breakpoint
UPDATE `program_exercises` SET `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Румынская тяга с гантелями')
WHERE `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Dumbbell Romanian Deadlift')
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Румынская тяга с гантелями');
--> statement-breakpoint
DELETE FROM `exercises` WHERE `name` = 'Dumbbell Romanian Deadlift'
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Румынская тяга с гантелями');
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Румынская тяга с гантелями' WHERE `name` = 'Dumbbell Romanian Deadlift';
--> statement-breakpoint
UPDATE `program_exercises` SET `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Румынская тяга с гантелями')
WHERE `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Dumbbell Romanian Deadlift (light, controlled)')
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Румынская тяга с гантелями');
--> statement-breakpoint
DELETE FROM `exercises` WHERE `name` = 'Dumbbell Romanian Deadlift (light, controlled)'
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Румынская тяга с гантелями');
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Румынская тяга с гантелями' WHERE `name` = 'Dumbbell Romanian Deadlift (light, controlled)';
--> statement-breakpoint
UPDATE `program_exercises` SET `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Гоблет-приседания')
WHERE `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Goblet Squat')
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Гоблет-приседания');
--> statement-breakpoint
DELETE FROM `exercises` WHERE `name` = 'Goblet Squat'
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Гоблет-приседания');
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Гоблет-приседания' WHERE `name` = 'Goblet Squat';
--> statement-breakpoint
UPDATE `program_exercises` SET `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Гоблет-приседания')
WHERE `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Goblet Squat (limited range, pain-free)')
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Гоблет-приседания');
--> statement-breakpoint
DELETE FROM `exercises` WHERE `name` = 'Goblet Squat (limited range, pain-free)'
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Гоблет-приседания');
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Гоблет-приседания' WHERE `name` = 'Goblet Squat (limited range, pain-free)';
--> statement-breakpoint
UPDATE `program_exercises` SET `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Ягодичный мостик')
WHERE `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Hip Thrust')
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Ягодичный мостик');
--> statement-breakpoint
DELETE FROM `exercises` WHERE `name` = 'Hip Thrust'
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Ягодичный мостик');
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Ягодичный мостик' WHERE `name` = 'Hip Thrust';
--> statement-breakpoint
UPDATE `program_exercises` SET `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Ягодичный мостик')
WHERE `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Hip Thrust (light, controlled)')
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Ягодичный мостик');
--> statement-breakpoint
DELETE FROM `exercises` WHERE `name` = 'Hip Thrust (light, controlled)'
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Ягодичный мостик');
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Ягодичный мостик' WHERE `name` = 'Hip Thrust (light, controlled)';
--> statement-breakpoint
UPDATE `program_exercises` SET `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Жим ногами')
WHERE `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Leg Press (pain-free range, light)')
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Жим ногами');
--> statement-breakpoint
DELETE FROM `exercises` WHERE `name` = 'Leg Press (pain-free range, light)'
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Жим ногами');
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Жим ногами' WHERE `name` = 'Leg Press (pain-free range, light)';
--> statement-breakpoint
UPDATE `program_exercises` SET `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Тяга гантели одной рукой')
WHERE `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'One-Arm Dumbbell Row')
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Тяга гантели одной рукой');
--> statement-breakpoint
DELETE FROM `exercises` WHERE `name` = 'One-Arm Dumbbell Row'
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Тяга гантели одной рукой');
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Тяга гантели одной рукой' WHERE `name` = 'One-Arm Dumbbell Row';
--> statement-breakpoint
UPDATE `program_exercises` SET `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Жим гантелей сидя')
WHERE `exercise_id` = (SELECT `id` FROM `exercises` WHERE `name` = 'Seated Dumbbell Shoulder Press')
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Жим гантелей сидя');
--> statement-breakpoint
DELETE FROM `exercises` WHERE `name` = 'Seated Dumbbell Shoulder Press'
  AND EXISTS (SELECT 1 FROM `exercises` WHERE `name` = 'Жим гантелей сидя');
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Жим гантелей сидя' WHERE `name` = 'Seated Dumbbell Shoulder Press';
