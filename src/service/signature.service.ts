import { Injectable } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Model, Connection, Types } from "mongoose";
import { Readable } from "stream";
import { GridFSBucket } from "mongodb";
import { Admission, AdmissionDocument } from "src/model/admission.model";

@Injectable()
export class SignatureService {
    private bucket: GridFSBucket;

    constructor(
        @InjectConnection() private readonly connection: Connection,
        @InjectModel(Admission.name) private readonly admissionModel: Model<AdmissionDocument>
    ) {
        this.bucket = new GridFSBucket(this.connection.db, { bucketName: "signatures" });
    }

    async storeSignature(signatureBase64: string, filename: string): Promise<string> {
        const buffer = Buffer.from(signatureBase64, "base64");
        const readableStream = new Readable();
        readableStream.push(buffer);
        readableStream.push(null);

        return new Promise((resolve, reject) => {
            const uploadStream = this.bucket.openUploadStream(filename);
            readableStream.pipe(uploadStream);

            uploadStream.on("finish", () => {
                resolve(uploadStream.id.toString()); // Retorna el ID del archivo guardado
            });

            uploadStream.on("error", (err) => {
                reject(err);
            });
        });
    }

    async getSignature(signatureId: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const objectId = new Types.ObjectId(signatureId);
            const readStream = this.bucket.openDownloadStream(objectId);
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

    async assignSignature(admissionId: string, signedBy: string, signatureBase64: string): Promise<AdmissionDocument> {
        const signatureId = await this.storeSignature(signatureBase64, `signature_${admissionId}.png`);
        
        return this.admissionModel.findByIdAndUpdate(
            admissionId,
            {
                digitalSignature: {
                    signedBy,
                    signatureData: signatureId,
                },
            },
            { new: true }
        );
    }
}
