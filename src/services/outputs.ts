import { getRequiredEnvVar } from '../utils/getRequiredEnvVar';
import { getR2Client } from '../utils/getR2Client';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

export async function getOutput(filename: string): Promise<Buffer> {
    const r2Client = getR2Client();
    const bucketName = getRequiredEnvVar('R2_BUCKET_NAME');
    
    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: filename,
        });
        const response = await r2Client.send(command);
        const streamToBuffer = async (stream: Readable) => {
            const chunks = [];
            for await (const chunk of stream) {
                chunks.push(chunk);
            }
            return Buffer.concat(chunks);
        };
        return await streamToBuffer(response.Body as Readable);
    } catch (e) {
        throw new Error('NOT_FOUND');
    }
}