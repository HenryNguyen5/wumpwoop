import pino from "pino";
import { inject, injectable } from "tsyringe";
import { AppConfig } from "./config";

@injectable()
export class AppLogger {
  private logger = pino();
  constructor(@inject("AppConfig") conf: AppConfig) {
    this.logger.level = conf.logLevel;
  }

  public create(clazz: new (...args: any[]) => any): pino.Logger {
    return this.logger.child({ namespace: clazz.name });
  }
}
