import { clsx, type ClassValue } from 'clsx';
import type { UserGoal, UserLevel } from '$lib/types';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/** Russian needs three forms: 1 день, 2 дня, 5 дней. */
export function plural(count: number, forms: [string, string, string]): string {
	const tens = count % 100;
	const ones = count % 10;
	const form =
		tens > 10 && tens < 20
			? forms[2]
			: ones === 1
				? forms[0]
				: ones > 1 && ones < 5
					? forms[1]
					: forms[2];

	return `${count} ${form}`;
}

export const GOAL_LABELS: Record<UserGoal, string> = {
	lose: 'Похудение',
	maintain: 'Поддержание',
	gain: 'Набор массы'
};

export const LEVEL_LABELS: Record<UserLevel, string> = {
	beginner: 'Новичок',
	intermediate: 'Средний',
	advanced: 'Продвинутый'
};
