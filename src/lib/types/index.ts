export interface ChatMessageDto {
	id: number;
	role: 'user' | 'assistant';
	content: string;
	createdAt: string;
}

export interface ProgramExerciseDto {
	id: number;
	exerciseName: string;
	dayIndex: number;
	orderIndex: number;
	sets: number;
	reps: string;
	restSeconds: number | null;
}

export interface WorkoutProgramDto {
	id: number;
	title: string;
	source: 'ai_generated' | 'manual';
	createdAt: string;
	days: { dayIndex: number; exercises: ProgramExerciseDto[] }[];
}

export type UserGoal = 'gain' | 'lose' | 'maintain';
export type UserLevel = 'beginner' | 'intermediate' | 'advanced';

export interface UserProfileDto {
	username: string | null;
	goal: UserGoal | null;
	level: UserLevel | null;
	constraints: string | null;
	isComplete: boolean;
}

export interface ExerciseDto {
	id: number;
	name: string;
	muscleGroup: string;
	equipment: string | null;
	videoUrl: string | null;
	description: string | null;
	isBodyweight: boolean;
	needsCategorisation: boolean;
}

export interface ActivityDayDto {
	/** ISO date, `YYYY-MM-DD`. */
	date: string;
	sets: number;
}

export interface WorkoutSummaryDto {
	trainingDays: number;
	exercisesLogged: number;
	setsLogged: number;
	perDay: ActivityDayDto[];
}

export interface WorkoutLogDto {
	id: number;
	programExerciseId: number;
	programId: number;
	programTitle: string;
	exerciseName: string;
	performedAt: string;
	setsDone: number;
	repsDone: string;
	weightKg: number | null;
}
