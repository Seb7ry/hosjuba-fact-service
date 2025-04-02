// src/document/document.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Response } from 'express';
import { Request } from 'mssql';

import { SqlServerConnectionService } from './sqlServerConnection.service';
import { AdmissionService } from './admission.service';
import { SignatureService } from './signature.service';
import { LogService } from './log.service';

/**
 * Servicio para generación de documentos PDF y manejo de datos relacionados
 * 
 * Proporciona funcionalidades para:
 * - Generar comprobantes de admisión en PDF
 * - Consultar información de facturas
 * - Mapear valores de enumeraciones
 */
@Injectable()
export class DocumentService {
  constructor(
    private readonly admissionService: AdmissionService,
    private readonly signatureService: SignatureService,
    private readonly sqlServerConnectionService: SqlServerConnectionService,
    private readonly logService: LogService
  ) {}

  /**
   * Mapea códigos de tipo de admisión a su descripción correspondiente
   * @param typeAdmission - Código numérico del tipo de admisión
   * @returns Descripción textual del tipo de admisión
   */
  async mapService(typeAdmission: string): Promise<string> {
    if(typeAdmission === '1') return "Urgencias"
    if(typeAdmission === '99') return "Consulta Externa"
    return "Hospitalización"
  }

  /**
   * Mapea códigos de relación de acompañante a su descripción
   * @param relationCompanion - Código alfabético de relación
   * @returns Descripción textual de la relación
   */
  async mapRelation(relationCompanion: string): Promise<string> {
    if(relationCompanion === 'H') return "Hijo(a)"
    if(relationCompanion === 'F') return "Familiar"
    if(relationCompanion === 'C') return "Cónyuge"
    if(relationCompanion === 'A') return "Amigo(a)"
    if(relationCompanion === 'O') return "Otro"
  }
  /**
   * Método auxiliar para corregir el formato de las fechas obtenidas
   * de la base de datos MongoDB.
   * @param date Fecha a modificar el formato
   * @returns Fecha con el formator adecuadl Ej: xx/xx/xxxx
   */
  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  /**
   * Obtiene lista de facturas asociadas a una admisión
   * @param req - Objeto Request de la solicitud HTTP
   * @param documentPatient - Documento de identidad del paciente
   * @param consecutiveAdmission - Consecutivo de la admisión
   * @returns Array con registros de facturas
   * @throws InternalServerErrorException Si falla la consulta a la base de datos
   */
  async getFact(req: Request, documentPatient: string, consecutiveAdmission: string): Promise<any[]> {
    const pool = await this.sqlServerConnectionService.getConnectionPool();
    const query = `
        SELECT 
          FacDscPrf,
          MPNFac 
        FROM MAEATE 
        WHERE MPCedu = @documentPatient 
        AND MaCtvIng = @consecutiveAdmission 
        AND MAEstF NOT IN (1,10);`

    try{
        const result = await pool
        .request()
        .input('documentPatient', documentPatient) 
        .input('consecutiveAdmission', consecutiveAdmission)
        .query(query);
        return result.recordset;
    } catch(error){
        await this.logService.logAndThrow('error',`Error al obtener la lista de facturas de la admisión [documento: ${documentPatient} y consecutivo: ${consecutiveAdmission}] : ${error}`, 'DocumentService');
        throw new InternalServerErrorException("No se pudo obtener la lista de admisiones.", error);
    }
  }

