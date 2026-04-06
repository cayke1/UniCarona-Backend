import express from 'express';

import { errorHandlerMiddleware } from './middlewares/error-handler.middleware';
import { notFoundMiddleware } from './middlewares/not-found.middleware';
import { routes } from './routes';

const app = express();

app.use(express.json());
app.use('/api', routes);




app.use(notFoundMiddleware);
app.use(errorHandlerMiddleware);

export { app };
