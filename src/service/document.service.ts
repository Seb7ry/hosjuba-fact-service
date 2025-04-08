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
   * Obtiene el pabellón de atención de una admisión y su respectiva factura
   * @param req - Objeto Request de la solicitud HTTP
   * @param documentPatient - Documento de identidad del paciente
   * @param consecutiveAdmission - Consecutivo de la admisión
   * @param numberFac - Número de la factura
   * @returns String del pabellón
   * @throws InternalServerErrorException Si falla la consulta a la base de datos
   */
  async getPab(req: Request, documentPatient: string, consecutiveAdmission: number, numberFac: string): Promise<string> {
    const pool = await this.sqlServerConnectionService.getConnectionPool();
    const query = `
        SELECT 
            FacCodPab 
        FROM MAEATE 
        WHERE MPCedu= @documentPatient 
            AND MaCtvIng = @consecutiveAdmission 
            AND MPNFac = @numberFac 
            AND MAEstF NOT IN (1,10);
    `;
    try {
        const result = await pool
            .request()
            .input('documentPatient', documentPatient)
            .input('consecutiveAdmission', consecutiveAdmission)
            .input('numberFac', numberFac)
            .query(query);

        return result.recordset.length > 0 ? result.recordset[0].FacCodPab.toString() : 'N/A';
    } catch (error) {
        await this.logService.logAndThrow(
            'error',
            `Error al obtener los pabellones del [documento: ${documentPatient}, consecutivo: ${consecutiveAdmission}, factura: ${numberFac}] : ${error}`,
            'DocumentService'
        );
        throw new InternalServerErrorException("No se pudieron obtener los detalles de la factura.", error);
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
  async getFactDetailsPro(req: Request, documentPatient: string, consecutiveAdmission: string, numberFac: string): Promise<any[]> {
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
            AND MAEATE2.MaEsAnuP <> 'S'
          GROUP BY MAEATE2.PRCODI, MAEPRO.PrNomb;
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
              `Error al obtener detalles de los procedimientos del [documento: ${documentPatient}, consecutivo: ${consecutiveAdmission}, factura: ${numberFac}] : ${error}`,
              'DocumentService'
          );
          throw new InternalServerErrorException("No se pudieron obtener los detalles de la factura.", error);
      }
  }

  /**
   * Obtiene detalles de suministros de una factura específica
   * @param req - Objeto Request de la solicitud HTTP
   * @param documentPatient - Documento de identidad del paciente
   * @param consecutiveAdmission - Consecutivo de la admisión
   * @param numberFac - Número de factura a consultar
   * @returns Array con detalles de suministros asociados a la factura
   * @throws InternalServerErrorException Si falla la consulta a la base de datos
   */
  async getFactDetailsSum(req: Request, documentPatient: string, consecutiveAdmission: string, numberFac: string): Promise<any[]> {
    const pool = await this.sqlServerConnectionService.getConnectionPool();
    const query = `
        SELECT 
            LTRIM(RTRIM(MAEATE3.MSRESO)) AS codePro,
            LTRIM(RTRIM(MAESUM1.MSNOMG)) AS namePro
        FROM MAEATE3
          JOIN MAEATE ON MAEATE3.MPNFac = MAEATE.MPNFac AND MAEATE.MATipDoc = MAEATE3.MATipDoc
          JOIN MAESUM1 ON MAEATE3.MSRESO = MAESUM1.MSRESO
        WHERE MAEATE3.MPNFac = @numberFac 
          AND MAEATE.MAEstF NOT IN (1,10) 
          AND MAEATE3.FCSTPOTRN <> 'H'  
          AND MAEATE3.MAESANUS <> 'S'
        GROUP BY MAEATE3.MSRESO, MAESUM1.MSNOMG;
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
            `Error al obtener detalles de los suministros del [documento: ${documentPatient}, consecutivo: ${consecutiveAdmission}, factura: ${numberFac}] : ${error}`,
            'DocumentService'
        );
        throw new InternalServerErrorException("No se pudieron obtener los detalles de la factura.", error);
    }
  }

  /**
   * Genera un PDF con el comprobante de admisión básico
   * @param res - Objeto Response de Express
   * @param req - Objeto Request de Mssql
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
      const goberPath = './src/assets/logo2.png';
      try {
        doc.image(logoPath, 70, 90, { width: 60 });
        doc.image(goberPath, 470, 80, {width: 76});
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
      
      doc.fontSize(12).text(`Fecha: ${this.formatDate(admission.dateAdmission)}                                                                         Nº de Factura: N/A`);
      doc.moveDown();
      doc.fontSize(12).text(`Nombre Paciente: ${admission.fullNamePatient}`);
      doc.moveDown();
      doc.fontSize(12).text(`Documento Paciente: ${admission.documentPatient}`);
      doc.moveDown();
      doc.fontSize(12).text(`Servicio Prestado: ${await this.mapService(admission.typeAdmission)}`);
      doc.moveDown(2);
      
      doc.fontSize(12).text(process.env.NORMATIVA_DOCUMENTO_HOSPITAL, { align: 'justify' }
      );
      doc.moveDown(2);
      
      const startX = doc.x;
      const lineY = doc.y + 40;

      let pacienteY = lineY + 30;
      let acompananteY = pacienteY;

      doc.moveTo(startX, pacienteY).lineTo(startX + 180, pacienteY).stroke();
      doc.text('PACIENTE', startX, pacienteY + 5);

      const pacienteFields = [
        `Nº Documento: ${admission.documentPatient}`,
        `Teléfono: ${admission.phonePatient}`
      ];

      for (const field of pacienteFields) {
        const fieldHeight = doc.heightOfString(field, { width: 320 });
        doc.text(field, startX, pacienteY + 20);
        pacienteY += fieldHeight + 5;
      }

      const companionX = startX + 280;
      acompananteY = lineY + 30;

      doc.moveTo(companionX - 40, acompananteY).lineTo(companionX + 180, acompananteY).stroke();
      doc.text('ACUDIENTE', companionX - 40, acompananteY + 5);

      const acompananteFields = [
        `Nombre: ${admission.nameCompanion || 'N/A'}`,
        `Nº Documento: ${admission.documentCompanion || 'N/A'}`,
        `Parentesco: ${await this.mapRelation(admission.relationCompanion) || 'N/A'}`,
        `Teléfono: ${admission.phoneCompanion || 'N/A'}`
      ];

      let currentY = acompananteY + 20;
      for (const field of acompananteFields) {
        const fieldHeight = doc.heightOfString(field, { width: 320 });
        doc.text(field, companionX - 40, currentY);
        currentY += fieldHeight + 5; 
      }
      
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

      const pageHeight = doc.page.height;
        const bottomMargin = doc.page.margins.bottom;
        const footerHeight = 60;
    
        const footerY = pageHeight - bottomMargin - footerHeight + 10; 
  
        doc.image('./src/assets/footer.png', 210, footerY + 60, { width: 200, height: 50 });

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
   * Genera un PDF con el comprobante de admisión básico
   * @param res - Objeto Response de Express
   * @param req - Objeto Request de Mssql
   * @param documentPatient - Documento de identidad del paciente
   * @param consecutiveAdmission - Consecutivo de la admisión
   * @param numberFac - Número de factura
   * @throws InternalServerErrorException Si falla la generación del PDF
   */
  async generatePdfFac(res: Response, req: Request, documentPatient: string, consecutiveAdmission: number, numberFac?: string) {
    try {
        let procedures = [], supplies = [];
        const admission = await this.admissionService.getSignedAdmissionKeys(documentPatient, consecutiveAdmission);
        const pabellon = await this.getPab(req, documentPatient, consecutiveAdmission, numberFac);

        if (!admission) {
            throw new InternalServerErrorException('No se encontró una admisión con firma digital.');
        }

        if (numberFac) {
            procedures = await this.getFactDetailsPro(res, documentPatient, consecutiveAdmission.toString(), numberFac);
            supplies = await this.getFactDetailsSum(res, documentPatient, consecutiveAdmission.toString(), numberFac);
        }

        res.setHeader('Content-Disposition', 'attachment; filename=comprobante.pdf');
        res.setHeader('Content-Type', 'application/pdf');

        const doc = new PDFDocument({
            size: 'A4',
            margins: { top: 150, left: 50, right: 50, bottom: 50 },
            bufferPages: true
        });

        const addHeader = () => {
            const pageWidth = 595.28;
            const leftMargin = 50;
            const rightMargin = 550;
            const centerX = pageWidth / 2;

            const savedY = doc.y;

            doc.image('./src/assets/logo.png', leftMargin, 50, { width: 60 });
            doc.image('./src/assets/logo2.png', leftMargin + 430, 40, { width: 75 });
            doc.fontSize(14).text(process.env.NOMBRE_HOSPITAL, centerX - 200, 50, { width: 400, align: 'center' });
            doc.fontSize(10).text(process.env.NIT_HOSPITAL, centerX - 200, 70, { width: 400, align: 'center' });
            doc.fontSize(12).text(process.env.NOMBRE_DOCUMENTO_HOSPITAL, centerX - 200, 90, { width: 400, align: 'center' });

            doc.moveTo(leftMargin, 120).lineTo(rightMargin, 120).stroke();
            doc.fontSize(9).text(process.env.DESCRIPCION_DOCUMENTO_HOSPITAL, centerX - 200, 130, { width: 400, align: 'center', italic: true });

            doc.y = savedY;
        };

        const addFooter = () => {
          const pageHeight = doc.page.height;
          const bottomMargin = doc.page.margins.bottom;
          const footerHeight = 60;
      
          const footerY = pageHeight - bottomMargin - footerHeight + 10; 
    
          doc.image('./src/assets/footer.png', 190, footerY + 35, { width: 200, height: 50 });
      };

        doc.on('pageAdded', () => {
          addHeader();
          addFooter();
      });

        doc.pipe(res);

        addHeader();
        addFooter();

        const pageWidth = 595.28;
        const leftMargin = 50;
        const rightMargin = 550;
        const centerX = pageWidth / 2;

        let currentY = 170;
        doc.fontSize(10).text(`Fecha: ${this.formatDate(admission.dateAdmission)}`, leftMargin, currentY, { continued: true });
        doc.text(`Nº de Factura: ${numberFac || 'N/A'}`, { align: 'right' });

        currentY += 25;
        doc.fontSize(10).text(`Nombre Paciente: ${admission.fullNamePatient}`, leftMargin, currentY);
        currentY += 20;
        doc.fontSize(10).text(`Documento Paciente: ${admission.documentPatient}`, leftMargin, currentY);
        currentY += 20;
        doc.fontSize(10).text(`Servicio Prestado: ${await this.mapService(pabellon)}`, leftMargin, currentY);
        currentY += 20;

        if (procedures.length > 0) {
            currentY = this.addSectionWithPageBreak(doc, currentY, 'Procedimientos:', procedures);
        }

        if (supplies.length > 0) {
            currentY = this.addSectionWithPageBreak(doc, currentY, 'Suministros:', supplies);
        }

        const normativaText = process.env.NORMATIVA_DOCUMENTO_HOSPITAL || "";
        const normativaHeight = doc.heightOfString(normativaText, {
            width: rightMargin - leftMargin
        });

        if (currentY + normativaHeight + 50 > doc.page.height - doc.page.margins.bottom) {
            doc.addPage();
            currentY = 170;
        }

        doc.fontSize(10).text(normativaText, leftMargin, currentY, {
            align: 'justify',
            width: rightMargin - leftMargin
        });
        currentY += normativaHeight + 30;

        if (currentY + 150 > doc.page.height - doc.page.margins.bottom) {
            doc.addPage();
            currentY = 170; 
        }

        await this.addSignatureToDocument(doc, admission, leftMargin, currentY);

        doc.end();
    } catch (error) {
        await this.logService.logAndThrow('error', `Error al generar el PDF: ${error.message}`, 'DocumentService');
        throw new InternalServerErrorException(`Error generando PDF: ${error.message}`);
    }
  }

  /**
   * Agrega una sección al documento PDF que contiene una lista de elementos con salto de página automático
   * si el contenido sobrepasa el espacio disponible en la página actual.
   * 
   * @param doc - Documento PDF sobre el que se está escribiendo.
   * @param currentY - Posición vertical actual desde la cual empezar a escribir.
   * @param title - Título de la sección que se mostrará encima de los elementos.
   * @param items - Lista de objetos que contienen los datos a mostrar (deben tener 'codePro' y 'namePro').
   * @returns La nueva posición vertical después de haber escrito todos los elementos.
   */
  private addSectionWithPageBreak(doc: PDFDocument, currentY: number, title: string, items: any[]): number {
    const leftMargin = 50;
    const rightMargin = 550;
    
    doc.fontSize(10).text(title, leftMargin, currentY);
    currentY += 20;

    doc.fontSize(10).text('Código', leftMargin, currentY);
    doc.text('Nombre', leftMargin + 100, currentY);
    currentY += 15;
    doc.moveTo(leftMargin, currentY).lineTo(rightMargin, currentY).stroke();
    currentY += 10;

    items.forEach(item => {
        const textHeight = doc.heightOfString(item.namePro, { width: 400 });
        
        if (currentY + textHeight + 20 > doc.page.height - doc.page.margins.bottom) {
            doc.addPage();
            currentY = 50;
        }
        
        doc.fontSize(9).text(item.codePro, leftMargin, currentY);
        doc.fontSize(9).text(item.namePro, leftMargin + 100, currentY, { width: 400 });
        currentY += textHeight + 10;
    });

    return currentY + 10; 
  }

  /**
   * Agrega las firmas del paciente y/o acudiente al documento PDF, junto con la información relacionada,
   * como nombres, documentos y teléfonos. También dibuja líneas de firma debajo de cada imagen.
   * 
   * @param doc - Documento PDF al que se le agregarán las firmas.
   * @param admission - Objeto que contiene la información de la admisión, incluidas las firmas y los datos de contacto.
   * @param leftMargin - Margen izquierdo desde donde se empieza a dibujar.
   * @param signatureStartY - Posición vertical inicial donde se colocarán las firmas.
   */
  async addSignatureToDocument(doc: PDFDocument, admission: any, leftMargin: number, signatureStartY: number) {
    const signatureWidth = 200; 
    const signatureHeight = 100; 
    const gapBetweenSignatures = 50;
    const lineY = signatureStartY + signatureHeight - 20; 

    if (admission.digitalSignature && admission.digitalSignature.signatureData) {
        try {
            const signatureBuffer = await this.signatureService.getSignature(admission.digitalSignature.signatureData);
            const signatureImage = signatureBuffer.toString('base64');
            const imagePath = `data:image/png;base64,${signatureImage}`;
            const signatureY = signatureStartY;

            if (admission.digitalSignature.signedBy === 'patient') {
                doc.image(imagePath, leftMargin, signatureY, { 
                    width: signatureWidth, 
                    height: signatureHeight,
                    align: 'center',
                    valign: 'center'
                });
            } else if (admission.digitalSignature.signedBy === 'companion') {
                doc.image(imagePath, leftMargin + signatureWidth + gapBetweenSignatures, signatureY, { 
                    width: signatureWidth, 
                    height: signatureHeight,
                    align: 'center',
                    valign: 'center'
                });
            }
        } catch (error) {
            await this.logService.logAndThrow('error', `Error al cargar la firma: ${error.message}`, 'DocumentService');
            throw new InternalServerErrorException(`Error cargando la firma: ${error.message}`);
        }
    }

    doc.moveTo(leftMargin, lineY).lineTo(leftMargin + signatureWidth, lineY).stroke();
    doc.fontSize(10).text('PACIENTE', leftMargin, lineY + 5);
    doc.text(`Nº Documento: ${admission.documentPatient}`, leftMargin, lineY + 20);
    doc.text(`Teléfono: ${admission.phonePatient}`, leftMargin, lineY + 35);

    const companionX = leftMargin + signatureWidth + gapBetweenSignatures;
    doc.moveTo(companionX, lineY).lineTo(companionX + signatureWidth, lineY).stroke();
    doc.fontSize(10).text('ACUDIENTE', companionX, lineY + 5);
    doc.text(`Nombre: ${admission.nameCompanion}`, companionX, lineY + 20);
    doc.text(`Nº Documento: ${admission.documentCompanion}`, companionX, lineY + 35);
    doc.text(`Parentesco: ${await this.mapRelation(admission.relationCompanion)}`, companionX, lineY + 50);
    doc.text(`Teléfono: ${admission.phoneCompanion}`, companionX, lineY + 65);
  }
}