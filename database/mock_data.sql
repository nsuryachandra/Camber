-- ============================================================================
-- mock_data.sql — Optional Realistic Demo Data
-- Run this if you want to populate the database with sample fleet, customers,
-- rentals, payments, and maintenance history.
-- ============================================================================

USE vehicle_rental_db;

-- ---- Additional Branches ---------------------------------------------------
INSERT INTO branches (branch_name, address, city, phone, manager_name) VALUES
('CAMBER Indiranagar Hub',  '12, 100 Feet Rd, Opp. Sony Signal',         'Bengaluru', '9886100202', 'Meera Iyer'),
('CAMBER Banjara Hills Hub','Plot 8, Rd No. 12, Banjara Hills',          'Hyderabad', '9886100203', 'Arjun Reddy'),
('CAMBER Andheri West Hub', 'Shop 4, Veera Desai Rd, Andheri West',      'Mumbai',    '9886100204', 'Sana Qureshi')
ON DUPLICATE KEY UPDATE branch_name=VALUES(branch_name);

-- ---- Customers (20) --------------------------------------------------------
INSERT INTO customers (name, phone, email, driving_license_number, address, registration_date) VALUES
('Aarav Mehta',      '9845012301', 'aarav.mehta@gmail.com',   'KA0520110001234', 'HSR Layout, Bengaluru',  '2024-01-15'),
('Diya Nair',        '9845012302', 'diya.nair@gmail.com',     'KA0320120005432', 'Koramangala, Bengaluru', '2024-02-03'),
('Rohan Kulkarni',   '9845012303', 'rohan.k@yahoo.com',       'KA0120130009876', 'Rajajinagar, Bengaluru', '2024-03-21'),
('Sneha Reddy',      '9845012304', 'sneha.reddy@gmail.com',   'TS0120140003456', 'Gachibowli, Hyderabad',  '2024-04-11'),
('Vikram Singh',     '9845012305', 'vikram.singh@gmail.com',  'MH0220150007789', 'Andheri West, Mumbai',   '2024-05-06'),
('Ananya Iyer',      '9845012306', 'ananya.iyer@gmail.com',   'KA0520150002211', 'BTM Layout, Bengaluru',  '2024-05-28'),
('Karthik Subramanian','9845012307','karthik.s@gmail.com',    'TN0920160004432', 'Anna Nagar, Chennai',    '2024-06-19'),
('Pooja Joshi',      '9845012308', 'pooja.joshi@gmail.com',   'MH0420160008890', 'Powai, Mumbai',          '2024-07-07'),
('Aditya Rao',       '9845012309', 'aditya.rao@gmail.com',    'KA0420170001123', 'Jayanagar, Bengaluru',   '2024-08-14'),
('Ishita Kapoor',    '9845012310', 'ishita.kapoor@gmail.com', 'DL0420170006678', 'Saket, New Delhi',       '2024-09-02'),
('Manish Gupta',     '9845012311', 'manish.gupta@gmail.com',  'UP3220180009901', 'Sector 62, Noida',       '2024-10-10'),
('Riya Shetty',      '9845012312', 'riya.shetty@gmail.com',   'KA0320180003345', 'Whitefield, Bengaluru',  '2024-11-25'),
('Sahil Khan',       '9845012313', 'sahil.khan@gmail.com',    'MH0120190005567', 'Bandra, Mumbai',         '2025-01-08'),
('Nandini Pillai',   '9845012314', 'nandini.p@gmail.com',     'KL0720190007789', 'Jayanagar, Bengaluru',   '2025-02-17'),
('Gaurav Malhotra',  '9845012315', 'gaurav.m@gmail.com',      'HR2620200011234', 'Gurgaon, Haryana',       '2025-03-30'),
('Tanvi Deshmukh',   '9845012316', 'tanvi.d@gmail.com',       'MH1220200044567', 'Kothrud, Pune',          '2025-05-12'),
('Harish Nayak',     '9845012317', 'harish.nayak@gmail.com',  'KA0520210067890', 'Marathahalli, Bengaluru','2025-06-21'),
('Kavya Menon',      '9845012318', 'kavya.menon@gmail.com',   'KL0820210089012', 'Indiranagar, Bengaluru', '2025-07-19'),
('Nikhil Chandra',   '9845012319', 'nikhil.c@gmail.com',      'KA0120220012345', 'Malleshwaram, Bengaluru','2025-08-27'),
('Farhan Ali',       '9845012320', 'farhan.ali@gmail.com',    'TS0120220034567', 'Banjara Hills, Hyderabad','2025-09-05');

-- ---- Vehicles (26) --------------------------------------------------------
INSERT INTO vehicles (registration_number, brand, model, vehicle_type_id, manufacturing_year,
                      fuel_type, transmission, seating_capacity, rental_rate, branch_id, status) VALUES
