
/**
 * Logger utility for OpenAI API services
 */
export class GPTLogger {
  /**
   * Log a message with timestamp and request ID
   */
  public static log(requestId: string | undefined, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const idPart = requestId ? `[${requestId}]` : '';
    console.log(`[${timestamp}]${idPart} ${message}`);
    if (data !== undefined) {
      console.log(`${idPart} ${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`);
    }
  }

  /**
   * Log an error with timestamp and request ID
   */
  public static error(requestId: string | undefined, message: string, error?: any): void {
    const timestamp = new Date().toISOString();
    const idPart = requestId ? `[${requestId}]` : '';
    console.error(`[${timestamp}]${idPart} ${message}`);
    if (error) {
      console.error(`${idPart}`, error);
    }
  }

  /**
   * Log a warning with timestamp and request ID
   */
  public static warn(requestId: string | undefined, message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const idPart = requestId ? `[${requestId}]` : '';
    console.warn(`[${timestamp}]${idPart} ${message}`);
    if (data !== undefined) {
      console.warn(`${idPart}`, data);
    }
  }
}
