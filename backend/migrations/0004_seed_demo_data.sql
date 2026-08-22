-- Demo/seed data for showcasing the HRMS with a populated dashboard.
-- Password for every seeded account is "Demo@1234" (see README).
-- Safe to run more than once: every insert is keyed on a unique column
-- with ON CONFLICT DO NOTHING, though the migration runner only applies
-- this file once regardless.

INSERT INTO users (employee_id, email, password_hash, role, email_verified, must_change_password)
VALUES
    ('HRDEMO1',   'hr.demo@dayflow.io',       '$2a$10$RCO410ZaH8/7usSCygAn5.ZU4h6UyccvEWTDwpBzmD3mMfWM91jFm', 'admin',    TRUE, FALSE),
    ('EMPDEMO1',  'employee.demo@dayflow.io', '$2a$10$RCO410ZaH8/7usSCygAn5.ZU4h6UyccvEWTDwpBzmD3mMfWM91jFm', 'employee', TRUE, FALSE),
    ('PRIYASH1',  'priya.sharma@dayflow.io',  '$2a$10$RCO410ZaH8/7usSCygAn5.ZU4h6UyccvEWTDwpBzmD3mMfWM91jFm', 'employee', TRUE, FALSE),
    ('ROHANG1',   'rohan.gupta@dayflow.io',   '$2a$10$RCO410ZaH8/7usSCygAn5.ZU4h6UyccvEWTDwpBzmD3mMfWM91jFm', 'employee', TRUE, FALSE),
    ('NEHAKAP1',  'neha.kapoor@dayflow.io',   '$2a$10$RCO410ZaH8/7usSCygAn5.ZU4h6UyccvEWTDwpBzmD3mMfWM91jFm', 'employee', TRUE, FALSE),
    ('KARANM1',   'karan.mehta@dayflow.io',   '$2a$10$RCO410ZaH8/7usSCygAn5.ZU4h6UyccvEWTDwpBzmD3mMfWM91jFm', 'employee', TRUE, FALSE),
    ('ANANYAI1',  'ananya.iyer@dayflow.io',   '$2a$10$RCO410ZaH8/7usSCygAn5.ZU4h6UyccvEWTDwpBzmD3mMfWM91jFm', 'employee', TRUE, FALSE)
ON CONFLICT (employee_id) DO NOTHING;

INSERT INTO employee_profiles (user_id, full_name, phone, address, job_title, department, date_joined)
VALUES
    ((SELECT id FROM users WHERE employee_id = 'HRDEMO1'),  'Meera Nair',   '+91 98450 11221', 'Bengaluru, India', 'HR Director',         'Human Resources', '2022-03-15'),
    ((SELECT id FROM users WHERE employee_id = 'EMPDEMO1'), 'Arjun Verma',  '+91 98450 22332', 'Bengaluru, India', 'Software Engineer',   'Engineering',      '2023-06-01'),
    ((SELECT id FROM users WHERE employee_id = 'PRIYASH1'), 'Priya Sharma', '+91 98450 33443', 'Pune, India',      'Marketing Lead',      'Marketing',        '2023-01-10'),
    ((SELECT id FROM users WHERE employee_id = 'ROHANG1'),  'Rohan Gupta',  '+91 98450 44554', 'Mumbai, India',    'Sales Executive',     'Sales',            '2023-09-20'),
    ((SELECT id FROM users WHERE employee_id = 'NEHAKAP1'), 'Neha Kapoor',  '+91 98450 55665', 'Delhi, India',     'Product Designer',    'Product & Design', '2022-11-05'),
    ((SELECT id FROM users WHERE employee_id = 'KARANM1'),  'Karan Mehta',  '+91 98450 66776', 'Hyderabad, India', 'Operations Analyst',  'Operations',       '2024-02-12'),
    ((SELECT id FROM users WHERE employee_id = 'ANANYAI1'), 'Ananya Iyer',  '+91 98450 77887', 'Bengaluru, India', 'Backend Engineer',    'Engineering',      '2023-04-18')
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO salary_structures (user_id, basic, hra, allowances, deductions)
VALUES
    ((SELECT id FROM users WHERE employee_id = 'HRDEMO1'),  95000, 38000, 12000, 15000),
    ((SELECT id FROM users WHERE employee_id = 'EMPDEMO1'), 65000, 26000, 8000,  9500),
    ((SELECT id FROM users WHERE employee_id = 'PRIYASH1'), 70000, 28000, 9000,  10200),
    ((SELECT id FROM users WHERE employee_id = 'ROHANG1'),  55000, 22000, 15000, 8100),
    ((SELECT id FROM users WHERE employee_id = 'NEHAKAP1'), 72000, 28800, 8500,  10600),
    ((SELECT id FROM users WHERE employee_id = 'KARANM1'),  50000, 20000, 6000,  7300),
    ((SELECT id FROM users WHERE employee_id = 'ANANYAI1'), 68000, 27200, 8200,  9900)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO attendance (user_id, date, status, check_in, check_out)
