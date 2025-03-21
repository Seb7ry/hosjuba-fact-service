import { Controller, Get, Query, UnauthorizedException, UseGuards, Req, Request } from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { LogService } from 'src/service/log.service';

/**
 * Controlador para gestionar las solicitudes relacionadas con los logs del sistema.
 * 
 * El controlador expone un endpoint `GET /log` para consultar los logs almacenados en la base de datos.
 * Solo los usuarios autenticados pueden acceder a este endpoint, gracias al uso del guard `JwtAuthGuard`.
 */
@Controller('log')
export class LogController {
    constructor(private readonly logService: LogService) { }

    @Get('filtrerTec')
    @UseGuards(JwtAuthGuard)
    async getLogsTec(
        @Request() req: Request,
        @Query('level') level?: string | string[],  // Filtro por nivel
        @Query('startDate') startDate?: string,  // Filtro por fecha de inicio
        @Query('endDate') endDate?: string,  // Filtro por fecha de fin
    ) {
        try {
            const levels = Array.isArray(level) ? level : [level].filter(l => l);

            const logs = await this.logService.getLogsTec(req, levels.length ? levels : ['warn', 'error'], startDate, endDate);
            return logs;
        } catch (error) {
            throw new UnauthorizedException('Error en la búsqueda de logs.', error);
        }
    }
}