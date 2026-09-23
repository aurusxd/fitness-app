import { db } from './client';
import { exercises } from './schema';

const baseExercises = [
	{ name: 'Barbell Squat', muscleGroup: 'legs', equipment: 'barbell' },
	{ name: 'Bodyweight Squat', muscleGroup: 'legs', equipment: null },
	{ name: 'Deadlift', muscleGroup: 'back', equipment: 'barbell' },
	{ name: 'Romanian Deadlift', muscleGroup: 'legs', equipment: 'barbell' },
	{ name: 'Bench Press', muscleGroup: 'chest', equipment: 'barbell' },
	{ name: 'Incline Dumbbell Press', muscleGroup: 'chest', equipment: 'dumbbell' },
	{ name: 'Push-Up', muscleGroup: 'chest', equipment: null },
	{ name: 'Overhead Press', muscleGroup: 'shoulders', equipment: 'barbell' },
	{ name: 'Lateral Raise', muscleGroup: 'shoulders', equipment: 'dumbbell' },
	{ name: 'Pull-Up', muscleGroup: 'back', equipment: null },
	{ name: 'Lat Pulldown', muscleGroup: 'back', equipment: 'cable machine' },
	{ name: 'Barbell Row', muscleGroup: 'back', equipment: 'barbell' },
	{ name: 'Seated Cable Row', muscleGroup: 'back', equipment: 'cable machine' },
	{ name: 'Bicep Curl', muscleGroup: 'arms', equipment: 'dumbbell' },
	{ name: 'Hammer Curl', muscleGroup: 'arms', equipment: 'dumbbell' },
	{ name: 'Tricep Pushdown', muscleGroup: 'arms', equipment: 'cable machine' },
	{ name: 'Dips', muscleGroup: 'arms', equipment: null },
	{ name: 'Leg Press', muscleGroup: 'legs', equipment: 'machine' },
	{ name: 'Leg Curl', muscleGroup: 'legs', equipment: 'machine' },
	{ name: 'Leg Extension', muscleGroup: 'legs', equipment: 'machine' },
	{ name: 'Walking Lunge', muscleGroup: 'legs', equipment: null },
	{ name: 'Calf Raise', muscleGroup: 'legs', equipment: null },
	{ name: 'Plank', muscleGroup: 'core', equipment: null },
	{ name: 'Crunch', muscleGroup: 'core', equipment: null },
	{ name: 'Hanging Leg Raise', muscleGroup: 'core', equipment: null },
	{ name: 'Russian Twist', muscleGroup: 'core', equipment: null },
	{ name: 'Mountain Climber', muscleGroup: 'core', equipment: null },
	{ name: 'Burpee', muscleGroup: 'full_body', equipment: null },
	{ name: 'Kettlebell Swing', muscleGroup: 'full_body', equipment: 'kettlebell' },
	{ name: 'Jump Rope', muscleGroup: 'cardio', equipment: 'jump rope' }
];

await db.insert(exercises).values(baseExercises);

console.log(`Seeded ${baseExercises.length} exercises`);
