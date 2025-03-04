import { Body, Controller, Get, NotFoundException, Post, Query, UnauthorizedException, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";
import { Admission } from "src/model/admission.model";
import { AdmissionService } from "src/service/admission.service";

@Controller('admissions')
export class AdmissionController {
    constructor(private readonly admissionService: AdmissionService) { }

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
     * Obtiene la admisión filtrando por documento del paciente o consecutivo de la admisión.
     * 
     * Si se proporciona el documento del paciente, busca todas las admisiones asociadas a ese documento.
     * Si se proporciona el consecutivo de la admisión, busca la admisión específica con ese consecutivo.
     * 
     * @param documentPatient - El número de documento del paciente.
     * @param consecutiveAdmission - El consecutivo de la admisión.
     * @returns La admisión encontrada o una excepción si no se encuentra.
     */
    
    @Get()
    @UseGuards(JwtAuthGuard)
    async getAdmissionByKeys(
        @Query('documentPatient') documentPatient: string,
        @Query('consecutiveAdmission') consecutiveAdmission: string,
    ): Promise<Admission> {
        // Validar si se pasa el documento del paciente, es obligatorio
        if (!documentPatient) {
            throw new UnauthorizedException("El número de documento es obligatorio.");
        }

        // Llamada al servicio con el documento y el consecutivo si existe
        const admission = await this.admissionService.getAdmissionByKeys(documentPatient, consecutiveAdmission);

        if (!admission) {
            throw new UnauthorizedException("Admisión no encontrada.");
        }

        return admission;
    }
    
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
}