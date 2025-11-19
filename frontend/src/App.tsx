import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CodePage from './Pages/CodingPage'
import HomePage from './Pages/HomePage'
import styles from './assets/base.module.css'

function App() {
    return (
        <BrowserRouter>
            <div className={styles.body}>
                <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/code" element={<CodePage />} />
                </Routes>
            </div>
        </BrowserRouter>
    )
}

export default App