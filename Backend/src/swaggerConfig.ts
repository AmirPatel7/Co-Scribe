// swaggerConfig.ts
import swaggerJsDoc from 'swagger-jsdoc';

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Co-Scribe API Documentation',
    version: '1.0.0', 
    description: 'API Documentation for Group 27 project', 
  },
  servers: [
    {
      url: 'http://159.203.189.208:3000',
      description: 'Development server',
    },
  ],
};

const options = {
  swaggerDefinition,
  apis: ['./**/*.ts'],
};

const swaggerSpec = swaggerJsDoc(options);

export default swaggerSpec;
