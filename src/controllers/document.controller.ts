import { BadRequestException, Controller, Get, Param, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { DocumentService } from '../service/document.service';

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
}
