import { Controller, Post, Get, Body, Param, UseGuards, NotFoundException, InternalServerErrorException } from "@nestjs/common";
import { SignatureService } from "../service/signature.service";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";

@Controller("signatures")
export class SignatureController {
    constructor(private readonly signatureService: SignatureService) {}

    @Post("upload")
    @UseGuards(JwtAuthGuard)
    async uploadSignature(@Body() body: { signatureBase64: string; filename: string }) {
        try {
            const fileId = await this.signatureService.storeSignature(body.signatureBase64, body.filename);
            return { message: "Firma guardada con éxito", fileId };
        } catch (error) {
            throw new InternalServerErrorException("Error al guardar la firma");
        }
    }

    @Get(":id")
    @UseGuards(JwtAuthGuard)
    async getSignature(@Param("id") id: string) {
        try {
            const signatureBuffer = await this.signatureService.getSignature(id);
            if (!signatureBuffer) {
                throw new NotFoundException("Firma no encontrada");
            }

            return { signature: signatureBuffer.toString("base64") };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException("Error al obtener la firma");
        }
    }
}
