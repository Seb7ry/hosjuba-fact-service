import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import * as Grid from "gridfs-stream";
import { Readable } from "stream";

@Injectable()
export class SignatureService {
    private gfs: Grid.Grid;

    constructor(@InjectConnection() private readonly connection: Connection) {
        this.gfs = Grid(this.connection.db, require("mongodb"));
        this.gfs.collection("signatures");
    }

    async storeSignature(signatureBase64: string, filename: string): Promise<string> {
        const buffer = Buffer.from(signatureBase64, "base64");
        const readableStream = new Readable();
        readableStream.push(buffer);
        readableStream.push(null);

        return new Promise((resolve, reject) => {
            const writeStream = this.gfs.createWriteStream({ filename });
            readableStream.pipe(writeStream);

            writeStream.on("close", (file) => {
                resolve(file._id.toString()); // Retorna el ID de la firma guardada
            });

            writeStream.on("error", (err) => {
                reject(err);
            });
        });
    }

    async getSignature(signatureId: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const readStream = this.gfs.createReadStream({ _id: signatureId });
            const chunks: Buffer[] = [];

            readStream.on("data", (chunk) => {
                chunks.push(chunk);
            });

            readStream.on("end", () => {
                resolve(Buffer.concat(chunks));
            });

            readStream.on("error", (err) => {
                reject(err);
            });
        });
    }
}
