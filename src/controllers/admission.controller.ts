import { Body, Controller, Get, NotFoundException, Post, Query } from "@nestjs/common";
import { Admission } from "src/model/admission.model";
import { AdmissionService } from "src/service/admission.service";

@Controller('admissions')
export class AdmissionController {
    constructor(private readonly admissionService: AdmissionService) { }

    @Get()
    async getAllAdmissions(): Promise<Admission[]>{
        try{
            return await this.admissionService.getAllAdmissions();
        }catch(error){
            throw new NotFoundException('No se pudieron obtener las admisiones.');
        }
    }

    @Get('id')
    async getAdmissionByKeys(
        @Query('documentPatient') documentPatient: string,
        @Query('consecutiveAdmission') consecutiveAdmission: string): Promise<Admission>{
            
        const admission = await this.admissionService.getAdmissionByKeys(documentPatient, consecutiveAdmission);

        if(!admission) throw new NotFoundException("Admisión no encontrada.");

        return admission;
    }

    @Post('save')
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