import React, { useState } from 'react'
import {Link} from 'react-router-dom'
import './Navbar.css'

export default function Navbar() {
    const[menu,setmenu]=useState("")
  return (
      <nav>
          <ul className='navbar'>

              <li className='artstore'>
                  <Link to='/'>
                      <img src='/artstore_logo.jpeg' alt='artstore logo' />
                  </Link>
              </li>

              <li>
                  <input
                      className='search'
                      type='text'
                      placeholder='Search products...'
                  />
              </li>

              <li className='icons'>
                  <Link to='/cart'>
                      <img src='/carticon.png' alt='cart' />
                  </Link>

                  <Link to='/order'>
                      <img src='/ordericon.png' alt='order' />
                  </Link>

                  <Link to='/signin' className='signin'>
                      Sign In
                  </Link>
              </li>

          </ul>
      </nav>
  )
}
