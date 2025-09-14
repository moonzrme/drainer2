const winston = require('winston');

class MonitoringService {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.json(),
      transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
      ]
    });
  }

  logDrain(data) {
    this.logger.info('Drain executed', data);
  }

  logError(error) {
    this.logger.error('Error occurred', error);
  }
}