import { Navigate } from 'react-router-dom'
import { PublicLayout } from '../../layouts/PublicLayout'
import { PrestataireLayout } from '../../layouts/PrestataireLayout'
import { AdminLayout } from '../../layouts/AdminLayout'
import {
  LandingPage,
  SearchPage,
  ActivityDetailsPage,
  BecomePrestatairePage,
  PrestataireLoginPage,
  PrestataireRegisterPage,
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  TermsPage,
  PrivacyPage,
  FaqPage,
} from '../../pages/public/PublicPages'
import {
  ClientReservationsPage,
  ClientPanierPage,
  ClientFavoritesPage,
  ClientProfilePage,
  ClientComptePage,
  ClientReviewsPage,
  ClientMessagesPage,
  ClientPaymentsPage,
} from '../../pages/client/ClientPages'
import {
  PrestataireDashboardPage,
  PrestataireActivitiesPage,
  PrestataireAvailabilityPage,
  PrestataireReservationsPage,
  PrestataireReviewsPage,
  PrestataireAdsPage,
  PrestataireSettingsPage,
} from '../../pages/prestataire/PrestatairePages'
import {
  AdminLoginPage,
  AdminDashboardPage,
  AdminUsersPage,
  AdminPrestatairesPage,
  AdminActivitiesPage,
  AdminReviewsPage,
  AdminAdsPage,
  AdminCommissionsPage,
  AdminStatisticsPage,
} from '../../pages/admin/AdminPages'
import { RequireAuth, RequireRole } from './guards'

export const appRoutes = [
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'activity/:id', element: <ActivityDetailsPage /> },
      { path: 'become-prestataire', element: <BecomePrestatairePage /> },
      { path: 'prestataire/login', element: <PrestataireLoginPage /> },
      { path: 'prestataire/register', element: <PrestataireRegisterPage /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'terms', element: <TermsPage /> },
      { path: 'privacy', element: <PrivacyPage /> },
      { path: 'faq', element: <FaqPage /> },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <RequireRole allowedRoles={['client']} />,
            children: [
              { path: 'dashboard', element: <Navigate to="/" replace /> },
              { path: 'reservations', element: <ClientReservationsPage /> },
              { path: 'panier', element: <ClientPanierPage /> },
              { path: 'favorites', element: <ClientFavoritesPage /> },
              { path: 'compte', element: <ClientComptePage /> },
              { path: 'profile', element: <ClientProfilePage /> },
              { path: 'reviews', element: <ClientReviewsPage /> },
              { path: 'messages', element: <ClientMessagesPage /> },
              { path: 'payments', element: <ClientPaymentsPage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <RequireRole allowedRoles={['prestataire']} />,
        children: [
          {
            path: 'prestataire',
            element: <PrestataireLayout />,
            children: [
              { path: 'dashboard', element: <PrestataireDashboardPage /> },
              { path: 'activities', element: <PrestataireActivitiesPage /> },
              { path: 'availability', element: <PrestataireAvailabilityPage /> },
              { path: 'reservations', element: <PrestataireReservationsPage /> },
              { path: 'reviews', element: <PrestataireReviewsPage /> },
              {
                path: 'statistics',
                element: <Navigate to="/prestataire/dashboard?tab=analyses" replace />,
              },
              { path: 'ads', element: <PrestataireAdsPage /> },
              { path: 'settings', element: <PrestataireSettingsPage /> },
            ],
          },
        ],
      },
      {
        element: <RequireRole allowedRoles={['admin']} />,
        children: [
          {
            path: 'admin',
            element: <AdminLayout />,
            children: [
              { path: 'dashboard', element: <AdminDashboardPage /> },
              { path: 'users', element: <AdminUsersPage /> },
              { path: 'prestataires', element: <AdminPrestatairesPage /> },
              { path: 'activities', element: <AdminActivitiesPage /> },
              { path: 'reviews', element: <AdminReviewsPage /> },
              {
                path: 'reports',
                element: <Navigate to="/admin/reviews?tab=signalements" replace />,
              },
              { path: 'ads', element: <AdminAdsPage /> },
              { path: 'commissions', element: <AdminCommissionsPage /> },
              { path: 'disputes', element: <Navigate to="/admin/reviews?tab=litiges" replace /> },
              { path: 'statistics', element: <AdminStatisticsPage /> },
              { path: 'notifications', element: <Navigate to="/admin/dashboard" replace /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: '/admin/login',
    element: <AdminLoginPage />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]
