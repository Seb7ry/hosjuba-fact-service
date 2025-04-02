import { Request, Response } from 'express';
import * as express from 'express';

/**
 * Extensión de tipos para el objeto Request de Express.
 * 
 * Esta declaración global amplía la interfaz Request original de Express para:
 * 1. Adicionar la propiedad `user` para almacenar información de usuario autenticado
 * 2. Tipar explícitamente el header de autorización
 * 
 * @module ExpressExtensions
 * @description Extensiones de tipo para el objeto Request de Express.js
 */
declare global {
    namespace Express {
        /**
         * Interfaz extendida de Request con propiedades personalizadas
         * @extends Request
         */
        interface Request {
            /**
             * Objeto que almacena información del usuario autenticado.
             * @type {any} - Puede especificarse una interfaz más específica según necesidades
             * @example { id: 1, username: 'admin', role: 'superuser' }
             */
            user: any;

            /**
             * Encabezados HTTP de la solicitud
             */
            headers: {
                /**
                 * Encabezado de autorización para autenticación JWT
                 * @optional
                 * @example "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                 */
                authorization?: string;
            };
        }
    }
}