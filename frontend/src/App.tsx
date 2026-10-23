import { Route, Routes } from 'react-router-dom'
import NavBar from './components/NavBar'
import BulldogMark from './components/BulldogMark'
import CampusBackdrop from './components/CampusBackdrop'
import { usePageState } from './pageContext'
import ChatWidget from './components/ChatWidget'
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import About from './pages/About'
import LogIn from './pages/LogIn'
import CreateAccount from './pages/CreateAccount'

export default function App() {
  // The category being browsed decides which part of campus is in view.
  const { category } = usePageState()

  return (
    <div className="app">
      <CampusBackdrop focus={category || null} />
      <NavBar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:productId" element={<ProductDetail />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<LogIn />} />
          <Route path="/create-account" element={<CreateAccount />} />
          <Route path="*" element={<p className="state">that page is not here.</p>} />
        </Routes>
      </main>
      <footer className="footer">
        <BulldogMark size={88} className="footer__dog" title="handsome dan" />
        <p>officially licensed merchandise</p>
        <p>campus customs · 57 broadway · new haven</p>
      </footer>
      {/* Floating panel, bottom-right, on every page. */}
      <ChatWidget />
    </div>
  )
}
