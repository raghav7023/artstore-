import React from 'react'
import {Route,Routes} from 'react-router-dom'
import Home from './components/Home/Home'
import Authentication from './components/Authentication/Authentication.jsx'


export default function App() {
  return (
    <div>
      <Routes>
        <Route path='/' element={<Home/>}/>
        <Route path='/signin' element={<Authentication/>}/>
      </Routes>
    </div>
  )
}
