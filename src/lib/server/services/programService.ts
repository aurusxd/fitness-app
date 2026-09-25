import type { WorkoutProgramDto } from '$lib/types';
import { ProgramRepository, toWorkoutProgramDto } from '../repositories/programRepository';

export class ProgramService {
	constructor(private readonly programRepository: ProgramRepository = new ProgramRepository()) {}

	async listForUser(userId: number): Promise<WorkoutProgramDto[]> {
		const programs = await this.programRepository.listByUser(userId);
		return programs.map(toWorkoutProgramDto);
	}

	/** False when the program is not the user's to delete, including one already deleted. */
	async deleteForUser(userId: number, programId: number): Promise<boolean> {
		return this.programRepository.archiveForUser(programId, userId);
	}

	/** Returns the program only if it belongs to `userId`, to prevent cross-user access. */
	async getForUser(userId: number, programId: number): Promise<WorkoutProgramDto | null> {
		const program = await this.programRepository.findByIdForUser(programId, userId);
		return program ? toWorkoutProgramDto(program) : null;
	}
}
