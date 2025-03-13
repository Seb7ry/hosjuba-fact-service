import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConnectionPool, Request } from 'mssql';
import { InjectModel } from "@nestjs/mongoose";
import { DataSource } from "typeorm";
import { Model } from 'mongoose';

import { Admission, AdmissionDocument } from "src/model/admission.model";

import { SqlServerConnectionService } from "./sqlServerConnection.service";
import { SignatureService } from "./signature.service";
import { LogService } from "./log.service";

import * as dotenv from 'dotenv';
dotenv.config(); 

/**
 * Servicio para gestionar las admisiones en el sistema.
 * Este servicio interactúa con varias bases de datos (MongoDB y SQL Server), 
 * y permite realizar operaciones de obtención, filtrado, búsqueda y creación de admisiones.
 */
@Injectable()
export class AdmissionService {

    /**
     * Constructor de la clase AdmissionService.
     * @param admissionModel - Modelo de Mongoose para las admisiones.
     * @param signatureService - Servicio encargado de generar las firmas digitales.
     * @param datasource - Fuente de datos (TypeORM) para interactuar con la base de datos SQL.
     * @param logService - Servicio para registrar los logs.
     * @param sqlService - Servicio para gestionar la conexión con SQL Server.
     */
    constructor(
        @InjectModel(Admission.name) private admissionModel: Model<AdmissionDocument>,
        private readonly signatureService: SignatureService,
        private readonly datasource: DataSource,
        private readonly logService: LogService,
        private readonly sqlService: SqlServerConnectionService
    ) { }

