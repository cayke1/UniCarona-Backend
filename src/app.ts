import cors from 'cors';
import express from 'express';
import swaggerUi from 'swagger-ui-express';

import { errorHandlerMiddleware } from './middlewares/error-handler.middleware';
import { notFoundMiddleware } from './middlewares/not-found.middleware';
import { routes } from './routes';
import { swaggerSpec } from './lib/swagger';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', routes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));




app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export { app };
