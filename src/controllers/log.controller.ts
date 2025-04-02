import { Controller, Get, Query, UnauthorizedException, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { LogService } from 'src/service/log.service';

/**
 * Controlador para gestión de logs del sistema
 * 
 * Proporciona endpoints para:
 * - Consulta de logs por niveles de severidad
 * - Filtrado de logs técnicos (warn/error)
 * - Obtención de historial de actividad (info)
 * 
 * Todas las rutas requieren autenticación JWT
 */
@Controller('log')
export class LogController {
    constructor(private readonly logService: LogService) { }

    /**
     * Obtiene logs filtrados por nivel de severidad
     * @param level Nivel(es) de log a consultar (info/warn/error)
     * @returns Array de logs filtrados
     * @example GET /log/all?level=error
     * @example GET /log/all?level=info&level=warn (múltiples niveles)
     */
    @Get('all')
    @UseGuards(JwtAuthGuard)
    async getLogsByLevels(@Query('level') level: string | string[]) {
        const levels = Array.isArray(level) ? level : [level];

        const validLevels = ['info', 'warn', 'error'];
        const filteredLevels = levels.filter(lvl => validLevels.includes(lvl));

        return this.logService.getLogsByLevels(filteredLevels as Array<'info' | 'warn' | 'error'>);
    }

    /**
     * Endpoint para filtrar logs técnicos (warn/error por defecto)
     * @param req Objeto Request con información del usuario
     * @param level Nivel(es) de log a filtrar (opcional)
     * @param startDate Fecha de inicio (opcional, formato YYYY-MM-DD)
     * @param endDate Fecha de fin (opcional, formato YYYY-MM-DD)
     * @returns Array de logs técnicos filtrados
     * @throws UnauthorizedException si ocurre un error en la consulta
     * @example GET /log/filtrerTec?startDate=2023-01-01&endDate=2023-12-31
     */
    @Get('filtrerTec')
    @UseGuards(JwtAuthGuard)
    async getLogsTec(
        @Request() req: Request,
        @Query('level') level?: string | string[], 
        @Query('startDate') startDate?: string,  
        @Query('endDate') endDate?: string,  
    ) {
        try {
            const levels = Array.isArray(level) ? level : [level].filter(l => l);

            const logs = await this.logService.getLogsTec(req, levels.length ? levels : ['warn', 'error'], startDate, endDate);
            return logs;
        } catch (error) {
            throw new UnauthorizedException('Error en la búsqueda de logs.', error);
        }
    }

    /**
     * Obtiene historial de logs de información (info)
     * @param req Objeto Request con información del usuario
     * @param startDate Fecha de inicio (opcional, formato YYYY-MM-DD)
     * @param endDate Fecha de fin (opcional, formato YYYY-MM-DD)
     * @param user Usuario específico a filtrar (opcional)
     * @returns Array de logs de historial
     * @throws UnauthorizedException si ocurre un error en la consulta
     * @example GET /log/filtrerHis?user=admin&startDate=2023-01-01
     */
    @Get('filtrerHis')
    @UseGuards(JwtAuthGuard)
    async getHistory(
        @Request() req: Request,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('user') user?: string
    ) {
        try {
            return await this.logService.getLogsHistory(req, startDate, endDate, user);
        } catch (error) {
            throw new UnauthorizedException('Error al obtener el historial de logs.', error)
        }
    }
}