# AI Call Intelligence Frontend

A modern, responsive React frontend application for the AI Call Intelligence platform. Built with React, TypeScript, Vite, TailwindCSS, and Framer Motion, featuring a glassmorphism design system and comprehensive analytics dashboard.

![AI Call Intelligence](https://img.shields.io/badge/React-18.2.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0.2-blue)
![Vite](https://img.shields.io/badge/Vite-5.0.0-purple)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4.0-cyan)

## ✨ Features

- **Modern Design System**: Glassmorphism UI with custom color palette
- **Responsive Layout**: Mobile-first design with adaptive navigation
- **Type-Safe Development**: Full TypeScript support with comprehensive types
- **State Management**: Zustand for lightweight, performant state management
- **Real-time Updates**: WebSocket integration for live data updates
- **Data Visualization**: Interactive charts with Recharts
- **Authentication**: Secure JWT-based authentication system
- **Dark Theme Ready**: Prepared for dark mode implementation
- **Performance Optimized**: Lazy loading, code splitting, and optimized builds

## 🏗️ Tech Stack

### Core Technologies
- **React 18.2** - Modern React with concurrent features
- **TypeScript 5.0** - Strong typing and developer experience
- **Vite 5.0** - Lightning-fast build tool and dev server

### Styling & UI
- **TailwindCSS 3.4** - Utility-first CSS framework
- **Headless UI** - Unstyled, fully accessible UI components
- **Heroicons** - Beautiful hand-crafted SVG icons
- **Framer Motion** - Production-ready motion library

### State & Data
- **Zustand** - Lightweight state management
- **React Hook Form** - Performant forms with easy validation
- **Zod** - TypeScript-first schema validation
- **TanStack Table** - Headless table building

### Visualization & Charts
- **Recharts** - Composable charting library
- **React Countup** - Number animation component

### HTTP & API
- **Axios** - Promise-based HTTP client
- **React Query** - Data fetching and caching (ready for implementation)

## 🚀 Getting Started

### Prerequisites

- Node.js 18.0 or higher
- npm 9.0 or higher (or yarn/pnpm)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd AI-call-intelligence-fe
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and configure your environment variables:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api
   VITE_WS_URL=ws://localhost:8000/ws
   VITE_APP_NAME=AI Call Intelligence
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

The application will be available at `http://localhost:5173`

### Build for Production

```bash
# Build for production
npm run build

# Preview the production build locally
npm run preview
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── analytics/      # Chart and analytics components
│   ├── ui/            # Base UI components (Button, Input, etc.)
│   └── PagePlaceholder.tsx
├── layouts/            # Page layout components
│   ├── AuthLayout.tsx
│   ├── DashboardLayout.tsx
│   ├── Header.tsx
│   └── Sidebar.tsx
├── pages/              # Page components
│   ├── auth/          # Authentication pages
│   ├── dashboard/     # Dashboard pages
│   ├── meetings/      # Meeting-related pages
│   ├── persons/       # Person management pages
│   ├── pain-points/   # Pain point analysis pages
│   ├── action-items/  # Action item management
│   ├── resources/     # Resource management
│   ├── analytics/     # Analytics and insights
│   ├── reports/       # Report generation
│   ├── search/        # Search functionality
│   ├── notifications/ # Notification center
│   └── settings/      # Application settings
├── services/          # API service layer
│   ├── api.ts        # Base API configuration
│   ├── meeting.ts    # Meeting API service
│   ├── person.ts     # Person API service
│   ├── painpoint.ts  # Pain point API service
│   ├── actionitem.ts # Action item API service
│   ├── resource.ts   # Resource API service
│   └── analytics.ts  # Analytics API service
├── store/             # Zustand state management
│   ├── auth.ts       # Authentication state
│   ├── meeting.ts    # Meeting state
│   ├── ui.ts         # UI state
│   └── analytics.ts  # Analytics state
├── hooks/             # Custom React hooks
├── utils/             # Utility functions
├── types/             # TypeScript type definitions
├── styles/            # Global stylesheets
└── App.tsx           # Root application component
```

## 🎨 Design System

### Color Palette
- **Primary**: `#15173D` - Deep navy for primary elements
- **Accent**: `#982598` - Purple for highlights and interactive elements
- **Secondary**: `#E491C9` - Light purple for secondary actions
- **Neutral**: `#F1E9E9` - Light pink for backgrounds and subtle elements

### Typography
- **Font**: Inter (loaded from Google Fonts)
- **Weights**: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)

### Components
All components follow a consistent design pattern with:
- Glassmorphism effects with `backdrop-blur`
- Subtle shadows and borders
- Smooth animations with Framer Motion
- Responsive design principles
- Accessibility-first approach

## 📊 Features Overview

### Authentication System
- **Login/Signup**: Secure JWT-based authentication
- **Password Recovery**: Email-based password reset flow
- **Protected Routes**: Route-level authentication guards
- **Session Management**: Automatic token refresh and logout

### Dashboard Features
- **Overview Dashboard**: Key metrics, recent meetings, action items
- **Meeting Management**: View, search, and analyze recorded meetings
- **Person Directory**: Manage vendors, distributors, and voice profiles
- **Pain Point Analysis**: Identify and track customer pain points
- **Action Items**: Create and manage follow-up tasks
- **Resource Library**: Organize solutions and documentation
- **Analytics**: Comprehensive insights and trend analysis
- **Reports**: Generate detailed business reports
- **Search**: Global search across all data
- **Notifications**: Real-time alerts and updates
- **Settings**: User preferences and configuration

### Data Visualization
- **Area Charts**: Trend analysis over time
- **Bar Charts**: Comparative data visualization
- **Pie Charts**: Distribution and proportion analysis
- **Line Charts**: Time-series data tracking
- **Metric Cards**: Key performance indicators with trend indicators

## 🔧 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run type checking
npm run type-check

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix
```

### Code Style

- **ESLint**: Configured with React and TypeScript rules
- **Prettier**: Automatic code formatting
- **TypeScript**: Strict mode enabled for better type safety
- **Import Organization**: Absolute imports with path mapping

### Component Development

Components follow these conventions:
- **Functional Components**: Use React.FC with explicit props typing
- **Props Interface**: Always define props interface above component
- **Default Props**: Use default parameters instead of defaultProps
- **Styling**: TailwindCSS classes with conditional logic using clsx
- **Animation**: Framer Motion for smooth interactions

## 🌐 API Integration

The application is designed to work with the AI Call Intelligence backend API. All API calls are handled through the service layer with:

- **Type Safety**: Full TypeScript interfaces for all API responses
- **Error Handling**: Comprehensive error catching and user feedback
- **Loading States**: Built-in loading indicators for async operations
- **Caching**: Ready for React Query implementation for optimized data fetching

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm install -g vercel
vercel --prod
```

### Netlify
```bash
npm run build
# Upload dist/ folder to Netlify
```

### Custom Server
```bash
npm run build
# Serve dist/ folder with any static file server
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style and conventions
- Add TypeScript types for all new features
- Include responsive design for all components
- Test components on different screen sizes
- Ensure accessibility compliance (WCAG 2.1)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **React Team** for the amazing framework
- **Vite Team** for the lightning-fast build tool
- **TailwindCSS** for the utility-first CSS framework
- **Framer Motion** for beautiful animations
- **Recharts** for data visualization components

---

Built with ❤️ by the AI Call Intelligence Team