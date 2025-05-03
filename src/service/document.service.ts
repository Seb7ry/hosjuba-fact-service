import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as PDFDocument from 'pdfkit';
import { Response } from 'express';
import { Request } from 'mssql';

import { AdmissionService } from './admission.service';
import { SignatureService } from './signature.service';
import { LogService } from './log.service';

@Injectable()
export class DocumentService {

  private readonly FOOTER_HEIGHT_EXTRA = 55;

  private getLocalProceduresAndSupplies(consecutiveAdmission: string) {
    const mock = {
      procedures: [],
      supplies: []
    };
  
    if (consecutiveAdmission === 'ADM-2025-0001') {
      mock.procedures = [
        { codePro: 'P001', namePro: 'Curación menor' },
        { codePro: 'P002', namePro: 'Aplicación de inyección' },
        { codePro: 'P003', namePro: 'Electrocardiograma' }
      ];
      mock.supplies = [
        { codePro: 'S001', namePro: 'Gasas estériles' },
        { codePro: 'S002', namePro: 'Jeringa 5ml' },
        { codePro: 'S003', namePro: 'Solución salina' },
        { codePro: 'S004', namePro: 'Guantes quirúrgicos' },
        { codePro: 'S005', namePro: 'Esparadrapo' }
      ];
    }
  
    if (consecutiveAdmission === 'ADM-2025-0002') {
      mock.procedures = [
        { codePro: 'P004', namePro: 'Toma de presión arterial' },
        { codePro: 'P005', namePro: 'Consulta general' },
        { codePro: 'P006', namePro: 'Evaluación médica' }
      ];
      mock.supplies = [
        { codePro: 'S006', namePro: 'Alcohol antiséptico' },
        { codePro: 'S007', namePro: 'Termómetro digital' },
        { codePro: 'S008', namePro: 'Tensiómetro manual' }
      ];
    }
  
    return mock;
  }  

