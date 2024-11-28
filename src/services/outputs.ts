import { resultsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { getRequiredEnvVar } from '../utils/getRequiredEnvVar';
import { getR2Client } from '../utils/getR2Client';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

export async function getOutput(promptId: string): Promise<Buffer> {
    const [{ r2Key }] = await db
        .select({
            r2Key: resultsTable.s3Key,
        })
        .from(resultsTable)
        .limit(1)
        .where(eq(resultsTable.promptId, promptId));
    if (!r2Key) throw new Error('NOT_FOUND');
    
    const r2Client = getR2Client();
    const bucketName = getRequiredEnvVar('R2_BUCKET_NAME');
    
    try {
        const command = new GetObjectCommand({
            Bucket: bucketName,
            Key: r2Key,
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
        console.error(`Error while downloading prompt job ${promptId} from S3: ${e}`);
        throw new Error('NOT_FOUND');
    }
}