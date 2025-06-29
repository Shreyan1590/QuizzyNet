# QuizzyNet - SIMATS | Real-time Quiz Platform

A comprehensive real-time quiz application built with React, Firebase, and advanced security features for SIMATS University.

## Features

### Student Portal
- **Secure Authentication**: Email-based registration and login with Firebase Auth
- **Advanced Security**: 
  - Right-click disabled during quizzes
  - Tab switch detection (max 3 switches)
  - Auto-logout after violations
  - 3-hour lockout period
  - Full-screen enforcement
- **Quiz Interface**: 
  - Real-time timer
  - Question navigation
  - Auto-submit on time expiry
  - Detailed results with explanations
- **Dashboard**: Performance analytics, quiz history, personal profile

### Faculty Portal
- **Secure Access**: Email-based authentication with approval system
- **Course Management**: 
  - Create and manage courses
  - Bulk course upload via CSV
  - Course approval workflow
- **Quiz Management**: 
  - CSV upload (up to 1GB)
  - Question bank management
  - Quiz configuration
  - Real-time monitoring
- **Student Analytics**: 
  - Comprehensive enrollment data
  - Performance tracking
  - 360° student view
  - Export functionality

### Admin Portal
- **Secure Access**: Predefined admin credentials (Username: admin, Password: admin123)
- **Student Management**: Monitor student activity, block/unblock users, view security logs
- **Course Approval**: Review and approve faculty course requests
- **Quiz Control**: Monitor and control quiz schedules across the platform
- **Disciplinary Management**: Handle security violations and disciplinary actions
- **Analytics**: Comprehensive reporting, export functionality, detailed insights

### Technical Features
- **Real-time Updates**: Firebase Firestore integration
- **Security**: Advanced tab switching detection, right-click prevention
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Performance**: Optimized loading and caching strategies

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Storage)
- **Routing**: React Router v6
- **State Management**: React Context API
- **UI Components**: Lucide React icons
- **File Processing**: PapaParse for CSV handling
- **Notifications**: React Hot Toast
- **Build Tool**: Vite
- **Deployment**: Netlify

## Getting Started

### Prerequisites
- Node.js 18+
- Firebase project with Firestore and Authentication enabled

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd quizzynet-simats
```

2. Install dependencies:
```bash
npm install
```

3. Configure Firebase:
   - Create a Firebase project at https://console.firebase.google.com/
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Enable Storage
   - Copy your Firebase config to `src/lib/firebase.ts`

4. Start the development server:
```bash
npm run dev
```

### Firebase Configuration

Update `src/lib/firebase.ts` with your Firebase project credentials:

```typescript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### CSV Format for Quiz Upload

The CSV file should contain the following columns:
- `question`: The question text
- `option1`, `option2`, `option3`, `option4`: Answer options
- `correctAnswer`: Correct answer number (1-4)
- `explanation`: Optional explanation for the answer
- `difficulty`: easy, medium, or hard
- `category`: Question category

Example:
```csv
question,option1,option2,option3,option4,correctAnswer,explanation,difficulty,category
"What is the capital of France?","London","Berlin","Paris","Madrid","3","Paris is the capital of France","easy","Geography"
```

## Security Features

### Tab Switch Detection
- Monitors `visibilitychange` and `blur` events
- Tracks number of tab switches
- Implements progressive warnings
- Auto-logout after 3 violations
- 3-hour lockout period

### Right-click Prevention
- Disables context menu during quizzes
- Shows warning notifications
- Prevents access to developer tools

### Full-screen Enforcement
- Requests full-screen mode on quiz start
- Monitors full-screen changes
- Automatically re-enters full-screen if exited

## User Roles & Access

### Student Access
- Register with email and student registration number
- Enroll in approved courses
- Take quizzes with security monitoring
- View results and performance analytics

### Faculty Access
- Register with email and faculty ID
- Requires admin approval for account activation
- Create and manage courses
- Upload questions via CSV
- Monitor student performance

### Admin Access
- Predefined credentials: admin / admin123
- Full system control and monitoring
- Approve faculty accounts and courses
- Manage disciplinary actions
- System analytics and reporting

## Deployment

### Netlify Deployment

1. Build the project:
```bash
npm run build
```

2. Deploy to Netlify:
   - Connect your repository to Netlify
   - Set build command: `npm run build`
   - Set publish directory: `dist`

3. Configure environment variables in Netlify dashboard:
   - Add your Firebase configuration variables

### Manual Deployment

1. Build the project:
```bash
npm run build
```

2. Upload the `dist` folder to your hosting provider

## Project Structure

```
src/
├── components/
│   ├── Admin/          # Admin portal components
│   ├── Auth/           # Authentication components
│   ├── Faculty/        # Faculty portal components
│   ├── Layout/         # Shared layout components
│   ├── Quiz/           # Quiz-related components
│   └── Student/        # Student portal components
├── contexts/           # React contexts
├── lib/               # Utilities and configurations
└── main.tsx           # Application entry point
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please contact the SIMATS development team or create an issue in the repository.

## About SIMATS

SIMATS (Saveetha Institute of Medical and Technical Sciences) is a leading educational institution committed to providing quality education through innovative technology solutions like QuizzyNet.