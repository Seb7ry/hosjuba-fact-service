import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO (Data Transfer Object) para manejar los datos de inicio de sesión.
 * Se encarga de validar que los datos ingresados cumplan con ciertos requisitos antes de procesarlos en la aplicación.
 */
export class LoginDto {

    /**
     * Nombre de usuario del usuario que intenta iniciar sesión.
     * - Debe ser una cadena de texto.
     * - No puede estar vacío.
     */
    @IsString()
    @IsNotEmpty()
    username: string;

    /**
     * Contraseña del usuario que intenta iniciar sesión.
     * - Debe ser una cadena de texto.
     * - No puede estar vacía.
     */
    @IsString()
    @IsNotEmpty()
    password: string;
}