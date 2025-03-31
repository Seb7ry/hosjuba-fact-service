import { BadRequestException, Controller, Get, Param, Query, Res, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { DocumentService } from '../service/document.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@Controller('document')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get()
  async generatePdf(
    @Query('documentPatient') documentPatient: string,
    @Query('consecutiveAdmission') consecutiveAdmission: number,
    @Res() res: Response
  ) {
    if (!documentPatient || !consecutiveAdmission) {
      throw new BadRequestException('Los parámetros documentPatient y consecutiveAdmission son obligatorios.');
    }

    await this.documentService.generatePdf(res, documentPatient, consecutiveAdmission);
  }

  @Get('allFact')
  @UseGuards(JwtAuthGuard)
  async getFact(
    @Query('documentPatient') documentPatient: string,
    @Query('consecutiveAdmission') consecutiveAdmission: string,
    @Request() req: Request): Promise<any[]>{
      try{
        return await this.documentService.getFact(req, documentPatient, consecutiveAdmission);
      } catch(error) {
        throw new NotFoundException('No se pudieron obtener las facturas.');
      }
    }
}
