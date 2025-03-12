import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

/**
 * Tipo de documento para un registro de Token en MongoDB.
 * 
 * Este tipo extiende la clase `Token` y permite interactuar con los
 * registros de los tokens almacenados en la colección 'tokens' de MongoDB.
 * 
 * @extends Token
 */
export type TokenDocument = Token & Document;

/**
 * Modelo de la colección 'tokens' en MongoDB.
 * 
 * Este modelo representa los tokens de acceso y refresh que se generan
 * durante el proceso de autenticación de los usuarios. Los tokens se almacenan
 * en la colección 'tokens' y contienen la información de expiración y los valores
 * del refresh token y access token para cada usuario.
 */
@Schema({ collection: 'tokens' })
export class Token {

    /**
     * Identificador único para el token.
     * 
     * Este campo sirve como el identificador principal (ID) del documento en MongoDB.
     * Es obligatorio y se utiliza para diferenciar los diferentes registros de tokens.
     * 
     * @type {string}
     */
    @Prop({ required: true })
    _id: string;

    /**
     * Grupo al que pertenece el usuario.
     * 
     * Este campo almacena el ID del grupo al que pertenece el usuario.
     * Se utilizará para personalizar la experiencia del usuario en el sistema.
     * 
     * @type {string}
     */
    @Prop({ required: true })
    group: string;

    /**
     * Refresh Token del usuario.
     * 
     * Este campo almacena el refresh token asociado al usuario. El refresh token
     * se utiliza para generar nuevos access tokens cuando el actual ha expirado.
     * 
     * @type {string}
     */
    @Prop({ required: true })
    refreshToken?: string;

    /**
     * Access Token del usuario.
     * 
     * Este campo almacena el access token del usuario. El access token se utiliza
     * para acceder a recursos protegidos y tiene un tiempo de expiración limitado.
     * 
     * @type {string}
     */
    @Prop({ required: true })
    accessToken?: string;

    /**
     * Fecha de expiración del Refresh Token.
     * 
     * Este campo almacena la fecha y hora en la que el refresh token expira.
     * Después de esta fecha, el refresh token ya no es válido y no puede ser
     * utilizado para generar nuevos access tokens.
     * 
     * @type {Date}
     */
    @Prop({ required: true })
    expiresAtRefresh: Date;

    /**
     * Fecha de expiración del Access Token.
     * 
     * Este campo almacena la fecha y hora en la que el access token expira.
     * Después de esta fecha, el access token ya no es válido y el usuario deberá
     * obtener un nuevo token mediante el uso del refresh token.
     * 
     * @type {Date}
     */
    @Prop({ required: true })
    expiresAtAccess: Date;
}
/**
 * Esquema de Mongoose para la entidad 'Token'.
 * 
 * Este esquema se crea a partir de la clase `Token` utilizando la función
 * `SchemaFactory.createForClass()`. El esquema se configura con el índice
 * en el campo `expiresAtRefresh`, lo que permite que MongoDB elimine automáticamente
 * los tokens cuando hayan expirado.
 * 
 * El índice asegura que los registros de los tokens sean eliminados de manera
 * automática después de que la fecha de expiración del refresh token haya pasado.
 */
export const TokenSchema = SchemaFactory.createForClass(Token);
TokenSchema.index({expiresAtRefresh: 1}, {expireAfterSeconds: 0});