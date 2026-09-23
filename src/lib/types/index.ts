export interface ChatMessageDto {
	id: number;
	role: 'user' | 'assistant';
	content: string;
	createdAt: string;
}
