export const logger = {
  debug: (message: string) => {
    console.log("[DEBUG]", message);
  },

  info: (message: string) => {
    console.info("[INFO]", message);
  },

  error: (message: string) => {
    console.error("[ERROR]", message);
  },
};