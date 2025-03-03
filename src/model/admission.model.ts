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
    userAdmission: string;

    @Prop({required: true})
    typeDocumentPatient: string;

    @Prop({required: true})
    documentPatient: string;

    @Prop({required: true})
    namePatient: string;

    @Prop({required: true})
    phonePatient: string;

    @Prop({required: false})
    typeDocumentCompanion: string;

    @Prop({required: false})
    documentCompanion: string;

    @Prop({required: false})
    nameCompanion: string;

    @Prop({required: false})
    phoneCompanion: string;

    @Prop({required: false})
    relationCompanion: string;

    @Prop({required: true, type: String})
    digitalSignature: string;
}

export const AdmissionSchema = SchemaFactory.createForClass(Admission);