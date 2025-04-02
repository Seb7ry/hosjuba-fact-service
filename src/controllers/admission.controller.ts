import { Body, Controller, Get, InternalServerErrorException, NotFoundException, Param, ParseIntPipe, Post, Put, Query, Req, Request, UnauthorizedException, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";
import { Admission } from "src/model/admission.model";
import { AdmissionService } from "src/service/admission.service";
import { TokenService } from "src/service/token.service";

@Controller('admission')
export class AdmissionController {
    
    constructor(
        private readonly admissionService: AdmissionService,
        private readonly tokenService: TokenService
    ) { }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getAllAdmissions(@Request() req: any): Promise<Admission[]>{
        try{
            return await this.admissionService.getAllAdmissions(req);
        }catch(error){
            throw new NotFoundException('No se pudieron obtener las admisiones.');
        }
    }

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

    @Get('filtrer')
    @UseGuards(JwtAuthGuard)
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
    
    @Post('save')
    @UseGuards(JwtAuthGuard)
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
    
    @Get('signedFiltrer')
    @UseGuards(JwtAuthGuard)
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

            // Convertimos los documentos a Admission[] si es necesario
            return filteredAdmissions.map(admission => admission as Admission);
            
        } catch (error) {
            throw new InternalServerErrorException('Error al obtener las admisiones filtradas', error);
        }
    }
    
    @Put('updateSigned')
    @UseGuards(JwtAuthGuard)
    async updateAdmission(
        @Request() req: Request,
        @Query('documentPatient') documentPatient: string,
        @Query('consecutiveAdmission') consecutiveAdmission: string
    ): Promise<Admission> {
        try {
            // Llamamos al servicio para actualizar la admisión sin pasar los datos adicionales
            return await this.admissionService.updateAdmission(req, documentPatient, consecutiveAdmission);
        } catch (error) {
            throw new NotFoundException('No se pudo actualizar la admisión.', error);
        }
    }
}