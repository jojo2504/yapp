import { BrowserRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/Home/HomePage'
import CodingPage from './pages/Coding/CodingPage'
import LoginPage from './pages/Auth/LoginPage'
import RegisterPage from './pages/Auth/RegisterPage'
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage'

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Page d'accueil */}
                <Route path="/" element={<HomePage />} />

                {/* Routes d'authentification */}
                <Route path="/auth/login" element={<LoginPage />} />
                <Route path="/auth/register" element={<RegisterPage />} />
                <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />

                {/* Route de codage */}
                <Route path="/code" element={<CodingPage />} />

                {/* Ajouter vos autres routes ici au fur et à mesure */}
            </Routes>
        </BrowserRouter>
    )
}

export default App