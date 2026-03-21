import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Layout/Navbar';
import ProtectedRoute, { RoleGuard } from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import AdminLayout from './components/Layout/AdminLayout';
import TeacherLayout from './components/Layout/TeacherLayout';

import Landing from './pages/Landing/Landing';
import Login from './pages/Login/Login';
import Signup from './pages/Signup/Signup';
import StudentDashboard from './pages/Dashboard/StudentDashboard';

import ChallengesList from './pages/Challenges/Challenges';
import ChallengeDetail from './pages/Challenges/ChallengeDetail';

import CoursesList from './pages/Courses/Courses';
import CourseDetail from './pages/Courses/CourseDetail';
import LessonPage from './pages/Courses/LessonPage';

import ExamPage from './pages/Exam/ExamPage';
import ProfilePage from './pages/Profile/ProfilePage';

import AdminDashboard from './pages/Admin/AdminDashboard';
import ManageChallenges from './pages/Admin/ManageChallenges';
import ManageCourses from './pages/Admin/ManageCourses';
import ManageExams from './pages/Admin/ManageExams';
import ManageGroups from './pages/Admin/ManageGroups';

import TeacherDashboard from './pages/Teacher/TeacherDashboard';
import TeacherChallenges from './pages/Teacher/TeacherChallenges';
import TeacherCourses from './pages/Teacher/TeacherCourses';
import TeacherExams from './pages/Teacher/TeacherExams';
import TeacherGroups from './pages/Teacher/TeacherGroups';

export default function App() {
  return (
    <ErrorBoundary>
    <BrowserRouter>
      <Navbar />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<StudentDashboard />} />

          <Route path="/challenges" element={<ChallengesList />} />
          <Route path="/challenges/:id" element={<ChallengeDetail />} />

          <Route path="/courses" element={<CoursesList />} />
          <Route path="/courses/:id" element={<CourseDetail />} />
          <Route path="/courses/:courseId/lesson/:challengeId" element={<LessonPage />} />

          <Route path="/exam/:examId" element={<ExamPage />} />
          <Route path="/exam"         element={<ExamPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          <Route element={<RoleGuard role="admin" />}>
            <Route element={<AdminLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/challenges" element={<ManageChallenges />} />
              <Route path="/admin/courses" element={<ManageCourses />} />
              <Route path="/admin/exams" element={<ManageExams />} />
              <Route path="/admin/groups" element={<ManageGroups />} />
            </Route>
          </Route>

          <Route element={<RoleGuard role="teacher" />}>
            <Route element={<TeacherLayout />}>
              <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
              <Route path="/teacher/challenges" element={<TeacherChallenges />} />
              <Route path="/teacher/courses" element={<TeacherCourses />} />
              <Route path="/teacher/exams" element={<TeacherExams />} />
              <Route path="/teacher/groups" element={<TeacherGroups />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
    </ErrorBoundary>
  );
}
