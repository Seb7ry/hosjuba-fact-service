import { Controller, Get, HttpException, HttpStatus, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";
import { StatService } from "src/service/stat.service";

/**
 * Controlador encargado de exponer el endpoint `/stat` para obtener estadísticas
 * relacionadas con las admisiones registradas en el sistema.
 *
 * Este controlador está protegido mediante autenticación JWT.
 */
@Controller('stat')
export class StatController {
    constructor(private readonly statService: StatService) {}

    /**
     * Endpoint GET `/stat`
     *
     * Obtiene estadísticas generales de las admisiones clasificadas por tipo:
     * - Total
     * - Urgencias
     * - Triage
     * - Consulta Externa
     * - Hospitalización
     *
     * Este endpoint requiere autenticación JWT.
     *
     * @returns Un objeto con los conteos por tipo de admisión.
     * @throws HttpException - Si ocurre un error al consultar las estadísticas.
     */
    @Get()
    @UseGuards(JwtAuthGuard)
    async getStats() {
      try {
        return await this.statService.getStats();
      } catch (error) {
        throw new HttpException('Error al obtener estadísticas', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
}