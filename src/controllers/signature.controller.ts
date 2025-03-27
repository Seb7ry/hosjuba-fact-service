import { 
    Controller, 
    Post, 
    Get, 
    Body, 
    Param, 
    UseGuards, 
    NotFoundException, 
    InternalServerErrorException, 
    BadRequestException 
} from "@nestjs/common";
import { SignatureService } from "../service/signature.service";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";
import { Types } from "mongoose";

@Controller("signatures")
export class SignatureController {
    constructor(private readonly signatureService: SignatureService) {}

    @Post("upload")
    @UseGuards(JwtAuthGuard)
    async uploadSignature(@Body() body: { signatureBase64: string; filename: string }) {
        try {
            if (!body.signatureBase64 || !body.filename) {
                throw new BadRequestException("La firma y el nombre de archivo son obligatorios.");
            }

            const fileId = await this.signatureService.storeSignature(body.signatureBase64, body.filename);
            return { success: true, message: "Firma guardada con éxito", fileId };
        } catch (error) {
            console.error("❌ Error en uploadSignature:", error);
            throw new InternalServerErrorException("Error al guardar la firma.");
        }
    }

    @Get(":id")
    @UseGuards(JwtAuthGuard)
    async getSignature(@Param("id") id: string) {
        try {
            if (!Types.ObjectId.isValid(id)) {
                throw new BadRequestException("El ID de la firma no es válido.");
            }

            const signatureBuffer = await this.signatureService.getSignature(id);
            return { success: true, signature: signatureBuffer.toString("base64") };
        } catch (error) {
            console.error("❌ Error en getSignature:", error);
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException("Error al obtener la firma.");
        }
    }
}