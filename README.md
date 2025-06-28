# QuizMaster Pro - Real-time Quiz Platform

A comprehensive real-time quiz application built with React, Firebase, and advanced security features.

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

### Admin Portal
- **Secure Access**: Predefined admin credentials (Username: Shreyan, Password: 123user123)
- **Student Management**: Monitor student activity, block/unblock users, view security logs
- **Quiz Management**: 
  - CSV upload (up to 1GB)
  - Question bank management
  - Quiz configuration
  - Real-time monitoring
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
cd quiz-master-pro
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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please contact the development team or create an issue in the repository.