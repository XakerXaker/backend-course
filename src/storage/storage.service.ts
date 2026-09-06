import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "crypto";

export interface UploadFileParams {
  buffer: Buffer;
  originalName: string;
  contentType: string;
  /** Логическая "папка" внутри бакета, например `trainers`. */
  folder: string;
}

// Инфраструктурный слой доступа к объектному хранилищу — та же роль в
// приложении, что у PrismaService для базы данных (см. src/prisma):
// инкапсулирует конкретного провайдера (Yandex Object Storage,
// S3-совместимый API) за одним сервисом, который подключают там, где
// нужна загрузка файлов, а не размазывают AWS SDK по контроллерам.
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly publicUrlBase: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET ?? "";

    const endpoint = process.env.S3_ENDPOINT ?? "https://storage.yandexcloud.net";
    const region = process.env.S3_REGION ?? "ru-central1";

    this.client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
      },
    });

    // Публичный URL для отдачи файлов читателям сайта. Yandex Object
    // Storage раздаёт объекты бакета с публичным доступом на чтение по
    // адресу вида `https://<bucket>.storage.yandexcloud.net/<key>` — если
    // переменная не задана явно, собираем его из имени бакета.
    this.publicUrlBase =
      process.env.S3_PUBLIC_URL_BASE ??
      `https://${this.bucket}.storage.yandexcloud.net`;
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