  /**
   * Obtiene detalles de procedimientos de una factura específica
   * @param req - Objeto Request de la solicitud HTTP
   * @param documentPatient - Documento de identidad del paciente
   * @param consecutiveAdmission - Consecutivo de la admisión
   * @param numberFac - Número de factura a consultar
   * @returns Array con detalles de procedimientos
   * @throws InternalServerErrorException Si falla la consulta a la base de datos
   */
  async getFactDetails(req: Request, documentPatient: string, consecutiveAdmission: string, numberFac: string): Promise<any[]> {
      const pool = await this.sqlServerConnectionService.getConnectionPool();
      const query = `
          SELECT 
              LTRIM(RTRIM(MAEATE2.PRCODI)) AS codePro,
              LTRIM(RTRIM(MAEPRO.PrNomb)) AS namePro
          FROM MAEATE
          JOIN MAEATE2 ON MAEATE.MPNFac = MAEATE2.MPNFac AND MAEATE.MATipDoc = MAEATE2.MATipDoc
          JOIN MAEPRO ON MAEATE2.PRCODI = MAEPRO.PRCODI
          WHERE MAEATE.MPCedu = @documentPatient
          AND MAEATE.MaCtvIng = @consecutiveAdmission
          AND MAEATE.MAEstF NOT IN (1,10)
          AND MAEATE.MPNFac = @numberFac
          AND MAEATE2.MaEsAnuP <> 'S';
      `;

      try {
          const result = await pool
              .request()
              .input('documentPatient', documentPatient)
              .input('consecutiveAdmission', consecutiveAdmission)
              .input('numberFac', numberFac)
              .query(query);

          return result.recordset;
      } catch (error) {
          await this.logService.logAndThrow(
              'error',
              `Error al obtener detalles de la factura [documento: ${documentPatient}, consecutivo: ${consecutiveAdmission}, factura: ${numberFac}] : ${error}`,
              'DocumentService'
          );
          throw new InternalServerErrorException("No se pudieron obtener los detalles de la factura.", error);
      }
  }

  /**
   * Genera un PDF con el comprobante de admisión básico
   * @param res - Objeto Response de Express
   * @param documentPatient - Documento de identidad del paciente
   * @param consecutiveAdmission - Consecutivo de la admisión
   * @throws InternalServerErrorException Si falla la generación del PDF
   */
  async generatePdf(res: Response, req: Request, documentPatient: string, consecutiveAdmission: number) {
    try {
      const admission = await this.admissionService.getSignedAdmissionKeys(documentPatient, consecutiveAdmission);
      if (!admission) {
        throw new InternalServerErrorException('No se encontró una admisión con firma digital.');
      }
      
      const doc = new PDFDocument();
      res.setHeader('Content-Disposition', 'attachment; filename=comprobante.pdf');
      res.setHeader('Content-Type', 'application/pdf');
      doc.pipe(res);

      const logoPath = './src/assets/logo.png'; 
      try {
        doc.image(logoPath, 70, 90, { width: 60 });
        doc.moveDown(2);
      } catch (error) {
        await this.logService.logAndThrow('error', `Error al cargar el logo: ${error.message}`, 'DocumentService');
        throw new InternalServerErrorException(`Error al cargar el logo: ${error.message}`);
      }
      
      doc.fontSize(16).text(process.env.NOMBRE_HOSPITAL, { align: 'center' });
      doc.fontSize(12).text(process.env.NIT_HOSPITAL, { align: 'center' });
      doc.fontSize(14).text(process.env.NOMBRE_DOCUMENTO_HOSPITAL, { align: 'center'});
      doc.text('____________________________________________________________')
      doc.text('')
      doc.fontSize(10).text(process.env.DESCRIPCION_DOCUMENTO_HOSPITAL, { align: 'center', italic: true });
      doc.moveDown(2);
      
      doc.fontSize(12).text(`Fecha: ${new Date().toLocaleDateString()}                                                                         Nº de Factura: N/A`);
      doc.moveDown();
      doc.fontSize(12).text(`Nombre Paciente: ${admission.fullNamePatient}`);
      doc.moveDown();
      doc.fontSize(12).text(`Documento Paciente: ${admission.documentPatient}`);
      doc.moveDown();
      doc.fontSize(12).text(`Servicio Prestado: ${await this.mapService(admission.typeAdmission)}`);
      doc.moveDown();
      
      if (admission.procedures && admission.procedures.length > 0) {
        doc.fontSize(12).text('Procedimientos:', { underline: true });
        admission.procedures.forEach((procedure, index) => {
          doc.text(`${index + 1}. ${procedure.name}`);
        });
      }
      doc.moveDown();
      
      doc.fontSize(12).text(process.env.NORMATIVA_DOCUMENTO_HOSPITAL, { align: 'justify' }
      );
      doc.moveDown(2);
      
      const startX = doc.x;
      const lineY = doc.y + 40;
      
      doc.moveTo(startX, lineY + 30).lineTo(startX + 180, lineY + 30).stroke();
      doc.text('PACIENTE', startX, lineY + 35);
      doc.text(`Nº Documento: ${admission.documentPatient}`, startX, lineY + 50);
      doc.text(`Teléfono: ${admission.phonePatient}`, startX, lineY + 65);
      
      const companionX = startX + 280;
      doc.moveTo(companionX - 40, lineY + 30).lineTo(companionX + 180, lineY + 30).stroke();
      doc.text('ACUDIENTE', companionX - 40, lineY + 35);
      doc.text(`Nombre: ${admission.nameCompanion || 'N/A'}`, companionX - 40, lineY + 50)
      doc.text(`Nº Documento: ${admission.documentCompanion || 'N/A'}`, companionX - 40, lineY + 65);
      doc.text(`Parentesco: ${await this.mapRelation(admission.relationCompanion) || 'N/A'}`, companionX - 40, lineY + 80);
      doc.text(`Teléfono: ${admission.phoneCompanion || 'N/A'}`, companionX - 40, lineY + 95);
      
      if (admission.digitalSignature && admission.digitalSignature.signatureData) {
        try {
          const signatureBuffer = await this.signatureService.getSignature(admission.digitalSignature.signatureData);
          const signatureImage = signatureBuffer.toString('base64');
          const imagePath = `data:image/png;base64,${signatureImage}`;
          
          if (admission.digitalSignature.signedBy === 'patient') {
            doc.image(imagePath, startX, lineY -62, { width: 200, height: 100 });
          } else if (admission.digitalSignature.signedBy === 'companion') {
            doc.image(imagePath, companionX - 35, lineY - 62, { width: 200, height: 100 });
          }
        } catch (error) {
          await this.logService.logAndThrow('error', `Error al cargar la firma: ${error.message}`, 'DocumentService');
          throw new InternalServerErrorException(`Error cargando la firma: ${error.message}`);
        }
      }

      await this.logService.log(
        'info', 
        `Se ha generado/descargado un comprobante para el paciente ${admission.fullNamePatient} con admisión no. ${admission.consecutiveAdmission} del día ${this.formatDate(admission.dateAdmission)}`, 
        'DocumentService', 
        undefined, 
        req.user.username);
      
      doc.end();
    } catch (error) {
      await this.logService.logAndThrow('error', `Error al generar el PDF: ${error.message}`, 'DocumentService');
      throw new InternalServerErrorException(`Error generando PDF: ${error.message}`);
    }
  }

