import { db } from './client';
import { exercises } from './schema';

const baseExercises = [
	{ name: 'Приседания со штангой', muscleGroup: 'legs', equipment: 'штанга' },
	{ name: 'Приседания без веса', muscleGroup: 'legs', equipment: null },
	{ name: 'Становая тяга', muscleGroup: 'back', equipment: 'штанга' },
	{ name: 'Румынская тяга', muscleGroup: 'legs', equipment: 'штанга' },
	{ name: 'Жим лёжа', muscleGroup: 'chest', equipment: 'штанга' },
	{ name: 'Жим гантелей на наклонной скамье', muscleGroup: 'chest', equipment: 'гантели' },
	{ name: 'Отжимания от пола', muscleGroup: 'chest', equipment: null },
	{ name: 'Жим штанги стоя', muscleGroup: 'shoulders', equipment: 'штанга' },
	{ name: 'Махи гантелями в стороны', muscleGroup: 'shoulders', equipment: 'гантели' },
	{ name: 'Подтягивания', muscleGroup: 'back', equipment: null },
	{ name: 'Тяга верхнего блока', muscleGroup: 'back', equipment: 'блочный тренажёр' },
	{ name: 'Тяга штанги в наклоне', muscleGroup: 'back', equipment: 'штанга' },
	{ name: 'Тяга нижнего блока сидя', muscleGroup: 'back', equipment: 'блочный тренажёр' },
	{ name: 'Подъём гантелей на бицепс', muscleGroup: 'arms', equipment: 'гантели' },
	{ name: 'Подъём гантелей «молот»', muscleGroup: 'arms', equipment: 'гантели' },
	{ name: 'Разгибание рук на блоке', muscleGroup: 'arms', equipment: 'блочный тренажёр' },
	{ name: 'Отжимания на брусьях', muscleGroup: 'arms', equipment: null },
	{ name: 'Жим ногами', muscleGroup: 'legs', equipment: 'тренажёр' },
	{ name: 'Сгибание ног в тренажёре', muscleGroup: 'legs', equipment: 'тренажёр' },
	{ name: 'Разгибание ног в тренажёре', muscleGroup: 'legs', equipment: 'тренажёр' },
	{ name: 'Выпады в ходьбе', muscleGroup: 'legs', equipment: null },
	{ name: 'Подъёмы на носки', muscleGroup: 'legs', equipment: null },
	{ name: 'Планка', muscleGroup: 'core', equipment: null },
	{ name: 'Скручивания', muscleGroup: 'core', equipment: null },
	{ name: 'Подъём ног в висе', muscleGroup: 'core', equipment: null },
	{ name: 'Русский твист', muscleGroup: 'core', equipment: null },
	{ name: 'Альпинист', muscleGroup: 'core', equipment: null },
	{ name: 'Бёрпи', muscleGroup: 'full_body', equipment: null },
	{ name: 'Махи гирей', muscleGroup: 'full_body', equipment: 'гиря' },
	{ name: 'Прыжки со скакалкой', muscleGroup: 'cardio', equipment: 'скакалка' }
];

await db.insert(exercises).values(baseExercises);

console.log(`Seeded ${baseExercises.length} exercises`);
