import { Request } from 'express';
import * as express from 'express';

/**
 * Extiende la interfaz de Request para incluir la propiedad `user`.
 */
declare global {
    namespace Express {
        interface Request {
            user: any,
            headers: {
                authorization?: string;
            },
        }
    }
}
