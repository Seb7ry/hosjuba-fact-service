import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HistoryUsr, HistoryUsrDocument } from '../model/historyusr.model';
import { LogService } from './log.service';

/**
 * Servicio para manejar el historial de acciones de los usuarios.
 * 
 * Este servicio permite registrar acciones realizadas por los usuarios en la plataforma, 
 * consultar el historial por usuario y filtrar acciones en un rango de fechas.
 */
@Injectable()
export class HistoryUsrService {
    private readonly logger = new Logger(HistoryUsrService.name);

    /**
     * Constructor del servicio `HistoryUsrService`.
     * 
     * @param historyModel - Modelo de Mongoose para el historial de usuarios.
     * @param logService - Servicio para registrar logs técnicos y errores.
     */
    constructor(
        @InjectModel(HistoryUsr.name) private readonly historyModel: Model<HistoryUsrDocument>,
        private readonly logService: LogService,
    ) {}

    /**
     * Registra una nueva acción en el historial del usuario.
     * 
     * @param userId - Identificador único del usuario que realizó la acción.
     * @param action - Descripción de la acción realizada.
     * @param details - Información adicional de la acción (opcional).
     * @param pageUrl - URL de la página donde se realizó la acción (opcional).
     * @returns Promesa con el registro almacenado en la base de datos.
     * @throws {BadRequestException} Si los datos son inválidos o faltan parámetros requeridos.
     */
    async create(userId: string, action: string, details?: string, pageUrl?: string): Promise<HistoryUsr> {
        try {
            if (!userId || !action) {
                this.logger.warn(`Intento de registrar acción con datos incompletos - userId: ${userId}, action: ${action}`);
                await this.logService.log('warn', 'Intento de registrar acción con datos incompletos', 'HistoryUsrService');
                throw new BadRequestException('El userId y la acción son obligatorios');
            }

            const newHistory = new this.historyModel({ userId, action, details, pageUrl });
            const savedHistory = await newHistory.save();

            this.logger.log(`Acción registrada correctamente para el usuario ${userId}: ${action}`);
            return savedHistory;
        } catch (error) {
            this.logger.error(`Error al registrar acción - Usuario: ${userId}, Acción: ${action}, Error: ${error.message}`);
            await this.logService.log('error', `Error al registrar acción: ${error.message}`, 'HistoryUsrService');
            throw new InternalServerErrorException('No se pudo registrar la acción en el historial');
        }
    }

    /**
     * Obtiene el historial de un usuario específico.
     * 
     * @param userId - Identificador único del usuario.
     * @returns Promesa con la lista de acciones registradas para el usuario.
     * @throws {BadRequestException} Si no se proporciona un userId válido.
     */
    async findByUser(userId: string): Promise<HistoryUsr[]> {
        try {
            if (!userId) {
                this.logger.warn('Intento de consulta de historial sin especificar userId');
                await this.logService.log('warn', 'Intento de consulta de historial sin userId', 'HistoryUsrService');
                throw new BadRequestException('El userId es obligatorio para esta consulta');
            }

            return await this.historyModel.find({ userId }).sort({ timestamp: -1 }).exec();
        } catch (error) {
            this.logger.error(`Error al obtener historial del usuario ${userId}: ${error.message}`);
            await this.logService.log('error', `Error al obtener historial: ${error.message}`, 'HistoryUsrService');
            throw new InternalServerErrorException('No se pudo obtener el historial del usuario');
        }
    }

    /**
     * Obtiene todo el historial de acciones registradas en el sistema.
     * 
     * @returns Promesa con la lista de todas las acciones almacenadas en la base de datos.
     */
    async findAll(): Promise<HistoryUsr[]> {
        try {
            return await this.historyModel.find().sort({ timestamp: -1 }).exec();
        } catch (error) {
            this.logger.error(`Error al obtener todo el historial de acciones: ${error.message}`);
            await this.logService.log('error', `Error al obtener todo el historial: ${error.message}`, 'HistoryUsrService');
            throw new InternalServerErrorException('No se pudo obtener el historial de acciones');
        }
    }

    /**
     * Obtiene el historial de un usuario en un rango de fechas.
     * 
     * @param userId - Identificador único del usuario (opcional, si no se envía, se obtienen todas las acciones en el rango de fechas).
     * @param startDate - Fecha inicial en formato ISO (YYYY-MM-DD).
     * @param endDate - Fecha final en formato ISO (YYYY-MM-DD).
     * @returns Promesa con la lista de acciones registradas en el rango de fechas especificado.
     * @throws {BadRequestException} Si los parámetros de fecha son inválidos o faltan.
     */
    async findByUserAndDate(userId: string, startDate: string, endDate: string): Promise<HistoryUsr[]> {
        try {
            if (!startDate || !endDate) {
                this.logger.warn('Intento de consulta de historial sin fechas definidas');
                await this.logService.log('warn', 'Intento de consulta de historial sin fechas', 'HistoryUsrService');
                throw new BadRequestException('Las fechas de inicio y fin son obligatorias');
            }

            const filter: any = {
                timestamp: {
                    $gte: new Date(startDate), 
                    $lte: new Date(endDate),
                },
            };

            if (userId) {
                filter.userId = userId;
            }

            return await this.historyModel.find(filter).sort({ timestamp: -1 }).exec();
        } catch (error) {
            this.logger.error(`Error al obtener historial con filtro - Usuario: ${userId}, Error: ${error.message}`);
            await this.logService.log('error', `Error al obtener historial con filtro: ${error.message}`, 'HistoryUsrService');
            throw new InternalServerErrorException('No se pudo obtener el historial con los filtros especificados');
        }
    }
}