    /**
     * Obtiene todas las admisiones de la base de datos SQL.
     * 
     * @returns Una lista de objetos de tipo `Admission`.
     */
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
                LTRIM(RTRIM(TF.TFDocAco)) AS documentCompanion,
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
                WHERE I.MPCodP <> 9
            ORDER BY I.IngFecAdm DESC`;

        try {
            const admissions = await this.datasource.query(query);
            return admissions;
        } catch (error) {
            await this.logService.logAndThrow('warn', '⚠️ No se pudo obtener la lista de admisiones.', 'AdmissionService');
            throw new InternalServerErrorException("No se pudo obtener la lista de admisiones.", error);
        }
    }

    /**
     * Filtra las admisiones según los parámetros proporcionados.
     * 
     * @param documentPatient - Documento del paciente.
     * @param consecutiveAdmission - Consecutivo de la admisión.
     * @param startDateAdmission - Fecha de inicio de la admisión.
     * @param endDateAdmission - Fecha final de la admisión.
     * @param userAdmission - Usuario que registró la admisión.
     * @param typeAdmission - Tipo de admisión.
     * @returns Una lista de objetos de tipo `Admission` filtrados.
     */
    async getAdmissionFiltrer(documentPatient: string, consecutiveAdmission: string, 
        startDateAdmission: string, endDateAdmission: string,
        userAdmission: string, typeAdmission: string): Promise<Admission[]> {

            if (startDateAdmission && endDateAdmission) {
                const start = new Date(startDateAdmission);
                const end = new Date(endDateAdmission);
    
                if (start >= end) {
        
                await this.logService.logAndThrow('warn', '⚠️ La fecha de inicio debe ser menor a la fecha final.', 'AdmissionService');
                throw new InternalServerErrorException("La fecha de inicio debe ser menor a la fecha final.");
            }
        }
        
        let query = `
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
                ) AS fullNamePatient,
                LTRIM(RTRIM(CB.MPTELE)) AS phonePatient,
                LTRIM(RTRIM(TF.TFTiDocAc)) AS typeDocumentCompanion,
                LTRIM(RTRIM(TF.TFDocAco)) AS documentCompanion,
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
                AND I.MPCodP <> 9`; 

        if (consecutiveAdmission) {
            query += ` AND I.IngCsc = @consecutiveAdmission`;
        }

        if (startDateAdmission && endDateAdmission) {
            const start = new Date(startDateAdmission);
            start.setUTCHours(0, 0, 0, 0);

            const end = new Date(endDateAdmission);
            end.setUTCHours(23, 59, 59, 999);

            query += ` AND I.IngFecAdm BETWEEN @start AND @end`;
        }

        if (startDateAdmission && !endDateAdmission) {
            const start = new Date(startDateAdmission);
            start.setUTCHours(0, 0, 0, 0); 

            const end = new Date(startDateAdmission);
            end.setUTCHours(23, 59, 59, 999);

            query += ` AND I.IngFecAdm BETWEEN @start AND @end`;
        }

        if (userAdmission) {
            query += ` AND dbo.desencriptar(I.IngUsrReg) = @userAdmission`;
        }

        if (typeAdmission) {
            query += ` AND I.MPCodP = @typeAdmission`;
        }

        query += ` ORDER BY I.IngFecAdm DESC`;

        try {
            const connectionPool = this.sqlService.getConnectionPool();
            connectionPool.config.requestTimeout = 60000;

            const request = new Request(connectionPool);

            if (documentPatient) {
                request.input('documentPatient', documentPatient);
            }

            if (consecutiveAdmission) {
                request.input('consecutiveAdmission', consecutiveAdmission);
            }

            if (startDateAdmission || endDateAdmission) {
                const start = new Date(startDateAdmission);
                start.setUTCHours(0, 0, 0, 0);

                const end = endDateAdmission ? new Date(endDateAdmission) : new Date(start);
                end.setUTCHours(23, 59, 59, 999);

                request.input('start', start);
                request.input('end', end);
            }

            if (userAdmission) {
                request.input('userAdmission', userAdmission);
            }

            if (typeAdmission) {
                request.input('typeAdmission', typeAdmission);
            }

            const result = await request.query(query);

            if (result.recordset.length === 0) {
                return [];
            }

            return result.recordset;

        } catch (error) {
            await this.logService.logAndThrow('error', '❌ Error al ejecutar la consulta de admisiones.', 'AdmissionService');
            throw new InternalServerErrorException("No se pudo obtener la admisión.");
        }
    }

    /**
     * Obtiene una admisión específica utilizando el documento del paciente y el consecutivo de admisión.
     * 
     * @param documentPatient - Documento del paciente.
     * @param consecutiveAdmission - Consecutivo de la admisión.
     * @returns La admisión correspondiente a las claves proporcionadas.
     */
    async getAdmissionByKeys(documentPatient: string, consecutiveAdmission: string): Promise<Admission>{
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
            ) AS fullNamePatient,
            LTRIM(RTRIM(CB.MPTELE)) AS phonePatient,
            LTRIM(RTRIM(TF.TFTiDocAc)) AS typeDocumentCompanion,
            LTRIM(RTRIM(TF.TFDocAco)) AS documentCompanion,
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
            const admission = await this.datasource.query(query);
            return admission;
        } catch (error) {
            await this.logService.logAndThrow('warn', '⚠️ No se pudo obtener admisión específica buscada.', 'AdmissionService');
            throw new InternalServerErrorException("No se pudo obtener la admision.", error);
        }
    }

    /**
     * Guarda una nueva admisión en la base de datos con la firma digital proporcionada.
     * 
     * @param documentPatient - Documento del paciente.
     * @param consecutiveAdmission - Consecutivo de la admisión.
     * @param signature - La firma digital.
     * @returns La admisión guardada en la base de datos.
     */
    async saveAdmission(documentPatient: string, consecutiveAdmission: string, signature: string): Promise<Admission> {
        const admissionData = await this.getAdmissionByKeys(documentPatient, consecutiveAdmission);
    
        if (!admissionData) {
            await this.logService.logAndThrow('warn', '⚠️ No se encontró la admisión para el paciente.', 'AdmissionService');
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
            await this.logService.log('info', `✔️ Guardando admisión con consecutivo ${admission.consecutiveAdmission}.`, 'AdmissionService');
            await admission.save();
            return admission;
        } catch (error) {
            await this.logService.logAndThrow('error', '❌ Error al guardar la admisión con la firma digital.', 'AdmissionService');
            throw new InternalServerErrorException('Error al guardar la admisión con la firma digital', error);
        }
    }

    /**
     * 🔹 Obtiene las admisiones firmadas en MongoDB según la lista proporcionada.
     * 
     * @param admissions - Lista de admisiones obtenida desde SQL Server.
     * @returns Array con los `consecutiveAdmission` de las admisiones que ya tienen firma.
     */
    async getSignedAdmissions(admissions: { documentPatient: string; consecutiveAdmission: number }[]): Promise<any[]> {
        try {
            const admissionKeys = admissions.map(adm => ({
                documentPatient: adm.documentPatient,
                consecutiveAdmission: adm.consecutiveAdmission
            }));

            const signedAdmissions = await this.admissionModel.find({
                $and: [
                    { documentPatient: { $in: admissionKeys.map(adm => adm.documentPatient) } },
                    { consecutiveAdmission: { $in: admissionKeys.map(adm => adm.consecutiveAdmission) } },
                    { digitalSignature: { $ne: null } }
                ]
            }, { consecutiveAdmission: 1 });

            return signedAdmissions;
        } catch (error) {
            await this.logService.logAndThrow('error', '❌ Error al verificar admisiones firmadas.', 'AdmissionService');
            throw new InternalServerErrorException("No se pudo verificar qué admisiones tienen firma.", error);
        }
    }
}