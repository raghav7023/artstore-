import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './components/Home/Home'
import Authentication from './components/Authentication/Authentication.jsx'
import Order from './components/Order/Order.jsx'
import Cart from './components/Cart/Cart.jsx'
import Products from './components/Products/Products.jsx'

export default function App() {
  return (
    <div>
      <Routes>
        {/* Home Page */}
        <Route path='/' element={<Home />} />

        {/* Authentication Page - login aur signup dono yahan */}
        <Route path='/signin' element={<Authentication />} />

        {/* Products Page */}
        <Route path='/products' element={<Products />} />

        {/* Cart Page - NOTE: lowercase 'cart' (URL mein lowercase rakho) */}
        <Route path='/cart' element={<Cart />} />

        {/* Order Page */}
        <Route path='/order' element={<Order />} />
      </Routes>
    </div>
  )
}
