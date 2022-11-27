

export class Settings {

  public static getSleepTime(): number {
    const sleep = process.env.SLEEP_TIME;
    if (sleep) {
      return parseInt(sleep);
    }
    return 100;
  }

  public static getApiRetries(): number {
    const retries = process.env.API_RETRIES;
    if (retries) {
      return parseInt(retries);
    }
    return 5;
  }
}