import express from "express";
import cors from "cors";
import os from "os";
import authRoutes from "./routes/authRoutes.js";
import usersRoutes from "./routes/usersRoutes.js";
import projectsRoutes from './routes/projectsRoutes.js';
import projectCostCodesRoutes from './routes/projectCostCodesRoutes.js';
import costCodesRoutes from './routes/costCodesRoutes.js';
import customersRoutes from './routes/customersRoutes.js';
import equipmentRoutes from './routes/equipmentRoutes.js';
import employeeAssignmentsRoutes from './routes/employeeAssignmentsRoutes.js';
import timeEntriesRoutes from './routes/timeEntriesRoutes.js';
import timecardApprovalsRoutes from "./routes/timecardApprovalsRoutes.js";
import timeOffRoutes from "./routes/timeOffRoutes.js";
import reportsRoutes from './routes/reportsRoutes.js';
import dailyProductionRoutes from './routes/dailyProductionRoutes.js';
import formsRoutes from './routes/formsRoutes.js';
import formSubmissionsRoutes from './routes/formSubmissionsRoutes.js';
import mapRoutes from './routes/mapRoutes.js';

const app = express();

// Middleware
app.use(cors()); // Allow all origins for development
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/customers", customersRoutes);
app.use('/api/projects', projectCostCodesRoutes);
app.use("/api/projects", projectsRoutes);
app.use("/api/cost-codes", costCodesRoutes);
app.use("/api/equipment", equipmentRoutes);
app.use("/api/employee-assignments", employeeAssignmentsRoutes);
app.use("/api/time-entries", timeEntriesRoutes);
app.use("/api/timecard-approvals", timecardApprovalsRoutes);
app.use("/api/time-off", timeOffRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/daily-production", dailyProductionRoutes);
app.use("/api/forms", formsRoutes);
app.use("/api/form-submissions", formSubmissionsRoutes);
app.use("/api/map", mapRoutes);

// Health check
app.get("/", (req, res) => {
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint not found" });
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
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