import { Controller, Post, Get, Body, Param, UseGuards, NotFoundException, InternalServerErrorException, BadRequestException, UseInterceptors } from "@nestjs/common";
import { SignatureService } from "../service/signature.service";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";
import { Types } from "mongoose";
import { RefreshTokenInterceptor } from "src/interceptor/refreshToken.interceptor";

/**
 * Controlador para manejo de firmas digitales
 * 
 * Proporciona endpoints para:
 * - Almacenamiento de firmas digitales en formato base64
 * - Recuperación de firmas almacenadas
 * 
 * Todas las rutas están protegidas por autenticación JWT
 */
@Controller("signature")
export class SignatureController {
    constructor(private readonly signatureService: SignatureService) {}

    /**
     * Endpoint para subir y almacenar una firma digital
     * @param body Objeto con la firma en base64 y nombre de archivo
     * @returns Objeto con estado de éxito, mensaje y ID del archivo
     * @throws BadRequestException Si faltan parámetros requeridos
     * @throws InternalServerErrorException Si falla el almacenamiento
     * 
     * @example
     * POST /signature/upload
     * {
     *   "signatureBase64": "base64string...",
     *   "filename": "firma_paciente123.png"
     * }
     */
    @Post("upload")
    @UseGuards(JwtAuthGuard)
    @UseInterceptors(RefreshTokenInterceptor)
    async uploadSignature(@Body() body: { signatureBase64: string; filename: string }) {
        try {
            if (!body.signatureBase64 || !body.filename) {
                throw new BadRequestException("La firma y el nombre de archivo son obligatorios.");
            }

            const fileId = await this.signatureService.storeSignature(body.signatureBase64, body.filename);
            return { 
                success: true, 
                message: "Firma guardada con éxito", 
                fileId 
            };
        } catch (error) {
            console.error("❌ Error en uploadSignature:", error);
            throw new InternalServerErrorException("Error al guardar la firma.");
        }
    }

    /**
     * Endpoint para obtener una firma digital almacenada
     * @param id ID de la firma en GridFS (ObjectId válido)
     * @returns Objeto con estado de éxito y firma en base64
     * @throws BadRequestException Si el ID no es válido
     * @throws NotFoundException Si la firma no existe
     * @throws InternalServerErrorException Si falla la recuperación
     * 
     * @example
     * GET /signature/507f1f77bcf86cd799439011
     */
    @Get(":id")
    @UseGuards(JwtAuthGuard)
    async getSignature(@Param("id") id: string) {
        try {
            if (!Types.ObjectId.isValid(id)) {
                throw new BadRequestException("El ID de la firma no es válido.");
            }

            const signatureBuffer = await this.signatureService.getSignature(id);
            return { 
                success: true, 
                signature: signatureBuffer.toString("base64") 
            };
        } catch (error) {
            console.error("❌ Error en getSignature:", error);
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException("Error al obtener la firma.");
        }
    }
}