('KA05MJ1234', 'Maruti Suzuki', 'Swift ZXi',       1, 2022, 'PETROL',   'MANUAL',    5, 1500.00, 1, 'AVAILABLE'),
('KA01AB5678', 'Hyundai',       'i20 Asta',        1, 2023, 'PETROL',   'MANUAL',    5, 1600.00, 1, 'AVAILABLE'),
('KA03XY9012', 'Maruti Suzuki', 'Baleno Alpha',    1, 2023, 'PETROL',   'AUTOMATIC', 5, 1800.00, 2, 'AVAILABLE'),
('KA02LM3456', 'Tata',          'Punch Creative',  1, 2024, 'PETROL',   'MANUAL',    5, 1700.00, 3, 'AVAILABLE'),
('KA05JK7890', 'Hyundai',       'i10 Nios Sportz', 1, 2021, 'CNG',      'MANUAL',    5, 1300.00, 4, 'AVAILABLE'),
('KA01CD2345', 'Honda',         'City ZX',         2, 2022, 'PETROL',   'AUTOMATIC', 5, 2500.00, 1, 'AVAILABLE'),
('KA03GH6789', 'Hyundai',       'Verna SX',        2, 2023, 'DIESEL',   'AUTOMATIC', 5, 2600.00, 2, 'AVAILABLE'),
('KA04MN0123', 'Maruti Suzuki', 'Ciaz Delta',      2, 2021, 'PETROL',   'MANUAL',    5, 2200.00, 3, 'AVAILABLE'),
('KA05PQ4567', 'Skoda',         'Slavia 1.5',      2, 2024, 'PETROL',   'AUTOMATIC', 5, 2900.00, 4, 'AVAILABLE'),
('KA01RS8901', 'Honda',         'Amaze VX',        2, 2022, 'PETROL',   'MANUAL',    5, 2000.00, 1, 'AVAILABLE'),
('KA02TU2345', 'Hyundai',       'Creta SX(O)',     3, 2023, 'DIESEL',   'AUTOMATIC', 5, 3500.00, 1, 'AVAILABLE'),
('KA03VW6789', 'Mahindra',      'Scorpio N Z8',    3, 2024, 'DIESEL',   'MANUAL',    7, 3800.00, 2, 'AVAILABLE'),
('KA04XY0123', 'Tata',          'Harrier XZA+',    3, 2023, 'DIESEL',   'AUTOMATIC', 5, 3600.00, 3, 'AVAILABLE'),
('KA05ZA4567', 'Toyota',        'Fortuner 4x2',    3, 2022, 'DIESEL',   'AUTOMATIC', 7, 5500.00, 4, 'AVAILABLE'),
('KA01BC8901', 'Mahindra',      'XUV300 W8(O)',    3, 2022, 'PETROL',   'MANUAL',    5, 3000.00, 1, 'AVAILABLE'),
('KA02DE2345', 'Maruti Suzuki', 'Ertiga ZXi',      4, 2022, 'PETROL',   'MANUAL',    7, 2400.00, 2, 'AVAILABLE'),
('KA03FG6789', 'Toyota',        'Innova Crysta GX',4, 2023, 'DIESEL',   'MANUAL',    7, 3200.00, 3, 'AVAILABLE'),
('KA04HI0123', 'Renault',       'Triber RXZ',      4, 2021, 'PETROL',   'MANUAL',    7, 1900.00, 4, 'AVAILABLE'),
('KA05JK3456', 'Toyota',        'Camry Hybrid',    5, 2024, 'HYBRID',   'AUTOMATIC', 5, 7000.00, 1, 'AVAILABLE'),
('KA01LM6789', 'Skoda',         'Superb L&K',      5, 2023, 'PETROL',   'AUTOMATIC', 5, 6500.00, 2, 'AVAILABLE'),
('KA02NO0123', 'Force',         'Traveller 3488',  6, 2022, 'DIESEL',   'MANUAL',   12, 4200.00, 3, 'AVAILABLE'),
('KA03PQ4567', 'Force',         'Urban 13-Str',    6, 2023, 'DIESEL',   'MANUAL',   13, 4500.00, 1, 'AVAILABLE'),
('KA04RS7890', 'MG',            'ZS EV Excite',    3, 2024, 'ELECTRIC', 'AUTOMATIC', 5, 3300.00, 2, 'AVAILABLE'),
('KA05TU9012', 'Tata',          'Nexon EV Max',    1, 2024, 'ELECTRIC', 'AUTOMATIC', 5, 2600.00, 4, 'AVAILABLE'),
('KA01VW2345', 'Maruti Suzuki', 'Swift ZXi',       1, 2021, 'PETROL',   'MANUAL',    5, 1400.00, 2, 'MAINTENANCE'),
('KA02XY5678', 'Hyundai',       'Venue S+',        3, 2022, 'PETROL',   'MANUAL',    5, 2800.00, 3, 'INACTIVE');

