 
import { Route, Routes } from 'react-router-dom'
import Home from './components/Home/Home'
import Authentication from './components/Authentication/Authentication.jsx'
import Order from './components/Order/Order.jsx'
import Cart from './components/Cart/Cart.jsx'
import Products from './components/Products/Products.jsx'
import Customorders from './components/Customorders/Customorders.jsx';  
import Checkout from './components/Checkout/Checkout.jsx';
import AdminOrders from "./components/AdminOrders/AdminOrders";
import PaymentSuccess from './components/PaymentSuccess/PaymentSuccess.jsx';
import PaymentFailure from './components/PaymentFailure/PaymentFailure.jsx';
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
        <Route path="/custom-orders" element={<Customorders />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failure" element={<PaymentFailure />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
      </Routes>
    </div>
  )
}
