import fs from "fs";
import path from "path";
import { ErrorCodes } from "./constants.js";
import { NitError } from "./errors.js";

/** Reads a file with human-readable error messages for common failure modes. */
export function safeReadFile(filePath, description = "file") {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch (err) {
    if (err.code === "ENOENT") {
      throw new NitError(
        `${description} not found: ${filePath}`,
        ErrorCodes.FILE_READ_ERROR,
        { path: filePath },
      );
    }
    if (err.code === "EACCES") {
      throw new NitError(
        `Permission denied reading ${description}: ${filePath}`,
        ErrorCodes.FILE_PERMISSION_DENIED,
        { path: filePath },
      );
    }
    throw new NitError(
      `Failed to read ${description}: ${err.message}`,
      ErrorCodes.FILE_READ_ERROR,
      { path: filePath, originalError: err.message },
    );
  }
}

/** Writes a file, creating parent directories if needed, with descriptive error handling. */
export function safeWriteFile(filePath, content, description = "file") {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, "utf-8");
  } catch (err) {
    if (err.code === "EACCES") {
      throw new NitError(
        `Permission denied writing ${description}: ${filePath}`,
        ErrorCodes.FILE_PERMISSION_DENIED,
        { path: filePath },
      );
    }
    if (err.code === "ENOSPC") {
      throw new NitError(
        `No disk space left to write ${description}: ${filePath}`,
        ErrorCodes.FILE_WRITE_ERROR,
        { path: filePath },
      );
    }
    if (err.code === "EROFS") {
      throw new NitError(
        `Read-only file system, cannot write ${description}: ${filePath}`,
        ErrorCodes.FILE_WRITE_ERROR,
        { path: filePath },
      );
    }
    throw new NitError(
      `Failed to write ${description}: ${err.message}`,
      ErrorCodes.FILE_WRITE_ERROR,
      { path: filePath, originalError: err.message },
    );
  }
}

/** Parses JSON content with a descriptive error if the content is malformed. */
export function safeParseJson(content, filePath, description = "JSON file") {
  try {
    return JSON.parse(content);
  } catch (err) {
    throw new NitError(
      `Invalid JSON in ${description}: ${err.message}`,
      ErrorCodes.VERSION_JSON_INVALID,
      { path: filePath, originalError: err.message },
    );
  }
}

/** Returns true if a file or directory exists at the given path. */
export function fileExists(filePath) {
  return fs.existsSync(filePath);
}
