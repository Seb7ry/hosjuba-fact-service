import { Controller, Post, Get, Body, Param, Query, BadRequestException, NotFoundException } from '@nestjs/common';
import { HistoryUsrService } from '../service/historyusr.service';

/**
 * Controlador para manejar el historial de acciones de los usuarios.
 * 
 * Este controlador expone endpoints para registrar acciones, 
 * consultar el historial de un usuario y filtrar acciones en un rango de fechas.
 */
@Controller('history')
export class HistoryUsrController {
    /**
     * Constructor del controlador `HistoryUsrController`.
     * 
     * @param historyService - Servicio que maneja la lógica de almacenamiento y consulta del historial de usuarios.
     */
    constructor(private readonly historyService: HistoryUsrService) {}

    /**
     * Endpoint para registrar una nueva acción en el historial.
     * 
     * @param body - Contiene `userId`, `action`, `details` (opcional) y `pageUrl` (opcional).
     * @returns Registro creado en la base de datos.
     * @throws {BadRequestException} Si los datos de entrada son inválidos o faltan parámetros requeridos.
     */
    @Post()
    async createHistory(@Body() body: { userId: string; action: string; details?: string; pageUrl?: string }) {
        if (!body.userId || !body.action) {
            throw new BadRequestException('El userId y la acción son obligatorios.');
        }

        return await this.historyService.create(body.userId, body.action, body.details, body.pageUrl);
    }

    /**
     * Endpoint para obtener el historial de un usuario específico.
     * 
     * @param userId - Identificador único del usuario.
     * @returns Lista de acciones registradas para el usuario.
     * @throws {BadRequestException} Si `userId` no es válido.
     * @throws {NotFoundException} Si no hay registros para el usuario.
     */
    @Get(':userId')
    async getHistoryByUser(@Param('userId') userId: string) {
        if (!userId) {
            throw new BadRequestException('El userId es obligatorio.');
        }

        const history = await this.historyService.findByUser(userId);
        if (!history.length) {
            throw new NotFoundException(`No se encontraron registros para el usuario con ID: ${userId}`);
        }

        return history;
    }

    /**
     * Endpoint para obtener todo el historial de acciones registradas en la base de datos.
     * 
     * @returns Lista de todas las acciones almacenadas en la base de datos.
     * @throws {NotFoundException} Si no hay registros en la base de datos.
     */
    @Get()
    async getAllHistory() {
        const history = await this.historyService.findAll();
        if (!history.length) {
            throw new NotFoundException('No se encontraron registros en el historial.');
        }

        return history;
    }

    /**
     * Endpoint para obtener el historial de un usuario en un rango de fechas.
     * 
     * @param userId - Identificador único del usuario (opcional).
     * @param startDate - Fecha inicial en formato ISO (YYYY-MM-DD).
     * @param endDate - Fecha final en formato ISO (YYYY-MM-DD).
     * @returns Lista de acciones en el rango de fechas especificado.
     * @throws {BadRequestException} Si los parámetros de fecha son inválidos o faltan.
     * @throws {NotFoundException} Si no hay registros en el rango de fechas especificado.
     */
    @Get('/search')
    async getHistoryByUserAndDate(
        @Query('userId') userId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ) {
        if (!startDate || !endDate) {
            throw new BadRequestException('Las fechas de inicio y fin son obligatorias.');
        }

        // Validación de formato de fecha ISO
        if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
            throw new BadRequestException('Las fechas deben estar en formato válido (YYYY-MM-DD).');
        }

        const history = await this.historyService.findByUserAndDate(userId, startDate, endDate);
        if (!history.length) {
            throw new NotFoundException('No se encontraron registros en el rango de fechas especificado.');
        }

        return history;
    }
}