  constructor(
    private readonly admissionService: AdmissionService,
    private readonly signatureService: SignatureService,
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

  private formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  async getFact(req: Request, documentPatient: string, consecutiveAdmission: string): Promise<any[]> {
    try {
      const facturasMap: Record<string, any[]> = {
        'ADM-2025-0001': [
          { FacDscPrf: 'Factura de urgencias 1', MPNFac: 'FAC001' },
          { FacDscPrf: 'Factura de urgencias 2', MPNFac: 'FAC002' }
        ],
        'ADM-2025-0002': [
          { FacDscPrf: 'Factura de consulta 1', MPNFac: 'FAC003' },
          { FacDscPrf: 'Factura de consulta 2', MPNFac: 'FAC004' }
        ]
      };
  
      return facturasMap[consecutiveAdmission] || [];
    } catch (error) {
      await this.logService.logAndThrow(
        'error',
        `Error al obtener facturas locales [doc: ${documentPatient}, admisión: ${consecutiveAdmission}] : ${error}`,
        'DocumentService'
      );
      throw new InternalServerErrorException('No se pudo obtener la lista de facturas.', error);
    }
  }

  async getPab(req: Request, documentPatient: string, consecutiveAdmission: number, numberFac: string): Promise<string> {
    try {
      const pabellones: Record<string, string> = {
        'FAC001': '1',
        'FAC002': '2',
        'FAC003': '99',
        'FAC004': '99'
      };
  
      return pabellones[numberFac] || 'Pabellón desconocido';
    } catch (error) {
      await this.logService.logAndThrow(
        'error',
        `Error al obtener pabellón [doc: ${documentPatient}, admisión: ${consecutiveAdmission}, factura: ${numberFac}] : ${error}`,
        'DocumentService'
      );
      throw new InternalServerErrorException('No se pudo obtener el pabellón.', error);
    }
  }  

  async getFactDetailsPro(req: Request, documentPatient: string, consecutiveAdmission: string, numberFac: string): Promise<any[]> {
    try {
      const { procedures } = this.getLocalProceduresAndSupplies(consecutiveAdmission);
  
      const facturaMap: Record<string, string[]> = {
        'FAC001': ['P001', 'P002'],
        'FAC002': ['P003'],
        'FAC003': ['P004'],
        'FAC004': ['P005', 'P006']
      };
  
      const codes = facturaMap[numberFac] || [];
      return procedures.filter(p => codes.includes(p.codePro));
    } catch (error) {
      await this.logService.logAndThrow(
        'error',
        `Error al obtener procedimientos locales [doc: ${documentPatient}, admisión: ${consecutiveAdmission}, factura: ${numberFac}] : ${error}`,
        'DocumentService'
      );
      throw new InternalServerErrorException('No se pudieron obtener los procedimientos.', error);
    }
  }  

  async getFactDetailsSum(req: Request, documentPatient: string, consecutiveAdmission: string, numberFac: string): Promise<any[]> {
    try {
      const { supplies } = this.getLocalProceduresAndSupplies(consecutiveAdmission);
  
      const facturaMap: Record<string, string[]> = {
        'FAC001': ['S001', 'S002'],
        'FAC002': ['S003', 'S004', 'S005'],
        'FAC003': ['S006'],
        'FAC004': ['S007', 'S008']
      };
  
      const codes = facturaMap[numberFac] || [];
      return supplies.filter(s => codes.includes(s.codePro));
    } catch (error) {
      await this.logService.logAndThrow(
        'error',
        `Error al obtener suministros locales [doc: ${documentPatient}, admisión: ${consecutiveAdmission}, factura: ${numberFac}] : ${error}`,
        'DocumentService'
      );
      throw new InternalServerErrorException('No se pudieron obtener los suministros.', error);
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

      // Añadir marca de agua vertical rotada (al inicio del documento)
      doc.save()
         .translate(20, 300) // Posición izquierda (x=20) y centrado vertical aproximado (y=300)
         .rotate(-90) // Rotación 90° antihorario
         .image('./src/assets/footer.png', -120, 0, {
             width: 150, // Ancho después de rotación
             height: 40, // Alto después de rotación
             opacity: 0.2 // Transparencia para marca de agua
         })
         .restore();

      // Logos y contenido principal (manteniendo tu código original)
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
      
      // Resto del contenido original...
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
      
      doc.fontSize(12).text(process.env.NORMATIVA_DOCUMENTO_HOSPITAL, { align: 'justify' });
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

      // Añadir footer al final del documento
      const footerY = 645; // Posición fija aproximada para el footer
      
      // Línea separadora del footer
      doc.moveTo(50, footerY)
         .lineTo(550, footerY)
         .lineWidth(0.5)
         .stroke();
      
      // Contenido del footer
      doc.fontSize(8)
         .text(process.env.DIRECCION_HOSPITAL || '', 50, footerY + 10, {
             width: 500,
             align: 'center'
         })
         .text(`Tel: ${process.env.TELEFONO_HOSPITAL || ''}`, 50, doc.y + 5, {
             width: 500,
             align: 'center'
         })
         .text(process.env.PAGINA_HOSPITAL || '', 50, doc.y + 5, {
             width: 500,
             align: 'center'
         });

         const correos = [
          process.env.CORREO2_HOSPITAL,
          process.env.CORREO3_HOSPITAL,
          process.env.CORREO4_HOSPITAL
          ].filter(Boolean).join(' | ');
      
          doc.text(correos, 50, doc.y + 4, {
              width: 500,
              align: 'center'
          });

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
            margins: { top: 150, left: 50, right: 50, bottom: 20 },
            bufferPages: true
        });

        const addHeader = () => {
            const pageWidth = 595.28;
            const leftMargin = 50;
            const rightMargin = 550;
            const centerX = pageWidth / 2;
            const pageHeight = 842;

            const savedY = doc.y;

            const imgWidth = 30; 
            const imgHeight = 150; 
            const imgX = 20; 
            const imgY = pageHeight / 2 - imgWidth / 2; 

            doc.save();
            doc.translate(imgX, imgY)
            .rotate(-90)
            .image('./src/assets/footer.png', 100, 0, { 
                width: imgHeight, 
                height: imgWidth
            })
            .restore();

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
          const footerStartY = pageHeight - bottomMargin - this.FOOTER_HEIGHT_EXTRA; 
          
          const centerX = 297.64; 
          const footerWidth = 500;
          const leftX = centerX - footerWidth / 2;
          const rightX = leftX + footerWidth;
      
          doc.lineWidth(0.5);
          doc.moveTo(leftX, footerStartY)
             .lineTo(rightX, footerStartY)
             .stroke();
          doc.lineWidth(1); 

          const textStartY = footerStartY + 8; 
          
          doc.fontSize(7);
          doc.text(process.env.DIRECCION_HOSPITAL || '', leftX, textStartY, {
              width: footerWidth,
              align: 'center'
          });
      
          doc.text(`Tel: ${process.env.TELEFONO_HOSPITAL || ''}`, leftX, doc.y + 4, {
              width: footerWidth,
              align: 'center'
          });
      
          doc.text(process.env.PAGINA_HOSPITAL || '', leftX, doc.y + 4, {
              width: footerWidth,
              align: 'center'
          });
      
          const correos = [
              process.env.CORREO2_HOSPITAL,
              process.env.CORREO3_HOSPITAL,
              process.env.CORREO4_HOSPITAL
          ].filter(Boolean).join(' | ');
      
          doc.text(correos, leftX, doc.y + 4, {
              width: footerWidth,
              align: 'center'
          });
      };

        doc.on('pageAdded', () => {
          const pageHeight = doc.page.height;
          doc.image('./src/assets/footer.png', 10, (pageHeight/2) - 100, { 
              width: 20,
              align: 'center',
              valign: 'center'
          });

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

        if (currentY + normativaHeight + 70 > doc.page.height - doc.page.margins.bottom - this.FOOTER_HEIGHT_EXTRA) {
            doc.addPage();
            currentY = 170;
        }

        doc.fontSize(10).text(normativaText, leftMargin, currentY, {
            align: 'justify',
            width: rightMargin - leftMargin
        });
        currentY += normativaHeight + 30;

        if (currentY + 150 > doc.page.height - doc.page.margins.bottom - this.FOOTER_HEIGHT_EXTRA) {
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
    const safeTopMargin = 170;

    doc.fontSize(10).text(title, leftMargin, currentY);
    currentY += 20;

    doc.fontSize(10).text('Código', leftMargin, currentY);
    doc.text('Nombre', leftMargin + 100, currentY);
    currentY += 15;
    doc.moveTo(leftMargin, currentY).lineTo(rightMargin, currentY).stroke();
    currentY += 10;

    items.forEach(item => {
        const textHeight = doc.heightOfString(item.namePro, { width: 400 });
        
        if (currentY + textHeight + 20 > doc.page.height - doc.page.margins.bottom - this.FOOTER_HEIGHT_EXTRA) {
            doc.addPage();
            currentY = safeTopMargin;
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
    const totalSignatureHeight = 150;
    
    if (signatureStartY + totalSignatureHeight > doc.page.height - doc.page.margins.bottom - this.FOOTER_HEIGHT_EXTRA) {
      doc.addPage();
      signatureStartY = 170;
    }
    
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