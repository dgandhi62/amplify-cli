const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({ region: process.env.AWS_REGION });

/**
 * @type {import('@types/aws-lambda').S3Handler}
 */
exports.handler = async (event) => {
  console.log(`EVENT: ${JSON.stringify(event)}`);

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    // Skip if already a thumbnail
    if (key.includes('/thumbnails/')) {
      continue;
    }

    // Only process image files
    if (!key.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      continue;
    }

    try {
      // Get file metadata
      const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
      const fileData = await s3.send(getCommand);

      console.log(`Processing image: ${key}`);
      console.log(`File size: ${fileData.ContentLength} bytes`);
      console.log(`Content type: ${fileData.ContentType}`);

      // Create a simple text file as "thumbnail" for now
      const thumbnailKey = key.replace(/^(.+)\/([^/]+)$/, '$1/thumbnails/$2') + '.txt';
      const thumbnailContent = `Thumbnail info for: ${key}\nSize: ${fileData.ContentLength} bytes\nType: ${fileData.ContentType}`;

      const putCommand = new PutObjectCommand({
        Bucket: bucket,
        Key: thumbnailKey,
        Body: thumbnailContent,
        ContentType: 'text/plain',
      });
      await s3.send(putCommand);

      console.log(`Thumbnail info created: ${thumbnailKey}`);
    } catch (error) {
      console.error(`Error processing ${key}:`, error);
    }
  }

  return { statusCode: 200, body: 'Thumbnails processed' };
};
