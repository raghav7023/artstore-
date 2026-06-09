import React from 'react'
import './Authentication.css'

export default function Authentication() {
  return (
    <div>
      <form className='form'>
        <div className='signup_items'>
      <h2 className='head'>Sign up</h2>
      <label  className='label' for='user'>Username:</label>
      <input className='input' type='text' to='user' placeholder='enter the name here' name='username'/>
      <br></br>
      <label className='label' >Password:</label>
      <input className='input' type='password' to='pass' placeholder='enter your password here' name='password' />
      <br></br>
      <label  className='label' for='number'>number:</label>
      <input className='input' type='number' placeholder='enter the number' to='number' name='number'/>
      <br></br>
      <button className='button'>Sign in</button>
        </div>
      </form>

    </div>
  )
}
