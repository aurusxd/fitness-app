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
