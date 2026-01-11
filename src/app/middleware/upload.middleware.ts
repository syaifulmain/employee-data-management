import multer from "multer";
import path from "path";
import { CustomHttpExceptionError } from "../../lib/helper/errorHandler";

// Configure storage in memory
const storage = multer.memoryStorage();

// File filter to accept only CSV and Excel files
const fileFilter = (_req, file, cb) => {
  const allowedMimeTypes = [
    "text/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  const allowedExtensions = [".csv", ".xlsx", ".xls"];

  const ext = path.extname(file.originalname).toLowerCase();

  if (
    allowedMimeTypes.includes(file.mimetype) ||
    allowedExtensions.includes(ext)
  ) {
    cb(null, true);
  } else {
    cb(
      new CustomHttpExceptionError(
        "Invalid file format. Only CSV and Excel files are allowed",
        400,
      ),
      false,
    );
  }
};

// Configure multer
export const uploadMiddleware = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

