import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { ConnectionPool, Request } from 'mssql';
import { Response } from 'express';
import { AdmissionService } from './admission.service';
import { SignatureService } from './signature.service';
import { async } from 'rxjs';
import { DataSource } from 'typeorm';
import { LogService } from './log.service';
import { SqlServerConnectionService } from './sqlServerConnection.service';
import { start } from 'repl';

@Injectable()
export class DocumentService {
  constructor(
    private readonly admissionService: AdmissionService,
    private readonly signatureService: SignatureService,
    private readonly sqlServerConnectionService: SqlServerConnectionService,
    private readonly datasource: DataSource,
    private readonly logService: LogService
  ) {}

  async mapService(typeAdmission: string): Promise<string> {
    if(typeAdmission === '1') return "Urgencias"
    if(typeAdmission === '99') return "Consulta Externa"
    return "Hospitalización"
  }

  async mapRelation(relationCompanion: string): Promise<string> {
    if(relationCompanion === 'H') return "Hijo(a)"
    if(relationCompanion === 'F') return "Familiar"
    if(relationCompanion === 'C') return "Cónyuge"
    if(relationCompanion === 'A') return "Amigo(a)"
    if(relationCompanion === 'O') return "Otro"
  }

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
        await this.logService.log('error',`Error al obtener la lista de facturas de la admisión [documento: ${documentPatient} y consecutivo: ${consecutiveAdmission}] : ${error}`, 'DocumentService', undefined, req.user.username);
        throw new InternalServerErrorException("No se pudo obtener la lista de admisiones.", error);
    }
  }

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
          await this.logService.log(
              'error',
              `Error al obtener detalles de la factura [documento: ${documentPatient}, consecutivo: ${consecutiveAdmission}, factura: ${numberFac}] : ${error}`,
              'DocumentService',
              undefined,
              req.user.username
          );
          throw new InternalServerErrorException("No se pudieron obtener los detalles de la factura.", error);
      }
  }

  async generatePdf(res: Response, documentPatient: string, consecutiveAdmission: number) {
    try {
      // 🔹 Buscar admisión por documento y consecutivo
      const admission = await this.admissionService.getSignedAdmissionKeys(documentPatient, consecutiveAdmission);
      if (!admission) {
        throw new InternalServerErrorException('No se encontró una admisión con firma digital.');
      }
      
      const doc = new PDFDocument();
      res.setHeader('Content-Disposition', 'attachment; filename=comprobante.pdf');
      res.setHeader('Content-Type', 'application/pdf');
      doc.pipe(res);

       // 📌 AGREGAR LOGO (parte superior izquierda)
      const logoPath = './src/assets/logo.png'; // Cambia esto por la ruta correcta
      try {
        doc.image(logoPath, 70, 90, { width: 60 }); // Ajusta posición (x,y) y tamaño según necesites
        doc.moveDown(2);
      } catch (error) {
        console.error('❌ Error cargando el logo:', error.message);
        // Continuar sin logo si hay error
      }
      
      // 📌 ENCABEZADO
      doc.fontSize(16).text(process.env.NOMBRE_HOSPITAL, { align: 'center' });
      doc.fontSize(12).text(process.env.NIT_HOSPITAL, { align: 'center' });
      doc.fontSize(14).text(process.env.NOMBRE_DOCUMENTO_HOSPITAL, { align: 'center'});
      doc.text('____________________________________________________________')
      doc.text('')
      doc.fontSize(10).text(process.env.DESCRIPCION_DOCUMENTO_HOSPITAL, { align: 'center', italic: true });
      doc.moveDown(2);
      
      // 📌 INFORMACIÓN DEL PACIENTE
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
      
      // 📌 TEXTO INFORMATIVO
      doc.fontSize(12).text(process.env.NORMATIVA_DOCUMENTO_HOSPITAL, { align: 'justify' }
      );
      doc.moveDown(2);
      
      // 📌 FIRMAS (Paciente y Acompañante)
      const startX = doc.x;
      const lineY = doc.y + 40;
      
      // Línea para la firma del paciente
      doc.moveTo(startX, lineY + 30).lineTo(startX + 180, lineY + 30).stroke();
      doc.text('PACIENTE', startX, lineY + 35);
      doc.text(`Nº Documento: ${admission.documentPatient}`, startX, lineY + 50);
      doc.text(`Teléfono: ${admission.phonePatient}`, startX, lineY + 65);
      
      // Línea para la firma del acompañante
      const companionX = startX + 280;
      doc.moveTo(companionX - 40, lineY + 30).lineTo(companionX + 180, lineY + 30).stroke();
      doc.text('ACUDIENTE', companionX - 40, lineY + 35);
      doc.text(`Nombre: ${admission.nameCompanion || 'N/A'}`, companionX - 40, lineY + 50)
      doc.text(`Nº Documento: ${admission.documentCompanion || 'N/A'}`, companionX - 40, lineY + 65);
      doc.text(`Parentesco: ${await this.mapRelation(admission.relationCompanion) || 'N/A'}`, companionX - 40, lineY + 80);
      doc.text(`Teléfono: ${admission.phoneCompanion || 'N/A'}`, companionX - 40, lineY + 95);
      
      // 📌 OBTENER FIRMA Y AÑADIRLA AL PDF
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
          console.error('❌ Error obteniendo la firma:', error.message);
        }
      }
      
      doc.end();
    } catch (error) {
      throw new InternalServerErrorException(`Error generando PDF: ${error.message}`);
    }
  }

  async generatePdfFac(res: Response, documentPatient: string, consecutiveAdmission: number, numberFac?: string) {
    try {
      // 🔹 Buscar admisión por documento y consecutivo
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
  
      // 📌 AGREGAR LOGO (parte superior izquierda)
      const logoPath = './src/assets/logo.png'; // Cambia esto por la ruta correcta
      try {
        doc.image(logoPath, 70, 90, { width: 60 }); // Ajusta posición (x,y) y tamaño según necesites
        doc.moveDown(2);
      } catch (error) {
        console.error('❌ Error cargando el logo:', error.message);
        // Continuar sin logo si hay error
      }
  
      // 📌 ENCABEZADO
      doc.fontSize(16).text(process.env.NOMBRE_HOSPITAL, { align: 'center' });
      doc.fontSize(12).text(process.env.NIT_HOSPITAL, { align: 'center' });
      doc.fontSize(14).text(process.env.NOMBRE_DOCUMENTO_HOSPITAL, { align: 'center' });
      doc.text('____________________________________________________________');
      doc.text('');
      doc.fontSize(10).text(process.env.DESCRIPCION_DOCUMENTO_HOSPITAL, { align: 'center', italic: true });
      doc.moveDown(2);
  
      // 📌 INFORMACIÓN DEL PACIENTE
      doc.fontSize(12).text(`Fecha: ${new Date().toLocaleDateString()}                                                                         Nº de Factura: ${numberFac}`);
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
  
        // Márgenes y columnas
        const startA = doc.x;
        const marginA = 40;
        const columnWidths = [80, 150]; // Ancho de las columnas: código, nombre
  
        // Agregar encabezados de la "tabla"
        doc.fontSize(10).text('Código', startA + marginA, doc.y);
        doc.text('Nombre', startA + columnWidths[0] + marginA, doc.y-11);
        doc.moveDown(1);
  
        // Agregar cada procedimiento
        procedures.forEach((procedure, index) => {
          doc.fontSize(10).text(procedure.codePro, startA + marginA, doc.y);
          doc.text(procedure.namePro, startA + columnWidths[0] + marginA, doc.y-11);
          doc.moveDown(1);  // Mantener un pequeño espacio entre filas
        });
        doc.moveDown(2);  // Dejar un espacio después de la tabla
      }

      // 📌 FIRMAS (Paciente y Acompañante)
      const startX = doc.x;
      const lineY = doc.y + 40;

      // 📌 TEXTO INFORMATIVO
      doc.fontSize(12).text(process.env.NORMATIVA_DOCUMENTO_HOSPITAL,startX - 120, lineY - 40, { align: 'justify' });
      doc.moveDown(2);
  
      // Línea para la firma del paciente
      doc.moveTo(startX - 120, lineY + 110).lineTo(startX + 60, lineY + 110).stroke();
      doc.text('PACIENTE', startX - 120, lineY + 115);
      doc.text(`Nº Documento: ${admission.documentPatient}`, startX - 120, lineY + 130);
      doc.text(`Teléfono: ${admission.phonePatient}`, startX - 120, lineY + 145);
  
      // Línea para la firma del acompañante
      const companionX = startX;
      doc.moveTo(companionX + 120 , lineY + 110).lineTo(companionX + 330, lineY + 110 ).stroke();
      doc.text('ACUDIENTE', companionX + 120, lineY + 115);
      doc.text(`Nombre: ${admission.nameCompanion || 'N/A'}`, companionX + 120, lineY + 130);
      doc.text(`Nº Documento: ${admission.documentCompanion || 'N/A'}`, companionX + 120, lineY + 145);
      doc.text(`Parentesco: ${await this.mapRelation(admission.relationCompanion) || 'N/A'}`, companionX + 120, lineY + 160);
      doc.text(`Teléfono: ${admission.phoneCompanion || 'N/A'}`, companionX + 120, lineY + 175);
  
      // 📌 OBTENER FIRMA Y AÑADIRLA AL PDF
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
          console.error('❌ Error obteniendo la firma:', error.message);
        }
      }
  
      doc.end();
    } catch (error) {
      throw new InternalServerErrorException(`Error generando PDF: ${error.message}`);
    }
  }  
}