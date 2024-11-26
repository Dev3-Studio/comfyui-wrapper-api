import { S3Client } from '@aws-sdk/client-s3';
import { getRequiredEnvVar } from './getRequiredEnvVar';

export function getR2Client() {
    return new S3Client({
        region: 'auto',
        endpoint: getRequiredEnvVar('R2_ENDPOINT'),
        credentials: {
            accessKeyId: getRequiredEnvVar('R2_ACCESS_KEY_ID'),
            secretAccessKey: getRequiredEnvVar('R2_SECRET_ACCESS_KEY'),
        },
    });
}