import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from 'mongoose';
import { Admission, AdmissionDocument } from "src/model/admission.model";
import { DataSource } from "typeorm";
import { LogService } from "./log.service";
import { SignatureService } from "./signature.service";
import { ConnectionPool, Request } from 'mssql';
import * as dotenv from 'dotenv';
import { SqlServerConnectionService } from "./sqlServerConnection.service";
dotenv.config(); 

@Injectable()
export class AdmissionService {

    constructor(
        @InjectModel(Admission.name) private admissionModel: Model<AdmissionDocument>,
        private readonly signatureService: SignatureService,
        private readonly datasource: DataSource,
        private readonly logService: LogService,
        private readonly sqlService: SqlServerConnectionService
    ) { }

    async getAllAdmissions(): Promise<Admission[]> {
        const query = `
            SELECT 
                I.IngCsc AS consecutiveAdmission,
                I.IngFecAdm AS dateAdmission,
                I.MPCodP AS typeAdmission,
                LTRIM(RTRIM(dbo.desencriptar(I.IngUsrReg))) AS userAdmission,
                LTRIM(RTRIM(I.MPCedu)) AS documentPatient,
                CONCAT(
                    LTRIM(RTRIM(CB.MPNom1)), ' ', 
                    LTRIM(RTRIM(CB.MPNom2)), ' ', 
                    LTRIM(RTRIM(CB.MPApe1)), ' ', 
                    LTRIM(RTRIM(CB.MPApe2))
                ) AS fullNamePatient,
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
                AND I.MPTDoc = TF.TFTDoc`;

        try {
            const admissions = await this.datasource.query(query);
            return admissions;
        } catch (error) {
            await this.logService.logAndThrow('warn','No se pudo obtener la lista de admisiones.', 'AdmissionService');
            throw new InternalServerErrorException("No se pudo obtener la lista de admisiones.", error);
        }
    }

    async getAdmissionByKeys(documentPatient: string, consecutiveAdmission: string): Promise<Admission> {
        const query = `
            SELECT 
                I.IngCsc AS consecutiveAdmission,
                I.IngFecAdm AS dateAdmission,
                I.MPCodP AS typeAdmission,
                LTRIM(RTRIM(dbo.desencriptar(I.IngUsrReg))) AS userAdmission,
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
            LEFT JOIN CAPBAS CB
                ON I.MPCedu = CB.MPCedu
                AND I.MPTDoc = CB.MPTDoc
            LEFT JOIN TMPFAC TF
                ON I.IngCsc = TF.TmCtvIng
                AND I.MPCedu = TF.TFCedu
                AND I.MPTDoc = TF.TFTDoc
            WHERE I.MPCedu = @documentPatient
            AND I.IngCsc = @consecutiveAdmission`;

            try {

                const connectionPool = this.sqlService.getConnectionPool();
                const request = new Request(connectionPool);

                request.input('documentPatient', documentPatient);
                request.input('consecutiveAdmission', consecutiveAdmission);

                const result = await request.query(query);

                if (result.recordset.length === 0) {
                    return null;
                }

                return result.recordset[0];  
            } catch (error) {
                console.error('Error executing the query:', error);
                throw new InternalServerErrorException("No se pudo obtener la admisión.");
            }
    }

    async saveAdmission(documentPatient: string, consecutiveAdmission: string, signature: string): Promise<Admission> {
        const admissionData = await this.getAdmissionByKeys(documentPatient, consecutiveAdmission);
    
        if (!admissionData) {
            throw new InternalServerErrorException('Admisión no encontrada');
        }

        const signatureN = await this.signatureService.generateSignature(signature);
    
        admissionData.typeDocumentCompanion = admissionData.typeDocumentCompanion || '';
        admissionData.documentCompanion = admissionData.documentCompanion || '';
        admissionData.nameCompanion = admissionData.nameCompanion || '';
        admissionData.phoneCompanion = admissionData.phoneCompanion || '';
        admissionData.relationCompanion = admissionData.relationCompanion || '';
    
        const admission = new this.admissionModel({
            consecutiveAdmission: admissionData.consecutiveAdmission,
            dateAdmission: admissionData.dateAdmission,
            typeAdmission: admissionData.typeAdmission,
            userAdmission: admissionData.userAdmission,

            typeDocumentPatient: admissionData.typeDocumentPatient,
            namePatient: admissionData.namePatient,
            documentPatient: admissionData.documentPatient,
            phonePatient: admissionData.phonePatient,
            
            typeDocumentCompanion: admissionData.typeDocumentCompanion,
            documentCompanion: admissionData.documentCompanion,
            nameCompanion: admissionData.nameCompanion,
            phoneCompanion: admissionData.phoneCompanion,
            relationCompanion: admissionData.relationCompanion,
            
            digitalSignature: signatureN,
        });
    
        try {
            await admission.save();
            return admission;
        } catch (error) {
            throw new InternalServerErrorException('Error al guardar la admisión con la firma digital', error);
        }
    }    
}