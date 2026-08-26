import crypto from "crypto";

const SECRET_KEY = crypto.createHash("sha256").update("clashwager_ww1_entrenched_key").digest();
const IV = Buffer.alloc(16, 0); // Static IV for simplified stateless session (zero-config)

export const hashPassword = (password: string): string => {
  return crypto.createHash("sha256").update(password).digest("hex");
};

export const encryptSession = (userId: string): string => {
  const cipher = crypto.createCipheriv("aes-256-cbc", SECRET_KEY, IV);
  let encrypted = cipher.update(userId, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
};

export const decryptSession = (sessionToken: string): string | null => {
  try {
    const decipher = crypto.createDecipheriv("aes-256-cbc", SECRET_KEY, IV);
    let decrypted = decipher.update(sessionToken, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    return null;
  }
};
