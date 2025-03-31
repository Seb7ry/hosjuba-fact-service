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

  async getFact(req: Request, documentPatient: string, consecutiveAdmission: string): Promise<any[]> {
    const pool = await this.sqlServerConnectionService.getConnectionPool();
    const query = `
        SELECT MPNFac FROM MAEATE 
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
      doc.fontSize(12).text(`Fecha: ${new Date().toLocaleDateString()}                                                                         Nº de Factura: ${admission.consecutiveAdmission}`);
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
      doc.moveTo(startX, lineY).lineTo(startX + 220, lineY).stroke();
      doc.text('PACIENTE', startX, lineY + 5);
      doc.text(`Nº Documento: ${admission.documentPatient}`, startX, lineY + 20);
      doc.text(`Teléfono: ${admission.phonePatient}`, startX, lineY + 35);
      
      // Línea para la firma del acompañante
      const companionX = startX + 280;
      doc.moveTo(companionX, lineY).lineTo(companionX + 220, lineY).stroke();
      doc.text('ACUDIENTE', companionX, lineY + 5);
      doc.text(`Nº Documento: ${admission.documentCompanion || 'N/A'}`, companionX, lineY + 20);
      doc.text(`Parentesco: ${admission.relationCompanion || 'N/A'}`, companionX, lineY + 35);
      doc.text(`Teléfono: ${admission.phoneCompanion || 'N/A'}`, companionX, lineY + 50);
      
      // 📌 OBTENER FIRMA Y AÑADIRLA AL PDF
      if (admission.digitalSignature && admission.digitalSignature.signatureData) {
        try {
          const signatureBuffer = await this.signatureService.getSignature(admission.digitalSignature.signatureData);
          const signatureImage = signatureBuffer.toString('base64');
          const imagePath = `data:image/png;base64,${signatureImage}`;
          
          if (admission.digitalSignature.signedBy === 'patient') {
            doc.image(imagePath, startX + 10, lineY - 45, { width: 100, height: 50 });
          } else if (admission.digitalSignature.signedBy === 'companion') {
            doc.image(imagePath, companionX + 10, lineY - 45, { width: 100, height: 50 });
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