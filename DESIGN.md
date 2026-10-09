job-tracker/
│
├── client/ # React + Vite frontend
│ ├── public/
│ ├── src/
│ │ ├── assets/
│ │ │
│ │ ├── components/ # Shared UI components
│ │ │ ├── ui/
│ │ │ │ ├── Button.jsx
│ │ │ │ ├── Input.jsx
│ │ │ │ ├── Modal.jsx
│ │ │ │ └── Loader.jsx
│ │ │ ├── layout/
│ │ │ │ ├── Sidebar.jsx
│ │ │ │ ├── Navbar.jsx
│ │ │ │ └── AppLayout.jsx
│ │ │ └── common/
│ │ │ ├── ErrorMessage.jsx
│ │ │ └── ConfirmDialog.jsx
│ │ │
│ │ ├── features/ # Feature-specific UI
│ │ │ ├── auth/
│ │ │ │ ├── LoginForm.jsx
│ │ │ │ ├── RegisterForm.jsx
│ │ │ │ └── authApi.js
│ │ │ │
│ │ │ ├── applications/
│ │ │ │ ├── ApplicationForm.jsx
│ │ │ │ ├── ApplicationList.jsx
│ │ │ │ ├── ApplicationCard.jsx
│ │ │ │ ├── ApplicationFilters.jsx
│ │ │ │ ├── ApplicationDetails.jsx
│ │ │ │ └── applicationApi.js
│ │ │ │
│ │ │ ├── interviews/
│ │ │ │ ├── InterviewForm.jsx
│ │ │ │ ├── InterviewList.jsx
│ │ │ │ └── interviewApi.js
│ │ │ │
│ │ │ └── dashboard/
│ │ │ ├── StatsCards.jsx
│ │ │ ├── StatusChart.jsx
│ │ │ ├── UpcomingInterviews.jsx
│ │ │ └── dashboardApi.js
│ │ │
│ │ ├── pages/ # Route-level pages
│ │ │ ├── LoginPage.jsx
│ │ │ ├── RegisterPage.jsx
│ │ │ ├── DashboardPage.jsx
│ │ │ ├── ApplicationsPage.jsx
│ │ │ ├── ApplicationDetailsPage.jsx
│ │ │ └── NotFoundPage.jsx
│ │ │
│ │ ├── routes/
│ │ │ ├── AppRoutes.jsx
│ │ │ └── ProtectedRoute.jsx
│ │ │
│ │ ├── hooks/
│ │ │ └── useDebounce.js
│ │ │
│ │ ├── lib/
│ │ │ ├── apiClient.js
│ │ │ └── queryClient.js
│ │ │
│ │ ├── context/
│ │ │ └── AuthContext.jsx
│ │ │
│ │ ├── App.jsx
│ │ ├── main.jsx
│ │ └── index.css
│ │
│ ├── .env.example
│ ├── index.html
│ ├── vite.config.js
│ └── package.json
│
├── server/ # Node.js + Express backend
│ ├── src/
│ │ ├── config/
│ │ │ ├── database.js
│ │ │ └── env.js
│ │ │
│ │ ├── middleware/
│ │ │ ├── authenticate.js
│ │ │ ├── validate.js
│ │ │ ├── errorHandler.js
│ │ │ └── notFound.js
│ │ │
│ │ ├── modules/
│ │ │ ├── auth/
│ │ │ │ ├── auth.routes.js
│ │ │ │ ├── auth.controller.js
│ │ │ │ ├── auth.service.js
│ │ │ │ └── auth.schema.js
│ │ │ │
│ │ │ ├── applications/
│ │ │ │ ├── application.model.js
│ │ │ │ ├── application.routes.js
│ │ │ │ ├── application.controller.js
│ │ │ │ ├── application.service.js
│ │ │ │ └── application.schema.js
│ │ │ │
│ │ │ ├── interviews/
│ │ │ │ ├── interview.model.js
│ │ │ │ ├── interview.routes.js
│ │ │ │ ├── interview.controller.js
│ │ │ │ ├── interview.service.js
│ │ │ │ └── interview.schema.js
│ │ │ │
│ │ │ └── dashboard/
│ │ │ ├── dashboard.routes.js
│ │ │ ├── dashboard.controller.js
│ │ │ └── dashboard.service.js
│ │ │
│ │ ├── utils/
│ │ │ └── AppError.js
│ │ │
│ │ ├── app.js
│ │ └── server.js
│ │
│ ├── tests/
│ │ ├── auth.test.js
│ │ ├── applications.test.js
│ │ ├── interviews.test.js
│ │ └── dashboard.test.js
│ │
│ ├── .env.example
│ └── package.json
│
├── .gitignore
├── package.json # Optional root scripts
└── README.md
