import dotenv from 'dotenv';
dotenv.config();

export function getRequiredEnvVar(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable ${name}`);
	}
	return value;
}