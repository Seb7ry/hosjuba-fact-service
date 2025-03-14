import { Body, Controller, Get, NotFoundException, Post, Query, UnauthorizedException, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";
import { Admission } from "src/model/admission.model";
import { AdmissionService } from "src/service/admission.service";

/**
 * Controlador de las admisiones.
 * Este controlador expone los endpoints para obtener, filtrar, y guardar admisiones.
 * Utiliza el guardia de autenticación JWT para proteger los endpoints.
 */
@Controller('admission')
export class AdmissionController {
    
    /**
     * Constructor del controlador de admisiones.
     * @param admissionService - Servicio que gestiona las operaciones relacionadas con las admisiones.
     */
    constructor(private readonly admissionService: AdmissionService) { }

    /**
     * Obtiene todas las admisiones.
     * 
     * Este endpoint obtiene todas las admisiones almacenadas en el sistema. 
     * Utiliza el guardia `JwtAuthGuard` para asegurar que el usuario esté autenticado.
     * 
     * @returns Una lista de objetos `Admission`.
     * @throws `NotFoundException` si no se pueden obtener las admisiones.
     */
    @Get()
    @UseGuards(JwtAuthGuard)
    async getAllAdmissions(): Promise<Admission[]>{
        try{
            return await this.admissionService.getAllAdmissions();
        }catch(error){
            throw new NotFoundException('No se pudieron obtener las admisiones.');
        }
    }

    /**
     * Obtiene una admisión específica utilizando las claves `documentPatient` y `consecutiveAdmission`.
     * 
     * Si el número de documento no es proporcionado, lanza una excepción de tipo `UnauthorizedException`.
     * Si no se encuentra la admisión, lanza una excepción de tipo `UnauthorizedException`.
     * 
     * @param documentPatient - El número de documento del paciente.
     * @param consecutiveAdmission - El consecutivo de la admisión.
     * @returns La admisión correspondiente a los parámetros dados.
     * @throws `UnauthorizedException` si el número de documento no está presente o si la admisión no se encuentra.
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
            throw new UnauthorizedException("Admisión no encontrada.");
        }

        return admission;
    }

    /**
     * Obtiene las admisiones filtradas según los parámetros proporcionados.
     * 
     * Este endpoint permite filtrar las admisiones por diversos criterios como el documento del paciente, 
     * el consecutivo de la admisión, fechas de inicio y fin, usuario que registró la admisión y el tipo de admisión.
     * 
     * @param documentPatient - El número de documento del paciente.
     * @param consecutiveAdmission - El consecutivo de la admisión.
     * @param startDateAdmission - La fecha de inicio de la admisión.
     * @param endDateAdmission - La fecha final de la admisión.
     * @param userAdmission - El usuario que registró la admisión.
     * @param typeAdmission - El tipo de admisión.
     * @returns Una lista de objetos `Admission` que cumplen con los criterios de filtrado.
     * @throws `UnauthorizedException` si no se encuentra la admisión o si faltan parámetros obligatorios.
     */
    @Get('filtrer')
    @UseGuards(JwtAuthGuard)
    async getAdmissionFiltrer(
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
     * Guarda una nueva admisión con la firma digital proporcionada.
     * 
     * Este endpoint guarda una nueva admisión en la base de datos utilizando los parámetros proporcionados.
     * La firma digital debe ser proporcionada en el cuerpo de la solicitud.
     * 
     * @param documentPatient - El número de documento del paciente.
     * @param consecutiveAdmission - El consecutivo de la admisión.
     * @param signature - La firma digital del paciente.
     * @returns La admisión guardada con la firma digital.
     * @throws `NotFoundException` si no se puede guardar la admisión.
     */
    @Post('save')
    @UseGuards(JwtAuthGuard)
    async saveAdmission(
        @Query('documentPatient') documentPatient: string,
        @Query('consecutiveAdmission') consecutiveAdmission: string,
        @Body('signature') signature: string): Promise<Admission>{
            
        try {
            return await this.admissionService.saveAdmission(documentPatient, consecutiveAdmission, signature);
        } catch (error) {
            console.log(error)
            throw new NotFoundException('No se pudo guardar la admisión con la firma digital.');
        }
    }

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
}