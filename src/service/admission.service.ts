import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { LeanDocument, Model } from 'mongoose';
import { InjectModel } from "@nestjs/mongoose";
import { Request } from 'mssql';

import { Admission, AdmissionDocument } from "src/model/admission.model";

import { SignatureService } from "./signature.service";
import { LogService } from "./log.service";

import * as dotenv from 'dotenv';

dotenv.config(); 

@Injectable()
export class AdmissionService {

    private readonly staticAdmissions: Admission[] = [
        {
            consecutiveAdmission: 'ADM-2025-0001',
            dateAdmission: new Date('2025-01-01T08:00:00Z'),
            typeAdmission: '1',
            userAdmission: 'USER2',
            typeDocumentPatient: 'CC',
            documentPatient: '1234567890',
            fullNamePatient: 'Juan Pérez',
            phonePatient: '3001231231',
            typeDocumentCompanion: 'CC',
            documentCompanion: '9988776655',
            nameCompanion: 'María González',
            phoneCompanion: '3101231231',
            relationCompanion: 'F',
            digitalSignature: undefined,
            toObject: () => null 
        },
        {
            consecutiveAdmission: 'ADM-2025-0002',
            dateAdmission: new Date('2025-02-10T10:30:00Z'),
            typeAdmission: '99',
            userAdmission: 'USER1',
            typeDocumentPatient: 'TI',
            documentPatient: '1122334455',
            fullNamePatient: 'Carlos Ruiz',
            phonePatient: '3111231231',
            typeDocumentCompanion: 'CC',
            documentCompanion: '4455667788',
            nameCompanion: 'Laura Ríos',
            phoneCompanion: '3011231231',
            relationCompanion: 'A',
            digitalSignature: undefined,
            toObject: () => null 
        },
        {
            consecutiveAdmission: 'ADM-2025-0003',
            dateAdmission: new Date('2025-03-15T16:45:00Z'),
            typeAdmission: '3',
            userAdmission: 'USER2',
            typeDocumentPatient: 'CE',
            documentPatient: '6677889900',
            fullNamePatient: 'Ana Torres',
            phonePatient: '3121231231',
            typeDocumentCompanion: 'CE',
            documentCompanion: '2233445566',
            nameCompanion: 'Pedro Torres',
            phoneCompanion: '3101231231',
            relationCompanion: 'O',
            digitalSignature: undefined,
            toObject: () => null 
        }
    ];

    constructor(
        @InjectModel(Admission.name) private admissionModel: Model<AdmissionDocument>,
        private readonly signatureService: SignatureService,
        private readonly logService: LogService,
    ) { }

    async getAllAdmissions(req: Request): Promise<Admission[]> {
        try {
            return this.staticAdmissions;
        } catch (error) {
            await this.logService.log('error', `Error al obtener las admisiones locales: ${error}`, 'AdmissionService', undefined, req.user?.username);
            throw new InternalServerErrorException("Error al obtener las admisiones.");
        }
    }

    async getAdmissionFiltrer(
        req: Request,
        documentPatient: string,
        consecutiveAdmission: string,
        startDateAdmission: string,
        endDateAdmission: string,
        userAdmission: string,
        typeAdmission: string
    ): Promise<Admission[]> {
        let message = 'Filtro(s):';
    
        try {
            if (startDateAdmission && endDateAdmission) {
                const start = new Date(startDateAdmission);
                const end = new Date(endDateAdmission);
    
                if (start > end) {
                    await this.logService.log('warn', 'La fecha de inicio debe ser menor a la fecha final.', 'AdmissionService', undefined, req.user?.username);
                    throw new InternalServerErrorException("La fecha de inicio debe ser menor a la fecha final.");
                }
            }
    
            let filtered = [...this.staticAdmissions];
    
            if (documentPatient) {
                message += ` documento: ${documentPatient}`;
                filtered = filtered.filter(a => a.documentPatient === documentPatient);
            }
    
            if (consecutiveAdmission) {
                message += ` consecutivo: ${consecutiveAdmission}`;
                filtered = filtered.filter(a => a.consecutiveAdmission === consecutiveAdmission);
            }
    
            if (startDateAdmission && endDateAdmission) {
                const start = new Date(startDateAdmission);
                start.setHours(0, 0, 0, 0);
                const end = new Date(endDateAdmission);
                end.setHours(23, 59, 59, 999);
                message += ` fechaInicio: ${startDateAdmission}, fechaFinal: ${endDateAdmission}`;
                filtered = filtered.filter(a => a.dateAdmission >= start && a.dateAdmission <= end);
            }
    
            if (startDateAdmission && !endDateAdmission) {
                const start = new Date(startDateAdmission);
                start.setHours(0, 0, 0, 0);
                const end = new Date(startDateAdmission);
                end.setHours(23, 59, 59, 999);
                message += ` fechaExacta: ${startDateAdmission}`;
                filtered = filtered.filter(a => a.dateAdmission >= start && a.dateAdmission <= end);
            }
    
            if (userAdmission) {
                message += ` usuarioAdmision: ${userAdmission}`;
                filtered = filtered.filter(a => a.userAdmission === userAdmission);
            }
    
            if (typeAdmission) {
                message += ` tipoAdmision: ${typeAdmission}`;
                filtered = filtered.filter(a => a.typeAdmission === typeAdmission);
            }
    
            await this.logService.log('info', `Consulta local de admisiones con filtros: ${message}`, 'AdmissionService', undefined, req.user?.username);
    
            return filtered;
        } catch (error) {
            await this.logService.log('error', `Error al filtrar admisiones localmente: ${error}`, 'AdmissionService', undefined, req.user?.username);
            throw new InternalServerErrorException("Error al obtener las admisiones locales.");
        }
    }

    async getAdmissionByKeys(documentPatient: string, consecutiveAdmission: string): Promise<Admission | null> {
        return this.staticAdmissions.find(
            a => a.documentPatient === documentPatient && a.consecutiveAdmission === consecutiveAdmission
        ) || null;
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
            ...admissionData,
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
            const allAdmissions = await this.admissionModel.find()
            .sort({createdAt: -1})
            .lean();
            
            return allAdmissions;
        } catch (error) {
            await this.logService.logAndThrow('error', `Error al obtener todas las admisiones: ${error.message}`, 'AdmissionService');
            throw new InternalServerErrorException("No se pudo obtener todas las admisiones.", error);
        }
    }

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
            const query: any = { };
    
            if (documentPatient){
                mesage += ` documento: ${documentPatient}`;
                query['documentPatient'] = documentPatient;
            }

            if (consecutiveAdmission) {
                mesage += ` consecutivo: ${consecutiveAdmission}`;
                query['consecutiveAdmission'] = consecutiveAdmission;
            }
            
            if (startDateAdmission && !endDateAdmission) {
                const start = new Date(`${startDateAdmission}T00:00:00.000-05:00`);
                const end = new Date(`${startDateAdmission}T23:59:59.999-05:00`);
            
                mesage += ` fecha exacta: ${startDateAdmission}`;
                query['dateAdmission'] = { $gte: start, $lte: end };
            }
            
            if (startDateAdmission && endDateAdmission) {
                const start = new Date(`${startDateAdmission}T00:00:00.000-05:00`);
                const end = new Date(`${endDateAdmission}T23:59:59.999-05:00`);
            
                mesage += ` fechaInicio: ${startDateAdmission}, fechaFinal: ${endDateAdmission}`;
                query['dateAdmission'] = { $gte: start, $lte: end };
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