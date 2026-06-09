import React, { useState } from 'react'
import {Link} from 'react-router-dom'
import './Navbar.css'

export default function Navbar() {
    const[menu,setmenu]=useState("")
  return (
    <div>
        <nav>
            <ul className='navbar'>
                <li className='artstore' ><Link to="/artstore_logo.jpeg"><img src='/artstore_logo.jpeg' alt='artstore logo' /></Link></li>
                <li> 
                    <input className='search' type="text" placeholder='search products....' />
                </li>
                <li className='navbar_items'> 
                    <button className='search_button'>search</button>
                </li>
                <li className='navbar_items'><Link to="/cart"><img src='/carticon.png' alt='cart_icon' /></Link></li>
                <li className='navbar_items'><Link to="/order"><img src='/ordericon.png' alt='order_icon' /></Link></li>
                <li className='navbar_items'><Link to='/signin'>sign in</Link></li>
            </ul>
        </nav>
      
    </div>
  )
}
