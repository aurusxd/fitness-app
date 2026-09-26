ALTER TABLE `ai_chat_messages` ADD `program_draft` text;--> statement-breakpoint
ALTER TABLE `ai_chat_messages` ADD `saved_program_id` integer REFERENCES workout_programs(id);