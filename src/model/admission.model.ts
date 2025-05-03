import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/**
 * Representa un documento de Admisión en MongoDB.
 * Combina las propiedades de la clase Admission con los métodos de Document de Mongoose.
 */
export type AdmissionDocument = Admission & Document;

/**
 * Define la estructura de un procedimiento médico asociado a la admisión.
 * @property {string} code - Código único del procedimiento (ej: "CPT-12345")
 * @property {string} name - Nombre descriptivo del procedimiento (ej: "Apendicectomía")
 */
interface Procedure {
    code: string;
    name: string;
}

/**
 * Representa una firma digital asociada al proceso de admisión.
 * @property {string} signedBy - Nombre completo del firmante autorizado
 * @property {string} signatureData - Datos de la firma en formato base64 o referencia a GridFS
 */
interface DigitalSignature {
    signedBy: string;
    signatureData: string;
}

/**
 * Esquema principal de Admisión para MongoDB.
 * @Schema - Configuración automática de timestamps (createdAt, updatedAt)
 */
@Schema({ timestamps: true })
export class Admission {
    // Método placeholder para conversión a objeto plano
    toObject(): any {
        throw new Error("Method not implemented.");
    }
    
    /** Consecutivo único de admisión (formato: "ADM-YYYY-XXXX") */
    @Prop({ required: true })
    consecutiveAdmission: string;

    /** Fecha y hora de ingreso del paciente */
    @Prop({ required: true })
    dateAdmission: Date;

    /** Tipo de admisión (Urgencias, Programada, Remitida) */
    @Prop({ required: true })
    typeAdmission: string;

    /** Identificador del usuario que registra la admisión */
    @Prop({ required: true })
    userAdmission: string;

    /** Tipo de documento del paciente (CC, TI, CE, PAS) */
    @Prop({ required: true })
    typeDocumentPatient: string;

    /** Número de documento del paciente */
    @Prop({ required: true })
    documentPatient: string;

    /** Nombre completo del paciente */
    @Prop({ required: true })
    fullNamePatient: string;

    /** Teléfono de contacto del paciente */
    @Prop({ required: true })
    phonePatient: string;

    /** Tipo de documento del acompañante (opcional) */
    @Prop({ required: false })
    typeDocumentCompanion?: string;

    /** Documento del acompañante (opcional) */
    @Prop({ required: false })
    documentCompanion?: string;

    /** Nombre del acompañante (opcional) */
    @Prop({ required: false })
    nameCompanion?: string;

    /** Teléfono del acompañante (opcional) */
    @Prop({ required: false })
    phoneCompanion?: string;

    /** Parentesco o relación con el paciente (opcional) */
    @Prop({ required: false })
    relationCompanion?: string;

    /** 
     * Firma digital del responsable
     * @type {DigitalSignature}
     */
    @Prop({ required: true, type: { signedBy: String, signatureData: String } })
    digitalSignature: DigitalSignature;

    /** 
     * Referencia al PDF de admisión en GridFS
     * @type {Types.ObjectId}
     */
    @Prop({ required: false, type: Types.ObjectId })
    documentFileId?: Types.ObjectId;

    @Prop({ default: () => new Date(Date.now() + 30 * 1000) })
    expireAt?: Date;    
}

/**
 * SchemaFactory para la clase Admission.
 * Exportado para su uso en módulos de NestJS.
 */
export const AdmissionSchema = SchemaFactory.createForClass(Admission);

// Configuración de índices
AdmissionSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
AdmissionSchema.index({ documentPatient: 1, consecutiveAdmission: 1 }, { unique: true });
AdmissionSchema.index({ dateAdmission: 1 }); // Índice por fecha para consultas frecuentes
AdmissionSchema.index({ typeAdmission: 1 }); // Índice por tipo para filtros rápidos