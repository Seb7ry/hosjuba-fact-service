import { BadRequestException, Controller, Get, Query, Res, UseGuards, Request, NotFoundException, UseInterceptors, Req } from '@nestjs/common';
import { DocumentService } from '../service/document.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { Response } from 'express';
import { RefreshTokenInterceptor } from 'src/interceptor/refreshToken.interceptor';

/**
 * Controlador para manejo de documentos y facturas
 * 
 * Provee endpoints para:
 * - Generación de PDFs de admisión
 * - Consulta de facturas
 * - Detalle de procedimientos
 * 
 * Todas las rutas están protegidas por JWT
 */
@Controller('document')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  /**
   * Endpoint principal para generación de documentos PDF
   * 
   * @param res - Objeto Response de Express para manejar la descarga
   * @param req - Objeto Request con información del usuario autenticado
   * @param documentPatient - Documento de identidad del paciente (requerido)
   * @param consecutiveAdmission - Número consecutivo de admisión (requerido)
   * @param numberFac - Número de factura (opcional)
   * 
   * @returns PDF generado como descarga directa
   * @throws BadRequestException si faltan parámetros requeridos
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async generatePdf(
    @Res() res: Response,
    @Req() req: Request,
    @Query('documentPatient') documentPatient: string,
    @Query('consecutiveAdmission') consecutiveAdmission: number,
    @Query('numberFac') numberFac?: string,
  ) {
    if (!documentPatient || !consecutiveAdmission) {
      throw new BadRequestException('Los parámetros documentPatient y consecutiveAdmission son obligatorios.');
    }

    if(numberFac){
      await this.documentService.generatePdfFac(res, req, documentPatient, consecutiveAdmission, numberFac)
    } else {    
      await this.documentService.generatePdf(res, req, documentPatient, consecutiveAdmission);
    }
  }

  /**
   * Obtiene el listado de facturas asociadas a una admisión
   * 
   * @param documentPatient - Documento del paciente (requerido)
   * @param consecutiveAdmission - Consecutivo de admisión (requerido)
   * @param req - Request con información de usuario
   * 
   * @returns Array con listado de facturas
   * @throws NotFoundException si no se encuentran facturas
   */
  @Get('allFact')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(RefreshTokenInterceptor)
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