SELECT u.id, d.date, d.status,
       CASE WHEN d.status IN ('present', 'half_day') THEN (d.date + TIME '09:15')::TIMESTAMPTZ END,
       CASE WHEN d.status = 'present' THEN (d.date + TIME '18:30')::TIMESTAMPTZ
            WHEN d.status = 'half_day' THEN (d.date + TIME '13:30')::TIMESTAMPTZ END
FROM users u
JOIN LATERAL (
    VALUES
        (CURRENT_DATE - 4, 'present'),
        (CURRENT_DATE - 3, 'present'),
        (CURRENT_DATE - 2, 'half_day'),
        (CURRENT_DATE - 1, 'present'),
        (CURRENT_DATE,     'present')
) AS d(date, status) ON TRUE
WHERE u.employee_id IN ('HRDEMO1', 'EMPDEMO1', 'PRIYASH1', 'ROHANG1', 'ANANYAI1')
ON CONFLICT (user_id, date) DO NOTHING;

INSERT INTO attendance (user_id, date, status, check_in, check_out)
SELECT u.id, d.date, d.status, NULL, NULL
FROM users u
JOIN LATERAL (
    VALUES
        (CURRENT_DATE - 4, 'leave'),
        (CURRENT_DATE - 3, 'leave'),
        (CURRENT_DATE - 2, 'absent'),
        (CURRENT_DATE - 1, 'leave'),
        (CURRENT_DATE,     'leave')
) AS d(date, status) ON TRUE
WHERE u.employee_id = 'NEHAKAP1'
ON CONFLICT (user_id, date) DO NOTHING;

INSERT INTO attendance (user_id, date, status, check_in, check_out)
SELECT u.id, d.date, 'present', (d.date + TIME '09:00')::TIMESTAMPTZ, (d.date + TIME '18:00')::TIMESTAMPTZ
FROM users u
JOIN LATERAL (
    VALUES (CURRENT_DATE - 4), (CURRENT_DATE - 1), (CURRENT_DATE)
) AS d(date) ON TRUE
WHERE u.employee_id = 'KARANM1'
ON CONFLICT (user_id, date) DO NOTHING;

INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, remarks, status, admin_comment, reviewed_by)
VALUES
    ((SELECT id FROM users WHERE employee_id = 'NEHAKAP1'), 'sick',  CURRENT_DATE - 4, CURRENT_DATE,     'Recovering from flu', 'approved', 'Get well soon', (SELECT id FROM users WHERE employee_id = 'HRDEMO1')),
    ((SELECT id FROM users WHERE employee_id = 'ROHANG1'),  'paid',  CURRENT_DATE + 5, CURRENT_DATE + 7, 'Family function',     'pending',  '',              NULL),
    ((SELECT id FROM users WHERE employee_id = 'PRIYASH1'), 'unpaid',CURRENT_DATE + 10,CURRENT_DATE + 10,'Personal errand',     'rejected', 'Peak campaign week, please reschedule', (SELECT id FROM users WHERE employee_id = 'HRDEMO1')),
    ((SELECT id FROM users WHERE employee_id = 'ANANYAI1'), 'paid',  CURRENT_DATE + 14,CURRENT_DATE + 15,'Long weekend trip',   'pending',  '',              NULL)
ON CONFLICT DO NOTHING;
