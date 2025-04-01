import { BadRequestException, Controller, Get, Param, Query, Res, UseGuards, Request, NotFoundException } from '@nestjs/common';
import {  Response } from 'express';
import { DocumentService } from '../service/document.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@Controller('document')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async generatePdf(
    @Res() req: Response,
    @Query('documentPatient') documentPatient: string,
    @Query('consecutiveAdmission') consecutiveAdmission: number,
    @Query('numberFac') numberFac?: string,
  ) {
    if (!documentPatient || !consecutiveAdmission) {
      throw new BadRequestException('Los parámetros documentPatient y consecutiveAdmission son obligatorios.');
    }

    if(numberFac){
      await this.documentService.generatePdfFac(req, documentPatient, consecutiveAdmission, numberFac)
    } else {    
      await this.documentService.generatePdf(req, documentPatient, consecutiveAdmission);
    }
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

  @Get('factDetails')
  @UseGuards(JwtAuthGuard)
  async getFactDetails(
    @Query('documentPatient') documentPatient: string,
    @Query('consecutiveAdmission') consecutiveAdmission: string,
    @Query('numberFac') numberFac: string,
    @Request() req: Request): Promise<any[] | any>{
      try{
        return await this.documentService.getFactDetails(req, documentPatient, consecutiveAdmission, numberFac);
      } catch(error) {
        throw new NotFoundException('No se pudieron obtener los detalles de la factura ', numberFac);
      }
    }
}
