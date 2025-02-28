import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from 'mongoose';
import { Admission, AdmissionDocument } from "src/model/admission.model";
import { DataSource } from "typeorm";

@Injectable()
export class AdmissionService{
    constructor(
        @InjectModel(Admission.name) private admissionModel: Model<AdmissionDocument>,
        private readonly datasource: DataSource,
    ) { }

    async getAllAdmissions(): Promise<Admission[]> {
        
        const query = `
            SELECT 
                I.IngCsc AS consecutiveAdmission,
                I.IngFecAdm AS dateAdmission,
                I.MPCodP AS typeAdmission,
                LTRIM(RTRIM(I.MPCedu)) AS documentPatient,
                CONCAT(
                    LTRIM(RTRIM(CB.MPNom1)), ' ', 
                    LTRIM(RTRIM(CB.MPNom2)), ' ', 
                    LTRIM(RTRIM(CB.MPApe1)), ' ', 
                    LTRIM(RTRIM(CB.MPApe2))
                ) AS fullNamePatient,
                TRIM(RTRIM(CB.MPTELE)) AS phonePatient,
                LTRIM(RTRIM(TF.TFTiDocAc)) AS typeDocumentCompanion,
                LTRIM(RTRIM(TF.TFNoAc)) AS nameCompanion,
                LTRIM(RTRIM(TF.TFTeAc)) AS phoneCompanion,
                LTRIM(RTRIM(TF.TFParAc)) AS relationCompanion
            FROM INGRESOS I
            JOIN CAPBAS CB
                ON I.MPCedu = CB.MPCedu
            AND I.MPTDoc = CB.MPTDoc
            JOIN TMPFAC TF
                ON I.IngCsc = TF.TmCtvIng
                AND I.MPCedu = TF.TFCedu
                AND I.MPTDoc = TF.TFTDoc`;
        
        try{
            const admissions = await this.datasource.query(query);
            return admissions;
        } catch (error){
            throw new InternalServerErrorException("No se pudo obtener la lista de admisiones.");
        }
    }

    async getAdmissionByKeys(documentPatient: string, consecutiveAdmission: string): Promise<Admission> {
        const query = `
            SELECT 
                I.IngCsc AS consecutiveAdmission,
                I.IngFecAdm AS dateAdmission,
                I.MPCodP AS typeAdmission,
                I.MPTDoc AS typeDocumentPatient,
                LTRIM(RTRIM(I.MPCedu)) AS documentPatient,
                CONCAT(
                    LTRIM(RTRIM(CB.MPNom1)), ' ', 
                    LTRIM(RTRIM(CB.MPNom2)), ' ', 
                    LTRIM(RTRIM(CB.MPApe1)), ' ', 
                    LTRIM(RTRIM(CB.MPApe2))
                ) AS namePatient,
                LTRIM(RTRIM(CB.MPTELE)) AS phonePatient,
                LTRIM(RTRIM(TF.TFTiDocAc)) AS typeDocumentCompanion,
                LTRIM(RTRIM(TF.TFNoAc)) AS nameCompanion,
                LTRIM(RTRIM(TF.TFTeAc)) AS phoneCompanion,
                LTRIM(RTRIM(TF.TFParAc)) AS relationCompanion
            FROM INGRESOS I
            JOIN CAPBAS CB
                ON I.MPCedu = CB.MPCedu
                AND I.MPTDoc = CB.MPTDoc
            JOIN TMPFAC TF
                ON I.IngCsc = TF.TmCtvIng
                AND I.MPCedu = TF.TFCedu
                AND I.MPTDoc = TF.TFTDoc
            WHERE I.MPCedu = $1
            AND I.IngCsc = $2`;
        
        try {
            const result = await this.datasource.query(query, [documentPatient, consecutiveAdmission]);
    
            if (result.length === 0) {
                return null;
            }
    
            return result[0];
        } catch (error) {
            throw new InternalServerErrorException("No se pudo obtener la admisión.");
        }
    }
    
}