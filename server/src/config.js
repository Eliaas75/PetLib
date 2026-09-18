const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

function parseBoolean(value, fallback) {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function parseSameSite(value) {
  const normalized = String(value || (isProduction ? "lax" : "lax")).toLowerCase();
  if (!["lax", "strict", "none"].includes(normalized)) {
    throw new Error("COOKIE_SAME_SITE must be one of: lax, strict, none");
  }
  return normalized;
}

function parseTrustProxy(value) {
  if (value == null || value === "") return isProduction ? 1 : false;
  if (["false", "0", "off", "no"].includes(String(value).toLowerCase())) return false;
  if (["true", "on", "yes"].includes(String(value).toLowerCase())) return 1;
  const parsed = Number(value);
  if (Number.isInteger(parsed) && parsed >= 0) return parsed;
  throw new Error("TRUST_PROXY must be a non-negative integer or boolean-like value");
}

const port = Number(process.env.PORT || 4000);
const clientOrigins = String(process.env.CLIENT_ORIGIN || (isProduction ? "" : "http://localhost:5173"))
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const config = {
  nodeEnv,
  isProduction,
  port,
  mongoUri: process.env.MONGO_URI || "",
  jwtSecret: process.env.JWT_SECRET || "",
  clientOrigins,
  cookie: {
    sameSite: parseSameSite(process.env.COOKIE_SAME_SITE),
    secure: parseBoolean(process.env.COOKIE_SECURE, isProduction),
  },
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY),
};

export function validateConfig() {
  const errors = [];

  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    errors.push("PORT must be an integer between 1 and 65535");
  }
  if (!config.mongoUri) errors.push("MONGO_URI is required");
  if (!config.jwtSecret) errors.push("JWT_SECRET is required");

  if (config.cookie.sameSite === "none" && !config.cookie.secure) {
    errors.push("COOKIE_SECURE must be true when COOKIE_SAME_SITE=none");
  }

  if (config.isProduction) {
    if (config.jwtSecret.length < 32 || config.jwtSecret === "change_me") {
      errors.push("JWT_SECRET must be a strong secret of at least 32 characters in production");
    }
    if (!config.clientOrigins.length) {
      errors.push("CLIENT_ORIGIN is required in production");
    }
    if (config.clientOrigins.includes("*")) {
      errors.push("CLIENT_ORIGIN cannot contain * when credentials are enabled");
    }
    const insecureOrigins = config.clientOrigins.filter((origin) => !origin.startsWith("https://"));
    if (insecureOrigins.length) {
      errors.push("Every CLIENT_ORIGIN must use https:// in production");
    }
  }

  if (errors.length) {
    throw new Error(`Invalid server configuration:\n- ${errors.join("\n- ")}`);
  }
}

export default config;