-- ---- Rentals --------------------------------------------------------------
INSERT INTO rentals (customer_id, vehicle_id, branch_id, pickup_date, expected_return_date,
                     rental_days, daily_rate, rental_amount, final_amount, status, created_by) VALUES
(1,  12, 2, CURDATE() - INTERVAL 1 DAY,  CURDATE() + INTERVAL 3 DAY,  5, 3800.00, 19000.00, 19000.00, 'ACTIVE', 1),
(2,  15, 1, CURDATE(),                   CURDATE() + INTERVAL 2 DAY,  3, 3000.00,  9000.00,  9000.00, 'ACTIVE', 1),
(3,  23, 2, CURDATE() + INTERVAL 5 DAY,  CURDATE() + INTERVAL 8 DAY,  4, 3300.00, 13200.00, 13200.00, 'BOOKED', 2),
(4,  16, 3, CURDATE() + INTERVAL 10 DAY, CURDATE() + INTERVAL 13 DAY, 4, 2400.00,  9600.00,  9600.00, 'BOOKED', 2),
(5,   9, 4, CURDATE() + INTERVAL 2 DAY,  CURDATE() + INTERVAL 6 DAY,  5, 2900.00, 14500.00, 14500.00, 'BOOKED', 1);

INSERT INTO rentals (customer_id, vehicle_id, branch_id, pickup_date, expected_return_date,
                     actual_return_date, rental_days, daily_rate, rental_amount,
                     extra_charges, final_amount, vehicle_condition, status, created_by) VALUES
(6,   6, 1, CURDATE() - INTERVAL 40 DAY, CURDATE() - INTERVAL 37 DAY, CURDATE() - INTERVAL 37 DAY, 4, 2500.00, 10000.00, 0.00,    10000.00, 'GOOD',   'COMPLETED', 1),
(7,  10, 1, CURDATE() - INTERVAL 35 DAY, CURDATE() - INTERVAL 32 DAY, CURDATE() - INTERVAL 32 DAY, 4, 2000.00,  8000.00, 0.00,     8000.00, 'GOOD',   'COMPLETED', 1),
(8,  11, 1, CURDATE() - INTERVAL 30 DAY, CURDATE() - INTERVAL 26 DAY, CURDATE() - INTERVAL 26 DAY, 5, 3500.00, 17500.00, 0.00,    17500.00, 'GOOD',   'COMPLETED', 1),
(9,  14, 4, CURDATE() - INTERVAL 25 DAY, CURDATE() - INTERVAL 22 DAY, CURDATE() - INTERVAL 22 DAY, 4, 5500.00, 22000.00, 1500.00, 23500.00, 'FAIR',   'COMPLETED', 2),
(10, 19, 1, CURDATE() - INTERVAL 20 DAY, CURDATE() - INTERVAL 17 DAY, CURDATE() - INTERVAL 17 DAY, 4, 7000.00, 28000.00, 0.00,    28000.00, 'GOOD',   'COMPLETED', 1);

-- ---- Payments -------------------------------------------------------------
INSERT INTO payments (rental_id, amount, payment_method, payment_status, payment_date, recorded_by) VALUES
(1,  10000.00, 'UPI',  'PAID', CURDATE() - INTERVAL 1 DAY, 1),
(2,   9000.00, 'CARD', 'PAID', CURDATE(),                  1),
(6,  10000.00, 'UPI',  'PAID', CURDATE() - INTERVAL 37 DAY, 1),
(7,   8000.00, 'CASH', 'PAID', CURDATE() - INTERVAL 32 DAY, 1),
(8,  17500.00, 'CARD', 'PAID', CURDATE() - INTERVAL 26 DAY, 1),
(9,  23500.00, 'UPI',  'PAID', CURDATE() - INTERVAL 22 DAY, 2),
(10, 28000.00, 'CARD', 'PAID', CURDATE() - INTERVAL 17 DAY, 1);

-- ---- Maintenance ----------------------------------------------------------
INSERT INTO maintenance (vehicle_id, maintenance_type, description, maintenance_date, cost, service_provider, status, next_service_date) VALUES
(25, 'SERVICE', 'Scheduled 40,000 km general service + brake pad check', CURDATE() - INTERVAL 3 DAY, 4200.00, 'Maruti Authorized Service', 'IN_PROGRESS', CURDATE() + INTERVAL 90 DAY),
(11, 'INSPECTION', 'Pre-monsoon 50-point inspection',                    CURDATE() - INTERVAL 15 DAY, 1200.00, 'Hyundai Care Center',       'COMPLETED',   CURDATE() + INTERVAL 75 DAY);
