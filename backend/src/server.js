import express from "express";
import cors from "cors";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import authRoutes from "./routes/authRoutes.js";
import usersRoutes from "./routes/usersRoutes.js";
import projectsRoutes from './routes/projectsRoutes.js';
import projectCostCodesRoutes from './routes/projectCostCodesRoutes.js';
import costCodesRoutes from './routes/costCodesRoutes.js';
import customersRoutes from './routes/customersRoutes.js';
import equipmentRoutes from './routes/equipmentRoutes.js';
import employeeAssignmentsRoutes from './routes/employeeAssignmentsRoutes.js';
import crewsRoutes from './routes/crewsRoutes.js';
import timeEntriesRoutes from './routes/timeEntriesRoutes.js';
import timecardApprovalsRoutes from "./routes/timecardApprovalsRoutes.js";
import timeOffRoutes from "./routes/timeOffRoutes.js";
import reportsRoutes from './routes/reportsRoutes.js';
import dailyProductionRoutes from './routes/dailyProductionRoutes.js';
import formsRoutes from './routes/formsRoutes.js';
import formSubmissionsRoutes from './routes/formSubmissionsRoutes.js';
import mapRoutes from './routes/mapRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import offlineTimeEntryRoute from "./routes/offlineTimeEntriesRoute.js"
import predictionRoutes from './routes/predictionRoutes.js';
import { initModel } from './ml/budgetPredictor.js';

const app = express();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(express.json());

// Serve static files from the web frontend
app.use(express.static(path.join(__dirname, '../public')));

// Serve mobile web app at /mobile
app.use('/mobile', express.static(path.join(__dirname, '../public/mobile')));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/customers", customersRoutes);
app.use('/api/projects', projectCostCodesRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/cost-codes", costCodesRoutes);
app.use("/api/equipment", equipmentRoutes);
app.use("/api/employee-assignments", employeeAssignmentsRoutes);
app.use("/api/crews", crewsRoutes);
app.use("/api/time-entries", timeEntriesRoutes);
app.use("/api/timecard-approvals", timecardApprovalsRoutes);
app.use("/api/time-off", timeOffRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/daily-production", dailyProductionRoutes);
app.use("/api/forms", formsRoutes);
app.use("/api/form-submissions", formSubmissionsRoutes);
app.use("/api/map", mapRoutes);
app.use("/api/companies", companyRoutes)
app.use("/api/offline-time-entries", offlineTimeEntryRoute)
app.use("/api/projects", predictionRoutes)

// Check if we have the built frontend
const indexPath = path.join(__dirname, '../public/index.html');
const hasPublicFolder = fs.existsSync(indexPath);

if (!hasPublicFolder) {
  // Development mode - show health check at root
  app.get("/", (req, res) => {
    res.json({ 
      message: "Time tracking API is running",
      version: "1.0.0",
      environment: process.env.NODE_ENV || 'development',
      note: "Frontend runs separately in development (expo start)",
      endpoints: {
        auth: "/api/auth",
        users: "/api/users",
        customers: "/api/customers",
        projects: "/api/projects",
        costCodes: "/api/cost-codes",
        equipment: "/api/equipment",
        employeeAssignments: "/api/employee-assignments",
        timeEntries: "/api/time-entries",
        reports: "/api/reports",
        dailyProduction: "/api/daily-production",
        forms: "/api/forms",
        formSubmissions: "/api/form-submissions"
      }
    });
  });
}

// API health check
app.get("/api", (req, res) => {
  res.json({ 
    message: "Time tracking API is running",
    version: "1.0.0",
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      customers: "/api/customers",
      projects: "/api/projects",
      costCodes: "/api/cost-codes",
      equipment: "/api/equipment",
      employeeAssignments: "/api/employee-assignments",
      timeEntries: "/api/time-entries",
      reports: "/api/reports",
      dailyProduction: "/api/daily-production",
      forms: "/api/forms",
      formSubmissions: "/api/form-submissions"
    }
  });
});

// Handle client-side routing - serve index.html for all non-API routes (production only)
app.use((req, res) => {
  if (hasPublicFolder) {
    // Serve mobile index.html for /mobile/* routes
    if (req.path.startsWith('/mobile')) {
      const mobileIndexPath = path.join(__dirname, '../public/mobile/index.html');
      res.sendFile(mobileIndexPath);
    } else {
      // Serve web index.html for all other routes
      res.sendFile(indexPath);
    }
  } else {
    res.status(404).json({ 
      message: 'Endpoint not found',
      tip: 'API endpoints are under /api. Frontend runs separately in development.'
    });
  }
});

const PORT = process.env.PORT || 3001;

// Train the budget prediction model on startup
initModel().catch(err => console.error('[BudgetPredictor] Failed to initialize model:', err.message));

app.listen(PORT, '0.0.0.0', () => {
  const networkInterfaces = os.networkInterfaces();
  const localIP = Object.values(networkInterfaces)
    .flat()
    .find(iface => iface.family === 'IPv4' && !iface.internal)?.address;
  
  console.log(`Server started on PORT: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API available at http://localhost:${PORT}`);
  if (localIP) {
    console.log(`API available at http://${localIP}:${PORT}`);
  }
});

export default app;