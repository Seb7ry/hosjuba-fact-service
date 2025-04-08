import { Controller, Get, HttpException, HttpStatus, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";
import { StatService } from "src/service/stat.service";

@Controller('stat')
export class StatController {
    constructor(private readonly statService: StatService) {}

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