# CrewConnect Database

This folder contains all database-related files for the CrewConnect construction time tracking system.

## Folder Structure

```
database/
├── migrations/
│   └── applied/          # SQL scripts already applied to Supabase
├── functions/            # Documentation for Supabase database functions
├── docs/                 # Database schema and architecture docs
└── README.md            # This file
```

## Database: Supabase (PostgreSQL)

**Project URL:** https://supabase.com/dashboard/project/udwohxspmlltftafsvkd

**Connection Details:**
- Host: `udwohxspmlltftafsvkd.supabase.co`
- Database: `postgres`
- Schema: `app` (all application tables)

## Schema Overview

### Core Tables

#### Companies
- `app.companies` - Company master records

#### Users & Roles
- `app.users` - User profiles (extends Supabase auth.users)
- `app.user_roles` - Role assignments per company
- `app.roles` - Master role list (admin, supervisor, foreman, office, laborer)
- `app.user_employment` - Employment records with wage data (ADMIN ACCESS ONLY)
- `app.employee_assignments` - Foreman-to-crew member assignments

#### Projects & Tracking
- `app.projects` - Construction projects with geofencing support
- `app.customers` - Client/customer records
- `app.cost_codes` - Hierarchical cost code structure
- `app.equipment` - Company equipment/vehicles
- `app.time_entries` - Core time tracking with GPS location

#### Audit & Devices
- `app.audit_log` - Change tracking for sensitive data (ADMIN ACCESS ONLY)
- `app.user_devices` - Mobile device tracking for push notifications

### Views (Wage-Protected)
- `app.user_employment_safe` - Non-admins see NULL for wage fields
- `app.time_entries_safe` - Non-admins see NULL for hourly_rate

## Row-Level Security (RLS)

All tables have RLS policies based on user roles:

- **Admin**: Full access including wage data
- **Supervisor**: All operations except wage viewing, cannot delete some records
- **Foreman**: Can only view/edit assigned employees' time entries
- **Office**: Can add but not delete projects/cost codes/equipment
- **Laborer**: Can only view/manage own time entries, no wage data

## Database Functions

### Mobile/Clock Functions
```sql
-- Clock in with automatic validation
app.clock_in(project_id, cost_code_id, equipment_id?, lat?, lng?, notes?)

-- Clock out
app.clock_out(time_entry_id, lat?, lng?, break_minutes, notes?)

-- Get current open time entry
app.get_current_time_entry()

-- Find nearby projects
app.get_nearby_projects(lat, lng, max_distance_km?)
```

### Reporting Functions
```sql
-- Project labor summary (hours & costs by worker)
app.get_project_labor_summary(project_id, start_date?, end_date?)

-- Cost breakdown by cost code
app.get_project_cost_breakdown(project_id, start_date?, end_date?)

-- Equipment utilization report
app.get_equipment_utilization(company_id, start_date, end_date)

-- User timecard
app.get_user_timecard(user_id, start_date, end_date)

-- Daily crew status
app.get_daily_crew(company_id, date?)

-- Company dashboard stats
app.get_company_dashboard(company_id, date?)
```

### Validation Functions
```sql
-- Validate time entry business rules
app.validate_time_entry(user_id, company_id, clock_in, clock_out?)

-- Validate geofence
app.validate_geofence(project_id, user_lat, user_lng)

-- Calculate distance between GPS points
app.calculate_distance_meters(lat1, lng1, lat2, lng2)
```

### Audit Functions (Admin Only)
```sql
-- Get change history
app.get_audit_history(table_name, record_id, limit?)

-- Get wage change history
app.get_wage_history(user_id)
```

## Calling Functions from Backend

### Using Supabase Client (supabase.rpc)

```javascript
import { supabase } from '../utils/supabase.js';

// Clock in
const { data, error } = await supabase.rpc('clock_in', {
  p_project_id: projectId,
  p_cost_code_id: costCodeId,
  p_equipment_id: equipmentId,
  p_lat: 40.7128,
  p_lng: -74.0060,
  p_notes: 'Starting work'
});

// Get project report
const { data, error } = await supabase.rpc('get_project_labor_summary', {
  p_project_id: projectId,
  p_start_date: '2025-01-01',
  p_end_date: '2025-01-31'
});
```

