import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";

export type AdmissionDocument = Admission & Document;

@Schema()
export class Admission {
    
    @Prop({required: true})
    consecutiveAdmission: string;

    @Prop({required: true})
    dateAdmission: Date;

    @Prop({required: true})
    typeAdmission: string;

    @Prop({required: true})
    typeDocumentPatient: string;

    @Prop({required: true})
    documentPatient: string;

    @Prop({required: true})
    namePatient: string;

    @Prop({required: true})
    phonePatient: string;

    @Prop({required: true})
    typeDocumentCompanion: string;

    @Prop({required: true})
    documentCompanion: string;

    @Prop({required: true})
    nameCompanion: string;

    @Prop({required: true})
    phoneCompanion: string;

    @Prop({required: true})
    relationCompanion: string;
}

export const AdmissionSchema = SchemaFactory.createForClass(Admission);