  /**
   * Genera un PDF con el comprobante de admisión incluyendo detalles de factura
   * @param res - Objeto Response de Express
   * @param documentPatient - Documento de identidad del paciente
   * @param consecutiveAdmission - Consecutivo de la admisión
   * @param numberFac - Número de factura a incluir (opcional)
   * @throws InternalServerErrorException Si falla la generación del PDF
   */
  async generatePdfFac(res: Response, req: Request, documentPatient: string, consecutiveAdmission: number, numberFac?: string) {
    try {
      let procedures = [];
      const admission = await this.admissionService.getSignedAdmissionKeys(documentPatient, consecutiveAdmission);
      if (!admission) {
        throw new InternalServerErrorException('No se encontró una admisión con firma digital.');
      }
  
      if (numberFac) {
        procedures = await this.getFactDetails(res, documentPatient, consecutiveAdmission.toString(), numberFac);
      }
  
      res.setHeader('Content-Disposition', 'attachment; filename=comprobante.pdf');
      res.setHeader('Content-Type', 'application/pdf');
      const doc = new PDFDocument();
      doc.pipe(res);
  
      const logoPath = './src/assets/logo.png'; 
      try {
        doc.image(logoPath, 70, 90, { width: 60 }); 
        doc.moveDown(2);
      } catch (error) {
        await this.logService.logAndThrow('error', `Error al cargar el logo: ${error.message}`, 'DocumentService');
        throw new InternalServerErrorException(`Error al cargar el logo: ${error.message}`);
      }
  
      doc.fontSize(16).text(process.env.NOMBRE_HOSPITAL, { align: 'center' });
      doc.fontSize(12).text(process.env.NIT_HOSPITAL, { align: 'center' });
      doc.fontSize(14).text(process.env.NOMBRE_DOCUMENTO_HOSPITAL, { align: 'center' });
      doc.text('____________________________________________________________');
      doc.text('');
      doc.fontSize(10).text(process.env.DESCRIPCION_DOCUMENTO_HOSPITAL, { align: 'center', italic: true });
      doc.moveDown(2);
  
      doc.fontSize(12).text(`Fecha: ${this.formatDate(admission.dateAdmission)}                                                                         Nº de Factura: ${numberFac}`);
      doc.moveDown();
      doc.fontSize(12).text(`Nombre Paciente: ${admission.fullNamePatient}`);
      doc.moveDown();
      doc.fontSize(12).text(`Documento Paciente: ${admission.documentPatient}`);
      doc.moveDown();
      doc.fontSize(12).text(`Servicio Prestado: ${await this.mapService(admission.typeAdmission)}`);
      doc.moveDown();
  
      if (procedures.length > 0) {
        doc.fontSize(12).text('Procedimientos:');
        doc.moveDown(1);
  
        const startA = doc.x;
        const marginA = 40;
        const columnWidths = [80, 150];
  
        doc.fontSize(10).text('Código', startA + marginA, doc.y);
        doc.text('Nombre', startA + columnWidths[0] + marginA, doc.y-11);
        doc.moveDown(1);
  
        procedures.forEach((procedure, index) => {
          doc.fontSize(10).text(procedure.codePro, startA + marginA, doc.y);
          doc.text(procedure.namePro, startA + columnWidths[0] + marginA, doc.y-11);
          doc.moveDown(1);
        });
        doc.moveDown(2);
      }

      const startX = doc.x;
      const lineY = doc.y + 40;

      doc.fontSize(12).text(process.env.NORMATIVA_DOCUMENTO_HOSPITAL,startX - 120, lineY - 40, { align: 'justify' });
      doc.moveDown(2);
  
      doc.moveTo(startX - 120, lineY + 110).lineTo(startX + 60, lineY + 110).stroke();
      doc.text('PACIENTE', startX - 120, lineY + 115);
      doc.text(`Nº Documento: ${admission.documentPatient}`, startX - 120, lineY + 130);
      doc.text(`Teléfono: ${admission.phonePatient}`, startX - 120, lineY + 145);
  
      const companionX = startX;
      doc.moveTo(companionX + 120 , lineY + 110).lineTo(companionX + 330, lineY + 110 ).stroke();
      doc.text('ACUDIENTE', companionX + 120, lineY + 115);
      doc.text(`Nombre: ${admission.nameCompanion || 'N/A'}`, companionX + 120, lineY + 130);
      doc.text(`Nº Documento: ${admission.documentCompanion || 'N/A'}`, companionX + 120, lineY + 145);
      doc.text(`Parentesco: ${await this.mapRelation(admission.relationCompanion) || 'N/A'}`, companionX + 120, lineY + 160);
      doc.text(`Teléfono: ${admission.phoneCompanion || 'N/A'}`, companionX + 120, lineY + 175);
  
      const signatureMarginTop = -20;
      if (admission.digitalSignature && admission.digitalSignature.signatureData) {
        try {
          const signatureBuffer = await this.signatureService.getSignature(admission.digitalSignature.signatureData);
          const signatureImage = signatureBuffer.toString('base64');
          const imagePath = `data:image/png;base64,${signatureImage}`;
  
          if (admission.digitalSignature.signedBy === 'patient') {
            doc.image(imagePath, startX - 120, lineY - signatureMarginTop, { width: 200, height: 100 });
          } else if (admission.digitalSignature.signedBy === 'companion') {
            doc.image(imagePath, companionX + 130, lineY - signatureMarginTop, { width: 200, height: 100 });
          }
        } catch (error) {
          await this.logService.logAndThrow('error', `Error al cargar la firma: ${error.message}`, 'DocumentService');
          throw new InternalServerErrorException(`Error cargando la firma: ${error.message}`);
        }
      }

      await this.logService.log(
        'info', 
        `Se ha generado/descargado un comprobante para el paciente ${admission.fullNamePatient} con admisión no. ${admission.consecutiveAdmission} del día ${this.formatDate(admission.dateAdmission)}`, 
        'DocumentService', 
        undefined, 
        req.user.username);

      doc.end(); 
    } catch (error) {
      await this.logService.logAndThrow('error', `Error al generar el PDF: ${error.message}`, 'DocumentService');
      throw new InternalServerErrorException(`Error generando PDF: ${error.message}`);
    }
  }  
}