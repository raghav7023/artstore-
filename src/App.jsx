import { Route, Routes } from 'react-router-dom';
import Home from './components/Home/Home';
import Authentication from './components/Authentication/Authentication.jsx';
import Cart from './components/Cart/Cart.jsx';
import Products from './components/Products/Products.jsx';
import Customorders from './components/Customorders/Customorders.jsx';
import Checkout from './components/Checkout/Checkout.jsx';
import AdminOrders from './components/AdminOrders/AdminOrders';
import PaymentSuccess from './components/PaymentSuccess/PaymentSuccess.jsx';
import PaymentFailure from './components/PaymentFailure/PaymentFailure.jsx';
import ProductDetail from './components/ProductDetail/ProductDetail.jsx';

// Admin Dashboard
import AdminLayout from './components/Admin/AdminLayout.jsx';
import Dashboard from './components/Admin/Dashboard.jsx';
import UserList from './components/Admin/UserList.jsx';
import UserDetail from './components/Admin/UserDetail.jsx';
import OrderList from './components/Admin/OrderList.jsx';
import OrderDetail from './components/Admin/OrderDetail.jsx';
import PaymentList from './components/Admin/PaymentList.jsx';
import EmailList from './components/Admin/EmailList.jsx';
import ProductList from './components/Admin/ProductList.jsx';
import Settings from './components/Admin/Settings.jsx';

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
        <Route path='/product/:id' element={<ProductDetail />} />

        {/* Cart Page - NOTE: lowercase 'cart' (URL mein lowercase rakho) */}
        <Route path='/cart' element={<Cart />} />

        {/* Orders Page (My Orders for users) */}
        <Route path='/order' element={<AdminOrders />} />
        <Route path='/orders' element={<AdminOrders />} />
        <Route path="/custom-orders" element={<Customorders />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/payment-failure" element={<PaymentFailure />} />

        {/* Admin Dashboard */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="users" element={<UserList />} />
          <Route path="users/:id" element={<UserDetail />} />
          <Route path="products" element={<ProductList />} />
          <Route path="orders" element={<OrderList />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="payments" element={<PaymentList />} />
          <Route path="emails" element={<EmailList />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </div>
  );
}
