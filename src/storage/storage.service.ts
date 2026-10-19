import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";

export interface UploadFileParams {
  buffer: Buffer;
  originalName: string;
  contentType: string;
  folder: string;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrlBase: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? "";

    const endpoint = process.env.S3_ENDPOINT;
    const region = process.env.S3_REGION;

    this.client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
      },
    });

    this.publicUrlBase =
      process.env.S3_PUBLIC_URL_BASE ?? "";
  }

  async uploadFile(params: UploadFileParams): Promise<string> {
    const extension = params.originalName.includes(".")
      ? params.originalName.slice(params.originalName.lastIndexOf("."))
      : "";
    const key = `${params.folder}/${randomUUID()}${extension}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: params.buffer,
        ContentType: params.contentType,
        ACL: "public-read",
      }),
    );

    this.logger.log(`Файл загружен в объектное хранилище: ${key}`);

    return `${this.publicUrlBase}/${key}`;
  }
}
