import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConnectionPool, Request } from 'mssql';
import { InjectModel } from "@nestjs/mongoose";
import { DataSource } from "typeorm";
import { LeanDocument, Model } from 'mongoose';

import { Admission, AdmissionDocument } from "src/model/admission.model";

import { SqlServerConnectionService } from "./sqlServerConnection.service";
import { SignatureService } from "./signature.service";
import { LogService } from "./log.service";

import * as dotenv from 'dotenv';
import { start } from "repl";
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

    async getAllAdmissions(req: Request): Promise<Admission[]> {
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
                LTRIM(RTRIM(CB.MPTELE)) AS phonePatient
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
            await this.logService.log('error', `Error al obtener la lista de admisiones: ${error}`, 'AdmissionService', undefined, req.user.username);
            throw new InternalServerErrorException("No se pudo obtener la lista de admisiones.", error);
        }
    }

    async getAdmissionFiltrer(req: Request, documentPatient: string, consecutiveAdmission: string, 
        startDateAdmission: string, endDateAdmission: string,
        userAdmission: string, typeAdmission: string): Promise<Admission[]> {

        let mesage = 'Filtro(s):';

            if (startDateAdmission && endDateAdmission) {
                const start = new Date(startDateAdmission);
                const end = new Date(endDateAdmission);
    
                if (start >= end) {
        
                await this.logService.log('warn', 'La fecha de inicio debe ser menor a la fecha final en los filtros de búsqueda.', 'AdmissionService', undefined, req.user.username);
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
                LTRIM(RTRIM(I.IngTiDoAc)) AS typeDocumentCompanion,
                LTRIM(RTRIM(I.IngDoAco)) AS documentCompanion,
                LTRIM(RTRIM(I.IngNoAc)) AS nameCompanion,
                LTRIM(RTRIM(I.IngTeAc)) AS phoneCompanion,
                LTRIM(RTRIM(I.IngParAc)) AS relationCompanion
            FROM INGRESOS I
                LEFT JOIN CAPBAS CB
                    ON I.MPCedu = CB.MPCedu
                    AND I.MPTDoc = CB.MPTDoc
            WHERE I.MPCodP <> 9 
                AND I.MPCedu = @documentPatient`; 

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
                mesage += ` documento: ${documentPatient}`;
                request.input('documentPatient', documentPatient);
            }

            if (consecutiveAdmission) {
                mesage += ` consecutivo: ${consecutiveAdmission}`;
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

            if(startDateAdmission) mesage += ` fechaInicio: ${startDateAdmission}`;
            if(endDateAdmission) mesage += ` fechaFinal: ${endDateAdmission}`;

            if (userAdmission) {
                mesage += ` usuarioAdmision: ${userAdmission}`;
                request.input('userAdmission', userAdmission);
            }

            if (typeAdmission) {
                mesage += ` tipoAdmision: ${typeAdmission}`;
                request.input('typeAdmission', typeAdmission);
            }

            await this.logService.log('info', `Buscó el listado de admisiones disponiblesa.a ${mesage}.`, 'Admisiones', undefined, req.user.username);
            const result = await request.query(query);

            if (result.recordset.length === 0) {
                return [];
            }

            return result.recordset;

        } catch (error) {
            await this.logService.logAndThrow('error', `Error al ejecutar la consulta filtrada de admisiones: ${error.message}`, 'AdmissionService');
            throw new InternalServerErrorException("No se pudo obtener la admisión.", error);
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
                ) AS fullNamePatient,
                LTRIM(RTRIM(CB.MPTELE)) AS phonePatient,
                LTRIM(RTRIM(I.IngTiDoAc)) AS typeDocumentCompanion,
                LTRIM(RTRIM(I.IngDoAco)) AS documentCompanion,
                LTRIM(RTRIM(I.IngNoAc)) AS nameCompanion,
                LTRIM(RTRIM(I.IngTeAc)) AS phoneCompanion,
                LTRIM(RTRIM(I.IngParAc)) AS relationCompanion
            FROM INGRESOS I
            LEFT JOIN CAPBAS CB
                ON I.MPCedu = CB.MPCedu
                AND I.MPTDoc = CB.MPTDoc
            WHERE I.MPCedu = @documentPatient
            AND I.IngCsc = @consecutiveAdmission`;
    
        try {
            const connectionPool = this.sqlService.getConnectionPool();
            connectionPool.config.requestTimeout = 60000;
    
            const request = new Request(connectionPool);
            request.input('documentPatient', documentPatient);
            request.input('consecutiveAdmission', consecutiveAdmission);
    
            const result = await request.query(query);
            return result.recordset.length > 0 ? result.recordset[0] : null;
        } catch (error) {
            await this.logService.logAndThrow('error', `Error al obtener la admisión específica buscada: ${error.message}`, 'AdmissionService');
            throw new InternalServerErrorException("No se pudo obtener la admisión.", error);
        }
    }    

    async saveAdmission(
        req: Request,
        documentPatient: string,
        consecutiveAdmission: string,
        signature: string,
        signedBy: string // Recibido como parámetro
    ): Promise<Admission> {
        const admissionData = await this.getAdmissionByKeys(documentPatient, consecutiveAdmission);
    
        if (!admissionData) {
            await this.logService.logAndThrow('warn', '⚠️ No se encontró la admisión para el paciente.', 'AdmissionService');
            throw new InternalServerErrorException('Admisión no encontrada');
        }
    
        const signatureData = await this.signatureService.storeSignature(signature, `firma_${documentPatient}_${consecutiveAdmission}.png`);
    
        const admission = new this.admissionModel({
            ...admissionData, // Ya es un objeto plano, no necesita .toObject()
            digitalSignature: {
                signedBy: signedBy,
                signatureData: signatureData 
            }
        });
    
        try {
            await this.logService.log(
                'info', 
                `Guardando admisión con consecutivo ${admission.consecutiveAdmission} y documento ${admission.documentPatient}.`, 
                'Admisiones', 
                undefined, 
                req.user.username
            );
            await admission.save();
            return admission;
        } catch (error) {
            await this.logService.logAndThrow('error', `Error al guardar la admisión con la firma digital: ${error.message}`, 'AdmissionService');
            throw new InternalServerErrorException('Error al guardar la admisión con la firma digital', error);
        }
    }
    
    async getSignedAdmissions(admissions: { documentPatient: string; consecutiveAdmission: number }[]): Promise<any[]> {
        try {
            if (!admissions || admissions.length === 0) {
                return [];
            }
    
            const signedAdmissions = await this.admissionModel.find(
                {
                    $and: [
                        { documentPatient: { $in: admissions.map(adm => adm.documentPatient) } },
                        { consecutiveAdmission: { $in: admissions.map(adm => adm.consecutiveAdmission) } },
                        { digitalSignature: { $ne: null } }
                    ]
                },
                { documentPatient: 1, consecutiveAdmission: 1, _id: 0 }
            ).lean();
    
            return signedAdmissions;
        } catch (error) {
            await this.logService.logAndThrow('error', `Error al verificar admisiones firmadas. Error: ${error.message}`, 'AdmissionService');
            throw new InternalServerErrorException("No se pudo verificar qué admisiones tienen firma.", error);
        }
    }    

    async getSignedAdmissionsAll(): Promise<any[]>{
        try {
            const allAdmissions = await this.admissionModel.find().lean();
            
            return allAdmissions;
        } catch (error) {
            await this.logService.logAndThrow('error', `Error al obtener todas las admisiones: ${error.message}`, 'AdmissionService');
            throw new InternalServerErrorException("No se pudo obtener todas las admisiones.", error);
        }
    }

    async getSignedAdmissionsFiltrer(
        req: Request,
        documentPatient?: string,
        consecutiveAdmission?: string,
        startDateAdmission?: string,
        endDateAdmission?: string,
        userAdmission?: string,
        typeAdmission?: string
    ): Promise<LeanDocument<Admission>[]> {
        let mesage = 'Filtro(s): ';
        
         try {
            let query: any = { };
    
            if (documentPatient){
                mesage += ` documento: ${documentPatient}`;
                query['documentPatient'] = documentPatient;
            }

            if (consecutiveAdmission) {
                mesage += ` consecutivo: ${consecutiveAdmission}`;
                query['consecutiveAdmission'] = consecutiveAdmission;
            }
            
            if (startDateAdmission) {
                mesage += ` fechaInicio: ${startDateAdmission}`;
                query['dateAdmission'] = { $gte: new Date(startDateAdmission) };
            }
            
            if (endDateAdmission) {
                mesage += ` fechaFinal: ${endDateAdmission}`;
                query['dateAdmission'] = { $lte: new Date(endDateAdmission) };
            }
            
            if (userAdmission) {
                mesage += ` usuarioAdmision: ${userAdmission}`;
                query['userAdmission'] = userAdmission;
            }
            
            if (typeAdmission) {
                mesage += ` tipoAdmision: ${typeAdmission}`;
                query['typeAdmission'] = typeAdmission;
            }
    
            await this.logService.log('info', `Buscó el listado de admisiones disponiblesa. ${mesage}.`, 'Comprobantes', undefined, req.user.username);
            const filteredAdmissions = await this.admissionModel.find(query).lean();
            return filteredAdmissions;
        } catch (error) {
            await this.logService.logAndThrow('error', `Error al obtener las admisiones filtradas: ${error.message}`, 'AdmissionService');
            throw new InternalServerErrorException('No se pudieron obtener las admisiones filtradas.', error);
        }
    }
}