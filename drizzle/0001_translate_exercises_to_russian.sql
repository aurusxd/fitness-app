-- Renames the seeded library in place (tech.md v10). Programs and log entries reference
-- exercises by id, so they follow the rename; rows the AI created under English names are
-- left alone, since only the seeded set has a known translation.

UPDATE `exercises` SET `name` = 'Приседания со штангой' WHERE `name` = 'Barbell Squat';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Приседания без веса' WHERE `name` = 'Bodyweight Squat';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Становая тяга' WHERE `name` = 'Deadlift';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Румынская тяга' WHERE `name` = 'Romanian Deadlift';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Жим лёжа' WHERE `name` = 'Bench Press';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Жим гантелей на наклонной скамье' WHERE `name` = 'Incline Dumbbell Press';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Отжимания от пола' WHERE `name` = 'Push-Up';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Жим штанги стоя' WHERE `name` = 'Overhead Press';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Махи гантелями в стороны' WHERE `name` = 'Lateral Raise';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Подтягивания' WHERE `name` = 'Pull-Up';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Тяга верхнего блока' WHERE `name` = 'Lat Pulldown';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Тяга штанги в наклоне' WHERE `name` = 'Barbell Row';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Тяга нижнего блока сидя' WHERE `name` = 'Seated Cable Row';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Подъём гантелей на бицепс' WHERE `name` = 'Bicep Curl';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Подъём гантелей «молот»' WHERE `name` = 'Hammer Curl';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Разгибание рук на блоке' WHERE `name` = 'Tricep Pushdown';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Отжимания на брусьях' WHERE `name` = 'Dips';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Жим ногами' WHERE `name` = 'Leg Press';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Сгибание ног в тренажёре' WHERE `name` = 'Leg Curl';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Разгибание ног в тренажёре' WHERE `name` = 'Leg Extension';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Выпады в ходьбе' WHERE `name` = 'Walking Lunge';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Подъёмы на носки' WHERE `name` = 'Calf Raise';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Планка' WHERE `name` = 'Plank';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Скручивания' WHERE `name` = 'Crunch';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Подъём ног в висе' WHERE `name` = 'Hanging Leg Raise';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Русский твист' WHERE `name` = 'Russian Twist';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Альпинист' WHERE `name` = 'Mountain Climber';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Бёрпи' WHERE `name` = 'Burpee';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Махи гирей' WHERE `name` = 'Kettlebell Swing';
--> statement-breakpoint
UPDATE `exercises` SET `name` = 'Прыжки со скакалкой' WHERE `name` = 'Jump Rope';
--> statement-breakpoint
UPDATE `exercises` SET `equipment` = 'штанга' WHERE `equipment` = 'barbell';
--> statement-breakpoint
UPDATE `exercises` SET `equipment` = 'гантели' WHERE `equipment` = 'dumbbell';
--> statement-breakpoint
UPDATE `exercises` SET `equipment` = 'блочный тренажёр' WHERE `equipment` = 'cable machine';
--> statement-breakpoint
UPDATE `exercises` SET `equipment` = 'тренажёр' WHERE `equipment` = 'machine';
--> statement-breakpoint
UPDATE `exercises` SET `equipment` = 'гиря' WHERE `equipment` = 'kettlebell';
--> statement-breakpoint
UPDATE `exercises` SET `equipment` = 'скакалка' WHERE `equipment` = 'jump rope';
