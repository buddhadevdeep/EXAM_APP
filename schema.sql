-- Database creation
CREATE DATABASE IF NOT EXISTS `smart_sql_exam`;
USE `smart_sql_exam`;

-- 1. Roles table
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role_id` INT NOT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `email_verified` TINYINT(1) DEFAULT 0,
  `verification_token` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Students table
CREATE TABLE IF NOT EXISTS `students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `full_name` VARCHAR(255) NOT NULL,
  `roll_number` VARCHAR(50) NOT NULL UNIQUE,
  `class_section` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Teachers table
CREATE TABLE IF NOT EXISTS `teachers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `full_name` VARCHAR(255) NOT NULL,
  `department` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Subjects table
CREATE TABLE IF NOT EXISTS `subjects` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Categories table
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Question Banks table
CREATE TABLE IF NOT EXISTS `question_banks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Questions table
CREATE TABLE IF NOT EXISTS `questions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `question_bank_id` INT NOT NULL,
  `category_id` INT NOT NULL,
  `subject_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `points` INT NOT NULL DEFAULT 10,
  `sql_template` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`question_bank_id`) REFERENCES `question_banks` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 9. Exams table
CREATE TABLE IF NOT EXISTS `exams` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `teacher_id` INT NOT NULL,
  `subject_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `total_marks` INT NOT NULL DEFAULT 100,
  `duration_minutes` INT NOT NULL DEFAULT 60,
  `is_published` TINYINT(1) DEFAULT 0,
  `is_closed` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 10. Exam Questions table
CREATE TABLE IF NOT EXISTS `exam_questions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `exam_id` INT NOT NULL,
  `question_id` INT NOT NULL,
  `order_index` INT NOT NULL DEFAULT 0,
  FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `exam_question_unique` (`exam_id`, `question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 11. Submissions table
CREATE TABLE IF NOT EXISTS `submissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `exam_id` INT NOT NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Submitted, Graded
  `submitted_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `student_exam_unique` (`student_id`, `exam_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 12. Submission Answers table
CREATE TABLE IF NOT EXISTS `submission_answers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `submission_id` INT NOT NULL,
  `question_id` INT NOT NULL,
  `sql_query` TEXT NOT NULL,
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `submission_question_unique` (`submission_id`, `question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 13. Marks table
CREATE TABLE IF NOT EXISTS `marks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `submission_id` INT NOT NULL,
  `question_id` INT NOT NULL,
  `teacher_id` INT NOT NULL,
  `marks_obtained` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `feedback` TEXT,
  `graded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE,
  UNIQUE KEY `submission_question_grader_unique` (`submission_id`, `question_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 14. Feedback table (overall exam feedback if needed, optional, but we have marks level. Let's create an overall feedback table too)
CREATE TABLE IF NOT EXISTS `feedback` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `submission_id` INT NOT NULL UNIQUE,
  `teacher_id` INT NOT NULL,
  `comments` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 15. Notifications table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 16. Activity Logs table
CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `action` VARCHAR(255) NOT NULL,
  `details` TEXT,
  `ip_address` VARCHAR(45) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 17. Settings table
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` TEXT,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- SEED DATA
-- Insert Roles
INSERT INTO `roles` (`id`, `name`) VALUES 
(1, 'Admin'),
(2, 'Teacher'),
(3, 'Student')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Insert default admin, teacher, and student users
-- All default passwords are 'Password123' hashed with bcrypt (salt rounds = 10)
-- $2b$10$R9hZqR/zS2e5lZ5j.p7aP.kY8yqgHqVwX2K1K6.V92GvH0R5sB/dC (example hash)
-- Let's use a standard bcrypt hash: $2b$10$tMh4EeeZJgVfN8l.HExbQeS.jJ.tOa5zP48KkK4P263h/Y2B6hI.q
-- which is 'password123'
INSERT INTO `users` (`id`, `email`, `password_hash`, `role_id`, `is_active`, `email_verified`) VALUES
(1, 'admin@platform.com', '$2b$10$tMh4EeeZJgVfN8l.HExbQeS.jJ.tOa5zP48KkK4P263h/Y2B6hI.q', 1, 1, 1),
(2, 'teacher1@platform.com', '$2b$10$tMh4EeeZJgVfN8l.HExbQeS.jJ.tOa5zP48KkK4P263h/Y2B6hI.q', 2, 1, 1),
(3, 'teacher2@platform.com', '$2b$10$tMh4EeeZJgVfN8l.HExbQeS.jJ.tOa5zP48KkK4P263h/Y2B6hI.q', 2, 1, 1),
(4, 'student1@platform.com', '$2b$10$tMh4EeeZJgVfN8l.HExbQeS.jJ.tOa5zP48KkK4P263h/Y2B6hI.q', 3, 1, 1),
(5, 'student2@platform.com', '$2b$10$tMh4EeeZJgVfN8l.HExbQeS.jJ.tOa5zP48KkK4P263h/Y2B6hI.q', 3, 1, 1)
ON DUPLICATE KEY UPDATE `email`=VALUES(`email`);

INSERT INTO `teachers` (`id`, `user_id`, `full_name`, `department`) VALUES
(1, 2, 'Dr. Alan Turing', 'Computer Science'),
(2, 3, 'Prof. Grace Hopper', 'Information Technology')
ON DUPLICATE KEY UPDATE `full_name`=VALUES(`full_name`);

INSERT INTO `students` (`id`, `user_id`, `full_name`, `roll_number`, `class_section`) VALUES
(1, 4, 'John Doe', 'CS202601', 'Class A'),
(2, 5, 'Jane Smith', 'CS202602', 'Class B')
ON DUPLICATE KEY UPDATE `full_name`=VALUES(`full_name`);

-- Insert Subjects
INSERT INTO `subjects` (`id`, `name`, `description`) VALUES
(1, 'Database Management Systems', 'Core database concepts, SQL queries, normalization, transactions.'),
(2, 'Advanced Database Systems', 'Advanced query tuning, distributed databases, NoSQL.')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Insert Categories
INSERT INTO `categories` (`id`, `name`, `description`) VALUES
(1, 'Basic SELECT Queries', 'Simple select queries with WHERE, ORDER BY, and LIMIT constraints.'),
(2, 'SQL Aggregations', 'GROUP BY, HAVING, and aggregate functions like COUNT, SUM, AVG.'),
(3, 'SQL Joins', 'INNER JOIN, LEFT JOIN, RIGHT JOIN, and self joins.')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Insert Question Banks
INSERT INTO `question_banks` (`id`, `name`, `description`) VALUES
(1, 'DBMS Semester 1 Question Bank', 'Collection of basic and intermediate SQL questions for first year undergraduates.')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Insert Questions
INSERT INTO `questions` (`id`, `question_bank_id`, `category_id`, `subject_id`, `title`, `description`, `points`, `sql_template`) VALUES
(1, 1, 1, 1, 'Select All Employees', 'Write a query to retrieve all columns from the employees table where department is "Engineering" and salary is greater than 70000.', 10, 'SELECT * FROM employees WHERE department = \'Engineering\' AND salary > 70000;'),
(2, 1, 2, 1, 'Average Salary per Department', 'Write a SQL query to calculate the average salary of employees in each department. Group the results by department name.', 15, 'SELECT department, AVG(salary) FROM employees GROUP BY department;'),
(3, 1, 3, 1, 'Get Employee Managers', 'Write a query using an INNER JOIN to retrieve the employee name and their manager\'s name from the employees table joining the managers table on manager_id.', 20, 'SELECT e.name as employee_name, m.name as manager_name FROM employees e INNER JOIN employees m ON e.manager_id = m.id;')
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`);

-- Insert Settings
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES
('platform_name', 'Smart SQL Exam Platform'),
('allow_registration', 'true'),
('theme', 'dark')
ON DUPLICATE KEY UPDATE `setting_value`=VALUES(`setting_value`);
