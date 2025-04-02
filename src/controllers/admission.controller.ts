import { Body, Controller, Get, InternalServerErrorException, NotFoundException, Post, Put, Query, Request, UnauthorizedException, UseGuards, UseInterceptors } from "@nestjs/common";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";
import { RefreshTokenInterceptor } from "src/interceptor/refreshToken.interceptor";
import { Admission } from "src/model/admission.model";
import { AdmissionService } from "src/service/admission.service";

/**
 * Controlador para gestión de admisiones médicas
 * 
 * Proporciona endpoints para:
 * - Consulta de admisiones (generales, filtradas y firmadas)
 * - Registro y actualización de admisiones
 * - Manejo de firmas digitales
 * 
 * Todas las rutas requieren autenticación JWT
 */
@Controller('admission')
export class AdmissionController {
    
    constructor(
        private readonly admissionService: AdmissionService
    ) { }

    /**
     * Obtiene todas las admisiones del sistema
     * @param req Objeto Request con información del usuario
     * @returns Listado completo de admisiones
     * @throws NotFoundException Si no se encuentran admisiones
     */
    @Get()
    @UseGuards(JwtAuthGuard)
    async getAllAdmissions(@Request() req: any): Promise<Admission[]>{
        try{
            return await this.admissionService.getAllAdmissions(req);
        }catch(error){
            throw new NotFoundException('No se pudieron obtener las admisiones.');
        }
    }

    /**
     * Busca una admisión específica por documento y consecutivo
     * @param documentPatient Documento del paciente (requerido)
     * @param consecutiveAdmission Consecutivo de admisión
     * @returns Admisión encontrada
     * @throws UnauthorizedException Si falta documento
     * @throws InternalServerErrorException Si no se encuentra
     */
    @Get('id')
    @UseGuards(JwtAuthGuard)
    async getAdmissionByKeys(
        @Query('documentPatient') documentPatient: string,
        @Query('consecutiveAdmission') consecutiveAdmission: string,
    ): Promise<Admission> {
        if (!documentPatient) {
            throw new UnauthorizedException("El número de documento es obligatorio.");
        }
        const admission = await this.admissionService.getAdmissionByKeys(documentPatient, consecutiveAdmission);

        if (!admission) {
            throw new InternalServerErrorException("Admisión no encontrada.");
        }

        return admission;
    }

    /**
     * Filtra admisiones con múltiples criterios
     * @param req Objeto Request
     * @param documentPatient Documento del paciente (requerido)
     * @param consecutiveAdmission Consecutivo de admisión
     * @param startDateAdmission Fecha inicial (opcional)
     * @param endDateAdmission Fecha final (opcional)
     * @param userAdmission Usuario que registró (opcional)
     * @param typeAdmission Tipo de admisión (opcional)
     * @returns Listado de admisiones filtradas
     * @throws UnauthorizedException Si faltan parámetros requeridos
     */
    @Get('filtrer')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(RefreshTokenInterceptor)
    async getAdmissionFiltrer(
        @Request() req: Request,
        @Query('documentPatient') documentPatient: string,
        @Query('consecutiveAdmission') consecutiveAdmission: string,
        @Query('startDateAdmission') startDateAdmission: string,
        @Query('endDateAdmission') endDateAdmission:string,
        @Query('userAdmission') userAdmission: string,
        @Query('typeAdmission') typeAdmission: string
    ): Promise<Admission[]> {
        if (!documentPatient) {
            throw new UnauthorizedException("El número de documento es obligatorio.");
        }
        const admission = await this.admissionService.getAdmissionFiltrer(
            req,
            documentPatient, 
            consecutiveAdmission,
            startDateAdmission,
            endDateAdmission,
            userAdmission,
            typeAdmission);

        if (admission.length === 0) {
            throw new UnauthorizedException("No se encontraron admisiones.");
        }

        return admission;
    }
    
    /**
     * Guarda una admisión con firma digital
     * @param req Objeto Request
     * @param documentPatient Documento del paciente
     * @param consecutiveAdmission Consecutivo de admisión
     * @param signature Firma digital en base64
     * @param signedBy Tipo de firmante (paciente/acompañante)
     * @returns Admisión guardada
     * @throws NotFoundException Si falla el guardado
     */
    @Post('save')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(RefreshTokenInterceptor)
    async saveAdmission(
        @Request() req: Request,
        @Query('documentPatient') documentPatient: string,  
        @Query('consecutiveAdmission') consecutiveAdmission: string,  
        @Body('signature') signature: string,  
        @Body('signedBy') signedBy: string 
    ): Promise<Admission> {
        try {
            return await this.admissionService.saveAdmission(req, documentPatient, consecutiveAdmission, signature, signedBy);
        } catch (error) {
            throw new NotFoundException('No se pudo guardar la admisión con la firma digital.', error);
        }
    }

