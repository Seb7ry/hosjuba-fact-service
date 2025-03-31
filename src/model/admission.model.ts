import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

/**
 * Tipo de documento representando una Admisión en la base de datos de MongoDB.
 */
export type AdmissionDocument = Admission & Document;

/**
 * Interfaz para la estructura de un procedimiento médico asociado a la admisión.
 */
interface Procedure {
    code: string; // Código del procedimiento
    name: string; // Nombre del procedimiento
}

/**
 * Interfaz para la firma digital de la admisión.
 */
interface DigitalSignature {
    signedBy: string; // Nombre de quien firma
    signatureData: string; // Imagen de la firma (base64 o referencia a GridFS)
}

/**
 * Modelo de la Entidad Admisión en MongoDB.
 */
@Schema({ timestamps: true }) // Agrega createdAt y updatedAt automáticamente
export class Admission {
    toObject(): any {
        throw new Error("Method not implemented.");
    }
    
    @Prop({ required: true })
    consecutiveAdmission: string;

    @Prop({ required: true })
    dateAdmission: Date;

    @Prop({ required: true })
    typeAdmission: string;

    @Prop({ required: true })
    userAdmission: string;

    @Prop({ required: true })
    typeDocumentPatient: string;

    @Prop({ required: true })
    documentPatient: string;

    @Prop({ required: true })
    fullNamePatient: string;

    @Prop({ required: true })
    phonePatient: string;

    @Prop({ required: false })
    typeDocumentCompanion?: string;

    @Prop({ required: false })
    documentCompanion?: string;

    @Prop({ required: false })
    nameCompanion?: string;

    @Prop({ required: false })
    phoneCompanion?: string;

    @Prop({ required: false })
    relationCompanion?: string;

    /**
     * Firma digital asociada a la admisión.
     */
    @Prop({ required: true, type: { signedBy: String, signatureData: String } })
    digitalSignature: DigitalSignature;

    /**
     * ID del documento PDF almacenado en GridFS.
     * Es opcional, ya que se genera posteriormente.
     */
    @Prop({ required: false, type: Types.ObjectId })
    documentFileId?: Types.ObjectId;
}

export const AdmissionSchema = SchemaFactory.createForClass(Admission);

// ✅ Agregar índices aquí
AdmissionSchema.index({ documentPatient: 1, consecutiveAdmission: 1 }, { unique: true });
AdmissionSchema.index({ dateAdmission: 1 });
AdmissionSchema.index({ typeAdmission: 1 });
