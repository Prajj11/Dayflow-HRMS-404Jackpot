CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    employee_id TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('employee', 'admin')),
    email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    verification_token TEXT,
    verification_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS employee_profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    job_title TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT '',
    date_joined DATE,
    profile_picture_url TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS salary_structures (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    basic NUMERIC(12, 2) NOT NULL DEFAULT 0,
    hra NUMERIC(12, 2) NOT NULL DEFAULT 0,
    allowances NUMERIC(12, 2) NOT NULL DEFAULT 0,
    deductions NUMERIC(12, 2) NOT NULL DEFAULT 0,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'half_day', 'leave')),
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL CHECK (leave_type IN ('paid', 'sick', 'unpaid')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    remarks TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_comment TEXT NOT NULL DEFAULT '',
    reviewed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