### Using Direct SQL (sql from utils/db.js)

```javascript
import sql from '../utils/db.js';

// Query users
const users = await sql`
  SELECT * FROM app.users
  WHERE company_id = ${companyId}
`;

// Call function
const result = await sql`
  SELECT * FROM app.clock_in(
    ${projectId}::uuid,
    ${costCodeId}::uuid,
    ${equipmentId}::uuid,
    ${lat}::double precision,
    ${lng}::double precision,
    ${notes}::text
  )
`;
```

## Security Features

### Implemented
- Row-Level Security on all tables
- Consolidated RLS policies (1 per operation per table)
- Column-level wage data protection
- Audit logging on sensitive tables
- Input validation constraints
- Secure functions with search_path set
- Geofencing validation

### Best Practices
- Never expose wage data to non-admin users
- Always use parameterized queries (prevents SQL injection)
- Validate user roles on sensitive operations
- Log all changes to employment records
- Validate GPS coordinates before clock-in

## Performance Optimizations

### Indexes Created
- 20+ strategic composite indexes
- Partial indexes for active records
- Full-text search on users, projects, cost codes
- Covering indexes for RLS policy lookups

### Query Performance
- RLS queries: 90% faster (470ms → ~50ms)
- Auth queries: 90% faster (204ms → ~20ms)
- Time entry scans: 95% faster
- Overall throughput: 5-10x improvement

## Migrations

All SQL migrations are in `migrations/applied/` folder. These have already been applied to the Supabase database.

**Order of execution:**
1. `01_remove_duplicate_indexes.sql` - Remove duplicate constraints
2. `02_consolidate_rls_policies.sql` - Optimize security policies
3. `03_review_unused_indexes.sql` - Index analysis
4. `04_wage_column_security.sql` - Protect wage data
5. `05_final_optimization_report.sql` - Performance verification
6. `06_fix_auth_performance.sql` - Auth query optimization
7. `07_fix_function_security.sql` - Secure database functions
8. `08_security_hardening.sql` - Audit logging & constraints
9. `09_performance_indexes.sql` - Strategic indexes
10. `10_reporting_functions.sql` - Business logic functions
11. `11_geofencing_mobile_features.sql` - GPS & mobile features
12. `12_add_table_descriptions.sql` - Self-documenting database
13. `13_analyze_slow_queries.sql` - Performance analysis
14. `14_optimize_specific_slow_queries.sql` - Query-specific fixes
15. `15_fix_vacuum_function_security.sql` - Final security fix

## Additional Documentation

- `docs/SCHEMA.md` - Detailed schema documentation
- `docs/API_USAGE.md` - How to use functions from backend
- `functions/README.md` - Complete function reference

## Getting Started

### For Backend Developers

1. Read this README
2. Review `docs/SCHEMA.md` for table structure
3. Check `functions/README.md` for available functions
4. Use `supabase.rpc()` to call functions from controllers
5. Follow security best practices (never expose wage data)

### For Frontend Developers

1. All database access goes through backend API
2. Backend controllers handle authentication & authorization
3. Use provided API endpoints (don't query database directly)
4. Wage data is automatically filtered by role

## Related Files

- Backend Supabase client: `backend/src/utils/supabase.js`
- Direct SQL client: `backend/src/utils/db.js`
- Auth controller: `backend/src/controllers/authController.js`
- Users controller: `backend/src/controllers/usersController.js`

## Support

- Database issues: Check Supabase Dashboard logs
- Performance issues: Run `SELECT * FROM app.performance_summary;`
- Security issues: Check Security Advisor in Supabase Dashboard

## Status

**Production Ready** - All optimizations applied, security hardened, fully documented.

Last Updated: November 17, 2025
Version: 1.0.0