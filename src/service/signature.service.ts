import { Admission, AdmissionDocument } from "src/model/admission.model";

import { Injectable, NotFoundException, InternalServerErrorException } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Model, Connection, Types } from "mongoose";
import { GridFSBucket } from "mongodb";
import { Readable } from "stream";
import { LogService } from "./log.service";
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * Servicio para gestión de firmas digitales en MongoDB GridFS
 * 
 * Proporciona funcionalidades para:
 * - Almacenamiento de firmas digitales en formato base64
 * - Recuperación de firmas almacenadas
 * - Asignación de firmas a admisiones médicas
 */
@Injectable()
export class SignatureService {
    private bucket: GridFSBucket;

    constructor(
        @InjectConnection() private readonly connection: Connection,
        @InjectModel(Admission.name) private readonly admissionModel: Model<AdmissionDocument>,
        private readonly logService: LogService
    ) {
        this.bucket = new GridFSBucket(this.connection.db, { bucketName: "signatures" });
    }

    /**
     * Almacena una firma digital en GridFS
     * @param signatureBase64 Firma en formato base64
     * @param filename Nombre del archivo para identificar la firma
     * @returns ID del archivo almacenado en GridFS
     * @throws InternalServerErrorException Si falla el almacenamiento
     */
    async storeSignature(signatureBase64: string, filename: string): Promise<string> {
        const buffer = Buffer.from(signatureBase64, "base64");
        const readableStream = new Readable();
        readableStream.push(buffer);
        readableStream.push(null);

        return new Promise((resolve, reject) => {
            const uploadStream = this.bucket.openUploadStream(filename);
            readableStream.pipe(uploadStream);

            uploadStream.on("finish", () => resolve(uploadStream.id.toString()));
            uploadStream.on("error", (err) => {
                this.logService.logAndThrow('error', 'Error al almacenar la firma digital:', err.message);
                reject(new InternalServerErrorException("Error al almacenar la firma digital."));
            });
        });
    }

    /**
     * Recupera una firma digital almacenada
     * @param signatureId ID de la firma en GridFS
     * @returns Buffer con los datos de la imagen de la firma
     * @throws NotFoundException Si la firma no existe o el ID es inválido
     */
    async getSignature(signatureId: string): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            try {
                const objectId = new Types.ObjectId(signatureId);
                const readStream = this.bucket.openDownloadStream(objectId);
                const chunks: Buffer[] = [];

                readStream.on("data", (chunk) => chunks.push(chunk));
                readStream.on("end", () => resolve(Buffer.concat(chunks)));
                readStream.on("error", (err) => {
                    this.logService.logAndThrow('warn', 'Firma digital no encontrada: ', err.message);
                    reject(new NotFoundException("Firma digital no encontrada."));
                });
            } catch (error) {
                this.logService.logAndThrow('error', 'ID de firma inválido:', error.message);
                reject(new NotFoundException("ID de firma inválido."));
            }
        });
    }

    /**
     * Asigna una firma digital a una admisión médica
     * @param admissionId ID de la admisión médica
     * @param signedBy Tipo de firmante (paciente/acompañante)
     * @param signatureBase64 Firma en formato base64
     * @returns Documento de admisión actualizado
     * @throws NotFoundException Si no se encuentra la admisión
     * @throws InternalServerErrorException Si falla el almacenamiento
     */
    async assignSignature(admissionId: string, signedBy: string, signatureBase64: string): Promise<AdmissionDocument> {
        const admission = await this.admissionModel.findById(admissionId);
        if (!admission) {
            throw new NotFoundException("No se encontró la admisión para asignar la firma.");
        }

        const signatureId = await this.storeSignature(signatureBase64, `signature_${admissionId}.png`);

        admission.digitalSignature = { signedBy, signatureData: signatureId };

        return admission.save();
    }
}