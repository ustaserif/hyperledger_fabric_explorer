import { createLogger, format, transports } from 'winston';

export const logger = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.json()),
  defaultMeta: { service: 'client-gateway' },
  transports: [
    new transports.Console(),
    // Additional transports can be added here
  ],
});