    /**
     * Obtiene admisiones firmadas específicas
     * @param admissions Array de objetos con documento y consecutivo
     * @returns Listado de admisiones firmadas
     * @throws NotFoundException Si la lista es inválida o vacía
     */
    @Post('signed')
    @UseGuards(JwtAuthGuard)
    async getSignedAdmissions(
        @Body('admissions') admissions: { documentPatient: string; consecutiveAdmission: number }[]
    ): Promise<any[]> {
        try {
            if (!Array.isArray(admissions) || admissions.length === 0) {
                throw new NotFoundException("Debes proporcionar una lista de admisiones válida.");
            }

            return await this.admissionService.getSignedAdmissions(admissions);
        } catch (error) {
            console.error("❌ Error en getSignedAdmissions:", error);
            throw new NotFoundException('No se pudo obtener la lista de admisiones firmadas.');
        }
    }

    /**
     * Obtiene todas las admisiones firmadas
     * @returns Listado completo de admisiones firmadas
     * @throws InternalServerErrorException Si falla la consulta
     */
    @Get('signedAll')
    @UseGuards(JwtAuthGuard)
    async getSignedAdmissionsAll(){
        try {
            const admissions = await this.admissionService.getSignedAdmissionsAll();
            return admissions;
        } catch (error) {
            throw new InternalServerErrorException('No se pudieron obtener las admisiones', error);
        }
    }
    
    /**
     * Filtra admisiones firmadas con múltiples criterios
     * @param req Objeto Request
     * @param documentPatient Documento del paciente
     * @param consecutiveAdmission Consecutivo de admisión
     * @param startDateAdmission Fecha inicial (opcional)
     * @param endDateAdmission Fecha final (opcional)
     * @param userAdmission Usuario que registró (opcional)
     * @param typeAdmission Tipo de admisión (opcional)
     * @returns Listado de admisiones firmadas filtradas
     * @throws NotFoundException Si no se encuentran resultados
     * @throws InternalServerErrorException Si falla el filtrado
     */
    @Get('signedFiltrer')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(RefreshTokenInterceptor)
    async getSignedAdmissionsFiltrer(
        @Request() req: Request,
        @Query('documentPatient') documentPatient: string,
        @Query('consecutiveAdmission') consecutiveAdmission: string,
        @Query('startDateAdmission') startDateAdmission: string,
        @Query('endDateAdmission') endDateAdmission: string,
        @Query('userAdmission') userAdmission: string,
        @Query('typeAdmission') typeAdmission: string
    ): Promise<Admission[]> {
        try {
            const filteredAdmissions = await this.admissionService.getSignedAdmissionsFiltrer(
                req,
                documentPatient, 
                consecutiveAdmission, 
                startDateAdmission, 
                endDateAdmission, 
                userAdmission, 
                typeAdmission
            );

            if (filteredAdmissions.length === 0) {
                throw new NotFoundException('No se encontraron admisiones con los filtros proporcionados.');
            }

            return filteredAdmissions.map(admission => admission as Admission);
            
        } catch (error) {
            throw new InternalServerErrorException('Error al obtener las admisiones filtradas', error);
        }
    }
    
    /**
     * Actualiza una admisión existente
     * @param req Objeto Request
     * @param documentPatient Documento del paciente
     * @param consecutiveAdmission Consecutivo de admisión
     * @returns Admisión actualizada
     * @throws NotFoundException Si no se puede actualizar
     */
    @Put('updateSigned')
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(RefreshTokenInterceptor)
    async updateAdmission(
        @Request() req: Request,
        @Query('documentPatient') documentPatient: string,
        @Query('consecutiveAdmission') consecutiveAdmission: string
    ): Promise<Admission> {
        try {
            return await this.admissionService.updateAdmission(req, documentPatient, consecutiveAdmission);
        } catch (error) {
            throw new NotFoundException('No se pudo actualizar la admisión.', error);
        }
    }
}