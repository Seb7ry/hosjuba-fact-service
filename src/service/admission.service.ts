import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { LeanDocument, Model } from 'mongoose';
import { InjectModel } from "@nestjs/mongoose";
import { DataSource } from "typeorm";
import { Request } from 'mssql';

import { Admission, AdmissionDocument } from "src/model/admission.model";

import { SqlServerConnectionService } from "./sqlServerConnection.service";
import { SignatureService } from "./signature.service";
import { LogService } from "./log.service";

import * as dotenv from 'dotenv';

dotenv.config(); 

/**
 * Servicio para gestión de admisiones médicas
 * 
 * Este servicio maneja:
 * - Consulta de admisiones desde SQL Server
 * - Almacenamiento en MongoDB con firmas digitales
 * - Búsqueda avanzada con múltiples filtros
 * - Manejo de firmas digitales asociadas
 */
@Injectable()
export class AdmissionService {

    constructor(
        @InjectModel(Admission.name) private admissionModel: Model<AdmissionDocument>,
        private readonly signatureService: SignatureService,
        private readonly datasource: DataSource,
        private readonly logService: LogService,
        private readonly sqlService: SqlServerConnectionService
    ) { }

    /**
     * Obtiene todas las admisiones desde SQL Server
     * @param req Objeto Request para logging
     * @returns Listado completo de admisiones
     * @throws InternalServerErrorException Si falla la consulta
     */
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
            ORDER BY I.IngFecAdm DESC`;

        try {
            const admissions = await this.datasource.query(query);
            return admissions;
        } catch (error) {
            await this.logService.log('error', `Error al obtener la lista de admisiones: ${error}`, 'AdmissionService', undefined, req.user.username);
            throw new InternalServerErrorException("No se pudo obtener la lista de admisiones.", error);
        }
    }

    /**
     * Busca admisiones con múltiples filtros
     * @param req Objeto Request para logging
     * @param documentPatient Documento del paciente (requerido)
     * @param consecutiveAdmission Consecutivo de admisión
     * @param startDateAdmission Fecha de inicio
     * @param endDateAdmission Fecha de fin
     * @param userAdmission Usuario que registró
     * @param typeAdmission Tipo de admisión
     * @returns Listado de admisiones filtradas
     * @throws InternalServerErrorException Si falla la consulta
     */
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
                JOIN CAPBAS CB
                    ON I.MPCedu = CB.MPCedu
                    AND I.MPTDoc = CB.MPTDoc
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

    /**
     * Obtiene una admisión específica por documento y consecutivo
     * @param documentPatient Documento del paciente
     * @param consecutiveAdmission Consecutivo de admisión
     * @returns Datos de la admisión
     * @throws InternalServerErrorException Si falla la consulta
     */
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

    /**
     * Guarda una admisión con firma digital en MongoDB
     * @param req Objeto Request para logging
     * @param documentPatient Documento del paciente
     * @param consecutiveAdmission Consecutivo de admisión
     * @param signature Firma digital en base64
     * @param signedBy Tipo de firmante (paciente/acompañante)
     * @returns Admisión guardada
     * @throws InternalServerErrorException Si falla el guardado
     */
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

    /**
     * Actualiza una admisión manteniendo la firma digital existente
     * @param req Objeto Request para logging
     * @param documentPatient Documento del paciente
     * @param consecutiveAdmission Consecutivo de admisión
     * @returns Admisión actualizada
     * @throws InternalServerErrorException Si falla la actualización
     */
    async updateAdmission(
        req: Request,
        documentPatient: string,
        consecutiveAdmission: string
    ): Promise<Admission> {
        const admissionData = await this.getAdmissionByKeys(documentPatient, consecutiveAdmission);
        if (!admissionData) {
            await this.logService.logAndThrow('warn', '⚠️ No se encontró la admisión para el paciente.', 'AdmissionService');
            throw new InternalServerErrorException('Admisión no encontrada');
        }
    
        const currentAdmissionMongo = await this.admissionModel.findOne({ documentPatient, consecutiveAdmission });
        
        if (!currentAdmissionMongo) {
            await this.logService.logAndThrow('warn', '⚠️ No se encontró la admisión en MongoDB.', 'AdmissionService');
            throw new InternalServerErrorException('Admisión no encontrada en MongoDB');
        }
    
        const { digitalSignature } = currentAdmissionMongo.toObject();
    
        const updatedAdmission = {
            ...admissionData,
            digitalSignature,
        };
    
        try {
            await this.logService.log(
                'info', 
                `Actualizando admisión con consecutivo ${admissionData.consecutiveAdmission} y documento ${admissionData.documentPatient}.`, 
                'Admisiones', 
                undefined, 
                req.user.username
            );
    
            const updatedAdmissionRecord = await this.admissionModel.findOneAndUpdate(
                { documentPatient, consecutiveAdmission },
                updatedAdmission, 
                { new: true } 
            );
    
            if (!updatedAdmissionRecord) {
                await this.logService.logAndThrow('warn', '⚠️ No se pudo actualizar la admisión.', 'AdmissionService');
                throw new InternalServerErrorException('No se pudo actualizar la admisión');
            }
    
            return updatedAdmissionRecord;
        } catch (error) {
            await this.logService.logAndThrow('error', `Error al actualizar la admisión: ${error.message}`, 'AdmissionService');
            throw new InternalServerErrorException('Error al actualizar la admisión', error);
        }
    }    
    
    /**
     * Obtiene admisiones firmadas específicas
     * @param admissions Array de {documentPatient, consecutiveAdmission}
     * @returns Listado de admisiones firmadas
     * @throws InternalServerErrorException Si falla la consulta
     */
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

    /**
     * Obtiene todas las admisiones firmadas
     * @returns Listado completo de admisiones firmadas
     * @throws InternalServerErrorException Si falla la consulta
     */
    async getSignedAdmissionsAll(): Promise<any[]>{
        try {
            const allAdmissions = await this.admissionModel.find()
            .sort({createdAt: -1})
            .lean();
            
            return allAdmissions;
        } catch (error) {
            await this.logService.logAndThrow('error', `Error al obtener todas las admisiones: ${error.message}`, 'AdmissionService');
            throw new InternalServerErrorException("No se pudo obtener todas las admisiones.", error);
        }
    }

    /**
     * Verifica si una admisión específica tiene firma digital
     * @param documentPatient Documento del paciente
     * @param consecutiveAdmission Consecutivo de admisión
     * @returns Admisión firmada o null
     * @throws InternalServerErrorException Si falla la consulta
     */
    async getSignedAdmissionKeys(documentPatient: string, consecutiveAdmission: number): Promise<any | null> {
        try {
            if (!documentPatient || consecutiveAdmission === undefined) {
                return null;
            }
    
            const signedAdmission = await this.admissionModel.findOne(
                {
                    documentPatient,
                    consecutiveAdmission,
                    digitalSignature: { $ne: null }
                }
            ).lean();
    
            return signedAdmission;
        } catch (error) {
            await this.logService.logAndThrow('error', `Error al verificar admisión firmada. Error: ${error.message}`, 'AdmissionService');
            throw new InternalServerErrorException("No se pudo verificar si la admisión tiene firma.", error);
        }
    }

    /**
     * Filtra admisiones firmadas con múltiples criterios
     * @param req Objeto Request para logging
     * @param documentPatient Documento del paciente
     * @param consecutiveAdmission Consecutivo de admisión
     * @param startDateAdmission Fecha de inicio
     * @param endDateAdmission Fecha de fin
     * @param userAdmission Usuario que registró
     * @param typeAdmission Tipo de admisión
     * @returns Listado de admisiones filtradas
     * @throws InternalServerErrorException Si falla la consulta
     */
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
    
            await this.logService.log('info', `Buscó el listado de admisiones disponibles. ${mesage}.`, 'Comprobantes', undefined, req.user.username);
            const filteredAdmissions = await this.admissionModel.find(query).lean();
            return filteredAdmissions;
        } catch (error) {
            await this.logService.logAndThrow('error', `Error al obtener las admisiones filtradas: ${error.message}`, 'AdmissionService');
            throw new InternalServerErrorException('No se pudieron obtener las admisiones filtradas.', error);
        }
    }
}