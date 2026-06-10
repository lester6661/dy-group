import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { RequireAuth } from '../components/RequireAuth';
import { DashboardPage } from '../pages/DashboardPage';
import { SchedulePage } from '../pages/SchedulePage';
import { StaffPage } from '../pages/StaffPage';
import { AttendancePage } from '../pages/AttendancePage';
import { LeavePage } from '../pages/LeavePage';
import { RestPlanningPage } from '../pages/RestPlanningPage';
import { ProfilePage } from '../pages/ProfilePage';
import { SettingsPage } from '../pages/SettingsPage';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { RegisterReviewPage } from '../pages/RegisterReviewPage';
import { NotFoundPage } from '../pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          {
            path: 'schedule',
            element: <SchedulePage />,
          },
          {
            path: 'staff',
            element: <StaffPage />,
          },
          {
            path: 'attendance',
            element: <AttendancePage />,
          },
          {
            path: 'leave',
            element: <LeavePage />,
          },
          {
            path: 'rest-planning',
            element: <RestPlanningPage />,
          },
          {
            path: 'profile',
            element: <ProfilePage />,
          },
          {
            path: 'settings',
            element: <SettingsPage />,
          },
        ],
      },
    ],
  },
  {
    element: <AuthLayout />,
    children: [
      {
        path: '/login',
        element: <LoginPage />,
      },
      {
        path: '/register',
        element: <RegisterPage />,
      },
      {
        path: '/register-review',
        element: <RegisterReviewPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
