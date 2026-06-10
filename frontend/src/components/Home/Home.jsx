import React from 'react'
import Navbar from '../Navbar/Navbar.jsx'
import Hero from '../Hero/Hero.jsx'

export default function Home() {
  return (
    <div>

      <Navbar />

      <Hero />

      <div className='welcome'>
        <h1>Welcome to Art Store</h1>
        <p>Discover unique paintings and artworks.</p>
      </div>

      <div className='products'>

        <div className='card'>
          <img src='/art1.jpg' alt='art' />
          <h3>Abstract Art</h3>
          <p>₹1200</p>
          <button>Buy Now</button>
        </div>

        <div className='card'>
          <img src='/art2.jpg' alt='art' />
          <h3>Landscape Art</h3>
          <p>₹1500</p>
          <button>Buy Now</button>
        </div>

        <div className='card'>
          <img src='/art3.jpg' alt='art' />
          <h3>Modern Art</h3>
          <p>₹1800</p>
          <button>Buy Now</button>
        </div>

        <div className='card'>
          <img src='/art4.jpg' alt='art' />
          <h3>Nature Art</h3>
          <p>₹2000</p>
          <button>Buy Now</button>
        </div>

      </div>

    </div>
  )
}
