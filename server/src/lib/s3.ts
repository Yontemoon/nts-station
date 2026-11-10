import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.S3_REGION || "auto",
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: false,
});

const uploadMp3ToS3 = async (key: string, body: Buffer) => {
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: body,
    });

    await s3Client.send(command);
    return { success: true, message: "File uploaded successfully." };
  } catch (error) {
    console.error("Error uploading to S3:", error);
    return { success: false, error };
  }
};

export { s3Client, uploadMp3ToS3 };
